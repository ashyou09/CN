# Person B Evidence Portfolio — Edge Proxy, Load Balancer & TLS Lead (Mac 2)

This directory contains verified terminal outputs, network packet captures (`.pcap`), and failure diagnosis logs captured directly from **Mac 2 (Person B, `10.7.3.128`)**, the Edge Nginx Proxy and TLS Termination lead for the **Private Network Service Platform (Phase 1)**.

---

## 🧭 Fast Navigation for Evaluator (Under 30 Seconds)

| Stage & Topic | Primary File | Machine / Host | Verification Summary |
| :--- | :--- | :--- | :--- |
| **Stage 1: LAN Reachability** | [`lan/ping_matrix_from_b.txt`](lan/ping_matrix_from_b.txt) | Mac 2 (`10.7.3.128`) | 0.0% packet loss pinging Mac 1 (`10.7.17.94`), Mac 3 (`10.7.6.84`), and Mac 4 (`10.7.17.147`) |
| **Stage 2: Backend A Check** | [`load-balancing/backend_a_remote.txt`](load-balancing/backend_a_remote.txt) | Mac 2 ➔ Mac 3 | Direct curl to `http://10.7.6.84:3001/api/status` returns `X-Backend: A` |
| **Stage 3: Backend B Check** | [`load-balancing/backend_b_remote.txt`](load-balancing/backend_b_remote.txt) | Mac 2 ➔ Mac 4 | Direct curl to `http://10.7.17.147:3002/api/status` returns `X-Backend: B` |
| **Stage 4: Edge Round-Robin** | [`load-balancing/round_robin_evidence.txt`](load-balancing/round_robin_evidence.txt) | Mac 2 (`10.7.3.128`) | 8 consecutive requests through Nginx `:8080` alternating between Backend A and B |
| **Stage 5: Private DNS** | [`dns/dig_direct.txt`](dns/dig_direct.txt) | Mac 2 ➔ Mac 1 | `dig @10.7.17.94` resolves `app.teamX.test` and `api.teamX.test` to `10.7.3.128` |
| **Stage 6: TLS Certificate** | [`tls/server_cert_inspection.txt`](tls/server_cert_inspection.txt) | Mac 2 (`10.7.3.128`) | OpenSSL inspection of `server.crt` & `ca.crt`, verifying SANs and CA signature |
| **Stage 6: Trusted HTTPS** | [`tls/https_ca_verified_response.txt`](tls/https_ca_verified_response.txt) | Mac 2 (`10.7.3.128`) | `curl -v --cacert ca.crt https://app.teamX.test:8443/api/status` succeeds with HTTP 200 |
| **Stage 7: HTTP Caching (304)**| [`caching/caching_evidence.txt`](caching/caching_evidence.txt) | Mac 2 (`10.7.3.128`) | `ETag` validation and conditional request `If-None-Match` yielding `HTTP/1.1 304 Not Modified` |
| **Stage 8: Live Packet Capture**| [`wireshark/phase1-live.pcap`](wireshark/phase1-live.pcap) | Mac 2 (`en0` + `lo0`) | Live binary pcap capturing DNS (53), TLS (8443), and HTTP (3001/3002) in Ethernet format |
| **Stage 8: Packet Flow Notes** | [`wireshark/packet_flow_annotation.txt`](wireshark/packet_flow_annotation.txt) | Mac 2 (`10.7.3.128`) | OSI 7-layer breakdown and complete frame-by-frame analysis across DNS, TCP, TLS, and HTTP |
| **Stage 9: Failure Case 1** | [`failures/case_1_wrong_dns_server.txt`](failures/case_1_wrong_dns_server.txt) | Mac 2 | DNS resolver down/wrong: `dig` times out while Layer 3 ICMP ping remains reachable |
| **Stage 9: Failure Case 2** | [`failures/case_2_dns_points_to_wrong_ip.txt`](failures/case_2_dns_points_to_wrong_ip.txt) | Mac 2 | DNS misdirection to backend IP: DNS succeeds but TCP port 8443 is refused |
| **Stage 9: Failure Case 3** | [`failures/case_3_backend_a_stopped_failover.txt`](failures/case_3_backend_a_stopped_failover.txt) | Mac 2 | Backend A stopped: Nginx detects failure and safely routes 100% traffic to Backend B |
| **Stage 9: Failure Case 4** | [`failures/case_4_both_backends_stopped_502.txt`](failures/case_4_both_backends_stopped_502.txt) | Mac 2 | Both backends stopped: Edge proxy returns `HTTP 502 Bad Gateway` |
| **Stage 9: Failure Case 5** | [`failures/case_5_wrong_edge_port.txt`](failures/case_5_wrong_edge_port.txt) | Mac 2 | Request to wrong port 8444: ICMP ping succeeds, TCP connection fails |

---

## 📁 Directory Structure

```
evidenceB/
├── README.md
├── caching/
│   └── caching_evidence.txt
├── dns/
│   ├── dig_direct.txt
│   ├── dig_system.txt
│   └── scutil_dns.txt
├── failures/
│   ├── case_1_wrong_dns_server.txt
│   ├── case_2_dns_points_to_wrong_ip.txt
│   ├── case_3_backend_a_stopped_failover.txt
│   ├── case_4_both_backends_stopped_502.txt
│   └── case_5_wrong_edge_port.txt
├── lan/
│   ├── ping_b_to_a.txt
│   ├── ping_b_to_c.txt
│   ├── ping_b_to_d.txt
│   └── ping_matrix_from_b.txt
├── load-balancing/
│   ├── backend_a_remote.txt
│   ├── backend_b_remote.txt
│   └── round_robin_evidence.txt
├── tls/
│   ├── https_ca_verified_response.txt
│   └── server_cert_inspection.txt
└── wireshark/
    ├── capture_phase1_flow.sh
    ├── packet_flow_annotation.txt
    ├── phase1-live-annotation.txt
    └── phase1-live.pcap
```
