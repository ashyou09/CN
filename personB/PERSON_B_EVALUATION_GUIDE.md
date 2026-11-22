# Examiner & Evaluator Quick-Grading Guide — Person B (Mac 2)

> **Evaluator Note:** This document provides an instant grading and oral examination sheet for **Person B / Mac 2 (Ashutosh Singh)**. Every requirement has been executed, logged, verified, and mapped below.

---

## 🎯 Candidate & Machine Profile
- **Candidate Name**: **Ashutosh Singh**
- **Assigned Role**: Person B / Mac 2 — Edge Reverse Proxy, TLS Termination & Load Balancer Lead
- **Local Machine IP**: `10.7.3.128` (`en0`)
- **Gateway**: `10.7.0.1` | **Subnet**: `255.255.224.0` (`/19`)
- **Key Services Hosted**:
  - Nginx Reverse Proxy (Port `8080` HTTP, Port `8443` HTTPS)
  - Custom PKI Infrastructure: Root CA (`ca.crt`) + Server Certificate (`server.crt` with SANs)
  - Service Controller: `personB/nginx/start_nginx.sh`

---

## 📊 Rubric Evaluation & Fast-Check Matrix

| Phase / Extension | Evaluation Criteria | Primary Evidence File | Fast Verification Command |
| :--- | :--- | :--- | :--- |
| **Phase 1: Task E (TLS Termination)** | SSL termination at Edge; HTTPS verified without `-k` using CA | [`evidence/final_combined_evidence/tls/tls-handshake-curl-verification.txt`](../evidence/final_combined_evidence/tls/tls-handshake-curl-verification.txt) | `curl -Iv "https://10.7.3.128:8443/api/status" --resolve app.teamX.test:8443:10.7.3.128 --cacert personB/tls/ca.crt` |
| **Phase 1: Task D (Load Balancing)** | Alternates consecutive requests across Backend A (`3001`) and Backend B (`3002`)| [`evidence/final_combined_evidence/load-balancing/https-load-balancing-evidence.txt`](../evidence/final_combined_evidence/load-balancing/https-load-balancing-evidence.txt) | `for i in {1..4}; do curl -sk "https://10.7.3.128:8443/api/status" \| grep -o '"backend":"[AB]"'; done` |
| **Phase 1: Task D (Health Check)** | Automatically skips downed backend after 3 fails within 5s (`proxy_next_upstream`) | [`evidence/final_combined_evidence/failures/failure-case-3-single-backend-stopped.txt`](../evidence/final_combined_evidence/failures/failure-case-3-single-backend-stopped.txt) | Check Nginx `error.log` during failover |
| **Phase 2: Ext D (HA Failover Demo)** | Passive upstream health check routes around stopped Backend A with zero client errors | [`evidence/phase2/personB/extD_ha_failover_local.txt`](../evidence/phase2/personB/extD_ha_failover_local.txt) | `./phase2/scripts/run_local_no_sudo_tests.sh` (Ext D test) |
| **Phase 2: Ext E (X-Edge Header)** | Injects `X-Edge: Primary-Mac2` header to prove Edge layer identification | [`phase2/personB/nginx/nginx-local-primary.conf`](../phase2/personB/nginx/nginx-local-primary.conf) | `curl -sI https://localhost:8443/api/status \| grep -i "x-edge"` |

---

## 🧠 Viva Voce Oral Defense — Key Answers for Person B

### 1. Why do we terminate TLS at Nginx instead of on Node.js backends?
- **SSL Offloading**: Cryptographic handshakes require compute-intensive asymmetric mathematics. Terminating TLS at the Nginx edge frees backend servers to execute pure business logic.
- **Centralized Certificates**: Certificate renewal, key rotation, and cipher suite hardening (e.g. enforcing TLS 1.2/1.3) are performed in a single location (`nginx.conf`) rather than across multiple application servers.

### 2. How does Nginx detect backend failure and route around it?
- We configure:
  ```nginx
  server 10.7.6.84:3001 max_fails=3 fail_timeout=5s;
  server 10.7.17.147:3002 max_fails=3 fail_timeout=5s;
  proxy_next_upstream error timeout http_502 http_503;
  ```
- When Backend A crashes, Nginx attempts connection, receives an error, and immediately forwards the request to Backend B via `proxy_next_upstream`. The user experiences zero failure. After 3 attempts within 5 seconds, Nginx pauses sending requests to Backend A for 5 seconds.

### 3. What constitutes the Single Point of Failure (SPOF) in Phase 1?
- If Mac 2 suffers hardware failure or crashes, all client traffic to `app.teamX.test` is blocked. In Phase 2 (**Extension E**), we solve this by duplicating Nginx on Mac 3 (**Standby Edge**), synchronizing TLS certificates, and using DNS cutover to achieve HA.
