# Person B — Mac 2: Edge Reverse Proxy, TLS & Load Balancer

> **Team Member:** **Ashutosh Singh**  
> **Course:** Computer Networks Laboratory  
> **Machine Role:** Mac 2 · Edge Proxy, TLS Termination & Load Balancer Lead  
> **Evaluator Quick Guide:** [`personB/PERSON_B_EVALUATION_GUIDE.md`](PERSON_B_EVALUATION_GUIDE.md)

---

## 🎯 Role Overview

Person B operates the **Edge Reverse Proxy & Load Balancer** using **Nginx**. In an enterprise cloud infrastructure, this role corresponds to an **Application Load Balancer (ALB)** or **Cloudflare Reverse Proxy / API Gateway**.

It provides:
1. **Single Entry Point**: Masks internal backend topologies; clients only ever communicate with Mac 2.
2. **TLS / HTTPS Termination**: Decrypts incoming traffic using CA-signed certificates, saving backend CPU cycles (SSL Offloading).
3. **Round-Robin Load Balancing**: Evenly distributes requests across Backend A (Mac 3: `3001`) and Backend B (Mac 4: `3002`).
4. **Passive Health Monitoring**: Automatically reroutes traffic if a backend fails (`max_fails=3 fail_timeout=5s`).

```text
                     Client (Mac 1 / 4)
                            │
                            │ HTTPS (Port 8443)
                            ▼
                 ┌──────────────────────┐
                 │    Person B (Mac 2)  │
                 │      Nginx Edge      │
                 │                      │
                 │  • TLS Termination   │
                 │  • Round-Robin LB    │
                 │  • Injects X-Edge    │
                 └──────────┬───────────┘
                            │
             Plaintext HTTP │ (Internal LAN)
                     ┌──────┴──────┐
                     │             │
                     ▼             ▼
              ┌────────────┐ ┌────────────┐
              │ Backend A  │ │ Backend B  │
              │ Mac 3:3001 │ │ Mac 4:3002 │
              │ (Person C) │ │ (Person D) │
              └────────────┘ └────────────┘
```

---

## ⚙️ Service Specifications

| Parameter | Details |
| :--- | :--- |
| **Component** | Nginx Reverse Proxy |
| **HTTP Port** | `8080` (Redirects to HTTPS or serves plaintext diagnostic requests) |
| **HTTPS Port**| `8443` (Terminates TLS 1.2 / 1.3) |
| **Certificates** | Root CA: `personB/tls/ca.crt` \| Server Cert: `personB/tls/server.crt` |
| **Balancing Strategy** | Round-Robin (`upstream backend_pool`) |
| **Target Backends** | Backend A (`10.7.6.84:3001`), Backend B (`10.7.17.147:3002`) |
| **Service Script** | [`personB/nginx/start_nginx.sh`](nginx/start_nginx.sh) |

---

## 🚀 Setup & Execution Guide

### 1. Configure Upstream Backends
Edit `upstream backend_pool` in [`personB/nginx/nginx.conf`](nginx/nginx.conf):
```nginx
upstream backend_pool {
    server 10.7.6.84:3001 max_fails=3 fail_timeout=5s;
    server 10.7.17.147:3002 max_fails=3 fail_timeout=5s;
}
```

### 2. Manage Nginx Service
```bash
# Test configuration syntax
./personB/nginx/start_nginx.sh test

# Start Nginx
./personB/nginx/start_nginx.sh start

# Check listener sockets
./personB/nginx/start_nginx.sh status

# Reload configuration after changes without dropping connections
./personB/nginx/start_nginx.sh reload

# Stop Nginx
./personB/nginx/start_nginx.sh stop
```

### 3. Generate TLS Certificates & Root CA
```bash
cd personB/tls
./generate_cert.sh
# Creates ca.crt, ca.key, server.crt, and server.key with Subject Alternative Names (SANs)
```

---

## 🧪 Verification Commands

```bash
# 1. Verify TLS Handshake & Certificate SANs
curl -Iv "https://127.0.0.1:8443/api/status" --resolve app.teamX.test:8443:127.0.0.1 --cacert personB/tls/ca.crt

# 2. Verify Round-Robin Alternation (Sends 4 requests)
for i in {1..4}; do
  curl -s --cacert personB/tls/ca.crt "https://app.teamX.test:8443/api/status" | grep -o '"backend":"[AB]"'
done
```

---

## 🛡️ Phase 2 Contributions (Review 2)
- **Extension D**: Demonstrated High-Availability failover behavior when backends crash without throwing client-facing errors.
- **Extension E**: Added `X-Edge: Primary-Mac2` header and shared TLS certificates/configurations for Standby Edge provisioning on Mac 3.
- **Phase 2 Configs & Runbook**: See [`phase2/personB/`](../phase2/personB/) and [`phase2/docs/EVALUATOR_RUBRIC_MAPPING.md`](../phase2/docs/EVALUATOR_RUBRIC_MAPPING.md).
