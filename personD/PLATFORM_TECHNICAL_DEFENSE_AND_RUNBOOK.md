# Private Network Service Platform — Technical Defense & Evaluation Manual
**Computer Networks Laboratory (Phase 1)**  
**Author / Persona:** Person D (Mac 4 — Backend Server B & Network Capture Lead)  
**System Scope:** 4-Node Physical LAN Topology running Private DNS, TLS Edge Reverse Proxy, Round-Robin Upstream Load Balancing, HTTP Caching, and Deep Packet Inspection.

---

## 📖 How to Use This Manual
This manual provides the exact technical answers, commands to run live during the defense, actual verified terminal outputs, and conceptual explanations for every evaluation parameter (A1 through D3). 

If the evaluator asks:
- **"Run this command live"** ➡️ Use the copy-paste commands provided in each section.
- **"Explain what is happening under the hood"** ➡️ Use the "Concept & Viva Explanation" subsections.
- **"Show me the proof"** ➡️ Refer to the exact evidence files and outputs listed.

---

# SECTION A: Physical Topology, Addressing & Private DNS Architecture

---

## A1: Machine Roles, IP Addressing & Network Interfaces

### 1. Summary Table
| Machine | Assigned Role | Private LAN IPv4 | Network Interface | Hostname | Open Ports |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **Mac 1** | Private DNS Server + Test Client | `10.7.17.94` | `en0` (Wi-Fi) | `Pankajs-MacBook-Pro-2.local` | `53` (UDP/TCP) |
| **Mac 2** | Edge Nginx Reverse Proxy / TLS | `10.7.3.128` | `en0` (Wi-Fi) | `mac2.local` | `8080`, `8443` |
| **Mac 3** | Backend Instance A | `10.7.6.84` | `en0` (Wi-Fi) | `mac3.local` | `3001` |
| **Mac 4 (You)**| Backend Instance B + Capture Lead | `10.7.17.147` | `en0` (Wi-Fi) | `Ranvendras-MacBook-Pro.local` | `3002` |

- **Subnet Mask**: `255.255.224.0` (`/19`)
- **Default Gateway**: `10.7.0.1`

### 2. Live Verification Commands
```bash
# Check your local IP and interface
ipconfig getifaddr en0
# Check subnet mask
ipconfig getoption en0 subnet_mask
# Check default gateway
route -n get default | grep gateway
```

### 3. Concept & Viva Explanation
- **Why `/19` Subnet Mask (`255.255.224.0`)?**  
  A `/19` prefix means 19 bits are allocated for the network ID and 13 bits are for host addressing ($2^{13} - 2 = 8,190$ possible usable hosts). This is why all four Macs can communicate directly across `10.7.3.x`, `10.7.6.x`, and `10.7.17.x` without needing an external router/NAT hop; they reside in the same broadcast domain (`10.7.0.1` to `10.7.31.254`).

---

## A2: Private DNS (`dnsmasq`) Configuration

### 1. Relevant Configuration File (`personA/dns/dnsmasq.conf`)
```ini
address=/app.teamX.test/10.7.3.128
address=/api.teamX.test/10.7.3.128
listen-address=0.0.0.0
interface=en0
bind-interfaces
```

### 2. Concept & Viva Explanation
- **What is `address=/domain/IP`?**  
  It acts as a wildcard local DNS A-record. Any DNS query for `app.teamX.test` or any subdomain will resolve to the Edge Nginx Proxy (`10.7.3.128`).
- **Why must `listen-address=0.0.0.0`?**  
  By default, `dnsmasq` might bind to loopback (`127.0.0.1`). If set to `127.0.0.1`, the socket rejects incoming UDP/53 packets from external LAN nodes. `0.0.0.0` binds the socket to all available interfaces so Mac 2, Mac 3, and Mac 4 can query it across Wi-Fi (`en0`).

---

## A3: Client DNS Query (`dig` Output)

### 1. Command to Run on Client (Mac 4)
```bash
dig @10.7.17.94 app.teamX.test
```

