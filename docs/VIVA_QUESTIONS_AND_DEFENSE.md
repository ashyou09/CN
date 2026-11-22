# Computer Networks Comprehensive Viva Voce Defense Guide

> **Examiner & Student Reference**  
> **Topic:** 25 In-Depth Networking Questions & Technical Answers for Oral Examination (Viva Voce)

---

## 📌 Section 1: Domain Name System (DNS) & Layer 7 Name Resolution

### Q1: Why does DNS primarily use UDP on Port 53 instead of TCP? When does it switch to TCP?
- **Answer**: 
  - **Speed & Low Overhead**: DNS resolution typically requires a single request and single response. Using UDP avoids the overhead of establishing a 3-way TCP handshake (3 packets) and teardown (4 packets), keeping latency minimal.
  - **Switching to TCP**: DNS automatically switches to TCP port 53 when:
    1. The response payload exceeds **512 bytes** (traditional UDP DNS limit) and the server sets the `TC` (Truncated) bit in the header, prompting the client to retry over TCP.
    2. Zone transfers between DNS servers (**AXFR / IXFR**) which require reliable stream transmission.
    3. Modern DNSSEC records with large cryptographic keys.

### Q2: What is the difference between an Authoritative DNS server and a Recursive Resolver?
- **Answer**:
  - **Authoritative DNS Server** (e.g., our `dnsmasq` instance on Mac 1 for `.test`): Holds the master record files for a specific domain/zone. It does not look elsewhere; it gives the definitive answer or `NXDOMAIN`.
  - **Recursive Resolver**: Queries other authoritative servers across the global hierarchy (Root `.` ➔ TLD `.com` ➔ Authoritative) on behalf of a client and caches the result.

### Q3: What is DNS TTL (Time-To-Live) and why is it critical during service migration (Phase 2)?
- **Answer**:
  - TTL specifies how many seconds client operating systems and intermediate resolvers are permitted to cache an A record before issuing a new query.
  - In Phase 1, default TTLs can be hours or days. In Phase 2 (**Extension B**), we configure `TTL = 30s`. This ensures that when the Edge Proxy is migrated from Primary (Mac 2) to Standby (Mac 3), clients discover the new IP address within 30 seconds rather than remaining stuck on stale cached records.

### Q4: Why must macOS DNS cache be flushed after updating DNS records (`dscacheutil` & `mDNSResponder`)?
- **Answer**:
  - macOS caches DNS queries in memory via the `mDNSResponder` daemon. Even if the remote DNS server updates its record, macOS will continue using the local memory cache until the TTL expires.
  - To force immediate re-querying during a demo or emergency failover:
    ```bash
    sudo dscacheutil -flushcache
    sudo killall -HUP mDNSResponder
    ```

---

## 🔒 Section 2: Transport Layer (TCP) & TLS / Cryptography

### Q5: Walk through the TCP 3-Way Handshake observed in your Wireshark traces.
- **Answer**:
  1. **SYN**: Client sends packet with flag `SYN=1`, random Initial Sequence Number (e.g. `Seq=X`), and options (MSS, Window Scale).
  2. **SYN-ACK**: Server acknowledges client's sequence (`Ack=X+1`) and sends its own sequence number (`Seq=Y`), with flags `SYN=1, ACK=1`.
  3. **ACK**: Client acknowledges server's sequence (`Ack=Y+1`, `Seq=X+1`). The socket transitions to `ESTABLISHED`. Both sides now have synchronized sequence numbers for reliable ordered streaming.

### Q6: What is Server Name Indication (SNI) and why is it essential in TLS?
- **Answer**:
  - SNI is a TLS extension included in the initial plaintext `ClientHello` message where the client indicates the hostname it wants to connect to (e.g. `app.teamX.test`).
  - Without SNI, the server would have to present a certificate before knowing which website the client is visiting, making it impossible to host multiple SSL-secured domains on a single IP address and port.

