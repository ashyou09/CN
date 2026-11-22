# Deliberate Fault Injection & Root-Cause Analysis Runbook

> **Course Requirement:** Deliberate Failure Demonstrations (Phase 1 & Phase 2)  
> **Topic:** Methodical fault induction, multi-layer symptom analysis, packet traces, and recovery procedures.

---

## 📌 Phase 1 Required Failure Scenarios (Cases D1 – D5)

### Case D1: DNS Resolver Failure (Layer 7 Name Service)
- **Fault Injected**: Stop `dnsmasq` service on Mac 1 or point client `/etc/resolver/teamX.test` to an inactive IP (`10.7.17.99`).
- **Symptom & Error**:
  - `dig @10.7.17.99 app.teamX.test` ➔ `connection timed out; no servers could be reached`.
  - `curl https://app.teamX.test:8443/api/status` ➔ `Could not resolve host: app.teamX.test`.
  - `ping -c 2 10.7.3.128` ➔ **Succeeds with 0% packet loss**.
- **Pedagogical Significance**: Demonstrates strict separation between **Layer 3 (IP network connectivity)** and **Layer 7 (Name resolution)**. The physical and IP paths are completely healthy, yet applications fail because human-readable names cannot be mapped to IP addresses.
- **Wireshark Trace**: Client transmits repeated DNS standard queries over UDP port 53; zero response packets are received.
- **Recovery**: Restart `dnsmasq` on Mac 1 or restore correct nameserver IP in client resolver.

---

### Case D2: DNS Misdirection (Layer 7 ➔ Layer 4 Misrouting)
- **Fault Injected**: Modify DNS A record on Mac 1 to point `app.teamX.test` to Mac 3 (`10.7.6.84` - Backend A) instead of Mac 2 (`10.7.3.128` - Edge Proxy).
- **Symptom & Error**:
  - `dig app.teamX.test +short` ➔ Returns `10.7.6.84`.
  - `curl -Iv https://app.teamX.test:8443/api/status` ➔ `curl: (7) Failed to connect to app.teamX.test port 8443: Connection refused`.
- **Pedagogical Significance**: Demonstrates the consequence of stale or malicious DNS poisoning. The DNS layer succeeds, but the target host (Mac 3) is listening only on port 3001, not port 8443. The Darwin kernel immediately resets the connection.
- **Wireshark Trace**: Client sends TCP `[SYN]` to `10.7.6.84:8443`. Mac 3 returns TCP `[RST, ACK]`.
- **Recovery**: Update `dnsmasq.conf` with Edge IP `10.7.3.128` and restart resolver.

---

### Case D3: Single Backend Service Failure (Upstream HA Failover)
- **Fault Injected**: Stop Node.js process on Backend A (`killall node` on Mac 3) while keeping Backend B running on Mac 4.
- **Symptom & Error**:
  - Requests to `https://app.teamX.test:8443/api/status` continue returning **HTTP 200 OK**.
  - Consecutive requests exclusively return `X-Backend: B`.
  - Zero requests fail from the client's perspective.
- **Pedagogical Significance**: Validates reverse proxy fault tolerance (`proxy_next_upstream`). When the primary round-robin choice fails to establish a TCP socket, Nginx transparently fails over to the surviving backend before sending a response to the client.
- **Nginx Error Log**:
  `[error] connect() failed (61: Connection refused) while connecting to upstream, upstream: "http://10.7.6.84:3001/api/status"`
- **Recovery**: Restart Backend A: `cd personC/backendA && npm start`.

---

### Case D4: Total Backend Outage (Layer 7 Application Down)
- **Fault Injected**: Terminate both Backend A (`port 3001`) and Backend B (`port 3002`).
- **Symptom & Error**:
  - `curl -i https://app.teamX.test:8443/api/status` ➔ **`HTTP/1.1 502 Bad Gateway`**.
  - `curl -Iv` indicates TLS handshake succeeded, TCP connection was established, but the response status is 502.
- **Pedagogical Significance**: Highlights the difference between a Transport Layer failure (`Connection Refused`) and an Application Layer gateway failure (`HTTP 502`). The client successfully connected to the Edge Proxy, but the Edge Proxy could not obtain a valid response from any upstream origin server.
- **Recovery**: Restart Backend A (`npm start`) and Backend B (`npm start`).

---

### Case D5: Destination Port Error (Layer 4 Port Rejection)
- **Fault Injected**: Client attempts HTTPS connection to port `8444` instead of configured port `8443`.
- **Symptom & Error**:
  - `curl -Iv https://app.teamX.test:8444/api/status` ➔ `curl: (7) Failed to connect to app.teamX.test port 8444: Connection refused`.
  - `ping app.teamX.test` ➔ **Succeeds**.
- **Pedagogical Significance**: Illustrates Layer 4 transport multiplexing. An IP address can host tens of thousands of services, but if no application socket is bound to a specific TCP port, the kernel drops the handshake and returns a TCP RST.
- **Wireshark Trace**: Client `[SYN]` on port 8444 ➔ Edge host `[RST, ACK]`.
- **Recovery**: Update client request to use the correct configured port `8443`.

---

## 🛡️ Summary Table for Examiners

| Failure ID | Injected Fault | Layer Affected | Client Status / Code | Packet Signature |
| :---: | :--- | :--- | :--- | :--- |
| **D1** | DNS Resolver Down | Layer 7 (DNS) | `Could not resolve host` | UDP 53 Retransmit Timeout |
| **D2** | DNS Misdirection | Layer 7 ➔ Layer 4 | `Connection refused` | TCP `[RST, ACK]` from wrong host |
| **D3** | Single Backend Down | Layer 7 (Upstream) | `HTTP 200 (X-Backend: B)` | Internal TCP Reset ➔ failover |
| **D4** | Both Backends Down | Layer 7 (Application)| `HTTP 502 Bad Gateway` | Valid TLS ➔ Gateway error body |
| **D5** | Port 8444 Mismatch | Layer 4 (Transport) | `Connection refused` | TCP `[RST, ACK]` from Edge kernel |
