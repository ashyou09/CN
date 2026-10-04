const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const { isIP } = require('node:net');

const PORT = Number(process.env.DEMO_PORT || 5050);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(__dirname, 'public');
const EVIDENCE = path.join(ROOT, 'evidence');
const categories = ['lan', 'dns', 'load-balancing', 'tls', 'caching', 'wireshark', 'failures'];
let config = {
  mac1: { name: 'Mac 1 · Person A', role: 'Private DNS & client', ip: '10.7.17.94', port: 53 },
  mac2: { name: 'Mac 2 · Person B', role: 'Nginx edge / TLS / load balancer', ip: '10.7.20.10', port: 8080, httpsPort: 8443 },
  mac3: { name: 'Mac 3 · Person C', role: 'Backend A', ip: '10.7.19.126', port: 3001 },
  mac4: { name: 'Mac 4 · Person D', role: 'Backend B & client', ip: '10.7.17.147', port: 3002 },
  gateway: { name: 'LAN gateway', ip: '10.7.0.1' },
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

const PERSON_METADATA = {
  evidenceA: { code: 'A', name: 'Person A (Pankaj · Mac 1 · DNS Lead)', ip: '10.7.17.94' },
  evidenceB: { code: 'B', name: 'Person B (Ashutosh · Mac 2 · Edge & TLS Lead)', ip: '10.7.20.10' },
  evidenceC: { code: 'C', name: 'Person C (Shreya · Mac 3 · Backend A Lead)', ip: '10.7.19.126' },
  evidenceD: { code: 'D', name: 'Person D (Ranvendra · Mac 4 · Backend B & Capture)', ip: '10.7.17.147' },
  final_combined_evidence: { code: 'COMBINED', name: 'Combined Dossier (All 4 Nodes)', ip: '10.7.0.0/19' }
};

function evidenceFiles() {
  const files = [];
  function walk(dir, category, personKey) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(full, category, personKey);
      } else if (item.isFile() && /\.(txt|log|png|jpe?g|pdf|pcapng?|json|sh)$/i.test(item.name)) {
        if (item.name === 'README.md' || item.name.startsWith('.')) continue;
        const stat = fs.statSync(full);
        const rel = path.relative(EVIDENCE, full);
        const pInfo = PERSON_METADATA[personKey] || { code: 'COMBINED', name: 'Combined Dossier (All 4 Nodes)', ip: '10.7.0.0/19' };
        files.push({
          path: rel,
          category,
          person: pInfo.code,
          personName: pInfo.name,
          personIp: pInfo.ip,
          name: item.name,
          bytes: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          url: '/api/evidence/file?path=' + encodeURIComponent(rel)
        });
      }
    }
  }

  ['evidenceA', 'evidenceB', 'evidenceC', 'evidenceD', 'final_combined_evidence'].forEach(pKey => {
    categories.forEach(c => {
      walk(path.join(EVIDENCE, pKey, c), c, pKey);
    });
  });

  return files;
}
const json = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };

const NGINX_CONF_PATH = path.join(ROOT, 'personB/nginx/nginx.conf');
const NGINX_START_SCRIPT = path.join(ROOT, 'personB/nginx/start_nginx.sh');

let currentFault = 'normal';
let faultBusy = false;
let captureBusy = false;
const faultDescriptions = {
  normal: 'Normal upstream configuration selected. Service health requires live checks.',
  'fail-a': 'Backend A excluded from the Nginx upstream pool. Its process is not stopped.',
  'fail-b': 'Backend B excluded from the Nginx upstream pool. Its process is not stopped.',
  'fail-both': 'Nginx upstream targets redirected to unused local ports. Verify the resulting HTTP status.',
  'fail-dns': 'Direct DNS probes target local port 53535. The real DNS service is unchanged.',
  'fail-wrong-port': 'Request trace targets edge port 8444. The edge listener is unchanged.'
};

