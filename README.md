# Private Network Service Platform — Phase 1
> **Computer Networks Laboratory Course Project**  
> An enterprise-grade, four-node distributed service platform running across physical macOS nodes on a private local area network.

---

## 👥 Team Members & Responsibilities

| Person | Team Member | Assigned Role & Machine | Key Components | Ports / Protocols |
| :---: | :--- | :--- | :--- | :--- |
| **Person A** | **Pankaj Baid** | **Mac 1** · Private DNS Lead & Test Client | `dnsmasq`, authoritative `.test` zone resolution, client dig suite | `53` (UDP/TCP) |
| **Person B** | **Ashutosh Singh** | **Mac 2** · Edge Proxy & TLS Lead | `nginx`, TLS 1.2/1.3 termination, round-robin load balancer | `8080` (HTTP), `8443` (HTTPS) |
| **Person C** | **Shreya Suman** | **Mac 3** · Backend Service A Lead | Node.js Express REST API, HTTP caching & ETag support | `3001` (`X-Backend: A`) |
| **Person D** | **Ranvendra Pratap Singh** | **Mac 4** · Backend Service B & Capture Lead | Node.js Express API, Wireshark/tcpdump protocol trace analysis | `3002` (`X-Backend: B`) |

---

## 🏗️ Repository Architecture

```text
CN/
├── personA/                    # Mac 1: Private DNS Resolver (Pankaj Baid)
│   ├── dns/
│   │   ├── dnsmasq.conf        # Authoritative DNS zone configuration
│   │   └── setup_dns.sh        # Automates domain mapping to Edge IP
│   ├── client/
│   │   └── test.sh             # Client verification scripts
│   └── README.md
│
├── personB/                    # Mac 2: Edge Reverse Proxy, TLS & Load Balancer (Ashutosh Singh)
│   ├── nginx/
│   │   ├── nginx.conf          # Reverse proxy, upstream pool & SSL config
│   │   ├── logs/               # Nginx access and error logs
│   │   └── start_nginx.sh      # Service controller (test, start, reload, stop)
│   ├── tls/
│   │   ├── ca.crt / ca.key     # Custom Root Certificate Authority
│   │   ├── server.crt / .key   # CA-signed SSL Certificate with SANs
│   │   ├── generate_cert.sh    # OpenSSL certificate generation script
│   │   └── README.md
│   └── README.md
│
├── personC/                    # Mac 3: Backend Instance A (Shreya Suman)
│   ├── backendA/
│   │   ├── server.js           # Express microservice (Port 3001, X-Backend: A)
│   │   ├── package.json
│   │   └── run.sh              # Backend A launcher
│   └── README.md
│
├── personD/                    # Mac 4: Backend Instance B & Capture Lead (Ranvendra Pratap Singh)
│   ├── backendB/
│   │   ├── server.js           # Express microservice (Port 3002, X-Backend: B)
│   │   ├── package.json
│   │   └── run.sh              # Backend B launcher
│   ├── client/
│   │   └── test.sh             # Automated end-to-end client test harness
│   ├── evidence/               # Person D Evidence Portfolio
│   ├── PERSON_D_EVALUATION_GUIDE.md # Fast grading sheet & viva defense guide
│   └── README.md
│
├── demo/                       # Live Interactive Demonstration Dashboard
│   ├── server.js               # Node.js probe and evaluation server (Port 5050)
│   ├── public/                 # Interactive visualizer, network diagram, packet inspector
│   └── run_demo.sh             # One-click dashboard launcher
│
├── evidence/                   # Consolidated Evidence Dossier (PCAP, Logs, D1–D5 Faults)
│   ├── final_combined_evidence/# Master portfolio for examiner review
│   ├── wireshark/              # Raw packet traces (.pcap) & dissection notes
│   ├── failures/               # All 5 deliberate failure demonstration outputs
│   ├── load-balancing/         # Round-robin balancing proof logs
│   ├── caching/                # HTTP 304 conditional request evidence
│   └── FINAL_EVIDENCE_DOSSIER.md
│
├── docs/                       # Architecture & Network Specifications
│   ├── topology.md             # Visual topology and request protocol journey
│   ├── machine-details.md      # Physical hardware & IP address inventory
│   └── video_recording_and_demo_guide.md # 5-minute video recording presentation script
│
├── projectflow.md              # Complete end-to-end Phase 1 execution runbook
├── package.json
└── README.md
```

---

## 🚀 How to Run the Backends and Services

