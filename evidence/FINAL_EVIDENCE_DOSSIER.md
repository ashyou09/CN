# Final Evidence Master Dossier — Private Network Service Platform (Phase 1)

**Course:** Computer Networks  
**Project:** Phase 1 — Four-Machine Private Network Service Platform  
**Target Domains:** `app.teamX.test`, `api.teamX.test`  
**Evaluation Status:** 100% Verified with Real Terminal & Packet Evidence  

---

## 1. Network Architecture & Machine Roles

The system is deployed on four physical macOS laptops connected to a single private Wi-Fi network (`10.7.0.0/19`, Default Gateway `10.7.0.1`):

| Persona | Machine | IP Address | MAC Address | Operating System / Hardware | Primary Network Roles | Open Service Ports |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Person A (Pankaj Baid)** | Mac 1 | `10.7.17.94` | `46:1d:da:58:a4:fb` | macOS (Pankaj's MacBook Pro) | Private DNS Server & Test Client | `53` (UDP/TCP) |
| **Person B (Ashutosh Singh)** | Mac 2 | `10.7.3.128` | `f6:bf:22:4f:e6:62` | macOS (Ashutosh's MacBook Pro · Edge Host) | Edge Proxy, TLS Termination, Load Balancer | `8080` (HTTP), `8443` (HTTPS) |
| **Person C (Shreya Suman)** | Mac 3 | `10.7.6.84` | `5e:7f:95:17:c2:ab` | macOS (Shreya's MacBook Air) | Backend Microservice Server A | `3001` (HTTP) |
| **Person D (Ranvendra Pratap Singh)** | Mac 4 | `10.7.17.147` | `72:1f:ac:57:17:62` | macOS (Ranvendra's MacBook Air) | Backend Server B, Wireshark Lead, Client | `3002` (HTTP) |

---

## 2. Complete 4×4 Pairwise Ping Reachability Matrix (Stage 1)

Every node verified pairwise bidirectional ICMP reachability to all other 3 nodes with 0.0% packet loss:

| Transmitting Node \ Receiving Node | Mac 1 (`10.7.17.94`) | Mac 2 (`10.7.3.128`) | Mac 3 (`10.7.6.84`) | Mac 4 (`10.7.17.147`) | Verification Evidence File |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Mac 1 (Person A)** | — | **PASS** (0.0% loss) | **PASS** (0.0% loss) | **PASS** (0.0% loss) | [`evidenceA/lan/mac1-to-mac2-ping.txt`](evidenceA/lan/mac1-to-mac2-ping.txt) |
| **Mac 2 (Person B)** | **PASS** (0.0% loss) | — | **PASS** (0.0% loss) | **PASS** (0.0% loss) | [`evidenceB/lan/ping_matrix_from_b.txt`](evidenceB/lan/ping_matrix_from_b.txt) |
| **Mac 3 (Person C)** | **PASS** (0.0% loss) | **PASS** (0.0% loss) | — | **PASS** (0.0% loss) | [`evidenceC/lan/ping-from-C.txt`](evidenceC/lan/ping-from-C.txt) |
| **Mac 4 (Person D)** | **PASS** (0.0% loss) | **PASS** (0.0% loss) | **PASS** (0.0% loss) | — | [`evidenceD/lan/02-lan-ping-mac4-to-all-nodes.txt`](evidenceD/lan/02-lan-ping-mac4-to-all-nodes.txt) |

---

## 3. Master Stage Verification & Evidence Mapping

Every stage of Phase 1 is backed by real output files with identical directory structure across all four personas:

```
evidence/
├── README.md
├── FINAL_EVIDENCE_DOSSIER.md
├── evidenceA/                  (Person A · Mac 1 · DNS Lead)
├── evidenceB/                  (Person B · Mac 2 · Edge / TLS Lead)
├── evidenceC/                  (Person C · Mac 3 · Backend A Lead)
├── evidenceD/                  (Person D · Mac 4 · Backend B & Capture Lead)
└── final_combined_evidence/    (Cross-Machine Consolidated Portfolio)
```

Inside **every** persona directory (`evidenceA/`, `evidenceB/`, `evidenceC/`, `evidenceD/`), the folders are structured identically:
`lan/` · `dns/` · `load-balancing/` · `tls/` · `caching/` · `wireshark/` · `failures/`

| Stage | Topic & Rubric Item | Primary Verification Goal | Responsible Persona | Real Evidence File |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **LAN Interface & IP Discovery** | Active IP, netmask `/19`, Gateway `10.7.0.1` | Person D & All | [`evidenceD/lan/01-lan-mac4-interface-discovery.txt`](evidenceD/lan/01-lan-mac4-interface-discovery.txt) <br> [`evidenceB/lan/ping_matrix_from_b.txt`](evidenceB/lan/ping_matrix_from_b.txt) |
| **2** | **Backend Server A Setup** | Node.js on `3001`, responds with `X-Backend: A` | Person C (Mac 3) | [`evidenceC/load-balancing/backend-a-listener-and-endpoints.txt`](evidenceC/load-balancing/backend-a-listener-and-endpoints.txt) <br> [`evidenceB/load-balancing/backend_a_remote.txt`](evidenceB/load-balancing/backend_a_remote.txt) |
| **3** | **Backend Server B Setup** | Node.js on `3002`, responds with `X-Backend: B` | Person D (Mac 4) | [`evidenceD/load-balancing/03-backend-b-listener-and-endpoints.txt`](evidenceD/load-balancing/03-backend-b-listener-and-endpoints.txt) <br> [`evidenceB/load-balancing/backend_b_remote.txt`](evidenceB/load-balancing/backend_b_remote.txt) |
| **4** | **Edge Nginx Load Balancer** | Upstream pool alternating round-robin on `:8080` | Person B (Mac 2) | [`evidenceB/load-balancing/round_robin_evidence.txt`](evidenceB/load-balancing/round_robin_evidence.txt) <br> [`evidenceD/load-balancing/07-https-load-balancing-round-robin.txt`](evidenceD/load-balancing/07-https-load-balancing-round-robin.txt) |
| **5** | **Private DNS Resolution** | `dnsmasq` maps both names to Edge `10.7.3.128` | Person A (Mac 1) | [`evidenceA/dns/mac1-app-dig.txt`](evidenceA/dns/mac1-app-dig.txt) <br> [`evidenceB/dns/dig_direct.txt`](evidenceB/dns/dig_direct.txt) <br> [`evidenceD/dns/04-dns-client-mac4-queries.txt`](evidenceD/dns/04-dns-client-mac4-queries.txt) |
| **6** | **TLS Certificate & Trust** | CA certificate trust & HTTPS without `-k` | Person B & D | [`evidenceB/tls/server_cert_inspection.txt`](evidenceB/tls/server_cert_inspection.txt) <br> [`evidenceD/tls/06-tls-handshake-curl-verification.txt`](evidenceD/tls/06-tls-handshake-curl-verification.txt) |
| **7** | **HTTP Caching & Revalidation** | `Cache-Control`, `ETag`, and `HTTP 304 Not Modified` | Person B & D | [`evidenceB/caching/caching_evidence.txt`](evidenceB/caching/caching_evidence.txt) <br> [`evidenceD/caching/08-caching-etag-and-304-not-modified.txt`](evidenceD/caching/08-caching-etag-and-304-not-modified.txt) |
| **8** | **Task G Wireshark Packet Capture** | Binary pcap of DNS, TCP 3-way, TLS, HTTP | Person B & D | [`evidenceB/wireshark/phase1-live.pcap`](evidenceB/wireshark/phase1-live.pcap) <br> [`evidenceD/wireshark/phase1-flow.pcap`](evidenceD/wireshark/phase1-flow.pcap) <br> [`evidenceB/wireshark/packet_flow_annotation.txt`](evidenceB/wireshark/packet_flow_annotation.txt) |
| **9** | **Failure Case 1 (DNS Down)** | Resolver unreachable; ping works, DNS times out | Person D & B | [`evidenceB/failures/case_1_wrong_dns_server.txt`](evidenceB/failures/case_1_wrong_dns_server.txt) <br> [`evidenceD/failures/failure-case-1-dns-resolver-failure.txt`](evidenceD/failures/failure-case-1-dns-resolver-failure.txt) |
| **9** | **Failure Case 2 (DNS Misdirected)**| Name points to Mac 3; TCP port 8443 refused | Person A & B | [`evidenceA/failures/case_2_dns_misdirection_from_a.txt`](evidenceA/failures/case_2_dns_misdirection_from_a.txt) <br> [`evidenceB/failures/case_2_dns_points_to_wrong_ip.txt`](evidenceB/failures/case_2_dns_points_to_wrong_ip.txt) |
| **9** | **Failure Case 3 (Backend A Fails)**| Backend A stopped; Nginx routes 100% to B | Person C & B | [`evidenceC/failures/case-3-backend-a-planned-stop.txt`](evidenceC/failures/case-3-backend-a-planned-stop.txt) <br> [`evidenceB/failures/case_3_backend_a_stopped_failover.txt`](evidenceB/failures/case_3_backend_a_stopped_failover.txt) |
| **9** | **Failure Case 4 (Both Backends Down)**| Both Node servers down; Nginx returns HTTP 502 | Person B & D | [`evidenceB/failures/case_4_both_backends_stopped_502.txt`](evidenceB/failures/case_4_both_backends_stopped_502.txt) <br> [`evidenceD/failures/failure-case-4-both-backends-down.txt`](evidenceD/failures/failure-case-4-both-backends-down.txt) |
| **9** | **Failure Case 5 (Wrong Port)** | Request to port 8444; TCP connection refused | Person B & D | [`evidenceB/failures/case_5_wrong_edge_port.txt`](evidenceB/failures/case_5_wrong_edge_port.txt) <br> [`evidenceD/failures/failure-case-5-wrong-port.txt`](evidenceD/failures/failure-case-5-wrong-port.txt) |

---

## 4. Persona Portfolios at a Glance

### Person A Portfolio — Pankaj (`evidence/evidenceA/`)
- **Role:** DNS Lead & Client (Mac 1 · `10.7.17.94`)
- **Files:**
  - `lan/`: Interface discovery and pings to Mac 2, 3, 4
  - `dns/`: `mac1-app-dig.txt`, `mac1-api-dig.txt`, `mac1-server-log-client-queries.txt`, `mac1-resolver.txt`
  - `load-balancing/`: `mac1-direct-backend-checks.txt`, `mac1-https-balancing-diagnostic.txt`
  - `tls/`: `mac1-ca-fingerprint-before-trust.txt`, `mac1-edge-ca-diagnostic.txt`
  - `caching/`: `mac1-cache-ca-diagnostic.txt`
  - `wireshark/`: DNS protocol inspection notes
  - `failures/`: `case_2_dns_misdirection_from_a.txt` (dnsmasq update to `10.7.6.84` and restoration)

### Person B Portfolio — Ashutosh (`evidence/evidenceB/`)
- **Role:** Edge Proxy, Load Balancer & TLS Termination Lead (Mac 2 · `10.7.3.128`)
- **Files:**
  - `lan/`: `ping_matrix_from_b.txt`, `ping_b_to_a.txt`, `ping_b_to_c.txt`, `ping_b_to_d.txt`
  - `dns/`: `dig_direct.txt`, `dig_system.txt`, `scutil_dns.txt`
  - `load-balancing/`: `round_robin_evidence.txt`, `backend_a_remote.txt`, `backend_b_remote.txt`
  - `tls/`: `server_cert_inspection.txt`, `https_ca_verified_response.txt`
  - `caching/`: `caching_evidence.txt` (ETag & conditional 304)
  - `wireshark/`: `phase1-live.pcap` (dual en0 + lo0 merged Ethernet pcap), `packet_flow_annotation.txt`, `phase1-live-annotation.txt`, `capture_phase1_flow.sh`
  - `failures/`: `case_1_wrong_dns_server.txt` through `case_5_wrong_edge_port.txt`

### Person C Portfolio — Shreya (`evidence/evidenceC/`)
- **Role:** Backend Server A Lead (Mac 3 · `10.7.6.84`)
- **Files:**
  - `lan/`: `mac3-interface-discovery.txt`, `ping-from-C.txt`
  - `load-balancing/`: `backend-a-listener-and-endpoints.txt` (port 3001 listener, `/`, `/api/status`)
  - `dns/`: `mac3-dns-resolution.txt` (`dig @10.7.17.94 app.teamX.test`)
  - `tls/`: `mac3-tls-ca-verification.txt` (CA fingerprint & curl validation)
  - `caching/`: `mac3-caching-endpoint.txt` (Backend A ETag generation)
  - `wireshark/`: `mac3-traffic-observation.txt` (port 3001 TCP handshake from Edge)
  - `failures/`: `case-3-backend-a-planned-stop.txt` (Backend A shutdown and automatic failover to B)

### Person D Portfolio — Ranvendra (`evidence/evidenceD/`)
- **Role:** Backend Server B & Packet Capture Lead (Mac 4 · `10.7.17.147`)
- **Files:**
  - `lan/`: `01-lan-mac4-interface-discovery.txt`, `02-lan-ping-mac4-to-all-nodes.txt`
  - `dns/`: `04-dns-client-mac4-queries.txt`, `05-dns-scutil-system-resolver.txt`
  - `load-balancing/`: `03-backend-b-listener-and-endpoints.txt`, `07-https-load-balancing-round-robin.txt`
  - `tls/`: `06-tls-handshake-curl-verification.txt`
  - `caching/`: `08-caching-etag-and-304-not-modified.txt`
  - `wireshark/`: `phase1-flow.pcap`, `tls12-handshake.pcap`, `09-wireshark-packet-analysis.txt`
  - `failures/`: `failure-case-1-dns-resolver-failure.txt` through `failure-case-5-wrong-port.txt`, `backend-A-stopped.txt`

### Final Combined Portfolio (`evidence/final_combined_evidence/`)
- **Role:** Cross-machine consolidation covering all 4 physical nodes
- **Structure:** Identical 7-category taxonomy (`lan/`, `dns/`, `load-balancing/`, `tls/`, `caching/`, `wireshark/`, `failures/`)
- **Key Artifacts:** Multi-point ping matrices, full pcap traces (`phase1-live.pcap`, `phase1-flow.pcap`), detailed frame analysis, complete failure test logs

---

## 5. Verification Checklist for Evaluator

- [x] **LAN Reachability:** All 12 off-diagonal pairs in the 4×4 ping matrix confirmed with 0.0% packet loss.
- [x] **Backend Isolation:** Both backends (ports 3001 and 3002) respond with their respective `X-Backend` headers.
- [x] **Edge Round-Robin:** Edge Nginx balances consecutive incoming requests between Backend A and Backend B.
- [x] **Private DNS:** `dnsmasq` authoritatively answers queries for `app.teamX.test` and `api.teamX.test` with Edge IP `10.7.3.128`.
- [x] **TLS Termination:** HTTPS on port 8443 validates cleanly against the local private CA certificate without `-k` or insecure flags.
- [x] **HTTP Caching:** Initial GET returns `Cache-Control` and `ETag`; conditional GET with `If-None-Match` returns `HTTP 304 Not Modified`.
- [x] **Live Packet Sniffer:** Real `.pcap` capture contains DNS (UDP 53), TCP 3-way handshake, TLS ClientHello/ServerHello/Certificates, and HTTP requests.
- [x] **Failure Demonstrations:** All 5 failure scenarios documented with root cause layer diagnosis and restoration verification.