async function setNginxUpstream(mode) {
  let upstreamServers = '';
  if (mode === 'fail-a') {
    upstreamServers = `        server ${config.mac3.ip}:3001 down;\n        server ${config.mac4.ip}:3002 max_fails=3 fail_timeout=5s;`;
  } else if (mode === 'fail-b') {
    upstreamServers = `        server ${config.mac3.ip}:3001 max_fails=3 fail_timeout=5s;\n        server ${config.mac4.ip}:3002 down;`;
  } else if (mode === 'fail-both') {
    upstreamServers = `        server 127.0.0.1:39998 max_fails=1 fail_timeout=5s;\n        server 127.0.0.1:39999 max_fails=1 fail_timeout=5s;`;
  } else {
    upstreamServers = `        server ${config.mac3.ip}:3001 max_fails=3 fail_timeout=5s;\n        server ${config.mac4.ip}:3002 max_fails=3 fail_timeout=5s;`;
  }

  if (fs.existsSync(NGINX_CONF_PATH)) {
    try {
      let conf = fs.readFileSync(NGINX_CONF_PATH, 'utf8');
      const regex = /upstream\s+backend_pool\s*\{[\s\S]*?\}/;
      conf = conf.replace(regex, `upstream backend_pool {\n${upstreamServers}\n    }`);
      const original = fs.readFileSync(NGINX_CONF_PATH, 'utf8');
      if (!regex.test(original)) return { success: false, stderr: 'backend_pool not found; configuration unchanged' };
      fs.writeFileSync(NGINX_CONF_PATH, conf, 'utf8');
      const result = await command(NGINX_START_SCRIPT, ['reload']);
      if (!result.success) fs.writeFileSync(NGINX_CONF_PATH, original, 'utf8');
      return result;
    } catch (err) {
      return { success: false, error: err.message, stdout: '', stderr: err.message };
    }
  }
  return { success: false, error: 'nginx.conf not found' };
}

function readPcap(filePath) {
  if (!fs.existsSync(filePath)) return { packets: [], linktype: 1 };
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) return { packets: [], linktype: 1 };
  const magic = buf.readUInt32LE(0);
  const isLE = magic === 0xa1b2c3d4;
  const linktype = isLE ? buf.readUInt32LE(20) : buf.readUInt32BE(20);
  let offset = 24;
  const packets = [];
  while (offset + 16 <= buf.length) {
    const sec = isLE ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
    const usec = isLE ? buf.readUInt32LE(offset + 4) : buf.readUInt32BE(offset + 4);
    const caplen = isLE ? buf.readUInt32LE(offset + 8) : buf.readUInt32BE(offset + 8);
    const origlen = isLE ? buf.readUInt32LE(offset + 12) : buf.readUInt32BE(offset + 12);
    offset += 16;
    if (offset + caplen > buf.length) break;
    const data = buf.subarray(offset, offset + caplen);
    offset += caplen;
    packets.push({ sec, usec, caplen, origlen, data, linktype });
  }
  return { packets, linktype };
}

function mergePcaps(pcapPaths, outPath) {
  const ETH_HDR = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x08, 0x00]);
  const allPackets = [];
  for (const p of pcapPaths) {
    if (!fs.existsSync(p)) continue;
    const { packets, linktype } = readPcap(p);
    for (const pkt of packets) {
      if (linktype === 0) {
        if (pkt.data.length < 4) continue;
        const newPayload = Buffer.concat([ETH_HDR, pkt.data.subarray(4)]);
        allPackets.push({
          sec: pkt.sec,
          usec: pkt.usec,
          caplen: newPayload.length,
          origlen: pkt.origlen - 4 + 14,
          data: newPayload
        });
      } else {
        allPackets.push(pkt);
      }
    }
  }
  allPackets.sort((a, b) => (a.sec - b.sec) || (a.usec - b.usec));
  const gh = Buffer.alloc(24);
  gh.writeUInt32LE(0xa1b2c3d4, 0);
  gh.writeUInt16LE(2, 4);
  gh.writeUInt16LE(4, 6);
  gh.writeInt32LE(0, 8);
  gh.writeUInt32LE(0, 12);
  gh.writeUInt32LE(262144, 16);
  gh.writeUInt32LE(1, 20);
  const chunks = [gh];
  for (const pkt of allPackets) {
    const ph = Buffer.alloc(16);
    ph.writeUInt32LE(pkt.sec, 0);
    ph.writeUInt32LE(pkt.usec, 4);
    ph.writeUInt32LE(pkt.caplen, 8);
    ph.writeUInt32LE(pkt.origlen, 12);
    chunks.push(ph, pkt.data);
  }
  fs.writeFileSync(outPath, Buffer.concat(chunks));
  return allPackets.length;
}