### 2. Verified Live Output
```text
; <<>> DiG 9.10.6 <<>> @10.7.17.94 app.teamX.test
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 54251
;; flags: qr aa rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;app.teamX.test.			IN	A

;; ANSWER SECTION:
app.teamX.test.		0	IN	A	10.7.3.128

;; Query time: 19 msec
;; SERVER: 10.7.17.94#53(10.7.17.94)
;; WHEN: Sun Oct 04 18:52:33 IST 2026
;; MSG SIZE  rcvd: 59
```

### 3. Concept & Viva Explanation
- **`status: NOERROR`**: The DNS server understood the query and possessed an answer.
- **`flags: qr aa rd ra`**:  
  - `qr` (Query Response): This is a response packet.
  - `aa` (Authoritative Answer): **Critical Viva Point.** Proves Mac 1 (`10.7.17.94`) is the authoritative source for `teamX.test`, rather than answering from a forwarded third-party cache.
- **`SERVER: 10.7.17.94#53`**: Confirms that query resolution was handled by Mac 1 on port 53, not public DNS or local router.

---

## A4: Public DNS Probing (Proof of Private Namespace)

### 1. Command to Run
```bash
dig @8.8.8.8 app.teamX.test
```

### 2. Verified Live Output
```text
; <<>> DiG 9.10.6 <<>> @8.8.8.8 app.teamX.test
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 34051
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 1

;; QUESTION SECTION:
;app.teamX.test.			IN	A

;; AUTHORITY SECTION:
.			86294	IN	SOA	a.root-servers.net. nstld.verisign-grs.com. 2026100400 1800 900 604800 86400

;; Query time: 12 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)
;; WHEN: Sun Oct 04 18:54:28 IST 2026
;; MSG SIZE  rcvd: 118
```

### 3. Concept & Viva Explanation
- **What does `NXDOMAIN` mean?**  
  Non-Existent Domain (RFC 2308). The authoritative Internet root name servers (`a.root-servers.net`) do not recognize `.test` as a delegated public Top-Level Domain (TLD) on the global Internet.
- **Why is this important?**  
  It mathematically proves that our service platform operates strictly within an isolated private network partition and does not leak or depend on public Internet resolution.

---

## A5: Full Mesh LAN Reachability (Ping Matrix)

### 1. Ping Results
```text
Mac 1 → Mac 2: ping 10.7.3.128 — 3 packets, 0% loss (avg 42.1 ms)
Mac 1 → Mac 3: ping 10.7.6.84 — 3 packets, 0% loss (avg 38.6 ms)
Mac 1 → Mac 4: ping 10.7.17.147 — 3 packets, 0% loss (avg 18.4 ms)
Mac 2 → Mac 1: ping 10.7.17.94 — 3 packets, 0% loss (avg 45.2 ms)
Mac 2 → Mac 3: ping 10.7.6.84 — 3 packets, 0% loss (avg 24.8 ms)
Mac 2 → Mac 4: ping 10.7.17.147 — 3 packets, 0% loss (avg 26.1 ms)
Mac 3 → Mac 1: ping 10.7.17.94 — 3 packets, 0% loss (avg 35.7 ms)
Mac 3 → Mac 2: ping 10.7.3.128 — 3 packets, 0% loss (avg 22.3 ms)
Mac 3 → Mac 4: ping 10.7.17.147 — 3 packets, 0% loss (avg 55.4 ms)
Mac 4 → Mac 1: ping 10.7.17.94 — 3 packets, 0% loss (avg 16.7 ms)
Mac 4 → Mac 2: ping 10.7.3.128 — 3 packets, 0% loss (avg 26.1 ms)
Mac 4 → Mac 3: ping 10.7.6.84 — 3 packets, 0% loss (avg 55.4 ms)
```

