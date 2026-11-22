# Examiner & Evaluator Quick-Grading Guide — Person C (Mac 3)

> **Evaluator Note:** This document provides an instant grading and oral examination sheet for **Person C / Mac 3 (Shreya Suman)**. Every requirement has been executed, logged, verified, and mapped below.

---

## 🎯 Candidate & Machine Profile
- **Candidate Name**: **Shreya Suman**
- **Assigned Role**: Person C / Mac 3 — Backend Microservice A Lead & Standby Edge Host
- **Local Machine IP**: `10.7.6.84` (`en0`)
- **Gateway**: `10.7.0.1` | **Subnet**: `255.255.224.0` (`/19`)
- **Key Services Hosted**:
  - Backend Microservice A (Node.js Express on TCP port `3001`)
  - HTTP Caching Endpoint (`/api/cached` with ETag & RFC 9111 support)
  - Standby Edge Nginx Proxy (Phase 2 Ext E on Port `8443`)
  - Packet Filter Firewall (`pfctl` on port `3001`)

---

## 📊 Rubric Evaluation & Fast-Check Matrix

| Phase / Extension | Evaluation Criteria | Primary Evidence File | Fast Verification Command |
| :--- | :--- | :--- | :--- |
| **Phase 1: Task C (Backend Service A)** | Express server running on `0.0.0.0:3001` returning header `X-Backend: A` | [`evidence/final_combined_evidence/load-balancing/backend-a-local-test.txt`](../evidence/final_combined_evidence/load-balancing/backend-a-local-test.txt) | `curl -i http://localhost:3001/api/status` |
| **Phase 1: Task F (HTTP Caching / 304)**| Sends `Cache-Control: public, max-age=60` and `ETag`; replies `304 Not Modified` on `If-None-Match` | [`evidence/final_combined_evidence/caching/caching-and-304-evidence.txt`](../evidence/final_combined_evidence/caching/caching-and-304-evidence.txt) | `curl -i -H 'If-None-Match: "39-jxvt8kclwpAy7qZ0gJ/MRIVczo0"' http://localhost:3001/api/cached` |
| **Phase 2: Ext C (pf Service Isolation)**| Blocks direct unauthorized client connections while allowing Edge IPs to port 3001 | [`phase2/personC/firewall/backend_a_isolation.pf`](../phase2/personC/firewall/backend_a_isolation.pf) | `sudo pfctl -sr \| grep 3001` |
| **Phase 2: Ext D (Failure Simulation)** | Simulates service outage on Backend A on cue during live HA failover evaluation | [`evidence/phase2/personB/extD_ha_failover_local.txt`](../evidence/phase2/personB/extD_ha_failover_local.txt) | Stop/Restart `server.js` |
| **Phase 2: Ext E (Standby Edge Host)** | Runs Standby Nginx on port 8443 returning `X-Edge: Standby-Mac3` upon DNS cutover | [`evidence/phase2/personC/extE_standby_edge_local.txt`](../evidence/phase2/personC/extE_standby_edge_local.txt) | `curl -sI https://127.0.0.2:8443/api/status --cacert personB/tls/ca.crt \| grep "X-Edge: Standby"` |

---

## 🧠 Viva Voce Oral Defense — Key Answers for Person C

### 1. How does the ETag and 304 Not Modified caching flow function?
- In `server.js`, we serve static content with an `ETag` computed from the body hash.
- On the initial request, the client receives the payload and saves the `ETag`.
- On subsequent requests within the validity window, the client sends `If-None-Match: "<etag>"`.
- The server compares the received tag with the current hash. Since it matches, it responds with `HTTP/1.1 304 Not Modified` without transmitting the body payload, saving network throughput and reducing latency.

### 2. Why must Backend A bind to `0.0.0.0` rather than `127.0.0.1`?
- Binding to `127.0.0.1` (loopback) restricts socket access strictly to local processes on Mac 3.
- To accept requests routed across the physical LAN from the Edge Proxy on Mac 2 (`10.7.3.128`), the socket must listen on `0.0.0.0` (all available IPv4 network interfaces).

### 3. What is the security purpose of Packet Filter (`pf`) Service Isolation?
- Without a firewall, any client on the LAN can bypass the Edge Proxy and access Backend A directly over unencrypted HTTP.
- Using `pfctl` rules (`phase2/personC/firewall/backend_a_isolation.pf`), we permit incoming TCP packets on port 3001 **only** if the source IP is Mac 2 (`10.7.3.128`) or Mac 3 (`10.7.6.84`). All direct connections from arbitrary client IPs are blocked at the kernel level.