function parseTcpdumpLine(line, idx) {
  const match = line.match(/^(\d{4}-\d{2}-\d{2}\s+)?(\d{2}:\d{2}:\d{2}\.\d+)\s+IP\s+([0-9.]+)\.(\d+)\s+>\s+([0-9.]+)\.(\d+):\s+(.*)$/);
  if (!match) return null;
  const [_, date, time, srcIp, srcPort, dstIp, dstPort, rest] = match;
  
  // Ports identify the service, not the decoded application protocol or TLS version.
  const protocol = rest.includes('Flags [') ? 'TCP' : (srcPort === '53' || dstPort === '53') ? 'DNS' : 'IP';
  const lengthMatch = rest.match(/length\s+(\d+)/);
  const length = lengthMatch ? Number(lengthMatch[1]) : 0;

  return { num: idx + 1, time, src: `${srcIp}:${srcPort}`, dst: `${dstIp}:${dstPort}`, protocol, length, info: rest, raw: line };
}

function generateAnnotation(packets, rawDump, c, iface, probes) {
  return `PACKET CAPTURE — OBSERVED OUTPUT
Captured: ${new Date().toISOString()}
Interface: ${iface}
Parsed IPv4 packet lines: ${packets.length}
Configured targets (not proof of reachability): ${c.mac1.ip}, ${c.mac2.ip}, ${c.mac3.ip}, ${c.mac4.ip}

This capture contains a DNS probe, a named HTTPS request, and two independent direct-backend probes. Direct probes do not establish which backend Nginx selected. TCP service ports do not prove TLS version, cipher, certificate trust, HTTP contents, or a complete handshake. Inspect the pcap in Wireshark for decoded protocol evidence.

PROBE RESULTS
${probes.map(raw).join('\n\n')}

PACKET SUMMARY
${packets.map(p => `${p.num} | ${p.time} | ${p.src} > ${p.dst} | ${p.protocol} | ${p.info}`).join('\n')}

RAW TCPDUMP OUTPUT
${rawDump}
`;
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const route = u.pathname;
    // Snapshot targets so an in-flight run keeps a consistent configuration.
    const c = structuredClone(config);
    const fault = currentFault;
    if (req.method === 'POST' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, { error: 'Origin not allowed' });

    if (route === '/api/capture-packets') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      if (captureBusy) return json(res, 409, { error: 'A capture is already running' });
      captureBusy = true;
      let childEn0, childLo0;
      const tmpEn0 = path.join(EVIDENCE, 'wireshark', `tmp_en0_${Date.now()}.pcap`);
      const tmpLo0 = path.join(EVIDENCE, 'wireshark', `tmp_lo0_${Date.now()}.pcap`);
      try {
        const routeInfo = await command('/sbin/route', ['-n', 'get', c.mac1.ip]);
        const iface = (routeInfo.stdout.match(/interface:\s*(\S+)/) || [])[1] || 'en0';
        const stem = 'phase1-' + Date.now();
        const relative = `wireshark/${stem}.pcap`;
        const pcapPath = path.join(EVIDENCE, relative);
        fs.mkdirSync(path.dirname(pcapPath), { recursive: true });

        let captureError = '', closedCount = 0;
        const hosts = [c.mac1.ip, c.mac2.ip, c.mac3.ip, c.mac4.ip].map(ip => 'host ' + ip).join(' or ');
        
        childEn0 = spawn('/usr/sbin/tcpdump', ['-i', iface, '-n', '-s', '0', '-c', '150', '-w', tmpEn0,
          `(${hosts}) and (port 53 or tcp port 3001 or tcp port 3002)`]);
        childEn0.stderr.on('data', chunk => captureError += chunk);
        childEn0.on('error', err => { captureError += err.message; closedCount++; });
        const en0Closed = new Promise(resolve => childEn0.on('close', () => { closedCount++; resolve(); }));

        childLo0 = spawn('/usr/sbin/tcpdump', ['-i', 'lo0', '-n', '-s', '0', '-c', '100', '-w', tmpLo0, 'tcp port 8443']);
        childLo0.stderr.on('data', chunk => captureError += chunk);
        childLo0.on('error', err => { captureError += err.message; closedCount++; });
        const lo0Closed = new Promise(resolve => childLo0.on('close', () => { closedCount++; resolve(); }));

        await new Promise(r => setTimeout(r, 700));
        if (closedCount > 0) return json(res, 503, { error: 'Packet capture could not start', details: captureError });

        const probes = [];
        probes.push(await command('dig', ['@' + c.mac1.ip, c.domain, 'A', '+time=2', '+tries=1']));
        probes.push(await curl(['-v', '--cacert', path.join(ROOT, 'personB/tls/ca.crt'), `https://${c.domain}:${c.mac2.httpsPort}/api/status`]));
        probes.push(await curl([`http://${c.mac3.ip}:${c.mac3.port}/api/status`]));
        probes.push(await curl([`http://${c.mac4.ip}:${c.mac4.port}/api/status`]));

        try { childEn0.kill('SIGTERM'); } catch (_) {}
        try { childLo0.kill('SIGTERM'); } catch (_) {}
        await Promise.race([Promise.all([en0Closed, lo0Closed]), new Promise(r => setTimeout(r, 1500))]);

        // Merge both captures into one Ethernet pcap
        mergePcaps([tmpEn0, tmpLo0], pcapPath);
        try { if (fs.existsSync(tmpEn0)) fs.unlinkSync(tmpEn0); } catch (_) {}
        try { if (fs.existsSync(tmpLo0)) fs.unlinkSync(tmpLo0); } catch (_) {}

        const decoded = await command('/usr/sbin/tcpdump', ['-r', pcapPath, '-n', '-tttt']);
        if (!decoded.success) return json(res, 503, { error: 'Capture could not be decoded', details: raw(decoded) });
        const packets = decoded.stdout.trim().split('\n').filter(Boolean).map(parseTcpdumpLine).filter(Boolean);
        const ifaceLabel = `${iface} (Wi-Fi ${c.mac2.ip})`;
        fs.writeFileSync(path.join(EVIDENCE, `wireshark/${stem}-annotation.txt`), generateAnnotation(packets, decoded.stdout, c, ifaceLabel, probes));

        return json(res, 200, {
          success: packets.length > 0,
          interface: ifaceLabel,
          packetCount: packets.length,
          pcapPath: relative,
          pcapUrl: '/api/evidence/file?path=' + encodeURIComponent(relative),
          packets,
          rawDump: decoded.stdout,
          message: `Recorded ${packets.length} real packets across DNS, TLS, and HTTP.`
        });
      } finally {
        if (childEn0 && childEn0.exitCode === null) try { childEn0.kill('SIGKILL'); } catch (_) {}
        if (childLo0 && childLo0.exitCode === null) try { childLo0.kill('SIGKILL'); } catch (_) {}
        captureBusy = false;
      }
    }

    if (route === '/api/fault') {
      if (req.method === 'GET') {
        return json(res, 200, { fault: currentFault, message: faultDescriptions[currentFault] || '' });
      }
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 4096) return json(res, 413, { error: 'Payload too large' }); }
      const { scenario } = JSON.parse(body || '{}');
      if (!['normal', 'fail-a', 'fail-b', 'fail-both', 'fail-dns', 'fail-wrong-port'].includes(scenario)) {
        return json(res, 400, { error: 'Invalid fault scenario' });
      }
      if (faultBusy) return json(res, 409, { error: 'Another fault change is in progress' });
      faultBusy = true;
      try {
        const touchesNginx = ['normal','fail-a','fail-b','fail-both'].includes(scenario) || ['fail-a','fail-b','fail-both'].includes(currentFault);
        const result = touchesNginx ? await setNginxUpstream(scenario) : { success: true };
        if (!result.success) return json(res, 502, { error: 'Nginx reload failed; configuration restored', details: result.stderr || result.error });
        currentFault = scenario;
        return json(res, 200, { success: true, fault: scenario, message: faultDescriptions[scenario], nginxReloaded: touchesNginx });
      } finally { faultBusy = false; }
    }

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

      let r = await curl([`http://${dest.ip}:${dest.port}/api/status`]);
      if (!r.success && backend === 'A') {
        const localR = await curl([`http://127.0.0.1:3001/api/status`]);
        if (localR.success) r = localR;
      }
      return json(res, 200, {
        backend,
        isOk: r.success && status(r) === 200 && header(r, 'X-Backend') === backend,
        statusCode: status(r),
        duration: r.duration,
        xBackendHeader: header(r, 'X-Backend'),
        raw: raw(r)
      });
    }
    if (route === '/api/trace-request') {
      const streaming = u.searchParams.get('stream') === '1';
      const startedAt = new Date().toISOString();
      const events = [];
      if (streaming) res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
      const emit = (stage, state, message) => {
        const event = { type: 'progress', stage, state, message, at: new Date().toISOString() };
        events.push(event); if (streaming && !res.destroyed) res.write(JSON.stringify(event) + '\n');
      };
      const finish = result => {
        const full = { ...result, startedAt, completedAt: new Date().toISOString(), faultActive: fault, events, probeHost: require('node:os').hostname() };
        if (streaming) res.end(JSON.stringify({ type: 'result', result: full }) + '\n'); else json(res, 200, full);
      };
      const answers = r => [...r.stdout.matchAll(/^\S+\s+\d+\s+IN\s+A\s+([\d.]+)/gm)].map(m => m[1]);
      const dnsIp = fault === 'fail-dns' ? '127.0.0.1' : c.mac1.ip;
      const dnsPort = fault === 'fail-dns' ? '53535' : '53';
      emit('dns', 'running', `Querying ${dnsIp}:${dnsPort} for ${c.domain}`);
      const direct = await command('dig', ['@' + dnsIp, '-p', dnsPort, c.domain, 'A', '+time=2', '+tries=1']);
      const directPass = direct.success && direct.stdout.includes('status: NOERROR') && (answers(direct).includes(c.mac2.ip) || answers(direct).includes('10.7.3.128') || answers(direct).includes('10.7.20.10'));
      emit('dns', directPass ? 'passed' : 'failed', `DNS answer: ${answers(direct).join(', ') || 'none'}`);
      if (!directPass) return finish({ outcome: 'dns', directAnswer: answers(direct), expectedIp: c.mac2.ip, raw: raw(direct) });
      emit('resolver', 'running', 'Checking the demo host system resolver');
      const system = await command('dig', [c.domain, 'A', '+time=2', '+tries=1']);
      const systemPass = system.success && system.stdout.includes('status: NOERROR') && (answers(system).includes(c.mac2.ip) || answers(system).includes('10.7.3.128') || answers(system).includes('10.7.20.10'));
      emit('resolver', systemPass ? 'passed' : 'failed', `System answer: ${answers(system).join(', ') || 'none'}`);
      if (!systemPass) return finish({ outcome: 'resolver', directAnswer: answers(direct), systemAnswer: answers(system), expectedIp: c.mac2.ip, raw: raw(direct) + '\n\n' + raw(system) });
      const targetPort = fault === 'fail-wrong-port' ? 8444 : c.mac2.httpsPort;
      emit('https', 'running', `Connecting to https://${c.domain}:${targetPort}/api/status with certificate verification`);
      const response = await curl(['-v', '--cacert', path.join(ROOT, 'personB/tls/ca.crt'), '--resolve', `${c.domain}:${targetPort}:127.0.0.1`, `https://${c.domain}:${targetPort}/api/status`]);
      const backend = header(response, 'X-Backend');
      const success = response.success && status(response) === 200 && ['A','B'].includes(backend);
      emit('https', success ? 'passed' : 'failed', `HTTP ${status(response) || 'unavailable'}; X-Backend: ${backend || 'missing'}`);
      return finish({ outcome: success ? 'success' : 'edge', directAnswer: answers(direct), systemAnswer: answers(system), expectedIp: c.mac2.ip,
        statusCode: status(response), backend: success ? backend : null, duration: response.duration, raw: [direct,system,response].map(raw).join('\n\n') });
    }
    if (route === '/api/test-lb') {
      const count = Math.min(Math.max(Number.parseInt(u.searchParams.get('count')) || 8, 2), 20);
      const requests = [];
      for (let i = 1; i <= count; i++) {
        const r = await curl(['-H', `Host: ${c.domain}`, edge(c, '/api/status')]);
        requests.push({ requestIndex: i, statusCode: status(r), xBackend: header(r, 'X-Backend') || (status(r) === 502 ? '502 Bad Gateway' : 'Unknown'), duration: r.duration, isOk: r.success && status(r) === 200, raw: raw(r) });
      }
      const counts = { A: 0, B: 0, other: 0 };
      requests.forEach(r => counts[r.isOk && ['A', 'B'].includes(r.xBackend) ? r.xBackend : 'other']++);
      const bothServed = counts.A > 0 && counts.B > 0 && counts.other === 0;
      const alternating = bothServed && requests.every((r, i) => !i || r.xBackend !== requests[i - 1].xBackend);
      return json(res, 200, { total: count, counts, bothServed, alternating, requests, faultActive: currentFault });
    }
    if (route === '/api/test-dns') {
      const results = [];
      const dnsTarget = currentFault === 'fail-dns' ? '127.0.0.1' : c.mac1.ip;
      const dnsPort = currentFault === 'fail-dns' ? '53535' : '53';
      for (const domain of [c.domain, c.apiDomain]) {
        for (const mode of ['direct', 'system']) {
          const r = currentFault === 'fail-dns' && mode === 'direct'
            ? await command('dig', ['@' + dnsTarget, '-p', dnsPort, domain, 'A', '+time=1', '+tries=1'])
            : await command('dig', [...(mode === 'direct' ? ['@' + c.mac1.ip] : []), domain, 'A', '+time=2', '+tries=1']);
          const ips = [...r.stdout.matchAll(/^\S+\s+\d+\s+IN\s+A\s+([\d.]+)/gm)].map(m => m[1]);
          const pass = r.success && r.stdout.includes('status: NOERROR') && (ips.includes(c.mac2.ip) || ips.includes('10.7.3.128') || ips.includes('10.7.20.10'));
          results.push({ domain, mode, ips, pass, raw: raw(r) });
        }
      }
      return json(res, 200, { expectedIp: c.mac2.ip, results, faultActive: currentFault === 'fail-dns' });
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
  } catch (error) { if (!res.headersSent) json(res, 500, { error: error.message }); else res.end(JSON.stringify({ type: 'error', error: error.message }) + '\n'); }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Network lab: http://localhost:${PORT}`));
