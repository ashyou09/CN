# Private Network Service Platform

> A production-grade distributed service platform deployed across four physical nodes on a private local area network, featuring authoritative DNS resolution, TLS termination, round-robin load balancing, RFC 9111 HTTP caching, and stateful packet filtering.

---

## Overview

The **Private Network Service Platform** is an enterprise-style distributed system designed and implemented for the Computer Networks Laboratory. The platform replicates modern multi-tier cloud infrastructure (such as AWS Route 53, Cloudflare/Application Load Balancers, and private VPC microservices) across physical hardware without relying on external cloud providers.

The architecture strictly separates concerns across three primary network tiers:
1. **Name Resolution Tier (Private DNS)**: Provides authoritative, isolated domain resolution for the `.test` top-level domain.
2. **Edge Ingress Tier (Reverse Proxy & TLS Termination)**: Acts as the single entry point, offloading TLS computation and intelligently balancing traffic.
3. **Application Tier (Microservices)**: Runs containerized/Node.js origin backends inside a protected private network segment.

---

## System Architecture

```text
                                  CLIENT NODE (Mac 1 / Mac 4)
                                                │
                          1. Query DNS (:53 UDP)│ 2. HTTPS Request (:8443 TCP)
                                                ▼
         ┌────────────────────────┐           ┌────────────────────────────────┐
         │   PRIMARY DNS SERVER   │           │    PRIMARY EDGE PROXY (Mac 2)  │
         │   Mac 1 (Pankaj Baid)  │           │    Ashutosh Singh              │
         │   dnsmasq (Port 53)    │           │    Nginx (Port 8080 / 8443)    │
         │                        │           │    • TLS 1.2 / 1.3 Offloading  │
         │   app.teamX.test ─────┼──────────>│    • Round-Robin Balancer      │
         └────────────────────────┘           │    • Injects X-Edge Header     │
                                              └───────────────┬────────────────┘
                                                              │
                                     Internal Plaintext HTTP  │ (Private DMZ)
                                     Round-Robin Distribution │
                                              ┌───────────────┴───────────────┐
                                              │                               │
                                              ▼ Port 3001                     ▼ Port 3002
                               ┌──────────────────────────────┐┌──────────────────────────────┐
                               │      BACKEND SERVICE A       ││      BACKEND SERVICE B       │
                               │      Mac 3 (Shreya Suman)    ││   Mac 4 (Ranvendra Singh)    │
                               │      Node.js Express API     ││      Node.js Express API     │
                               │      • Header: X-Backend: A  ││      • Header: X-Backend: B  │
                               │      • RFC 9111 HTTP Caching ││      • Packet Capture Lead   │
                               │      • pfctl Service Guard   ││      • pfctl Service Guard   │
                               └──────────────────────────────┘└──────────────────────────────┘
```

---

## Node Allocation & Network Inventory

The platform operates across four dedicated physical macOS nodes connected via a local Wi-Fi / Ethernet subnet (`10.7.0.0/19`):

| Node | Team Member | Primary Role | Core Software | Ports & Protocols |
| :--- | :--- | :--- | :--- | :--- |
| **Mac 1** | **Pankaj Baid** | Private DNS Authority & Client Lead | `dnsmasq`, `dig` | Port `53` (UDP/TCP) |
| **Mac 2** | **Ashutosh Singh** | Edge Proxy, TLS Termination & Load Balancer | `nginx`, OpenSSL | Ports `8080` (HTTP), `8443` (HTTPS) |
| **Mac 3** | **Shreya Suman** | Backend Service A & Standby Edge Lead | Node.js, `pfctl`, Nginx | Port `3001` (`X-Backend: A`), `8443` |
| **Mac 4** | **Ranvendra Pratap Singh** | Backend Service B, Packet Capture & Backup DNS | Node.js, `pfctl`, `dnsmasq`, Wireshark | Port `3002` (`X-Backend: B`), `53` |

---

## Core Features & Concepts Demonstrated