### Q7: What is SSL/TLS Termination (Offloading) and why perform it at the Edge Proxy (Mac 2)?
- **Answer**:
  - TLS termination decrypts incoming HTTPS traffic at the Edge Proxy (Nginx) and forwards requests to backend services (Mac 3 / Mac 4) as fast, plaintext HTTP over the internal network.
  - **Benefits**:
    1. **CPU Offloading**: Cryptographic handshakes (RSA / ECDHE) consume compute power; offloading preserves backend CPU for core application processing.
    2. **Centralized Certificate Management**: Only the Edge Proxy requires the SSL certificate and private key. Backends do not need certificate provisioning or annual renewal.
    3. **Application Layer Inspection**: Allows the proxy to inspect headers, apply WAF rules, perform gzip compression, and balance load intelligently.

### Q8: What occurs if the client does not trust the Root Certificate (`ca.crt`)?
- **Answer**:
  - The client's TLS verification library aborts the connection during the certificate validation phase with `x509: certificate signed by unknown authority` or `curl: (60) SSL certificate problem`.
  - In our architecture, we generated a custom Root CA (`ca.crt`) and imported it into the macOS System Keychain with root trust permissions (`security add-trusted-cert`). This enables native, trusted HTTPS without insecure flags like `curl -k`.

---

## ⚖️ Section 3: Reverse Proxy, Load Balancing & HTTP Caching

### Q9: What is the difference between a Reverse Proxy and a Forward Proxy?
- **Answer**:
  - **Forward Proxy**: Sits in front of clients (e.g., corporate intranet proxy) to monitor, filter, or anonymize outbound requests to the internet.
  - **Reverse Proxy**: Sits in front of backend servers (e.g. Nginx on Mac 2) to protect backends, distribute incoming client traffic, terminate TLS, and hide internal network topology.

### Q10: How does Round-Robin load balancing handle a backend crash?
- **Answer**:
  - Nginx alternates incoming connections 1:1 between Backend A (`10.7.6.84:3001`) and Backend B (`10.7.17.147:3002`).
  - In our configuration:
    ```nginx
    server 10.7.6.84:3001 max_fails=3 fail_timeout=5s;
    server 10.7.17.147:3002 max_fails=3 fail_timeout=5s;
    ```
  - If Backend A stops responding, Nginx detects the connection failure, triggers `proxy_next_upstream`, immediately reroutes the client to Backend B without throwing an error to the user, and marks Backend A inactive for 5 seconds.

### Q11: Explain HTTP 304 Not Modified and Conditional Requests (RFC 9111).
- **Answer**:
  - **Initial Request**: Server replies `200 OK` with an `ETag: "hash"` header and `Cache-Control: public, max-age=60`.
  - **Subsequent Request**: Client cache sends a conditional request with `If-None-Match: "hash"`.
  - **Server Evaluation**: If the backend resource content has not changed, the server sends `HTTP/1.1 304 Not Modified` with empty body payload.
  - **Advantage**: Saves LAN bandwidth, lowers CPU serialization costs, and reduces round-trip latency.

### Q12: Why are `X-Forwarded-For` and `X-Forwarded-Proto` headers added by the proxy?
- **Answer**:
  - Because Nginx terminates the client TCP connection and opens a new connection to the backend, the backend socket sees the Edge Proxy's IP (`10.7.3.128`) instead of the true client IP (`10.7.17.147`).
  - `X-Forwarded-For` conveys the original client IP.
  - `X-Forwarded-Proto: https` informs the backend that the original client request was encrypted, preventing unwanted redirect loops.

---

## 🛡️ Section 4: Network Security, Subnetting & Packet Filter (pfctl)

### Q13: Explain the Network Architecture: Subnets, Gateways, and Broadcast.
- **Answer**:
  - In our testbed, machines are on subnet `10.7.0.0/19` (`255.255.224.0`).
  - Host IP range spans `10.7.0.1` to `10.7.31.254`.
  - Default Gateway is `10.7.0.1` (routes packets destined outside the subnet).
  - Broadcast address is `10.7.31.255` (used for local ARP resolution).

