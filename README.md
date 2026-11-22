# Private Network Service Platform — Phase 1 & Phase 2

> **Computer Networks Laboratory Course Project**  
> An enterprise-grade, four-node distributed service platform running across physical macOS nodes on a private local area network.

---

## ⚡ 60-Second Evaluator & Fast-Grading Cheat Sheet

Welcome, Professors and Examiners! To evaluate our project in under 2 minutes:

### 1. Launch the Live Interactive Dashboard (One-Click)
```bash
npm run demo
# Open in your browser: http://localhost:5050
```
- Click **"Run All Probes"** to verify all **8/8 automated compliance tests** across DNS, TCP, TLS, Load Balancing, and Caching.
- Switch between **Healthy** and **Failure Scenarios (D1–D5)** to watch dynamic packet flow animations and download binary packet captures (`.pcap`).

### 2. Run the Automated Phase 2 Test Suite
```bash
./phase2/scripts/run_local_no_sudo_tests.sh
```
- Automatically validates **Backup DNS (Ext A)**, **DNS TTL & Cutover (Ext B)**, **HA Backend Failover (Ext D)**, **Standby Edge Migration (Ext E)**, and **Layer Diagnostics (Ext F)**. Logs saved directly to [`evidence/phase2/`](evidence/phase2/).

### 3. Fast Links for Evaluation & Viva Voce
- **🎓 25-Question Viva Voce Master Cheat Sheet:** [`docs/VIVA_QUESTIONS_AND_DEFENSE.md`](docs/VIVA_QUESTIONS_AND_DEFENSE.md)
- **🔬 End-to-End 5-Layer Packet Journey:** [`docs/PACKET_JOURNEY_EXPLAINED.md`](docs/PACKET_JOURNEY_EXPLAINED.md)
- **🛡️ Network Security & DMZ Isolation:** [`docs/NETWORK_SECURITY_AND_ISOLATION.md`](docs/NETWORK_SECURITY_AND_ISOLATION.md)
- **💥 Deliberate Failure Analysis Runbook:** [`docs/FAILURE_ANALYSIS_RUNBOOK.md`](docs/FAILURE_ANALYSIS_RUNBOOK.md)
- **🕵️ 5-Layer Rapid Diagnostic Playbook (Ext F):** [`docs/TROUBLESHOOTING_PLAYBOOK.md`](docs/TROUBLESHOOTING_PLAYBOOK.md)
- **📋 50-Mark Phase 2 Rubric Mapping:** [`phase2/docs/EVALUATOR_RUBRIC_MAPPING.md`](phase2/docs/EVALUATOR_RUBRIC_MAPPING.md)

---

## 👥 Team Members & Candidate Grading Sheets

Every student has an individual, structured grading guide mapping their contributions to the course syllabus:

| Person | Team Member | Assigned Role & Machine | Key Components | Individual Defense Guide |
| :---: | :--- | :--- | :--- | :---: |
| **Person A** | **Pankaj Baid** | **Mac 1** · Private DNS Lead & Test Client | `dnsmasq`, authoritative `.test` zone resolution, client dig suite (`53`) | [`personA/PERSON_A_EVALUATION_GUIDE.md`](personA/PERSON_A_EVALUATION_GUIDE.md) |
| **Person B** | **Ashutosh Singh** | **Mac 2** · Edge Proxy & TLS Lead | `nginx`, TLS 1.2/1.3 termination, round-robin load balancer (`8080`, `8443`) | [`personB/PERSON_B_EVALUATION_GUIDE.md`](personB/PERSON_B_EVALUATION_GUIDE.md) |
| **Person C** | **Shreya Suman** | **Mac 3** · Backend Service A Lead | Node.js Express API (`3001`), HTTP caching & ETag, Standby Edge (`8443`) | [`personC/PERSON_C_EVALUATION_GUIDE.md`](personC/PERSON_C_EVALUATION_GUIDE.md) |
| **Person D** | **Ranvendra Pratap Singh** | **Mac 4** · Backend B & Capture Lead | Node.js Express API (`3002`), Wireshark trace analysis, Backup DNS (`53`) | [`personD/PERSON_D_EVALUATION_GUIDE.md`](personD/PERSON_D_EVALUATION_GUIDE.md) |

---

## 🎓 Pedagogical Intent & Learning Outcomes

This project is engineered to provide hands-on practical mastery over fundamental networking principles:

1. **Multi-Tier Separation of Concerns**:
   - Understanding why modern enterprise architectures decouple **Name Resolution (DNS)**, **Edge Ingress / TLS Offloading (Reverse Proxy)**, and **Internal Origin Processing (Microservices)**.