### 1. Authoritative Private DNS (`dnsmasq`)
- Binds to port `53` (UDP/TCP) to serve an authoritative private zone (`.test`).
- Maps `app.teamX.test` and `api.teamX.test` directly to the Edge Proxy IP, eliminating dependencies on external Internet root servers.
- Supports low Time-to-Live (TTL = `30s`) configurations to enable rapid service migration without persistent stale client caching.

### 2. Edge Reverse Proxy & SSL/TLS Offloading (`nginx`)
- Centralizes TLS encryption and certificate management at the edge. Application backends remain pure HTTP, conserving compute resources.
- Employs a custom Public Key Infrastructure (PKI): local Root Certificate Authority (`ca.crt`) signs server certificates (`server.crt`) with Subject Alternative Names (SANs).
- Injects standard tracing headers (`X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Edge`) to preserve client context and verify proxy execution.

### 3. Load Balancing & Resilience
- Implements active round-robin load distribution across backend microservices.
- Utilizes passive health checks (`max_fails=3 fail_timeout=5s`) combined with `proxy_next_upstream` to route around backend failures automatically with zero client-perceived errors.

### 4. Bandwidth Optimization via HTTP Caching (RFC 9111)
- Microservices emit strong `ETag` validators and `Cache-Control: public, max-age=60` headers on cacheable endpoints (`/api/cached`).
- Validates conditional client requests (`If-None-Match`), issuing `HTTP/1.1 304 Not Modified` without transmitting body payloads over the LAN.

### 5. Service Isolation & Zero-Trust Defense (`pfctl`)
- Employs the macOS Darwin kernel's Packet Filter (`pf`) to isolate backend instances.
- Directly drops or rejects unauthorized client connections on ports `3001` and `3002`, ensuring backends only accept traffic forwarded by authorized Edge Proxies.

### 6. High Availability & Disaster Recovery (Phase 2)
- **Backup DNS Resolver**: Mac 4 hosts an independent secondary resolver, allowing seamless client failover if Mac 1 goes offline.
- **Standby Edge Proxy**: Mac 3 runs a synchronized standby Nginx instance, enabling instant cutover upon primary edge failure.

---

## Getting Started

### Prerequisites
- macOS (tested on Apple Silicon and Intel)
- Node.js (v18+) and `npm`
- Homebrew packages: `nginx`, `dnsmasq`, `bind` (for `dig`), `curl`, and `wireshark`

---

### Option A: Running Locally on a Single Machine (Development & Testing)

From the repository root, start services with npm scripts:

