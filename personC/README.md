# Person C — Mac 3: Backend Server A & Standby Edge Host

> **Team Member:** **Shreya Suman**  
> **Course:** Computer Networks Laboratory  
> **Machine Role:** Mac 3 · Backend Microservice A Lead & Standby Edge Proxy  
> **Evaluator Quick Guide:** [`personC/PERSON_C_EVALUATION_GUIDE.md`](PERSON_C_EVALUATION_GUIDE.md)

---

## 🎯 Role Overview

Person C operates **Backend Server A**, a lightweight, high-performance Node.js Express REST API microservice.

In our multi-tier architecture:
1. **Application Processing**: Serves application endpoints (`/`, `/api/status`, `/api/cached`).
2. **Identification**: Attaches the explicit response header `X-Backend: A` so clients and proxies can verify load balancing.
3. **HTTP Caching (RFC 9111)**: Implements conditional caching using `ETag` and `Cache-Control` to conserve LAN bandwidth.
4. **Phase 2 Standby Edge**: Hosts the secondary Nginx Edge instance to guarantee high availability during Edge failure.

```text
               Nginx Edge (Mac 2 / Mac 3)
                           │
                           │ HTTP Request (Port 3001)
                           ▼
            ┌─────────────────────────────┐
            │       Person C (Mac 3)      │
            │      Backend Service A      │
            │                             │
            │  • Binds to 0.0.0.0:3001    │
            │  • Attaches X-Backend: A    │
            │  • ETag Validation (304)   │
            │  • pfctl Service Isolation  │
            └─────────────────────────────┘
```

---

## ⚙️ Service Specifications

| Parameter | Details |
| :--- | :--- |
| **Component** | Node.js Express Microservice |
| **Port** | `3001` (TCP) |
| **Bind Host** | `0.0.0.0` (Accepts traffic from all LAN interfaces) |
| **Response Headers** | `X-Backend: A`, `Content-Type: application/json` |
| **Caching Support** | `Cache-Control: public, max-age=60`, strong `ETag` digest |
| **Run Script** | [`personC/backendA/run.sh`](backendA/run.sh) |

---

## 🚀 Setup & Execution Guide

### 1. Start Backend Server A
```bash
cd personC/backendA
./run.sh
# Or manually:
npm install
npm start
```

### 2. Verify Port Listener & Local Health
```bash
# Check socket state
lsof -nP -iTCP:3001 -sTCP:LISTEN

# Test basic status
curl -i http://localhost:3001/api/status
```

---

## 💾 RFC 9111 HTTP Caching & 304 Validation

Backend A demonstrates modern HTTP caching mechanics:

```text
Client                                             Backend A
  │                                                    │
  │ 1. GET /api/cached                                 │
  ├───────────────────────────────────────────────────>│
  │ 2. 200 OK (ETag: "hash", Cache-Control: max-age=60)│
  │<───────────────────────────────────────────────────┤
  │                                                    │
  │ [Resource cached locally on Client]                │
  │                                                    │
  │ 3. GET /api/cached (If-None-Match: "hash")         │
  ├───────────────────────────────────────────────────>│
  │ 4. 304 Not Modified (No body payload transferred)  │
  │<───────────────────────────────────────────────────┤
```

### Test Commands:
```bash
# Step 1: Initial request (Returns 200 OK with ETag)
curl -i http://localhost:3001/api/cached

# Step 2: Conditional request (Returns 304 Not Modified)
curl -i -H 'If-None-Match: "39-jxvt8kclwpAy7qZ0gJ/MRIVczo0"' http://localhost:3001/api/cached
```

---

## 🛡️ Phase 2 Contributions (Review 2)
- **Extension C**: Implemented macOS `pfctl` firewall rules (`phase2/personC/firewall/backend_a_isolation.pf`) to block direct unauthorized client connections on port 3001.
- **Extension D**: Participated in HA failover simulation by gracefully stopping and restarting Backend A on cue.
- **Extension E**: Provisioned and executed **Standby Edge Nginx** on port 8443 returning `X-Edge: Standby-Mac3`.
- **Phase 2 Configs & Runbook**: See [`phase2/personC/`](../phase2/personC/) and [`phase2/docs/EVALUATOR_RUBRIC_MAPPING.md`](../phase2/docs/EVALUATOR_RUBRIC_MAPPING.md).