2. **Transport & Application Layer Security**:
   - Building a private Public Key Infrastructure (PKI): Root CA generation, CSR signing, Subject Alternative Names (SANs) matching, and installing trust anchors in the OS Keychain to achieve trusted HTTPS without insecure flags.
3. **High Availability, Redundancy & Fault Tolerance**:
   - Implementing active round-robin load distribution with passive upstream health checking (`max_fails`, `fail_timeout`).
   - Mitigating Single Points of Failure (SPOFs) via redundant resolvers (**Backup DNS on Mac 4**) and redundant edge proxies (**Standby Edge on Mac 3**).
4. **Bandwidth Optimization via HTTP Caching (RFC 9111)**:
   - Eliminating redundant payload transmission over the LAN using conditional requests (`If-None-Match`), digest verification (`ETag`), and `304 Not Modified` responses.
5. **Zero-Trust Network Segmentation & Firewalls**:
   - Implementing kernel-level stateful packet filtering (`pfctl` on macOS) to isolate backend application servers in a private DMZ, strictly rejecting unauthorized direct client traffic.
6. **Packet Forensics & Packet-Level Analysis**:
   - Capturing and dissecting live Ethernet frames, ARP requests, TCP 3-way handshakes (`SYN ➔ SYN-ACK ➔ ACK`), TLS records, and TCP teardown flags using Wireshark and `tcpdump`.
7. **Systematic 5-Layer Troubleshooting (Bottom-Up Methodology)**:
   - Rapidly diagnosing unknown network faults by progressing logically: Physical/Data Link ➔ Network (IP/ICMP) ➔ Transport (TCP/UDP) ➔ Application/Presentation (DNS/TLS/HTTP).

---

## 🏗️ Repository Architecture

```text
CN/
├── personA/                    # Mac 1: Private DNS Resolver (Pankaj Baid)
│   ├── dns/                    # Authoritative dnsmasq configuration & setup
│   ├── client/                 # Client verification suite
│   ├── PERSON_A_EVALUATION_GUIDE.md # Fast grading sheet & viva defense guide
│   └── README.md
│
├── personB/                    # Mac 2: Edge Reverse Proxy & TLS (Ashutosh Singh)
│   ├── nginx/                  # Reverse proxy, upstream pool & SSL config
│   ├── tls/                    # Root CA, server certs, SAN extensions
│   ├── PERSON_B_EVALUATION_GUIDE.md # Fast grading sheet & viva defense guide
│   └── README.md
│
├── personC/                    # Mac 3: Backend Instance A (Shreya Suman)
│   ├── backendA/               # Node.js microservice (Port 3001, X-Backend: A)
│   ├── PERSON_C_EVALUATION_GUIDE.md # Fast grading sheet & viva defense guide
│   └── README.md
│
├── personD/                    # Mac 4: Backend B & Capture Lead (Ranvendra Pratap Singh)
│   ├── backendB/               # Node.js microservice (Port 3002, X-Backend: B)
│   ├── client/                 # Automated end-to-end client test harness
│   ├── PERSON_D_EVALUATION_GUIDE.md # Fast grading sheet & viva defense guide
│   ├── PLATFORM_TECHNICAL_DEFENSE_AND_RUNBOOK.md # Exhaustive defense manual
│   └── README.md
│
├── demo/                       # Interactive Demonstration Dashboard
│   ├── server.js               # Node.js probe and evaluation server (Port 5050)
│   ├── public/                 # Visualizer, topology animator, packet inspector
│   ├── run_demo.sh             # Dashboard launcher
│   └── README.md
│
├── docs/                       # Architecture, Security & Pedagogical Specs
│   ├── PACKET_JOURNEY_EXPLAINED.md      # Detailed 5-layer request lifecycle walkthrough
│   ├── VIVA_QUESTIONS_AND_DEFENSE.md    # 25 in-depth viva questions & answers
│   ├── NETWORK_SECURITY_AND_ISOLATION.md# DMZ segmentation & pf firewall guide
│   ├── FAILURE_ANALYSIS_RUNBOOK.md      # Root-cause analysis for D1–D5
│   ├── TROUBLESHOOTING_PLAYBOOK.md      # Rapid triage tree for Ext F
│   ├── topology.md                      # Network visual diagram
│   └── machine-details.md               # Hardware & IP address inventory
│
├── phase2/                     # Phase 2 Harden, Recover & Troubleshoot Bundle
│   ├── docs/
│   │   ├── EVALUATOR_RUBRIC_MAPPING.md  # 50-mark Review 2 grading checklist
│   │   ├── PHASE2_FINAL_REPORT.md       # Architectural final report
│   │   └── topology_phase2.md           # Hardened Phase 2 topology
│   ├── personA/                # Mac 1: Primary DNS configs (30s TTL)
│   ├── personB/                # Mac 2: Primary Edge nginx (HA failover)
│   ├── personC/                # Mac 3: pf firewall isolation + Standby Edge
│   ├── personD/                # Mac 4: Backup DNS + pf firewall isolation
│   └── scripts/                # Local non-sudo and sudo demo test runners
│
├── evidence/                   # Consolidated Evidence Dossier (Phase 1 + Phase 2)
│   ├── final_combined_evidence/# Master portfolio for examiner review
│   ├── wireshark/              # Raw packet traces (.pcap) & dissection notes
│   ├── failures/               # All 5 deliberate failure demonstration outputs
│   ├── phase2/                 # Phase 2 verification logs (personA..D)
│   └── FINAL_EVIDENCE_DOSSIER.md
│
├── projectflow.md              # Complete end-to-end Phase 1 execution runbook
├── PHASE2_HANDOVER.md          # Per-person Phase 2 handover & single-Mac guide
├── package.json
└── README.md
```