```bash
# 1. Start Backend A (Port 3001)
npm run start:a

# 2. Start Backend B (Port 3002)
npm run start:b

# 3. Start Primary Edge Nginx (Ports 8080 & 8443)
npm run start:nginx

# 4. Launch the Interactive Dashboard & Visualizer
npm run demo
```
Open **[http://localhost:5050](http://localhost:5050)** to inspect real-time topology flow, run automated system probes, and test failure scenarios.

To stop or reload Nginx:
```bash
npm run reload:nginx   # Reload configuration without dropping connections
npm run stop:nginx     # Stop the proxy service
```

---

### Option B: Deploying Across the 4 Physical Machines (LAN Deployment)

#### Step 1: Discover Local Network IPs
On each Mac, check the active Wi-Fi IP address:
```bash
ipconfig getifaddr en0
```
Update the IP addresses in [`docs/machine-details.md`](docs/machine-details.md).

#### Step 2: Start Backend Microservices
- **On Mac 3 (Backend A)**:
  ```bash
  cd personC/backendA
  npm install && npm start
  # Listens on 0.0.0.0:3001, returns 'X-Backend: A'
  ```
- **On Mac 4 (Backend B)**:
  ```bash
  cd personD/backendB
  npm install && npm start
  # Listens on 0.0.0.0:3002, returns 'X-Backend: B'
  ```

#### Step 3: Configure & Start Edge Proxy (Mac 2)
1. Edit `upstream backend_pool` in [`personB/nginx/nginx.conf`](personB/nginx/nginx.conf) with the recorded IPs of Mac 3 and Mac 4:
   ```nginx
   upstream backend_pool {
       server <MAC3_IP>:3001 max_fails=3 fail_timeout=5s;
       server <MAC4_IP>:3002 max_fails=3 fail_timeout=5s;
   }
   ```
2. Start Nginx:
   ```bash
   ./personB/nginx/start_nginx.sh test
   ./personB/nginx/start_nginx.sh start
   ```

#### Step 4: Configure & Start Private DNS Authority (Mac 1)
1. Update `dnsmasq.conf` with Mac 2's IP:
   ```bash
   ./personA/dns/setup_dns.sh <MAC2_IP>
   ```
2. Start `dnsmasq`:
   ```bash
   sudo dnsmasq -C personA/dns/dnsmasq.conf -d
   ```

#### Step 5: Configure Client Machines (Mac 1 / Mac 4)
Configure the system to route `.test` queries to Mac 1:
```bash
sudo mkdir -p /etc/resolver
printf 'nameserver %s\n' "<MAC1_IP>" | sudo tee /etc/resolver/teamX.test
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```
Import and trust the local Root CA in the macOS System Keychain:
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain personB/tls/ca.crt
```

---

## Verification & Testing

### 1. DNS Resolution Verification
```bash
dig @<MAC1_IP> app.teamX.test +short
# Expected output: IP address of Mac 2
```

### 2. End-to-End Secure HTTPS Check
```bash
curl -i "https://app.teamX.test:8443/api/status"
# Expected response: HTTP/1.1 200 OK with X-Edge and X-Backend headers
```

### 3. Round-Robin Load Balancing Verification
```bash
for i in {1..4}; do
  curl -s "https://app.teamX.test:8443/api/status" | grep -o '"backend":"[AB]"'
done
# Expected: Alternating responses between Backend A and Backend B
```

### 4. HTTP Caching (RFC 9111) Validation
```bash
# Initial request returns ETag
curl -i "https://app.teamX.test:8443/api/cached"

# Subsequent conditional request returns 304 Not Modified
curl -i -H 'If-None-Match: "39-jxvt8kclwpAy7qZ0gJ/MRIVczo0"' "https://app.teamX.test:8443/api/cached"
```

### 5. Automated Single-Mac Test Suite
Run the comprehensive automated non-sudo test harness:
```bash
./phase2/scripts/run_local_no_sudo_tests.sh
```

---

## Fault Tolerance & Resilience Scenarios

The platform was subjected to five deliberate failure injection tests to validate multi-layer fault handling:

| Scenario | Injected Condition | Protocol Layer | System Behavior & Observation |
| :--- | :--- | :--- | :--- |
| **D1: DNS Resolver Outage** | Primary DNS stopped | Layer 7 (DNS) | Name lookup times out; Layer 3 IP ping remains operational. |
| **D2: DNS Misdirection** | DNS points to non-proxy host | Layer 7 ➔ Layer 4 | Name resolves, but target host returns TCP `[RST, ACK]` (`Connection refused`). |
| **D3: Single Backend Outage** | Backend A process terminated | Layer 7 Upstream | Edge proxy detects failure; transparently routes 100% traffic to Backend B. |
| **D4: Total Backend Outage** | Both backends terminated | Layer 7 Application | TLS handshake succeeds; Edge returns `HTTP 502 Bad Gateway`. |
| **D5: Port Mismatch** | Client requests port `8444` | Layer 4 (Transport) | Kernel resets connection immediately (`Connection refused`). |

Full root-cause analyses and packet signatures are available in [`docs/FAILURE_ANALYSIS_RUNBOOK.md`](docs/FAILURE_ANALYSIS_RUNBOOK.md).

---

## Repository Structure

```text
CN/
├── personA/                    # Mac 1: Private DNS Resolver (Pankaj Baid)
│   ├── dns/                    # dnsmasq configuration and setup scripts
│   ├── client/                 # Client verification scripts
│   └── README.md
│
├── personB/                    # Mac 2: Edge Reverse Proxy & TLS (Ashutosh Singh)
│   ├── nginx/                  # Nginx proxy, upstream, and SSL configurations
│   ├── tls/                    # Root CA, server certificates, and OpenSSL scripts
│   └── README.md
│
├── personC/                    # Mac 3: Backend Service A & Standby Edge (Shreya Suman)
│   ├── backendA/               # Node.js Express REST API microservice (Port 3001)
│   └── README.md
│
├── personD/                    # Mac 4: Backend Service B & Packet Capture (Ranvendra Singh)
│   ├── backendB/               # Node.js Express REST API microservice (Port 3002)
│   ├── client/                 # Automated test client harness
│   └── README.md
│
├── demo/                       # Interactive Demonstration Dashboard & Visualizer
│   ├── server.js               # Node.js monitoring and test server (Port 5050)
│   ├── public/                 # Real-time network flow visualizer & packet inspector
│   ├── run_demo.sh             # Dashboard launcher script
│   └── README.md
│
├── docs/                       # Technical Specifications & Architecture Guides
│   ├── PACKET_JOURNEY_EXPLAINED.md       # Detailed 5-layer packet lifecycle walkthrough
│   ├── VIVA_QUESTIONS_AND_DEFENSE.md     # Technical defense & viva preparation guide
│   ├── NETWORK_SECURITY_AND_ISOLATION.md # DMZ architecture and pfctl firewall guide
│   ├── FAILURE_ANALYSIS_RUNBOOK.md       # Analysis of failure cases D1–D5
│   ├── TROUBLESHOOTING_PLAYBOOK.md       # Systematic 5-layer triage methodology
│   ├── topology.md                       # Network topology diagram
│   └── machine-details.md                # Physical hardware inventory
│
├── phase2/                     # Phase 2 High Availability & Hardening Bundle
│   ├── personA/                # Primary DNS configs (30s TTL)
│   ├── personB/                # Primary Edge configs (HA failover)
│   ├── personC/                # Backend A firewall rules & Standby Edge
│   ├── personD/                # Backup DNS resolver & Backend B firewall rules
│   ├── scripts/                # Automated verification scripts
│   └── docs/                   # Phase 2 final report & updated topology
│
├── evidence/                   # Packet Traces (.pcap) & Execution Evidence
│   ├── wireshark/              # Raw packet captures and dissection logs
│   ├── failures/               # Outputs for all 5 deliberate failure tests
│   └── phase2/                 # Phase 2 verification logs for each node
│
├── projectflow.md              # Phase 1 execution runbook
├── PHASE2_HANDOVER.md          # Phase 2 team handover and integration guide
└── package.json
```

---

## Technical Documentation & References

For in-depth architectural details, implementation guides, and protocol analyses:

- **Packet-Level Lifecycle**: [`docs/PACKET_JOURNEY_EXPLAINED.md`](docs/PACKET_JOURNEY_EXPLAINED.md)
- **Technical Defense & Viva Reference**: [`docs/VIVA_QUESTIONS_AND_DEFENSE.md`](docs/VIVA_QUESTIONS_AND_DEFENSE.md)
- **Firewall & Security Architecture**: [`docs/NETWORK_SECURITY_AND_ISOLATION.md`](docs/NETWORK_SECURITY_AND_ISOLATION.md)
- **Fault Injection & Recovery Guide**: [`docs/FAILURE_ANALYSIS_RUNBOOK.md`](docs/FAILURE_ANALYSIS_RUNBOOK.md)
- **Rapid Troubleshooting Playbook**: [`docs/TROUBLESHOOTING_PLAYBOOK.md`](docs/TROUBLESHOOTING_PLAYBOOK.md)
- **Phase 2 Architecture & Final Report**: [`phase2/docs/PHASE2_FINAL_REPORT.md`](phase2/docs/PHASE2_FINAL_REPORT.md)
- **Individual Role Guides**:
  - Person A (DNS Lead): [`personA/PERSON_A_EVALUATION_GUIDE.md`](personA/PERSON_A_EVALUATION_GUIDE.md)
  - Person B (Edge Lead): [`personB/PERSON_B_EVALUATION_GUIDE.md`](personB/PERSON_B_EVALUATION_GUIDE.md)
  - Person C (Backend A Lead): [`personC/PERSON_C_EVALUATION_GUIDE.md`](personC/PERSON_C_EVALUATION_GUIDE.md)
  - Person D (Backend B Lead): [`personD/PERSON_D_EVALUATION_GUIDE.md`](personD/PERSON_D_EVALUATION_GUIDE.md)
