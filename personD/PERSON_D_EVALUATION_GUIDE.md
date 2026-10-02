# Examiner & Evaluator Quick-Grading Guide — Person D (Mac 4)

> **Evaluator Note:** This document provides an instant, structured grading sheet specifically for **Person D / Mac 4** (`10.7.17.147`). Every requirement from [`projectflow.md`](../projectflow.md) has been executed, logged, verified, and mapped below.

---

## 🎯 Candidate & Machine Profile
- **Candidate Role**: Person D / Mac 4 (Backend B Provider + Network Client & Packet Capture Lead)
- **Local Machine IP**: `10.7.17.147` (`en0`)
- **Default Gateway**: `10.7.0.1` | **Subnet**: `255.255.224.0` (`/19`)
- **Hosted Component**: Backend Server B (Node.js Express on TCP `3002`)
- **Team Topology**:
  - Mac 1 (Person A - Private DNS): `10.7.17.94:53`
  - Mac 2 (Person B - Edge Nginx / TLS): `10.7.3.128:8080,8443`
  - Mac 3 (Person C - Backend A): `10.7.6.84:3001`
  - Mac 4 (Person D - Backend B & Client): `10.7.17.147:3002`

---

## 📊 Rubric Evaluation & Fast-Check Matrix

| Phase 1 Requirement | Evaluation Criteria | Primary Evidence File | Fast Verification Command |
| :--- | :--- | :--- | :--- |
| **1. LAN Discovery (Task A)** | Interface details, IP, Subnet, Gateway accurately documented | [`evidence/lan/mac4-interface-discovery.txt`](../evidence/final_combined_evidence/lan/mac4-interface-discovery.txt) | `ipconfig getifaddr en0 && route -n get default` |
| **2. LAN Reachability (Task A)**| 12-cell matrix; Mac 4 pings Mac 1, 2, and 3 with 0.0% loss | [`evidence/lan/ping-from-mac4-to-all.txt`](../evidence/final_combined_evidence/lan/ping-from-mac4-to-all.txt) | `ping -c 3 10.7.3.128` |
| **3. Backend B Service (Task C)**| Independent Node.js service running on `3002`, `0.0.0.0`, with header `X-Backend: B` | [`evidence/load-balancing/backend-b-local-test.txt`](../evidence/final_combined_evidence/load-balancing/backend-b-local-test.txt) | `curl -i http://localhost:3002/api/status` |
| **4. DNS Client Test (Task B)**| Client resolves `app.teamX.test` & `api.teamX.test` to Edge IP (`10.7.3.128`) via Mac 1 | [`evidence/dns/dns-client-D.txt`](../evidence/final_combined_evidence/dns/dns-client-D.txt) | `dig @10.7.17.94 app.teamX.test A +short` |
| **5. Native TLS Trust (Task E)**| Root CA installed in Keychain; `curl` validates HTTPS without `-k` | [`evidence/tls/tls-handshake-curl-verification.txt`](../evidence/final_combined_evidence/tls/tls-handshake-curl-verification.txt) | `curl -v "https://app.teamX.test:8443/api/status"` |
| **6. Round-Robin Balancing (Task D)**| Consecutive requests via Edge alternate between `X-Backend: B` and `X-Backend: A` | [`evidence/load-balancing/https-load-balancing-evidence.txt`](../evidence/final_combined_evidence/load-balancing/https-load-balancing-evidence.txt) | `for i in 1 2 3 4; do curl -s -i "https://app.teamX.test:8443/api/status" \| grep -i x-backend; done` |
| **7. HTTP Caching / 304 (Task F)**| `Cache-Control`, `ETag`, and conditional `If-None-Match` request returns `304 Not Modified` | [`evidence/caching/caching-and-304-evidence.txt`](../evidence/final_combined_evidence/caching/caching-and-304-evidence.txt) | `curl -i -H "If-None-Match: \"39-jxvt8kclwpAy7qZ0gJ/MRIVczo0\"" "https://app.teamX.test:8443/api/cached"` |
| **8. Packet Capture (Task G)**| Full packet capture containing DNS query, TCP SYN/ACK, TLS handshake, Application Data | [`evidence/wireshark/phase1-flow.pcap`](../evidence/final_combined_evidence/wireshark/phase1-flow.pcap) | `tshark -r evidence/final_combined_evidence/wireshark/phase1-flow.pcap` or open in Wireshark |
| **9. Wireshark Protocol Analysis**| Frame annotation, TCP Sequence & ACK numbers, and 5-layer OSI mapping | [`evidence/wireshark/wireshark-packet-analysis.txt`](../evidence/final_combined_evidence/wireshark/wireshark-packet-analysis.txt) | Review document |
| **10. Deliberate Fault 1** | Misconfigured DNS resolver: Layer 7 DNS fails while Layer 3 IP ping passes | [`evidence/failures/failure-case-1-dns-resolver-failure.txt`](../evidence/final_combined_evidence/failures/failure-case-1-dns-resolver-failure.txt) | Review document |
| **11. Deliberate Fault 2** | DNS misdirection to non-edge host: TCP port 8443 connection refused | [`evidence/failures/failure-case-2-dns-misdirection.txt`](../evidence/final_combined_evidence/failures/failure-case-2-dns-misdirection.txt) | Review document |
| **12. Deliberate Fault 3** | Single backend failure: Nginx automatically routes 100% traffic to remaining backend | [`evidence/failures/failure-case-3-single-backend-stopped.txt`](../evidence/final_combined_evidence/failures/failure-case-3-single-backend-stopped.txt) | Review document |
| **13. Deliberate Fault 4** | Total backend outage: Edge returns `HTTP 502 Bad Gateway` | [`evidence/failures/failure-case-4-both-backends-down.txt`](../evidence/final_combined_evidence/failures/failure-case-4-both-backends-down.txt) | Review document |
| **14. Deliberate Fault 5** | Destination port error: Connecting to 8444 results in TCP Connection Refused | [`evidence/failures/failure-case-5-wrong-port.txt`](../evidence/final_combined_evidence/failures/failure-case-5-wrong-port.txt) | Review document |

