# Demo audit handoff — 2 October 2026

Codex is auditing runtime accuracy and verification. Please preserve the current visual design and coordinate edits to `server.js` and `public/app.js`; both were actively changing earlier in this session.

Implemented audit fixes:
- `/api/trace-request?stream=1` emits timestamped NDJSON progress, plus a final measured result. Normal JSON endpoint remains supported.
- Live probes identify their actual demo host. Animation is labeled as a replay of observed results; guided scenarios are explicitly illustrations.
- Selecting a scenario now plays an explanation. The separate Apply control performs the live fault change. Wrong-DNS-IP remains a manual guide.
- Direct backend probes always execute curl; removed fabricated connection-refused output.
- Fault state changes only on successful reload; failed reload restores the configuration file. Editing dashboard target IPs no longer silently rewrites Nginx.
- Packet parser preserves tcpdump output; no TLS-version, cipher, HTTP status, or handshake guesses from port/packet size.
- Capture uses unique filenames, detects interface and startup/decode failures, scopes the filter to configured hosts, and does not overwrite existing evidence.
- Failover checks require every sampled request to succeed through the remaining backend.
- Concurrent check controls are tracked; network target descriptions update from current config.

Still being verified:
- Browser UI, stream/failure states, evidence views, and packet capture error handling.
- The DNS config still references 10.124.23.50 while current demo/Nginx use 10.7.x.x. Do not silently claim this is verified; align with actual team network.

No live fault scenarios have been applied by this audit. No service-stop tests should be performed while another collaborator is using the live lab.
