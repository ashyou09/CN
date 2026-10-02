# Evidence Checklist & Comprehensive Directory Guide (Phase 1)

This directory contains verified terminal outputs, network packet captures (`.pcap`), and structured evaluation logs for the **Private Network Service Platform (Phase 1)** across all 4 Macs.

---

## 👥 Person-Specific Evidence Portfolios

- **[Person A Evidence (Mac 1)](../evidenceA/README.md):** DNS Lead — `dnsmasq` service, system resolver configuration, and client checks.
- **[Person B Evidence (Mac 2)](../evidenceB/README.md):** Edge Proxy & TLS Lead — Nginx proxy, certificate authority, TLS termination, live packet captures, and failure demonstrations.
- **[Person C Evidence (Mac 3)](../evidenceC/README.md):** Backend A Lead — Node.js service on port 3001, local checks, and ping matrix.
- **[Person D Evidence (Mac 4)](evidence_D/README.md):** Backend B & Packet Capture Lead — Node.js service on port 3002, end-to-end client verification, Wireshark traces, and failure tests.

---

## 🧭 Fast Navigation for Evaluator (Under 30 Seconds)

| Stage & Topic | Primary Files | Machine / Persona | Verification Goal |
| :--- | :--- | :--- | :--- |
| **Stage 1: LAN Discovery** | [`lan/mac4-interface-discovery.txt`](lan/mac4-interface-discovery.txt) | Person D (Mac 4) | Interface `en0`, IP `10.7.17.147`, `/19` Subnet Mask, Gateway `10.7.0.1` |
| **Stage 1: Ping Reachability** | [`lan/ping_matrix_from_b.txt`](lan/ping_matrix_from_b.txt) <br> [`lan/ping-from-mac4-to-all.txt`](lan/ping-from-mac4-to-all.txt) <br> [`lan/ping-from-C.txt`](lan/ping-from-C.txt) | Mac 2 (`10.7.3.128`) <br> Mac 4 (`10.7.17.147`) <br> Mac 3 (`10.7.6.84`) | 0.0% packet loss ping across all nodes in the 4x4 matrix |
| **Stage 2: Backend A Service** | [`load-balancing/backend_a_remote.txt`](load-balancing/backend_a_remote.txt) <br> [`load-balancing/backend-a-remote-test.txt`](load-balancing/backend-a-remote-test.txt) | Mac 3 (`10.7.6.84`) | Port 3001 listener, `GET /api/status`, header `X-Backend: A` |
| **Stage 3: Backend B Service** | [`load-balancing/backend_b_remote.txt`](load-balancing/backend_b_remote.txt) <br> [`load-balancing/backend-b-local-test.txt`](load-balancing/backend-b-local-test.txt) | Mac 4 (`10.7.17.147`) | Port 3002 listener, `GET /`, `GET /api/status`, `GET /api/cached` |
| **Stage 4: Edge Round-Robin** | [`load-balancing/round_robin_evidence.txt`](load-balancing/round_robin_evidence.txt) <br> [`load-balancing/https-load-balancing-evidence.txt`](load-balancing/https-load-balancing-evidence.txt) | Mac 2 (`10.7.3.128`) <br> Mac 4 (`10.7.17.147`) | Repeated requests through Nginx alternating between Backend A and B |
| **Stage 5: Private DNS** | [`dns/dig_direct.txt`](dns/dig_direct.txt) <br> [`dns/dns-client-D.txt`](dns/dns-client-D.txt) | Mac 2 & Mac 4 ➔ Mac 1 | `dig @10.7.17.94` queries for `app.teamX.test` returning Edge `10.7.3.128` |
| **Stage 5: System DNS Resolver** | [`dns/scutil_dns.txt`](dns/scutil_dns.txt) <br> [`dns/scutil-dns-mac4.txt`](dns/scutil-dns-mac4.txt) | Mac 2 & Mac 4 | `scutil --dns` resolver configuration |
| **Stage 6: Server Certificate** | [`tls/server_cert_inspection.txt`](tls/server_cert_inspection.txt) | Mac 2 (`10.7.3.128`) | OpenSSL inspection of `server.crt` & `ca.crt`, verifying SANs and CA signature |
| **Stage 6: Trusted TLS Handshake** | [`tls/https_ca_verified_response.txt`](tls/https_ca_verified_response.txt) <br> [`tls/tls-handshake-curl-verification.txt`](tls/tls-handshake-curl-verification.txt) | Mac 2 & Mac 4 | Native TLS validation with private CA returning HTTP 200 without `-k` |
| **Stage 7: HTTP Caching & 304** | [`caching/caching_evidence.txt`](caching/caching_evidence.txt) <br> [`caching/caching-and-304-evidence.txt`](caching/caching-and-304-evidence.txt) | Mac 2 & Mac 4 | `Cache-Control: public, max-age=60`, `ETag`, and conditional request yielding `304 Not Modified` |
| **Stage 8: Live Packet Capture** | [`wireshark/phase1-live.pcap`](wireshark/phase1-live.pcap) <br> [`wireshark/phase1-flow.pcap`](wireshark/phase1-flow.pcap) | Mac 2 & Mac 4 | Binary pcap of DNS (53), TCP 3-way handshake, TLS handshake on 8443, and HTTP |
| **Stage 8: Packet Analysis Log** | [`wireshark/packet_flow_annotation.txt`](wireshark/packet_flow_annotation.txt) <br> [`wireshark/wireshark-packet-analysis.txt`](wireshark/wireshark-packet-analysis.txt) | Mac 2 & Mac 4 | Frame-by-frame analysis, sequence numbers, acknowledgment numbers, and OSI layer breakdown |
| **Stage 9: Failure Case 1** | [`failures/case_1_wrong_dns_server.txt`](failures/case_1_wrong_dns_server.txt) | Mac 2 & Mac 4 | Wrong DNS resolver (`127.0.0.1`): `dig` times out while Layer 3 `ping` succeeds |
| **Stage 9: Failure Case 2** | [`failures/case_2_dns_points_to_wrong_ip.txt`](failures/case_2_dns_points_to_wrong_ip.txt) | Mac 2 & Mac 4 | DNS misdirection to backend IP: DNS succeeds but TCP port 8443 is refused |
| **Stage 9: Failure Case 3** | [`failures/case_3_backend_a_stopped_failover.txt`](failures/case_3_backend_a_stopped_failover.txt) | Mac 2 & Mac 4 | Backend A stopped: Edge automatically routes 100% requests to Backend B |
| **Stage 9: Failure Case 4** | [`failures/case_4_both_backends_stopped_502.txt`](failures/case_4_both_backends_stopped_502.txt) | Mac 2 & Mac 4 | Both backends down: Edge returns `HTTP 502 Bad Gateway` |
| **Stage 9: Failure Case 5** | [`failures/case_5_wrong_edge_port.txt`](failures/case_5_wrong_edge_port.txt) | Mac 2 & Mac 4 | Wrong port 8444: Layer 3 ping succeeds, Layer 4 TCP connection refused |