---

## 🧠 Viva Voce (Oral Defense) Reference Sheet

During oral examination, Person D can thoroughly explain every networking concept implemented:

### 1. TCP 3-Way Handshake
- **Frame 3 (`SYN`)**: Client sends initial sequence number `Seq=0`, setting the SYN flag.
- **Frame 4 (`SYN-ACK`)**: Server responds with its own initial sequence number and acknowledges client's SYN (`Ack=1`).
- **Frame 5 (`ACK`)**: Client acknowledges server's SYN (`Ack=1`). TCP socket transitions to `ESTABLISHED`.

### 2. TLS 1.2 Handshake & Trust Mechanics
- **ClientHello**: Advertises supported cipher suites and TLS extensions (e.g., SNI: `app.teamX.test`).
- **ServerHello & Certificate**: Edge presents `server.crt` signed by private CA (`ca.crt`).
- **Trust Store Validation**: Because `ca.crt` was imported into the macOS System Keychain with `trustRoot` privileges, `curl` verifies the signature chain up to the local root without warning.
- **ChangeCipherSpec / Finished**: Both parties switch to symmetric session keys (AES-GCM / ChaCha20) to encrypt subsequent HTTP/1.1 traffic.

### 3. HTTP 1.1 Caching & Validation (RFC 9111)
- Backend sends `Cache-Control: public, max-age=60` and a digest `ETag: "39-jxvt8kclwpAy7qZ0gJ/MRIVczo0"`.
- When the client requests the resource again, it sends a conditional request: `If-None-Match: "39-jxvt8kclwpAy7qZ0gJ/MRIVczo0"`.
- The server compares the entity tag; because the resource is unchanged, it sends `HTTP/1.1 304 Not Modified` with zero body payload, conserving LAN bandwidth.

### 4. OSI & TCP/IP Layer Separation
- **Application Layer (Layer 7 / 5)**: DNS (`UDP 53`), HTTP/1.1 REST API requests, TLS encryption.
- **Transport Layer (Layer 4)**: TCP (`port 8443`, `port 3002`), UDP (`port 53`), windowing, Sequence/ACK numbers.
- **Network / Internet Layer (Layer 3)**: IPv4 addressing (`10.7.17.147`, `10.7.3.128`), ICMP Echo (ping), IP routing via Gateway (`10.7.0.1`).
- **Data Link Layer (Layer 2)**: Ethernet / 802.11 Wi-Fi frames, MAC addresses (`ether 52:19:ac:c7:60:a3`), ARP table resolution.
