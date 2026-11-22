# Interactive Network Laboratory Demonstration Dashboard

> **Evaluator & Student Guide**  
> **Topic:** One-Click Visual Laboratory Testbed, Live Protocol Probes, and Scenario Simulator.

---

## 🚀 Quick Start for Evaluators

From the repository root, start the dashboard:

```bash
npm run demo
# Or directly:
./demo/run_demo.sh
```

Then open **[http://localhost:5050](http://localhost:5050)** in any modern web browser.

---

## 🖥️ Key Capabilities for Lab Evaluations

### 1. Automated System Health Checks (8/8 Green Matrix)
Click **"Run All Probes"** in the top navigation bar to execute an instant 8-point automated compliance audit:
1. **LAN Node Reachability**: Probes ping response and interface status.
2. **Backend A Health**: Verifies listener on TCP `3001` and header `X-Backend: A`.
3. **Backend B Health**: Verifies listener on TCP `3002` and header `X-Backend: B`.
4. **Round-Robin Load Distribution**: Sends 4 consecutive requests through Edge; verifies alternating `X-Backend` headers.
5. **Private DNS Resolution**: Queries `dnsmasq` for `app.teamX.test`; verifies mapping to Edge IP.
6. **Native TLS Handshake**: Validates certificate validity against Local CA without insecure `-k` flag.
7. **RFC 9111 HTTP Caching**: Sends conditional request with `If-None-Match`; verifies `304 Not Modified`.
8. **End-to-End Secure Flow**: Verifies complete transit from Client ➔ DNS ➔ Edge ➔ Backend.

### 2. Live Interactive Network Flow Visualizer
- Visualizes the 4 physical nodes (**Mac 1, Mac 2, Mac 3, Mac 4**) and animates packets traveling between them in real time as requests are triggered.
- Color-coded protocol badges for **DNS (UDP 53)**, **TCP (8443)**, **TLS 1.2**, and **HTTP/REST**.

### 3. Integrated Packet Sniffer & PCAP Export
- Displays live packet captures generated during testing.
- Allows the evaluator to download captured binary packets (`.pcap`) directly from the browser for offline Wireshark dissection.

### 4. Interactive Fault Simulator (Phase 1 Failures D1–D5)
- Switch between **Healthy State** and any of the 5 deliberate failure cases (**D1: DNS Down**, **D2: DNS Misdirection**, **D3: Single Backend Down**, **D4: Both Backends Down**, **D5: Port 8444**).
- Watch how the network diagram updates dynamically, showing blocked paths, red connection breaks, and simulated recovery actions.

### 5. Phase 2 Resilience & Isolation Panel
- Probes Backup DNS resolver (Mac 4).
- Tests 30-second TTL cache behavior.
- Verifies `pf` firewall rules blocking direct client connections.
- Demonstrates Standby Edge Nginx cutover.

### 6. Dynamic 4-Laptop IP Configuration
- Click **"Configure LAN IPs"** in the UI to update the target IP addresses for Mac 1, Mac 2, Mac 3, and Mac 4 on the fly when switching between different Wi-Fi networks.