### 2. Concept & Viva Explanation
- **Protocol**: ICMP (Internet Control Message Protocol, Type 8 Echo Request & Type 0 Echo Reply).
- **Operating Layer**: Network Layer (Layer 3).
- **What does 0% packet loss prove?**  
  It proves bilateral Layer 2 (ARP/Ethernet) and Layer 3 (IP routing) continuity across all physical laptops without Wi-Fi client isolation or firewall drops.

---

# SECTION B: Secure Edge Reverse Proxy & Load Balancing

---

## B1: Trusted Native HTTPS Verification (Zero Insecure Flags)

### 1. Command to Run
```bash
curl -v https://app.teamX.test:8443/
```

### 2. Verified Live Output
```text
* Host app.teamX.test:8443 was resolved.
* IPv4: 10.7.3.128
*   Trying 10.7.3.128:8443...
* Connected to app.teamX.test (10.7.3.128) port 8443
* ALPN: curl offers h2,http/1.1
* (304) (OUT), TLS handshake, Client hello (1):
* (304) (IN), TLS handshake, Server hello (2):
* (304) (IN), TLS handshake, Unknown (8):
* (304) (IN), TLS handshake, Certificate (11):
* (304) (IN), TLS handshake, CERT verify (15):
* (304) (IN), TLS handshake, Finished (20):
* (304) (OUT), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / AEAD-AES256-GCM-SHA384
* Server certificate:
*  subject: C=IN; ST=Karnataka; L=Bengaluru; O=TeamX; OU=NetworkLab; CN=app.teamX.test
*  start date: Sep 28 10:03:07 2026 GMT
*  expire date: Sep 28 10:03:07 2027 GMT
*  subjectAltName: host "app.teamX.test" matched cert's "app.teamX.test"
*  issuer: C=IN; ST=Karnataka; L=Bengaluru; O=TeamX; OU=NetworkLab; CN=TeamX Local CA
*  SSL certificate verify ok.
* using HTTP/1.x
> GET / HTTP/1.1
> Host: app.teamX.test:8443
> User-Agent: curl/8.7.1
> Accept: */*
> 
< HTTP/1.1 200 OK
< Server: nginx/1.31.6
< Date: Sun, 04 Oct 2026 13:26:00 GMT
< Content-Type: application/json; charset=utf-8
< Content-Length: 99
< Connection: keep-alive
< X-Powered-By: Express
< X-Backend: B
< ETag: "63-CzXfMq8KLq3UfrdwUv0Marni6AQ"
< 
{"message":"Backend B is running","backend":"B","port":3002,"timestamp":"2026-10-04T13:26:00.120Z"}
* Connection #0 to host app.teamX.test left intact
```

### 3. Concept & Viva Explanation
- **Why does curl succeed without `-k` (insecure)?**  
  Mac 2 generated a self-managed Root Certificate Authority (`ca.crt`). We installed `ca.crt` directly into the macOS System Keychain using `security add-trusted-cert -d -r trustRoot`. When curl executes, macOS validates the cryptographic signature of `server.crt` against the trusted root in the trust store.
- **Subject Alternative Name (SAN)**:  
  Modern TLS clients reject certificates if the hostname is only in the Common Name (CN). Our certificate includes `subjectAltName = DNS:app.teamX.test, DNS:api.teamX.test`, ensuring RFC 6125 compliance.

---

## B2: Round-Robin Load Balancing Proof

### 1. Command to Run
```bash
for i in {1..6}; do curl -sI https://app.teamX.test:8443/api/status | grep -E "(HTTP/|X-Backend)"; echo; done
```

### 2. Output
```text
HTTP/1.1 200 OK
X-Backend: A

HTTP/1.1 200 OK
X-Backend: B

HTTP/1.1 200 OK
X-Backend: A

HTTP/1.1 200 OK
X-Backend: B

HTTP/1.1 200 OK
X-Backend: A

HTTP/1.1 200 OK
X-Backend: B
```

### 3. Concept & Viva Explanation
- **How does Round-Robin work?**  
  Nginx maintains an in-memory cyclical pointer to upstream servers in `backend_pool`. For request $N$, it dispatches to Backend A (`10.7.6.84:3001`); for request $N+1$, it dispatches to Backend B (`10.7.17.147:3002`).
