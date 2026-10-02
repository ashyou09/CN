# Evidence Directory Guide (Phase 1)

This directory contains verified terminal outputs, network packet captures (`.pcap`), and structured evaluation logs for the **Private Network Service Platform (Phase 1)** across all 4 Macs.

---

## 👥 Person-Specific Evidence Portfolios

- **[Person A Evidence (Mac 1)](personA/README.md):** Private DNS, system resolver, TLS CA distribution, and Mac 1 client logs.
- **[Person D Evidence (Mac 4)](../evidence/evidence_D/README.md):** Complete Mac 4 evidence portfolio including interface discovery, ping matrix, backend B local checks, DNS queries, native TLS validation, round-robin load balancing, HTTP 304 caching, full-flow Wireshark `.pcap`, and all 5 deliberate failure cases.

---

## 🧭 Fast Navigation for Evaluator (Under 30 Seconds)

| Stage & Topic | Primary File | Persona / Machine | Verification Goal |
| :--- | :--- | :--- | :--- |
| **Stage 1: LAN Discovery** | [`../evidence/evidence_D/01-lan-mac4-interface-discovery.txt`](../evidence/evidence_D/01-lan-mac4-interface-discovery.txt) | Person D (Mac 4) | Interface `en0`, IP `10.7.17.147`, `/19` Subnet Mask, Gateway `10.7.0.1` |
| **Stage 1: Ping Reachability** | [`../evidence/evidence_D/02-lan-ping-mac4-to-all-nodes.txt`](../evidence/evidence_D/02-lan-ping-mac4-to-all-nodes.txt) | Person D (Mac 4) | 0.0% packet loss ping to Mac 1 (`10.7.17.94`), Mac 2 (`10.7.3.128`), Mac 3 (`10.7.6.84`) |
| **Stage 3: Backend B Service** | [`../evidence/evidence_D/03-backend-b-listener-and-endpoints.txt`](../evidence/evidence_D/03-backend-b-listener-and-endpoints.txt) | Person D (Mac 4) | Port 3002 listener, `GET /`, `GET /api/status`, `GET /api/cached`, and remote curl |
| **Stage 5: Private DNS Resolution**| [`../evidence/evidence_D/04-dns-client-mac4-queries.txt`](../evidence/evidence_D/04-dns-client-mac4-queries.txt) | Person D (Mac 4) | `dig @10.7.17.94` queries for `app.teamX.test` and `api.teamX.test` returning Edge `10.7.3.128` |
| **Stage 5: System DNS Resolver** | [`../evidence/evidence_D/05-dns-scutil-system-resolver.txt`](../evidence/evidence_D/05-dns-scutil-system-resolver.txt) | Person D (Mac 4) | `scutil --dns` resolver configuration |
| **Stage 6: Trusted TLS Handshake** | [`../evidence/evidence_D/06-tls-handshake-curl-verification.txt`](../evidence/evidence_D/06-tls-handshake-curl-verification.txt) | Person D (Mac 4) | `curl -v https://app.teamX.test:8443/api/status` succeeds without `-k` (TLS 1.3, valid CA) |
| **Stage 7: HTTPS Load Balancing** | [`../evidence/evidence_D/07-https-load-balancing-round-robin.txt`](../evidence/evidence_D/07-https-load-balancing-round-robin.txt) | Person D (Mac 4) | 6 consecutive requests through Edge alternating Round-Robin (`B`, `A`, `B`, `A`, `B`, `A`) |
| **Stage 7: HTTP Caching & 304** | [`../evidence/evidence_D/08-caching-etag-and-304-not-modified.txt`](../evidence/evidence_D/08-caching-etag-and-304-not-modified.txt) | Person D (Mac 4) | `Cache-Control: public, max-age=60`, `ETag`, and conditional `If-None-Match` -> `HTTP 304 Not Modified` |
| **Stage 8: Wireshark Packet Capture**| [`../evidence/evidence_D/phase1-flow.pcap`](../evidence/evidence_D/phase1-flow.pcap) | Person D (Mac 4) | Raw pcap of DNS (UDP 53), TCP 3-way handshake (SYN, SYN-ACK, ACK), TLS 1.2 handshake, HTTP data |
| **Stage 8: Packet Analysis Log** | [`../evidence/evidence_D/09-wireshark-packet-analysis.txt`](../evidence/evidence_D/09-wireshark-packet-analysis.txt) | Person D (Mac 4) | Frame-by-frame analysis, sequence numbers, acknowledgment numbers, and OSI layer breakdown |
| **Stage 9: Failure Case 1** | [`../evidence/evidence_D/failure-case-1-dns-resolver-failure.txt`](../evidence/evidence_D/failure-case-1-dns-resolver-failure.txt) | Person D (Mac 4) | Wrong DNS resolver (`127.0.0.1`): `dig` times out while Layer 3 `ping` succeeds |
| **Stage 9: Failure Case 2** | [`../evidence/evidence_D/failure-case-2-dns-misdirection.txt`](../evidence/evidence_D/failure-case-2-dns-misdirection.txt) | Person D (Mac 4) | DNS record points to Mac 3 instead of Edge Mac 2: TCP port 8443 connection refused |
| **Stage 9: Failure Case 3** | [`../evidence/evidence_D/failure-case-3-single-backend-stopped.txt`](../evidence/evidence_D/failure-case-3-single-backend-stopped.txt) | Person D (Mac 4) | Backend A stopped: Edge automatically routes 100% requests to Backend B |
| **Stage 9: Failure Case 4** | [`../evidence/evidence_D/failure-case-4-both-backends-down.txt`](../evidence/evidence_D/failure-case-4-both-backends-down.txt) | Person D (Mac 4) | Both backends down: Edge returns `HTTP 502 Bad Gateway` |
| **Stage 9: Failure Case 5** | [`../evidence/evidence_D/failure-case-5-wrong-port.txt`](../evidence/evidence_D/failure-case-5-wrong-port.txt) | Person D (Mac 4) | Wrong port 8444: Layer 3 ping succeeds, Layer 4 TCP connection refused |
