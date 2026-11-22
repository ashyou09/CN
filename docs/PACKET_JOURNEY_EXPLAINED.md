# End-to-End Packet Journey & 5-Layer Protocol Walkthrough

> **Educational Reference for Evaluators & Students**  
> **Course:** Computer Networks Laboratory  
> **Topic:** Tracing a single client request across the entire OSI / TCP-IP 5-Layer Stack on a 4-node physical LAN.

---

## 🎯 High-Level Overview

When a client executes:
```bash
curl -v "https://app.teamX.test:8443/api/status"
```
the system initiates a multi-stage, multi-layer networking sequence spanning **four independent physical nodes**. Below is the exhaustive chronological breakdown from the physical wire up to the application payload.

```text
+-------------------+             +-------------------+             +-------------------+             +-------------------+
|   Mac 4 (Client)  |             |    Mac 1 (DNS)    |             |    Mac 2 (Edge)   |             |   Mac 3 (Backend) |
|   10.7.17.147     |             |    10.7.17.94     |             |    10.7.3.128     |             |    10.7.6.84      |
+---------+---------+             +---------+---------+             +---------+---------+             +---------+---------+
          |                                 |                                 |                                 |
          | 1. DNS Query (UDP:53)           |                                 |                                 |
          +-------------------------------->|                                 |                                 |
          | 2. DNS Answer (A: 10.7.3.128)   |                                 |                                 |
          |<--------------------------------+                                 |                                 |
          |                                                                   |                                 |
          | 3. TCP SYN (Port 8443)                                            |                                 |
          +------------------------------------------------------------------>|                                 |
          | 4. TCP SYN-ACK                                                    |                                 |
          |<------------------------------------------------------------------+                                 |
          | 5. TCP ACK                                                        |                                 |
          +------------------------------------------------------------------>|                                 |
          |                                                                   |                                 |
          | 6. TLS ClientHello (SNI: app.teamX.test)                          |                                 |
          +------------------------------------------------------------------>|                                 |
          | 7. TLS ServerHello + Server Certificate (signed by TeamX CA)      |                                 |
          |<------------------------------------------------------------------+                                 |
          | 8. Client Key Exchange + Finished (Encrypted Channel Established) |                                 |
          +==================================================================>|                                 |
          |                                                                   |                                 |
          | 9. Encrypted HTTPS GET /api/status                                |                                 |
          +==================================================================>| 10. Upstream TCP Handshake      |
          |                                                                   +-------------------------------->|
          |                                                                   | 11. Plaintext HTTP GET (proxy)  |
          |                                                                   +-------------------------------->|
          |                                                                   | 12. HTTP 200 (X-Backend: A)     |
          |                                                                   |<--------------------------------+
          | 13. Encrypted HTTP 200 (X-Edge: Primary, X-Backend: A)            |                                 |
          |<==================================================================+                                 |
          |                                                                   |                                 |
```

---

## 🔬 Stage-by-Stage Protocol Analysis

### Stage 1: Address Resolution & DNS Discovery (Layer 7 ➔ Layer 2)
1. **Host-Level Lookup**: The client OS checks its local resolver cache (`mDNSResponder`). If un-cached, it queries `/etc/resolver/teamX.test`, pointing to Mac 1 (`10.7.17.94`).
2. **ARP Resolution (Layer 2)**:
   - If the MAC address of `10.7.17.94` is absent from client's ARP cache (`arp -a`), client broadcasts an **ARP Request**:  
     `"Who has 10.7.17.94? Tell 10.7.17.147"` (Ethernet broadcast `ff:ff:ff:ff:ff:ff`).
   - Mac 1 replies with an unicast **ARP Reply** containing its hardware address.
3. **DNS Query (Layer 7 over Layer 4 UDP)**:
   - Client sends a UDP datagram to `10.7.17.94:53`.
   - Payload: Standard query for `app.teamX.test` (Type `A`, Class `IN`).
4. **Authoritative Response**:
   - `dnsmasq` on Mac 1 matches its local records: `host-record=app.teamX.test,10.7.3.128,30`.
   - Replies with IPv4 Address `10.7.3.128` (Mac 2 - Edge Proxy).

---

### Stage 2: Transport Connection Establishment (Layer 4 TCP 3-Way Handshake)
To guarantee reliable delivery, the client initiates a TCP socket connection to `10.7.3.128:8443`:

1. **Packet 1 (SYN)**:
   - Client selects an ephemeral client port (e.g. `54210`).
   - Flag: `SYN=1`, Sequence Number: `Seq=0` (ISN - Initial Sequence Number).
   - Window size: `65535`, Options: MSS=1460, SACK permitted.
2. **Packet 2 (SYN-ACK)**:
   - Mac 2 responds from port `8443`.
   - Flags: `SYN=1, ACK=1`.
   - Sequence Number: `Seq=0` (Server ISN), Acknowledgment Number: `Ack=1` (Client ISN + 1).
3. **Packet 3 (ACK)**:
   - Client acknowledges server's SYN.
   - Flag: `ACK=1`, Sequence: `Seq=1`, Acknowledgment: `Ack=1`.
   - **Socket State**: `ESTABLISHED` on both sides.