- **Header Injection (`X-Backend`)**:  
  Each Express instance explicitly sets `res.setHeader('X-Backend', 'A')` or `'B'`. Nginx forwards this custom tracking header with `proxy_pass_header X-Backend;`, proving to the client which backend processed the request without revealing backend internal IPs directly.

---

## B3: Nginx Architecture & Upstream Configuration

### 1. Configuration Snippet (`personB/nginx/nginx.conf`)
```nginx
# Upstream Load Balancer Pool (Round-Robin)
upstream backend_pool {
    server 10.7.6.84:3001 max_fails=3 fail_timeout=5s;   # Mac 3 / Backend A
    server 10.7.17.147:3002 max_fails=3 fail_timeout=5s;  # Mac 4 / Backend B
}

# HTTPS Edge Server Block (Port 8443)
server {
    listen 8443 ssl;
    server_name app.teamX.test api.teamX.test;

    ssl_certificate     /path/to/personB/tls/server.crt;
    ssl_certificate_key /path/to/personB/tls/server.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://backend_pool;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_pass_header X-Backend;
        proxy_pass_header Cache-Control;
        proxy_pass_header ETag;

        proxy_buffering off;
    }
}
```

### 2. Concept & Viva Explanation
- **Reverse Proxy vs Forward Proxy**:  
  A forward proxy protects and hides clients accessing the Internet. A **reverse proxy** sits in front of backend servers, shielding them from direct client access, terminating TLS encryption, and distributing traffic load.
- **Failover Directives (`max_fails=3 fail_timeout=5s`)**:  
  If a backend fails 3 consecutive connection attempts within 5 seconds, Nginx temporarily removes it from rotation for 5 seconds before attempting passive health probes again.

---

# SECTION C: Deep Packet Inspection & Protocol Stack Breakdown

---

## C1: Wireshark DNS Query & Response Breakdown

### 1. Wireshark Filter
```text
dns
```

### 2. Packet Flow Breakdown
- **Packet 1 (Query)**:
  - Source: `10.7.17.147:59184` (Client Mac 4 ephemeral UDP port)
  - Destination: `10.7.17.94:53` (Mac 1 Private DNS Server)
  - Protocol: `DNS` (over UDP)
  - Queried Record: `Standard query 0x9c77 A app.teamX.test`
- **Packet 2 (Response)**:
  - Source: `10.7.17.94:53`
  - Destination: `10.7.17.147:59184`
  - Protocol: `DNS` (over UDP)
  - Answer Section: `app.teamX.test. 0 IN A 10.7.3.128` (TTL: `0`)

### 3. Concept & Viva Explanation
- **Why UDP instead of TCP for DNS?**  
  DNS queries are small (< 512 bytes). UDP avoids the 3-packet connection setup overhead of TCP, allowing single round-trip resolution. (TCP is reserved for zone transfers or queries exceeding 512 bytes via EDNS0).
- **Why is TTL = 0?**  
  In local testing with `dnsmasq`, TTL is set to 0 to prevent client operating systems from caching old IPs, facilitating immediate updates if Edge IP shifts.

---

## C2: TCP 3-Way Handshake Breakdown

### 1. Wireshark Filter
```text
tcp.flags.syn == 1 || (tcp.port == 8443 && tcp.len == 0)
```

### 2. Packet Sequence
1. **Packet 3 (`SYN`)**:
   - `10.7.17.147:50268` ➡️ `10.7.3.128:8443`
   - Relative `Seq=0`. Flags: `SYN`.
   - Client announces its Initial Sequence Number (ISN) and requests connection establishment.
2. **Packet 4 (`SYN-ACK`)**:
   - `10.7.3.128:8443` ➡️ `10.7.17.147:50268`
   - Relative `Seq=0`, `Ack=1`. Flags: `SYN, ACK`.
   - Server acknowledges client's SYN (`Ack = Seq + 1`) and sends its own ISN.
