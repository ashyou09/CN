const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { isIP } = require('node:net');

const PORT = Number(process.env.DEMO_PORT || 5050);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(__dirname, 'public');
const EVIDENCE = path.join(ROOT, 'evidence');
const categories = ['lan', 'dns', 'load-balancing', 'tls', 'caching', 'wireshark', 'failures'];
let config = {
  mac1: { name: 'Mac 1 · Person A', role: 'Private DNS & client', ip: '10.124.23.102', port: 53 },
  mac2: { name: 'Mac 2 · Person B', role: 'Nginx edge / TLS / load balancer', ip: '10.124.23.50', port: 8080, httpsPort: 8443 },
  mac3: { name: 'Mac 3 · Person C', role: 'Backend A', ip: '10.124.23.199', port: 3001 },
  mac4: { name: 'Mac 4 · Person D', role: 'Backend B & client', ip: '10.124.23.243', port: 3002 },
  gateway: { name: 'LAN gateway', ip: '10.124.23.114' },
  domain: 'app.teamX.test', apiDomain: 'api.teamX.test'
};

function command(bin, args, timeout = 7000) {
  const startedAt = new Date().toISOString();
  const start = Date.now();
  return new Promise(resolve => execFile(bin, args, { timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => resolve({
    success: !err, command: [bin, ...args.map(a => JSON.stringify(a))].join(' '),
    startedAt, duration: Date.now() - start, stdout: stdout || '', stderr: stderr || '',
    error: err ? (err.killed ? 'Probe timed out' : err.message) : null
  })));
}
const curl = args => command('curl', ['--noproxy', '*', '-sS', '-i', '--connect-timeout', '2', '--max-time', '5', ...args]);
const status = r => Number((r.stdout.match(/^HTTP\/\S+\s+(\d+)/m) || [])[1]) || 0;
const header = (r, name) => (r.stdout.match(new RegExp(`^${name}:\\s*([^\\r\\n]+)`, 'im')) || [])[1] || null;
const raw = r => `$ ${r.command}\n${r.stdout}${r.stderr}${r.error ? '\n' + r.error : ''}`;
const edge = (c, route) => `http://${c.mac2.ip}:${c.mac2.port}${route}`;

function evidenceFiles() {
  const files = [];
  function walk(dir, category) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full, category);
      else if (item.isFile() && /\.(txt|log|png|jpe?g|pdf|pcapng?|json)$/i.test(item.name)) {
        const stat = fs.statSync(full);
        files.push({ path: path.relative(EVIDENCE, full), category, name: item.name, bytes: stat.size,
          modifiedAt: stat.mtime.toISOString(), url: '/api/evidence/file?path=' + encodeURIComponent(path.relative(EVIDENCE, full)) });
      }
    }
  }
  categories.forEach(c => walk(path.join(EVIDENCE, c), c));
  return files;
}
const json = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const route = u.pathname;
    // Snapshot targets so an in-flight run keeps a consistent configuration.
    const c = structuredClone(config);
    if (route === '/api/config') {
      if (req.method === 'GET') return json(res, 200, c);
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      // Configuration belongs to this same-origin local dashboard.
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, { error: 'Origin not allowed' });
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 8192) return json(res, 413, { error: 'Configuration too large' }); }
      const update = JSON.parse(body);
      for (const key of ['mac1', 'mac2', 'mac3', 'mac4', 'gateway']) {
        if (!update[key] || isIP(update[key].ip) !== 4) return json(res, 400, { error: `${key}: enter a valid IPv4 address` });
      }
      for (const key of ['mac1', 'mac2', 'mac3', 'mac4', 'gateway']) config[key].ip = update[key].ip;
      return json(res, 200, { success: true, config });
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    if (route === '/api/evidence') return json(res, 200, { categories, files: evidenceFiles() });
    if (route === '/api/evidence/file') {
      const entry = evidenceFiles().find(f => f.path === u.searchParams.get('path'));
      if (!entry) return json(res, 404, { error: 'Evidence file not found' });
      const ext = path.extname(entry.path).toLowerCase();
      const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf' }[ext] || 'text/plain; charset=utf-8';
      res.writeHead(200, { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff', ...(ext.startsWith('.pcap') ? { 'Content-Disposition': 'attachment', 'Content-Type': 'application/octet-stream' } : {}) });
      fs.createReadStream(path.join(EVIDENCE, entry.path)).pipe(res); return;
    }
    if (route === '/api/ping') {
      const target = u.searchParams.get('target');
      if (!['mac1', 'mac3', 'mac4', 'gateway'].includes(target)) return json(res, 400, { error: 'Unknown target' });
      const r = await command('ping', ['-c', '2', '-W', process.platform === 'darwin' ? '1500' : '2', c[target].ip]);
      const loss = Number((r.stdout.match(/([\d.]+)% packet loss/) || [])[1] ?? 100);
      const avgRtt = Number((r.stdout.match(/min\/avg\/max\/\w+ = [\d.]+\/([\d.]+)/) || [])[1]) || null;
      return json(res, 200, { target, ip: c[target].ip, isAlive: r.success && loss < 100, loss, avgRtt, raw: raw(r), checkedAt: r.startedAt });
    }
    if (route === '/api/test-direct-backend') {
      const backend = u.searchParams.get('backend');
      if (!['A', 'B'].includes(backend)) return json(res, 400, { error: 'Unknown backend' });
      const dest = backend === 'A' ? c.mac3 : c.mac4;
      const r = await curl([`http://${dest.ip}:${dest.port}/api/status`]);
      return json(res, 200, { backend, isOk: r.success && status(r) === 200 && header(r, 'X-Backend') === backend, statusCode: status(r), duration: r.duration, xBackendHeader: header(r, 'X-Backend'), raw: raw(r) });
    }
    if (route === '/api/trace-request') {
      const answer = r => [...r.stdout.matchAll(/^\S+\s+\d+\s+IN\s+A\s+([\d.]+)/gm)].map(m => m[1]);
      const direct = await command('dig', ['@' + c.mac1.ip, c.domain, 'A', '+time=2', '+tries=1']);
      const directPass = direct.success && answer(direct).includes(c.mac2.ip);
      if (!directPass) return json(res, 200, { outcome: 'dns', directAnswer: answer(direct), expectedIp: c.mac2.ip, raw: raw(direct) });
      const system = await command('dig', [c.domain, 'A', '+time=2', '+tries=1']);
      const systemPass = system.success && answer(system).includes(c.mac2.ip);
      if (!systemPass) return json(res, 200, { outcome: 'resolver', directAnswer: answer(direct), systemAnswer: answer(system), expectedIp: c.mac2.ip, raw: raw(direct) + '\n\n' + raw(system) });
      const ca = path.join(ROOT, 'personB/tls/ca.crt');
      const response = await curl(['-v', '--cacert', ca, `https://${c.domain}:${c.mac2.httpsPort}/api/status`]);
      const backend = header(response, 'X-Backend');
      const success = response.success && status(response) === 200 && ['A', 'B'].includes(backend);
      return json(res, 200, { outcome: success ? 'success' : 'edge', directAnswer: answer(direct), systemAnswer: answer(system), expectedIp: c.mac2.ip,
        statusCode: status(response), backend: success ? backend : null, duration: response.duration,
        raw: raw(direct) + '\n\n' + raw(system) + '\n\n' + raw(response) });
    }
    if (route === '/api/test-lb') {
      const count = Math.min(Math.max(Number.parseInt(u.searchParams.get('count')) || 8, 2), 20);
      const requests = [];
      for (let i = 1; i <= count; i++) {
        const r = await curl(['-H', `Host: ${c.domain}`, edge(c, '/api/status')]);
        requests.push({ requestIndex: i, statusCode: status(r), xBackend: header(r, 'X-Backend') || 'Unknown', duration: r.duration, isOk: r.success && status(r) === 200, raw: raw(r) });
      }
      const counts = { A: 0, B: 0, other: 0 };
      requests.forEach(r => counts[r.isOk && ['A', 'B'].includes(r.xBackend) ? r.xBackend : 'other']++);
      const bothServed = counts.A > 0 && counts.B > 0 && counts.other === 0;
      const alternating = bothServed && requests.every((r, i) => !i || r.xBackend !== requests[i - 1].xBackend);
      return json(res, 200, { total: count, counts, bothServed, alternating, requests });
    }
    if (route === '/api/test-dns') {
      const results = [];
      for (const domain of [c.domain, c.apiDomain]) {
        for (const mode of ['direct', 'system']) {
          const r = await command('dig', [...(mode === 'direct' ? ['@' + c.mac1.ip] : []), domain, 'A', '+time=2', '+tries=1']);
          const ips = [...r.stdout.matchAll(/^\S+\s+\d+\s+IN\s+A\s+([\d.]+)/gm)].map(m => m[1]);
          results.push({ domain, mode, ips, pass: r.success && r.stdout.includes('status: NOERROR') && ips.includes(c.mac2.ip), raw: raw(r) });
        }
      }
      return json(res, 200, { expectedIp: c.mac2.ip, results });
    }
    if (route === '/api/test-tls') {
      const ca = path.join(ROOT, 'personB/tls/ca.crt');
      const r = await curl(['-v', '--cacert', ca, '--resolve', `${c.domain}:${c.mac2.httpsPort}:${c.mac2.ip}`, `https://${c.domain}:${c.mac2.httpsPort}/api/status`]);
      return json(res, 200, { isHttpsOk: r.success && status(r) === 200, statusCode: status(r), xBackend: header(r, 'X-Backend'), raw: raw(r), scope: 'Verifies hostname and certificate against the project CA. --resolve bypasses DNS; this does not prove client OS trust.' });
    }
    if (route === '/api/test-cache') {
      const r1 = await curl(['-H', `Host: ${c.domain}`, edge(c, '/api/cached')]);
      const etag = header(r1, 'ETag');
      const r2 = etag ? await curl(['-H', `Host: ${c.domain}`, '-H', `If-None-Match: ${etag}`, edge(c, '/api/cached')]) : null;
      return json(res, 200, { etag, cacheControl: header(r1, 'Cache-Control'), firstStatus: status(r1), secondStatus: r2 ? status(r2) : 0,
        isCacheWorking: r1.success && status(r1) === 200 && !!r2?.success && status(r2) === 304,
        raw: raw(r1) + '\n\n' + (r2 ? raw(r2) : 'Conditional request skipped: no ETag received.') });
    }
    if (route.startsWith('/api/')) return json(res, 404, { error: 'Unknown API endpoint' });
    const files = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' };
    if (!files[route]) return json(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }[path.extname(files[route])], 'Cache-Control': 'no-cache' });
    fs.createReadStream(path.join(PUBLIC, files[route])).pipe(res);
  } catch (error) { json(res, 500, { error: error.message }); }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Network lab: http://localhost:${PORT}`));
