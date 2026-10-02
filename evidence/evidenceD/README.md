# 🎓 Person D (Mac 4) — Official Evidence Portfolio
### B.Tech Computer Networks Project (Phase 1)
**Candidate / Machine:** Person D / Mac 4 (`10.7.17.147`)  
**Assigned Responsibilities:** Backend Instance B Provider (`0.0.0.0:3002`), Network Client Lead, and Wireshark Packet Capture Lead  

---

## 📌 Examiner Fast-Grading Index (< 30 Seconds)

Every required task, log, and packet trace assigned to **Person D / Mac 4** in [`projectflow.md`](../../projectflow.md) has been captured live, verified, and saved in this directory.

| Lab Rubric & Stage | Evidence File in this Directory | What It Accurately Proves |
| :--- | :--- | :--- |
| **Stage 1: Interface Discovery** | [`01-lan-mac4-interface-discovery.txt`](01-lan-mac4-interface-discovery.txt) | Interface `en0`, IP `10.7.17.147`, Mask `255.255.224.0` (`/19`), Gateway `10.7.0.1` |
| **Stage 1: LAN Ping Matrix** | [`02-lan-ping-mac4-to-all-nodes.txt`](02-lan-ping-mac4-to-all-nodes.txt) | 3-ping sequence from Mac 4 to Mac 1, Mac 2, Mac 3 with **0.0% packet loss** |
| **Stage 3: Backend B Service** | [`03-backend-b-listener-and-endpoints.txt`](03-backend-b-listener-and-endpoints.txt) | Port 3002 listener, all 3 endpoints (`/`, `/api/status`, `/api/cached`), and remote curl from Edge |
| **Stage 5: Private DNS Client** | [`04-dns-client-mac4-queries.txt`](04-dns-client-mac4-queries.txt) | Explicit queries to DNS Resolver (`10.7.17.94:53`) resolving `app` & `api.teamX.test` to Edge (`10.7.3.128`) |
| **Stage 5: System DNS Resolver** | [`05-dns-scutil-system-resolver.txt`](05-dns-scutil-system-resolver.txt) | macOS resolver configuration via `scutil --dns` |
| **Stage 6: Trusted TLS Handshake**| [`06-tls-handshake-curl-verification.txt`](06-tls-handshake-curl-verification.txt) | Native macOS Keychain trust for Private CA; `curl -v` validates HTTPS **without `-k`** (TLS 1.3) |
| **Stage 7: Round-Robin Balancing**| [`07-https-load-balancing-round-robin.txt`](07-https-load-balancing-round-robin.txt) | 6 sequential HTTPS requests through Edge alternating Round-Robin (`B`, `A`, `B`, `A`, `B`, `A`) |
| **Stage 7: HTTP Caching & 304** | [`08-caching-etag-and-304-not-modified.txt`](08-caching-etag-and-304-not-modified.txt) | `Cache-Control: public, max-age=60`, `ETag`, and conditional `If-None-Match` returning **`HTTP 304 Not Modified`** |
| **Stage 8: Raw Packet Capture** | [`phase1-flow.pcap`](phase1-flow.pcap) <br> *(alias: [`tls12-handshake.pcap`](tls12-handshake.pcap))* | Complete Wireshark `.pcap` capture of DNS (UDP 53), TCP 3-way handshake (SYN, SYN-ACK, ACK), TLS 1.2, HTTP |
| **Stage 8: Wireshark Analysis** | [`09-wireshark-packet-analysis.txt`](09-wireshark-packet-analysis.txt) | Frame-by-frame analysis, sequence numbers, acknowledgment numbers, and 5-layer OSI mapping |
| **Stage 9: Failure Case 1** | [`failure-case-1-dns-resolver-failure.txt`](failure-case-1-dns-resolver-failure.txt) | Wrong DNS resolver (`127.0.0.1`): `dig` times out while Layer 3 `ping` succeeds |
| **Stage 9: Failure Case 2** | [`failure-case-2-dns-misdirection.txt`](failure-case-2-dns-misdirection.txt) | DNS record points to Mac 3 instead of Edge Mac 2: TCP port 8443 connection refused |
| **Stage 9: Failure Case 3** | [`failure-case-3-single-backend-stopped.txt`](failure-case-3-single-backend-stopped.txt) <br> *(alias: [`backend-A-stopped.txt`](backend-A-stopped.txt))* | Backend A stopped: Edge automatically fails over 100% traffic to Backend B |
| **Stage 9: Failure Case 4** | [`failure-case-4-both-backends-down.txt`](failure-case-4-both-backends-down.txt) | Both Backends stopped: Edge returns **`HTTP 502 Bad Gateway`** |
| **Stage 9: Failure Case 5** | [`failure-case-5-wrong-port.txt`](failure-case-5-wrong-port.txt) | Wrong destination port (8444): ICMP ping succeeds, TCP handshake refused |