3. **Packet 5 (`ACK`)**:
   - `10.7.17.147:50268` ➡️ `10.7.3.128:8443`
   - Relative `Seq=1`, `Ack=1`. Flags: `ACK`.
   - Client acknowledges server's SYN. Socket state becomes `ESTABLISHED`.

### 3. Concept & Viva Explanation
- **What is the goal of the 3-way handshake?**  
  It synchronizes Initial Sequence Numbers (ISNs) in both directions, establishes maximum segment size (MSS = 1460 bytes) and window scaling parameters, and sets up a reliable, connection-oriented channel before transmitting application data.

---

## C3: TLS Handshake & Payload Encryption

### 1. Wireshark Filter
```text
tls
```

### 2. Handshake Phase Flow
1. **ClientHello (Packet 6)**:  
   Client advertises TLS version (`TLS 1.2 / 1.3`), random nonce, cipher suites (e.g., `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384`), and SNI (`app.teamX.test`).
2. **ServerHello & Certificate (Packets 7–8)**:  
   Server chooses cipher suite, responds with server random nonce, and presents X.509 certificate chain signed by `TeamX Local CA`.
3. **Key Exchange & ChangeCipherSpec (Packets 9–14)**:  
   Client and server compute shared pre-master secret via Elliptic Curve Diffie-Hellman (ECDHE), send `ChangeCipherSpec`, and exchange encrypted `Finished` verification hashes.
4. **Application Data (Packets 15+)**:  
   All subsequent HTTP requests and JSON responses appear as opaque `Application Data` bytes.

### 3. Concept & Viva Explanation: Why is HTTP Not Readable in Wireshark?
- HTTP plaintext data (`GET /api/status`, `Host: app.teamX.test`, headers, and bodies) is encrypted using authenticated symmetric session keys (`AES-GCM-256`) negotiated during the handshake.
- Wireshark passively captures raw frames from the Wi-Fi card. Without access to the private RSA/ECDHE key or ephemeral SSL session secrets (e.g., `SSLKEYLOGFILE`), Wireshark cannot decrypt the ciphertext on the wire.

---

# SECTION D: HTTP Caching, Performance & Fault Tolerance

---

## D1: HTTP Caching Headers Verification

### 1. Command to Run
```bash
curl -sI https://app.teamX.test:8443/api/cached
```

### 2. Output
```http
HTTP/1.1 200 OK
Server: nginx/1.31.6
Date: Fri, 02 Oct 2026 12:16:13 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 57
Connection: keep-alive
X-Powered-By: Express
X-Backend: B
Cache-Control: public, max-age=60
ETag: "39-jxvt8kclwpAy7qZ0gJ/MRIVczo0"
```

---

## D2: Cache-Control & ETag Mechanics (RFC 9111)

### 1. Explanation of Header Directives
- **`Cache-Control: public, max-age=60`**:  
  - `public`: Any intermediary cache (browser, proxy, CDN) is permitted to store the response.  
  - `max-age=60`: The resource is considered "fresh" for 60 seconds from its generation time.
- **Client Action during Freshness Window (< 60s)**:  
  The browser or client serves subsequent requests locally from memory or disk cache without issuing any network request to the server, achieving instant response times and zero LAN bandwidth consumption.
- **Client Action after TTL Expiration (> 60s)**:  
  The resource becomes "stale". The client must revalidate the resource with the origin server before serving it again.

### 2. Bonus: ETag & HTTP 304 Not Modified
- **Conditional Validation Command**:
  ```bash
  curl -i -H 'If-None-Match: "39-jxvt8kclwpAy7qZ0gJ/MRIVczo0"' https://app.teamX.test:8443/api/cached
  ```
- **Response**:
  ```http
  HTTP/1.1 304 Not Modified
  Server: nginx/1.31.6
  ETag: "39-jxvt8kclwpAy7qZ0gJ/MRIVczo0"
  ```
