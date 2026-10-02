// Deterministic probe fixtures. These verify application logic, not LAN health.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

function harness(replies = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-audit-'));
  fs.mkdirSync(path.join(root, 'personB/nginx'), { recursive: true });
  fs.writeFileSync(path.join(root, 'personB/nginx/nginx.conf'), 'upstream backend_pool { server 127.0.0.1:3001; }');
  const calls = []; let handler;
  const childProcess = {
    execFile(bin,args,opts,callback) {
      calls.push({bin,args});
      const reply = replies.shift() || { stdout: '' };
      queueMicrotask(() => callback(reply.error ? new Error(reply.error) : null, reply.stdout || '', reply.stderr || ''));
    },
    spawn() {
      const child = new EventEmitter(); child.stderr = new EventEmitter(); child.exitCode = null; child.kill = () => {};
      queueMicrotask(() => {child.stderr.emit('data','Permission denied opening capture device');child.exitCode=1;child.emit('close',1);});
      return child;
    }
  };
  const context = vm.createContext({require: name => name === 'node:http' ? {createServer: h => {handler=h;return {listen(){}};}} : name === 'node:child_process' ? childProcess : require(name),
    __dirname: path.join(root,'demo'), process, console, URL, structuredClone, Buffer, setTimeout, clearTimeout });
  vm.runInContext(source, context);
  async function request(url, method='GET', body, headers={}) {
    const req = {url,method,headers:{host:'localhost:5051',...headers},async *[Symbol.asyncIterator](){ if(body) yield JSON.stringify(body); }};
    const result={code:0,chunks:[]};
    const res={headersSent:false,destroyed:false,writeHead(code,headers){this.headersSent=true;result.code=code;result.headers=headers;},write(chunk){result.chunks.push(chunk);},end(chunk=''){result.chunks.push(chunk);}};
    await handler(req,res);
    result.text=result.chunks.join('');
    if(result.headers?.['Content-Type']==='application/json')result.data=JSON.parse(result.text);
    return result;
  }
  return {request,calls,context,root,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
const dns = {stdout:';; status: NOERROR\napp.teamX.test. 0 IN A 10.7.3.128\n'};
const ok = backend => ({stdout:`HTTP/1.1 200 OK\r\nX-Backend: ${backend}\r\n\r\n{"backend":"${backend}"}`});

test('trace streams real stage results and preserves selected backend',async()=>{
  const h=harness([dns,dns,ok('B')]); try {
    const r=await h.request('/api/trace-request?stream=1');
    const events=r.text.trim().split('\n').map(JSON.parse);
    assert.deepEqual(events.filter(x=>x.type==='progress').map(x=>x.state),['running','passed','running','passed','running','passed']);
    assert.equal(events.at(-1).result.backend,'B'); assert.equal(events.at(-1).result.outcome,'success');
    assert.ok(events.at(-1).result.probeHost); assert.ok(events.at(-1).result.completedAt);
    assert.ok(h.calls.at(-1).args.includes('--cacert')); assert.ok(!h.calls.at(-1).args.includes('-k'));
  } finally {h.cleanup();}
});
test('DNS mismatch stops before HTTPS; TLS failure never reports success',async()=>{
  const h=harness([{stdout:';; status: NOERROR\napp.teamX.test. 0 IN A 192.0.2.9\n'}]);try{const r=await h.request('/api/trace-request');assert.equal(r.data.outcome,'dns');assert.equal(h.calls.length,1);}finally{h.cleanup();}
  const t=harness([dns,dns,{error:'certificate expired',stderr:'curl: (60) certificate expired'}]);try{assert.equal((await t.request('/api/trace-request')).data.outcome,'edge');}finally{t.cleanup();}
});
test('direct backend still probes curl when an upstream is excluded',async()=>{
  const h=harness([{stdout:'reload complete'},ok('A')]);try{
    assert.equal((await h.request('/api/fault','POST',{scenario:'fail-a'})).data.success,true);
    assert.equal((await h.request('/api/test-direct-backend?backend=A')).data.isOk,true);
    assert.equal(h.calls.at(-1).bin,'curl');
  }finally{h.cleanup();}
});
test('reload failure rolls back file and does not claim applied fault',async()=>{
  const h=harness([{error:'reload failed',stderr:'bad configuration'}]);try{
    const file=path.join(h.root,'personB/nginx/nginx.conf'),before=fs.readFileSync(file,'utf8');
    assert.equal((await h.request('/api/fault','POST',{scenario:'fail-a'})).code,502);
    assert.equal(fs.readFileSync(file,'utf8'),before);assert.equal((await h.request('/api/fault')).data.fault,'normal');
  }finally{h.cleanup();}
});
test('config rejects invalid IP and cross-origin writes',async()=>{
  const h=harness();try{
    const c=(await h.request('/api/config')).data;c.mac1.ip='127.0.0.1; echo injected';
    assert.equal((await h.request('/api/config','POST',c)).code,400);
    assert.equal((await h.request('/api/fault','POST',{scenario:'normal'},{origin:'http://elsewhere.test'})).code,403);
    assert.equal(h.calls.length,0);
  }finally{h.cleanup();}
});
test('load balancing counts failed responses as other; cache requires 304',async()=>{
  const h=harness([ok('A'),{stdout:'HTTP/1.1 502 Bad Gateway\r\n\r\n'}]);try{const r=(await h.request('/api/test-lb?count=2')).data;assert.equal(r.bothServed,false);assert.equal(r.counts.other,1);}finally{h.cleanup();}
  const t=harness([{stdout:'HTTP/1.1 200 OK\r\nETag: "v1"\r\nCache-Control: public, max-age=60\r\n\r\nbody'},{stdout:'HTTP/1.1 304 Not Modified\r\n\r\n'}]);try{assert.equal((await t.request('/api/test-cache')).data.isCacheWorking,true);}finally{t.cleanup();}
});
test('packet parser preserves facts and does not invent TLS or HTTP payload',()=>{
  const h=harness();try{
    const p=vm.runInContext(`parseTcpdumpLine('2026-10-02 17:00:00.123456 IP 10.7.3.128.8443 > 10.7.17.94.51000: Flags [P.], seq 1:518, ack 1, win 100, length 517',0)`,h.context);
    assert.equal(p.protocol,'TCP');assert.ok(p.info.includes('Flags [P.]'));assert.ok(!p.info.includes('ClientHello'));
  }finally{h.cleanup();}
});
test('capture permission failure is reported and writes no claimed proof',async()=>{
  const h=harness([{stdout:'interface: en0\n'}]);try{const r=await h.request('/api/capture-packets','POST',{});assert.equal(r.code,503);assert.match(r.data.details,/Permission denied/);}finally{h.cleanup();}
});