---

## 🔬 Evidence Breakdown by Network Protocol Layer

### 1. Link Layer (Layer 2) & Network Layer (Layer 3)
- **Documented in:** [`01-lan-mac4-interface-discovery.txt`](01-lan-mac4-interface-discovery.txt) and [`02-lan-ping-mac4-to-all-nodes.txt`](02-lan-ping-mac4-to-all-nodes.txt)
- Shows hardware MAC address (`ether 52:19:ac:c7:60:a3`), IPv4 address (`10.7.17.147`), subnet broadcast (`10.7.31.255`), and LAN gateway (`10.7.0.1`).
- Pairwise ping demonstrates reachability with 0% loss:
  - Mac 4 -> Mac 1 (`10.7.17.94`): RTT avg 12.3 ms
  - Mac 4 -> Mac 2 (`10.7.3.128`): RTT avg 6.7 ms
  - Mac 4 -> Mac 3 (`10.7.6.84`): RTT avg 15.1 ms

### 2. Transport Layer (Layer 4 - TCP & UDP)
- **Documented in:** [`03-backend-b-listener-and-endpoints.txt`](03-backend-b-listener-and-endpoints.txt), [`09-wireshark-packet-analysis.txt`](09-wireshark-packet-analysis.txt), and [`phase1-flow.pcap`](phase1-flow.pcap)
- Mac 4 binds Node.js on `0.0.0.0:3002` (TCP listening state).
- Wireshark captures TCP 3-way handshake between Mac 4 (`10.7.17.147:54321`) and Edge (`10.7.3.128:8443`):
  - **SYN**: Client sends `Seq=0`.
  - **SYN-ACK**: Server sends `Seq=0, Ack=1`.
  - **ACK**: Client acknowledges with `Seq=1, Ack=1`.

### 3. Application Layer (Layer 7 - DNS, HTTP/1.1, TLS)
- **DNS (UDP Port 53):** [`04-dns-client-mac4-queries.txt`](04-dns-client-mac4-queries.txt) proves private DNS lookup via Mac 1 (`10.7.17.94#53`) resolving `app.teamX.test` to `10.7.3.128`.
- **TLS Security:** [`06-tls-handshake-curl-verification.txt`](06-tls-handshake-curl-verification.txt) proves certificate validation against the private CA installed in macOS Keychain without the `-k` (insecure) flag.
- **Reverse Proxy & Load Balancing:** [`07-https-load-balancing-round-robin.txt`](07-https-load-balancing-round-robin.txt) demonstrates alternating `X-Backend: B` and `X-Backend: A` responses.
- **HTTP Caching (RFC 9111):** [`08-caching-etag-and-304-not-modified.txt`](08-caching-etag-and-304-not-modified.txt) demonstrates `Cache-Control: public, max-age=60` and conditional validation via `If-None-Match: "39-jxvt8kclwpAy7qZ0gJ/MRIVczo0"` returning `HTTP/1.1 304 Not Modified` with 0 byte body transfer.

### 4. Deliberate Failure Demonstrations
- All 5 failure cases specified in [`projectflow.md`](../../projectflow.md) Stage 9 are fully demonstrated with diagnostic reasoning from the client's perspective.
