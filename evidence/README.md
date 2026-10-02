# Evidence Checklist & Master Directory Guide (Phase 1)

This directory contains verified terminal outputs, network packet captures (`.pcap`), and structured evaluation logs for the **Private Network Service Platform (Phase 1)** across all 4 Macs.

---

## 👥 Directory Architecture & Organization

All evidence is organized strictly into individual member folders and a consolidated combined dossier:

```
evidence/
├── evidenceA/                  # Person A: Pankaj (Mac 1 · 10.7.17.94 · DNS Lead)
├── evidenceB/                  # Person B: Ashutosh (Mac 2 · 10.7.3.128 · Edge & TLS Lead)
├── evidenceC/                  # Person C: Shreya (Mac 3 · 10.7.6.84 · Backend A Lead)
├── evidenceD/                  # Person D: Ranvendra (Mac 4 · 10.7.17.147 · Backend B & Wireshark Lead)
├── final_combined_evidence/    # Cross-machine consolidated portfolio
└── FINAL_EVIDENCE_DOSSIER.md   # Complete Professor-Ready Master Dossier
```

Every subfolder (`evidenceA`, `evidenceB`, `evidenceC`, `evidenceD`, `final_combined_evidence`) shares the **identical 7-category structure**:
- `lan/`
- `dns/`
- `load-balancing/`
- `tls/`
- `caching/`
- `wireshark/`
- `failures/`

---

## 🧭 Fast Navigation for Evaluator (Under 30 Seconds)