---

## 📂 Detailed Folder Contents

### 1. `evidence_D/` (Dedicated Person D / Mac 4 Folder)
- Consolidated, sequentially indexed copies of all Person D artifacts.
- Includes `README.md` with complete lab rubric and protocol analysis.

### 2. `lan/` (Task A)
- `ping_matrix_from_b.txt`: Ping reachability matrix executed from Mac 2 to Mac 1, 3, and 4.
- `ping_b_to_a.txt`, `ping_b_to_c.txt`, `ping_b_to_d.txt`: Individual ping logs from Mac 2.
- `mac4-interface-discovery.txt`: Discovery output from Mac 4.
- `ping-from-mac4-to-all.txt`: Ping reachability logs from Mac 4.
- `ping-from-C.txt`: Mac 3 ping results to other machines.

### 3. `dns/` (Task B)
- `dig_direct.txt`: Direct `dig @10.7.17.94` queries for `app.teamX.test` and `api.teamX.test`.
- `dig_system.txt`: System resolver verification queries from Mac 2.
- `scutil_dns.txt`: System resolver configuration from Mac 2.
- `dns-client-D.txt`: Consolidated client DNS test from Mac 4.
- `dns-query-evidence-mac4.txt`: Raw `dig` output from Mac 4.
- `scutil-dns-mac4.txt`: Output of macOS system resolver configuration from Mac 4.

### 4. `load-balancing/` (Tasks C & D)
- `round_robin_evidence.txt`: 8 consecutive requests through Nginx showing alternating round-robin backends.
- `backend_a_remote.txt` & `backend-a-remote-test.txt`: Cross-LAN reachability checks for Backend A.
- `backend_b_remote.txt` & `backend-b-local-test.txt`: Verification of Backend B listener and remote reachability.
- `https-load-balancing-evidence.txt`: Load balancing verification from Mac 4.

### 5. `tls/` (Task E)
- `server_cert_inspection.txt`: OpenSSL inspection of `server.crt` & `ca.crt` showing Subject, SANs, and validity dates.
- `https_ca_verified_response.txt`: `curl -v --cacert ca.crt` verifying HTTPS termination on port 8443.
- `tls-handshake-curl-verification.txt`: Full verbose `curl -v` log from Mac 4.

### 6. `caching/` (Task F)
- `caching_evidence.txt`: Step 1 initial fetch showing `Cache-Control` and `ETag`, and Step 2 conditional GET with `If-None-Match` returning `304 Not Modified`.
- `caching-and-304-evidence.txt`: Mac 4 caching and conditional 304 evidence.

### 7. `wireshark/` (Task G)
- `phase1-live.pcap`: Binary pcap recorded live on Mac 2 covering DNS (53), TLS (8443), and HTTP (3001/3002).
- `phase1-live-annotation.txt`: Text annotation of the live capture.
- `phase1-flow.pcap` & `tls12-handshake.pcap`: Mac 4 capture recording full flow.
- `packet_flow_annotation.txt` & `wireshark-packet-analysis.txt`: Frame-by-frame protocol breakdown.
- `capture_phase1_flow.sh`: Helper capture script for Task G.

### 8. `failures/` (Deliberate Failure Demonstrations)
- `case_1_wrong_dns_server.txt` & `failure-case-1-dns-resolver-failure.txt`: Case 1 - Misconfigured DNS resolver.
- `case_2_dns_points_to_wrong_ip.txt` & `failure-case-2-dns-misdirection.txt`: Case 2 - DNS pointing to host without Edge service.
- `case_3_backend_a_stopped_failover.txt` & `failure-case-3-single-backend-stopped.txt`: Case 3 - Backend failover to B.
- `case_4_both_backends_stopped_502.txt` & `failure-case-4-both-backends-down.txt`: Case 4 - Total backend failure (`502 Bad Gateway`).
- `case_5_wrong_edge_port.txt` & `failure-case-5-wrong-port.txt`: Case 5 - Wrong port test (8444).