### Option 1: Running Backends from Root Directory (`npm`)
From the repository root, you can start individual or all services using root scripts:

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
npm install
npm start
# Listens on 0.0.0.0:3001 (LAN-accessible)
# Returns HTTP 200 with header 'X-Backend: A'
```

#### 2. Backend Server B (Person D · Mac 4 · Ranvendra Pratap Singh)
```bash
cd personD/backendB
npm install
npm start
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
# 1. Update dnsmasq.conf with Person B's Edge IP
./personA/dns/setup_dns.sh <PERSON_B_IP>

# 2. Run dnsmasq in foreground
sudo dnsmasq -C personA/dns/dnsmasq.conf -d
```

---

## 🖥️ Interactive Demo Dashboard

We built a live **Network Laboratory Dashboard** that visualizes the multi-node packet journey, runs live system health probes, and demonstrates fault scenarios interactively:

```bash
npm run demo
# Or: ./demo/run_demo.sh
```
Open **[http://localhost:5050](http://localhost:5050)** in your browser to explore:
* **Interactive Network Flow:** Watch DNS resolution, TCP handshake, TLS termination, and upstream backend selection animated in real time.
* **Live Automated Checks (8/8):** Audits LAN reachability, Backend A, Backend B, Round-Robin Load Distribution, Private DNS resolution, TLS termination, HTTP Caching (`304 Not Modified`), and End-to-End Named HTTPS trace.
* **Live Wireshark Packet Sniffer:** Real-time binary packet capture across all 4 nodes with one-click `.pcap` export.
* **Fault Scenarios & Evidence Library:** Switch between healthy and failure topologies and view logs.

---

## 🌐 Transitioning to 4 Physical Macs (LAN Setup)

1. **Connect All 4 Macs to the Same Wi-Fi / Hotspot Subnet**:
   - Check local IP on each Mac: `ifconfig en0 | grep "inet "`
   - Update [`docs/machine-details.md`](docs/machine-details.md) with recorded hardware parameters.
   - Verify pairwise reachability with the 4-way ping matrix.

2. **Configure Nginx Upstream on Mac 2**:
   - Edit `upstream backend_pool` in [`personB/nginx/nginx.conf`](personB/nginx/nginx.conf):
     ```nginx
     upstream backend_pool {
         server <PERSON_C_IP>:3001 max_fails=3 fail_timeout=5s;
         server <PERSON_D_IP>:3002 max_fails=3 fail_timeout=5s;
     }
     ```
   - Reload Nginx: `./personB/nginx/start_nginx.sh reload`

3. **Configure DNS Records on Mac 1**:
   - Run: `./personA/dns/setup_dns.sh <PERSON_B_IP>`
   - Start dnsmasq: `sudo dnsmasq -C personA/dns/dnsmasq.conf -d`

4. **Client Resolver Setup (Mac 2, 3, 4)**:
   ```bash
   sudo mkdir -p /etc/resolver
   printf 'nameserver %s\n' "<PERSON_A_IP>" | sudo tee /etc/resolver/teamX.test
   ```

5. **Trust the Local Root CA on Client Macs**:
   Transfer `personB/tls/ca.crt` to client machines and trust it in the system keychain:
   ```bash
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain personB/tls/ca.crt
   ```

6. **Verify End-to-End Secure HTTPS Flow**:
   ```bash
   dig @<PERSON_A_IP> app.teamX.test +short
   curl -i "https://app.teamX.test:8443/api/status"
   ```

---

## ⚡ Deliberate Failure Demonstrations (Phase 1 Course Requirements)

All 5 required network fault cases are documented with raw capture logs in [`evidence/final_combined_evidence/failures/`](evidence/final_combined_evidence/failures/):

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
* Full packet-by-packet annotations are available in [`evidence/final_combined_evidence/wireshark/packet_flow_annotation.txt`](evidence/final_combined_evidence/wireshark/packet_flow_annotation.txt).

---

## 📜 Evaluator Review Notes
* **Project Execution Runbook:** [`projectflow.md`](projectflow.md)
* **Master Evidence Dossier:** [`evidence/FINAL_EVIDENCE_DOSSIER.md`](evidence/FINAL_EVIDENCE_DOSSIER.md)
* **5-Minute Presentation Video Guide:** [`docs/video_recording_and_demo_guide.md`](docs/video_recording_and_demo_guide.md)
* **Examiner Grading Sheet (Person D):** [`personD/PERSON_D_EVALUATION_GUIDE.md`](personD/PERSON_D_EVALUATION_GUIDE.md)
