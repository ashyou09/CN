# Final Combined Evidence Portfolio (Cross-Machine Aggregation)

This directory houses the consolidated multi-machine evidence portfolio for the **Private Network Service Platform (Phase 1)**, aggregating artifacts across all 4 Macs:
- **Person A (Mac 1 · `10.7.17.94`):** Private DNS Authority (`dnsmasq`)
- **Person B (Mac 2 · `10.7.3.128`):** Edge Reverse Proxy, TLS Termination & Load Balancer (`Nginx`)
- **Person C (Mac 3 · `10.7.6.84`):** Backend Service A (`Node.js :3001`)
- **Person D (Mac 4 · `10.7.17.147`):** Backend Service B (`Node.js :3002`) & Wireshark Packet Capture

---

## 📂 Subfolder Structure

All folders maintain the standardized 7-category layout:

| Directory | Content Description | Key Primary Files |
| :--- | :--- | :--- |
| **`lan/`** | 4x4 Ping reachability & network inventory | `ping_matrix_from_b.txt`, `ping-from-mac4-to-all.txt`, `ping-from-C.txt` |
| **`dns/`** | Direct and system DNS resolution checks | `dig_direct.txt`, `dig_system.txt`, `scutil_dns.txt`, `dns-client-D.txt` |
| **`load-balancing/`** | Direct backend checks & round-robin logs | `round_robin_evidence.txt`, `backend_a_remote.txt`, `backend_b_remote.txt` |
| **`tls/`** | Certificate authority & OpenSSL inspections | `server_cert_inspection.txt`, `https_ca_verified_response.txt` |
| **`caching/`** | ETag headers & HTTP 304 conditional checks | `caching_evidence.txt`, `caching-and-304-evidence.txt` |
| **`wireshark/`** | Binary `.pcap` captures & protocol annotations | `phase1-live.pcap`, `phase1-flow.pcap`, `packet_flow_annotation.txt` |
| **`failures/`** | Diagnostic logs for all 5 failure scenarios | `case_1` through `case_5` failure simulation logs |

---

For individual per-person dossiers, refer to:
- [`evidence/evidenceA/`](../evidenceA/)
- [`evidence/evidenceB/`](../evidenceB/)
- [`evidence/evidenceC/`](../evidenceC/)
- [`evidence/evidenceD/`](../evidenceD/)
- [`evidence/FINAL_EVIDENCE_DOSSIER.md`](../FINAL_EVIDENCE_DOSSIER.md)