---

## 🚀 How to Run the Backends and Services

### Option 1: Running Backends from Root Directory (`npm`)

```bash
# 1. Start Backend A (Port 3001 · Shreya Suman)
npm run start:a

# 2. Start Backend B (Port 3002 · Ranvendra Pratap Singh)
npm run start:b

# 3. Start Edge Nginx Proxy (Ports 8080/8443 · Ashutosh Singh)
npm run start:nginx

# 4. Stop Nginx Proxy
npm run stop:nginx

# 5. Reload Nginx Configuration
npm run reload:nginx
```

---

### Option 2: Running Backends on Respective Physical Macs

#### 1. Backend Server A (Person C · Mac 3 · Shreya Suman)
```bash
cd personC/backendA
npm install && npm start
# Listens on 0.0.0.0:3001 (LAN-accessible)
# Returns HTTP 200 with header 'X-Backend: A'
```

#### 2. Backend Server B (Person D · Mac 4 · Ranvendra Pratap Singh)
```bash
cd personD/backendB
npm install && npm start
# Listens on 0.0.0.0:3002 (LAN-accessible)
# Returns HTTP 200 with header 'X-Backend: B'
```

#### 3. Edge Reverse Proxy & Load Balancer (Person B · Mac 2 · Ashutosh Singh)
```bash
# Verify configuration syntax
./personB/nginx/start_nginx.sh test

# Start Nginx
./personB/nginx/start_nginx.sh start

# Check listener status (Ports 8080 and 8443)
./personB/nginx/start_nginx.sh status
```

#### 4. Private DNS Resolver (Person A · Mac 1 · Pankaj Baid)
```bash
# Update dnsmasq.conf with Person B's Edge IP
./personA/dns/setup_dns.sh <PERSON_B_IP>

# Run dnsmasq in foreground
sudo dnsmasq -C personA/dns/dnsmasq.conf -d
```

---

## ⚡ Deliberate Failure Demonstrations (Phase 1 Course Requirements)

All 5 required network fault cases are documented with raw capture logs in [`evidence/final_combined_evidence/failures/`](evidence/final_combined_evidence/failures/) and analyzed in [`docs/FAILURE_ANALYSIS_RUNBOOK.md`](docs/FAILURE_ANALYSIS_RUNBOOK.md):

| Case | Scenario | Injected Fault | Layer & Observation | Recovery Procedure |
| :---: | :--- | :--- | :--- | :--- |
| **D1** | **DNS Resolver Down** | Point client to inactive DNS resolver | **Layer 7 (DNS):** Query times out (`NXDOMAIN`), direct IP ping still succeeds | Restore active nameserver `10.7.17.94` |
| **D2** | **DNS Misdirection** | DNS points `app.teamX.test` to Mac 3 instead of Edge | **Layer 7 ➔ Layer 4:** DNS resolves, but HTTPS on `:8443` fails (`Connection refused`) | Point record back to Mac 2 IP |
| **D3** | **Single Backend Down** | Backend A process stopped (`port 3001`) | **Layer 7 Upstream:** Nginx detects failure; 100% failover to Backend B (`X-Backend: B`) | Restart Backend A (`npm start`) |
| **D4** | **Both Backends Down** | Backend A and Backend B both stopped | **Layer 7 Application:** DNS and TLS succeed; Nginx returns `HTTP 502 Bad Gateway` | Restart both microservices |
| **D5** | **Wrong Port** | Client requests Edge HTTPS on port `8444` | **Layer 4 (Transport):** Ping succeeds; TCP handshake fails (`Connection refused`) | Connect to configured port `8443` |