### Q14: What is Service Isolation (Extension C) and why is it implemented on backends?
- **Answer**:
  - **Vulnerability**: Without isolation, any client on the Wi-Fi network could bypass the Edge Proxy and directly hit `http://10.7.6.84:3001/api/status`. This bypasses TLS encryption, load balancing, rate limiting, and security inspection.
  - **Solution**: We implement macOS `pf` (Packet Filter) rules on Mac 3 and Mac 4:
    ```pf
    block in quick proto tcp to any port 3001
    pass in quick proto tcp from 10.7.3.128 to any port 3001
    ```
  - This strictly enforces a **Zero Trust / DMZ architecture**: only authorized Edge proxies can access the microservices.

### Q15: What is the difference between Layer 3 firewalling and Layer 7 Web Application Firewalls (WAF)?
- **Answer**:
  - **Layer 3/4 Firewall (`pfctl`)**: Inspects packet IP headers and TCP/UDP ports. Fast, kernel-level, but cannot inspect HTTP payload or URL parameters.
  - **Layer 7 WAF**: Inspects HTTP request methods, URIs, SQL injection strings, and cross-site scripting (XSS) headers at the application level.

---

## 💥 Section 5: Fault Injection & Failure Analysis

### Q16: In Failure Case 1 (DNS Down), why does `ping <IP>` work but `curl app.teamX.test` fail?
- **Answer**:
  - `ping <IP>` operates at **Layer 3 (ICMP Echo)** using a direct IP address, bypassing domain name resolution completely.
  - `curl app.teamX.test` requires a **Layer 7 DNS lookup** before it can build a transport socket. If the resolver is offline, name resolution times out (`NXDOMAIN`), preventing any TCP connection from starting.

### Q17: In Failure Case 4 (Both Backends Down), why does the client receive `HTTP 502 Bad Gateway` instead of `Connection Refused`?
- **Answer**:
  - The client's TCP handshake and TLS negotiation connect successfully to the **Edge Proxy (Nginx)** on port 8443 (`Connection Established`).
  - Nginx then attempts to connect to upstream backends on ports 3001 and 3002. Since both backends are down, Nginx gets `ECONNREFUSED` internally.
  - As a valid HTTP proxy, Nginx reports this upstream failure to the client using standardized status code **`502 Bad Gateway`**.

### Q18: In Failure Case 5 (Wrong Port 8444), what packet flag is returned in Wireshark?
- **Answer**:
  - The client sends a TCP `[SYN]` to destination port 8444.
  - Because no service is listening on port 8444, the operating system kernel immediately returns a TCP packet with the **`[RST, ACK]` (Reset)** flag set, resulting in `Connection Refused`.

---

## 🛠️ Section 6: Phase 2 High-Availability & Troubleshooting (Ext F)

### Q19: What is the Single Point of Failure (SPOF) in Phase 1, and how is it resolved in Phase 2?
- **Answer**:
  - **Phase 1 SPOF**: Mac 1 (Sole DNS) and Mac 2 (Sole Edge Proxy). If either Mac crashes, the entire system is down.
  - **Phase 2 Resolution**:
    1. **DNS Redundancy (Ext A)**: Mac 4 is configured as Backup DNS Resolver on port 53.
    2. **Edge Redundancy (Ext E)**: Mac 3 is provisioned as Standby Edge Proxy running Nginx on port 8443 with identical certificates and routing rules.
    3. **Fast Cutover (Ext B)**: 30-second TTL allows switching DNS pointers to Standby Edge in 30 seconds.

### Q20: What is your 5-step systematic diagnostic sequence if an examiner injects an unknown fault?
- **Answer**:
  Always follow bottom-up troubleshooting from Physical to Application layer:
  1. **Layer 1/2**: Verify Wi-Fi interface status and ARP entry: `ipconfig getifaddr en0 && arp -a`.
  2. **Layer 3**: Verify gateway and node reachability via ICMP: `ping -c 2 <target_ip>`.
  3. **Layer 4**: Verify port binding and socket state: `nc -zv <target_ip> <port>` or `lsof -nP -iTCP:<port>`.
  4. **Layer 7 (DNS)**: Test name resolution in isolation: `dig @<dns_ip> app.teamX.test +short`.
  5. **Layer 7 (Application/TLS)**: Test HTTP status and headers: `curl -kv https://app.teamX.test:8443/api/status`.