| Stage & Topic | Primary Files | Machine / Persona | Verification Goal |
| :--- | :--- | :--- | :--- |
| **Stage 1: LAN Discovery** | [`final_combined_evidence/lan/mac4-interface-discovery.txt`](final_combined_evidence/lan/mac4-interface-discovery.txt) | Person D (Mac 4) | Interface `en0`, IP `10.7.17.147`, `/19` Subnet Mask, Gateway `10.7.0.1` |
| **Stage 1: Ping Reachability** | [`final_combined_evidence/lan/ping_matrix_from_b.txt`](final_combined_evidence/lan/ping_matrix_from_b.txt) <br> [`final_combined_evidence/lan/ping-from-mac4-to-all.txt`](final_combined_evidence/lan/ping-from-mac4-to-all.txt) <br> [`final_combined_evidence/lan/ping-from-C.txt`](final_combined_evidence/lan/ping-from-C.txt) | Mac 2 (`10.7.3.128`) <br> Mac 4 (`10.7.17.147`) <br> Mac 3 (`10.7.6.84`) | 0.0% packet loss ping across all nodes in the 4x4 matrix |
| **Stage 2: Backend A Service** | [`final_combined_evidence/load-balancing/backend_a_remote.txt`](final_combined_evidence/load-balancing/backend_a_remote.txt) <br> [`final_combined_evidence/load-balancing/backend-a-remote-test.txt`](final_combined_evidence/load-balancing/backend-a-remote-test.txt) | Mac 3 (`10.7.6.84`) | Port 3001 listener, `GET /api/status`, header `X-Backend: A` |
| **Stage 3: Backend B Service** | [`final_combined_evidence/load-balancing/backend_b_remote.txt`](final_combined_evidence/load-balancing/backend_b_remote.txt) <br> [`final_combined_evidence/load-balancing/backend-b-local-test.txt`](final_combined_evidence/load-balancing/backend-b-local-test.txt) | Mac 4 (`10.7.17.147`) | Port 3002 listener, `GET /`, `GET /api/status`, `GET /api/cached` |
| **Stage 4: Edge Round-Robin** | [`final_combined_evidence/load-balancing/round_robin_evidence.txt`](final_combined_evidence/load-balancing/round_robin_evidence.txt) <br> [`final_combined_evidence/load-balancing/https-load-balancing-evidence.txt`](final_combined_evidence/load-balancing/https-load-balancing-evidence.txt) | Mac 2 (`10.7.3.128`) <br> Mac 4 (`10.7.17.147`) | Repeated requests through Nginx alternating between Backend A and B |
| **Stage 5: Private DNS** | [`final_combined_evidence/dns/dig_direct.txt`](final_combined_evidence/dns/dig_direct.txt) <br> [`final_combined_evidence/dns/dns-client-D.txt`](final_combined_evidence/dns/dns-client-D.txt) | Mac 2 & Mac 4 ➔ Mac 1 | `dig @10.7.17.94` queries for `app.teamX.test` returning Edge `10.7.3.128` |
| **Stage 5: System DNS Resolver** | [`final_combined_evidence/dns/scutil_dns.txt`](final_combined_evidence/dns/scutil_dns.txt) <br> [`final_combined_evidence/dns/scutil-dns-mac4.txt`](final_combined_evidence/dns/scutil-dns-mac4.txt) | Mac 2 & Mac 4 | `scutil --dns` resolver configuration |
| **Stage 6: Server Certificate** | [`final_combined_evidence/tls/server_cert_inspection.txt`](final_combined_evidence/tls/server_cert_inspection.txt) | Mac 2 (`10.7.3.128`) | OpenSSL inspection of `server.crt` & `ca.crt`, verifying SANs and CA signature |
| **Stage 6: Trusted TLS Handshake** | [`final_combined_evidence/tls/https_ca_verified_response.txt`](final_combined_evidence/tls/https_ca_verified_response.txt) <br> [`final_combined_evidence/tls/tls-handshake-curl-verification.txt`](final_combined_evidence/tls/tls-handshake-curl-verification.txt) | Mac 2 & Mac 4 | Native TLS validation with private CA returning HTTP 200 without `-k` |
| **Stage 7: HTTP Caching & 304** | [`final_combined_evidence/caching/caching_evidence.txt`](final_combined_evidence/caching/caching_evidence.txt) <br> [`final_combined_evidence/caching/caching-and-304-evidence.txt`](final_combined_evidence/caching/caching-and-304-evidence.txt) | Mac 2 & Mac 4 | `Cache-Control: public, max-age=60`, `ETag`, and conditional request yielding `304 Not Modified` |
| **Stage 8: Live Packet Capture** | [`final_combined_evidence/wireshark/phase1-live.pcap`](final_combined_evidence/wireshark/phase1-live.pcap) <br> [`final_combined_evidence/wireshark/phase1-flow.pcap`](final_combined_evidence/wireshark/phase1-flow.pcap) | Mac 2 & Mac 4 | Binary pcap of DNS (53), TCP 3-way handshake, TLS handshake on 8443, and HTTP |
| **Stage 8: Packet Analysis Log** | [`final_combined_evidence/wireshark/packet_flow_annotation.txt`](final_combined_evidence/wireshark/packet_flow_annotation.txt) <br> [`final_combined_evidence/wireshark/wireshark-packet-analysis.txt`](final_combined_evidence/wireshark/wireshark-packet-analysis.txt) | Mac 2 & Mac 4 | Frame-by-frame analysis, sequence numbers, acknowledgment numbers, and OSI layer breakdown |
| **Stage 9: Failure Case 1** | [`final_combined_evidence/failures/case_1_wrong_dns_server.txt`](final_combined_evidence/failures/case_1_wrong_dns_server.txt) | Mac 2 & Mac 4 | Wrong DNS resolver (`127.0.0.1`): `dig` times out while Layer 3 `ping` succeeds |
| **Stage 9: Failure Case 2** | [`final_combined_evidence/failures/case_2_dns_points_to_wrong_ip.txt`](final_combined_evidence/failures/case_2_dns_points_to_wrong_ip.txt) | Mac 2 & Mac 4 | DNS misdirection to backend IP: DNS succeeds but TCP port 8443 is refused |
| **Stage 9: Failure Case 3** | [`final_combined_evidence/failures/case_3_backend_a_stopped_failover.txt`](final_combined_evidence/failures/case_3_backend_a_stopped_failover.txt) | Mac 2 & Mac 4 | Backend A stopped: Edge automatically routes 100% requests to Backend B |
| **Stage 9: Failure Case 4** | [`final_combined_evidence/failures/case_4_both_backends_stopped_502.txt`](final_combined_evidence/failures/case_4_both_backends_stopped_502.txt) | Mac 2 & Mac 4 | Both backends down: Edge returns `HTTP 502 Bad Gateway` |
| **Stage 9: Failure Case 5** | [`final_combined_evidence/failures/case_5_wrong_edge_port.txt`](final_combined_evidence/failures/case_5_wrong_edge_port.txt) | Mac 2 & Mac 4 | Wrong port 8444: Layer 3 ping succeeds, Layer 4 TCP connection refused |

---

## 📂 Person-Specific Evidence Links

- **[Person A Evidence — Pankaj (Mac 1)](evidenceA/README.md):** DNS Lead — `dnsmasq` service, system resolver configuration, and client checks.
- **[Person B Evidence — Ashutosh (Mac 2)](evidenceB/README.md):** Edge Proxy & TLS Lead — Nginx proxy, certificate authority, TLS termination, live packet captures, and failure demonstrations.
- **[Person C Evidence — Shreya (Mac 3)](evidenceC/README.md):** Backend A Lead — Node.js service on port 3001, local checks, and ping matrix.
- **[Person D Evidence — Ranvendra (Mac 4)](evidenceD/README.md):** Backend B & Packet Capture Lead — Node.js service on port 3002, end-to-end client verification, Wireshark traces, and failure tests.
- **[Final Combined Portfolio](final_combined_evidence/README.md):** Consolidated cross-machine artifacts across all 7 stages.
- **[Master Evidence Dossier](FINAL_EVIDENCE_DOSSIER.md):** Comprehensive professor-ready technical evaluation document.