---

## 🔬 Protocol Dissection & Wireshark Captures

Open our pre-captured end-to-end trace in Wireshark:

```bash
open -a Wireshark evidence/final_combined_evidence/wireshark/phase1-flow.pcap
```

* **Display Filter `dns`**: Shows Packet #1 (Query for `app.teamX.test` over UDP 53) and Packet #2 (Authoritative response with Edge IP).
* **Display Filter `tcp.port == 8443`**: Shows TCP 3-way handshake (`[SYN] ➔ [SYN, ACK] ➔ [ACK]`) establishing reliable transport.
* **Display Filter `tls`**: Shows `Client Hello`, `Server Hello`, `Certificate` (validating TeamX Local CA and SANs), and encrypted `Application Data`.
* Detailed 5-layer journey walkthrough: [`docs/PACKET_JOURNEY_EXPLAINED.md`](docs/PACKET_JOURNEY_EXPLAINED.md).

---

## 🛡️ Phase 2 — Harden, Recover & Troubleshoot (Extensions A–F)

Phase 2 extends the Phase 1 four-node platform without altering frozen Phase 1 files:

| Extension | Scope | Lead / Config Path |
| :---: | :--- | :--- |
| **Ext A** | **Backup DNS Resolver** (`dnsmasq` failover on Mac 4) | [`phase2/personD/dns/`](phase2/personD/dns/) |
| **Ext B** | **DNS TTL (`30s`) & Controlled Record Change + Flush** | [`phase2/personA/dns/`](phase2/personA/dns/) |
| **Ext C** | **Service Isolation (`pf` firewall rules on `:3001` & `:3002`)** | [`phase2/personC/firewall/`](phase2/personC/firewall/), [`phase2/personD/firewall/`](phase2/personD/firewall/) |
| **Ext D** | **HA Backend Failover & Recovery (`max_fails=3 fail_timeout=5s`)** | [`phase2/personB/nginx/`](phase2/personB/nginx/) |
| **Ext E** | **Controlled Edge Migration (Standby `nginx` on Mac 3, `X-Edge`)** | [`phase2/personC/nginx/`](phase2/personC/nginx/) |
| **Ext F** | **5-Layer Faculty Troubleshooting Playbook** | [`docs/TROUBLESHOOTING_PLAYBOOK.md`](docs/TROUBLESHOOTING_PLAYBOOK.md) |

### Running Phase 2 Verification Locally
```bash
# 1. Automated non-sudo suite (Ext A, B, D, E, F -> saves to evidence/phase2/personA..D/)
./phase2/scripts/run_local_no_sudo_tests.sh

# 2. Full privileged single-Mac suite (adds real port 53 OS cache + pfctl isolation)
sudo ./phase2/scripts/run_local_sudo_full_demo.sh
```

---

## 📜 Evaluator Master Reference Directory

- **Phase 1 Execution Runbook:** [`projectflow.md`](projectflow.md)
- **Phase 2 Team Handover Guide:** [`PHASE2_HANDOVER.md`](PHASE2_HANDOVER.md)
- **Phase 2 Architecture & Topology:** [`phase2/docs/topology_phase2.md`](phase2/docs/topology_phase2.md)
- **Phase 2 Final Report:** [`phase2/docs/PHASE2_FINAL_REPORT.md`](phase2/docs/PHASE2_FINAL_REPORT.md)
- **Phase 2 Rubric Checklist:** [`phase2/docs/EVALUATOR_RUBRIC_MAPPING.md`](phase2/docs/EVALUATOR_RUBRIC_MAPPING.md)
- **Master Evidence Dossier:** [`evidence/FINAL_EVIDENCE_DOSSIER.md`](evidence/FINAL_EVIDENCE_DOSSIER.md)
- **5-Minute Video Recording Guide:** [`docs/video_recording_and_demo_guide.md`](docs/video_recording_and_demo_guide.md)
- **Examiner Grading Guides:** [`Person A`](personA/PERSON_A_EVALUATION_GUIDE.md) · [`Person B`](personB/PERSON_B_EVALUATION_GUIDE.md) · [`Person C`](personC/PERSON_C_EVALUATION_GUIDE.md) · [`Person D`](personD/PERSON_D_EVALUATION_GUIDE.md)