---

### Stage 3: Secure Channel Negotiation (TLS 1.2 Handshake)
Prior to transmitting sensitive HTTP payloads, cryptographic session keys must be negotiated:

1. **ClientHello**:
   - Client sends supported TLS versions (`TLS 1.2`, `TLS 1.3`), random bytes (`Client Random`), and cipher suites (e.g., `ECDHE-RSA-AES256-GCM-SHA384`).
   - Crucial Extension: **SNI (Server Name Indication)** indicating `app.teamX.test`.
2. **ServerHello & Certificate Delivery**:
   - Mac 2 selects agreed cipher suite.
   - Sends Server Certificate (`server.crt`). The certificate presents:
     - Issuer: `CN=TeamX Root CA`
     - Subject: `CN=app.teamX.test`
     - Subject Alternative Names (SANs): `DNS:app.teamX.test`, `DNS:api.teamX.test`.
3. **Client Verification & Trust Chain**:
   - The client matches the domain `app.teamX.test` against the certificate SAN.
   - The client verifies the cryptographic signature against `ca.crt` installed in its System Keychain (`/Library/Keychains/System.keychain`).
   - If verified, trust is established without any security warnings.
4. **Key Exchange & Cipher Activation**:
   - Diffie-Hellman parameters are exchanged to generate symmetric pre-master secret.
   - Both parties transmit `ChangeCipherSpec` and encrypted `Finished` verification hashes.

---

### Stage 4: Application Layer Request & Reverse Proxy Handling (Layer 7)
1. **Client Request**:
   - Client sends encrypted HTTP/1.1 request:
     ```http
     GET /api/status HTTP/1.1
     Host: app.teamX.test:8443
     User-Agent: curl/8.7.1
     Accept: */*
     ```
2. **Edge Processing (Nginx on Mac 2)**:
   - Nginx decrypts TLS record using negotiated symmetric session key.
   - Evaluates virtual host block matching `server_name app.teamX.test;`.
   - Checks location `/api/` directives.
   - Consults `upstream backend_pool`:
     ```nginx
     upstream backend_pool {
         server 10.7.6.84:3001 max_fails=3 fail_timeout=5s;
         server 10.7.17.147:3002 max_fails=3 fail_timeout=5s;
     }
     ```
   - Round-robin algorithm chooses target backend (e.g. Backend A on Mac 3).
   - Nginx opens an internal plaintext TCP connection to `10.7.6.84:3001` and forwards the request, attaching:
     - `X-Forwarded-For: 10.7.17.147` (preserves original client IP).
     - `X-Forwarded-Proto: https` (notifies backend that client used TLS).

---

### Stage 5: Backend Processing & Response Generation (Layer 7)
1. **Microservice Execution (Express on Mac 3)**:
   - Node.js listener accepts connection on `0.0.0.0:3001`.
   - Express router evaluates `GET /api/status`.
   - Handler attaches custom identification header: `res.setHeader('X-Backend', 'A')`.
   - Serializes JSON payload: `{"backend":"A","status":"ok"}`.
2. **Reverse Proxy Relay (Mac 2)**:
   - Nginx receives backend response over internal connection.
   - Injects edge header: `X-Edge: Primary-Mac2`.
   - Encrypts entire HTTP response frame via TLS session key.
   - Sends response across port 8443 TCP connection to client.

---

### Stage 6: Client Reception & Connection Teardown
1. **Client Output**:
   - `curl` prints status code `HTTP/1.1 200 OK`.
   - Displays headers verifying multi-node transit:
     - `X-Edge: Primary-Mac2` (proof of edge proxy).
     - `X-Backend: A` (proof of backend node).
   - Prints parsed JSON body.
2. **Connection Closure (TCP 4-Way Teardown or Keep-Alive)**:
   - If Keep-Alive is disabled or connection closes:
     - Client/Server sends `FIN` (`FIN_WAIT_1`).
     - Receiver acknowledges with `ACK` (`CLOSE_WAIT`).
     - Receiver sends its own `FIN` (`LAST_ACK`).
     - Originator replies `ACK`, socket enters `TIME_WAIT` to ensure no delayed packets linger in network buffers.

---

## 📊 Summary of Network Layers Engaged

| Layer | Protocol | Physical Location | Core Function in Project |
| :--- | :--- | :--- | :--- |
| **Layer 7 (Application)** | HTTP/1.1, REST, JSON | Mac 3 / Mac 4 | Microservice business logic & health status |
| **Layer 7 (Security)** | TLS 1.2 / 1.3 | Mac 2 (Edge) | SSL Offloading, certificate validation & encryption |
| **Layer 7 (Name Service)**| DNS (dnsmasq) | Mac 1 / Mac 4 | Resolving `.test` domain to private IP |
| **Layer 4 (Transport)** | TCP / UDP | All Nodes | Port multiplexing, connection reliability, windowing |
| **Layer 3 (Network)** | IPv4, ICMP, Routing | All Nodes | Addressing, subnetting (`/19`), gateway routing |
| **Layer 2 (Data Link)** | Ethernet, 802.11 Wi-Fi | All Network Interfaces| Framing, MAC addressing, local ARP broadcast |