- **Viva Concept**:  
  When revalidating, the client passes its stored `ETag` inside `If-None-Match`. The server calculates the hash of the current resource. If identical, the server sends `304 Not Modified` with **zero body payload**, saving bandwidth while guaranteeing that data has not drifted.

---

## D3: Controlled Failure Demonstration (Option A — Stop One Backend)

### 1. Scenario Summary
- **Target**: Stop Backend Instance A on Mac 3 (`10.7.6.84:3001`).
- **Objective**: Prove Nginx upstream failover and fault isolation without user disruption.

### 2. Step-by-Step Execution
1. **Before State (Both Backends Healthy)**:
   - Command: `for i in {1..6}; do curl -sI https://app.teamX.test:8443/api/status | grep -i x-backend; done`
   - Output: `X-Backend: A`, `B`, `A`, `B`, `A`, `B` (Alternating Round-Robin).
2. **Failure Action Injected**:
   - On Mac 3: Terminated Backend A process (`Ctrl+C` or `killall node`).
3. **After State (Automatic Failover)**:
   - On Mac 4: Re-ran 5 requests:
     ```text
     Request 1: X-Backend: B (HTTP 200 OK)
     Request 2: X-Backend: B (HTTP 200 OK)
     Request 3: X-Backend: B (HTTP 200 OK)
     Request 4: X-Backend: B (HTTP 200 OK)
     Request 5: X-Backend: B (HTTP 200 OK)
     ```
   - **Result**: Zero HTTP 502 errors observed by the client. 100% of traffic automatically shifted to Backend B.
4. **Layer Affected & Mechanism**:
   - **Layer 7 (Application / Upstream Routing) & Layer 4 (TCP Transport)**:
   - Nginx received a `TCP Connection Refused` (RST packet) from `10.7.6.84:3001`.
   - Because `nginx.conf` contains `proxy_next_upstream error timeout http_502;`, Nginx intercepted the transport error, marked Backend A failed, and rerouted the in-flight request to Backend B (`10.7.17.147:3002`).
5. **System Restoration**:
   - On Mac 3: `cd personC/backendA && npm start`
   - After `fail_timeout=5s` expired, Nginx resumed 50/50 alternating round-robin distribution automatically.

---

# SECTION E: Viva Voce (Oral Exam) Rapid-Fire Defense

| Examiner Question | Ideal High-Scoring Response |
| :--- | :--- |
| **"What happens if DNS goes down?"** | "Clients cannot resolve `app.teamX.test` to Edge IP (`10.7.3.128`), failing at Layer 7 before any TCP connection starts. However, direct IP reachability via `ping 10.7.3.128` remains intact at Layer 3." |
| **"Why does your site use port 8443 instead of 443?"** | "Binding to well-known ports below 1024 requires root/administrator privileges (`sudo`) on macOS. Port 8443 is the standard non-privileged alternative for testing TLS without running Nginx as root." |
| **"Where does TLS termination occur?"** | "At the Edge Reverse Proxy (Mac 2). Nginx decrypts incoming client HTTPS traffic on port 8443, inspects HTTP headers, and proxies cleartext HTTP over ports 3001 and 3002 across the internal LAN." |
| **"What is the difference between TCP SYN and ACK?"** | "`SYN` synchronizes sequence numbers to begin a connection; `ACK` acknowledges receipt of previous bytes. Sequence numbers ensure reliable, ordered delivery even over lossy Wi-Fi." |
| **"Why did you use ETag instead of Last-Modified?"** | "`ETag` is a cryptographic digest of content. Unlike `Last-Modified` which has 1-second granularity, ETags detect sub-second modifications accurately and avoid clock-skew issues between distributed servers." |
| **"Explain the OSI Layer mapping of your platform."** | "Layer 2: Wi-Fi/Ethernet MAC addresses (`52:19:ac:c7:60:a3`); Layer 3: IPv4 routing & ICMP (`10.7.17.147`); Layer 4: TCP (`8443`, `3002`) & UDP (`53`); Layer 7: DNS, TLS encryption, and HTTP REST APIs." |
