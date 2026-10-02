# Network Topology & Request Flow

## 1. Network Topology Diagram

```
                 +---------------------------------------------+
                 |            Private LAN (Wi-Fi)              |
                 |          10.7.0.0/19 · gateway 10.7.0.1     |
                 +----------------------+----------------------+
                                        |
       +--------------------------------+--------------------------------+
       |                                |                                |
+------v-------+                 +------v-------+                 +------v-------+
|    Mac 1     |                 |    Mac 2     |                 |    Mac 3     |
|  (Person A)  |                 |  (Person B)  |                 |  (Person C)  |
|  Private DNS |                 | Edge Reverse |                 |  Backend A   |
|   (Port 53)  |                 | Proxy / TLS  |                 | (Port 3001)  |
|   Client     |                 |  Load Bal.   |                 +--------------+
+--------------+                 | (8080/8443)  |                        |
                                 +------+-------+                        |
                                        |                                |
                                        +--------------------------------+
                                        |
                                 +------v-------+
                                 |    Mac 4     |
                                 |  (Person D)  |
                                 |  Backend B   |
                                 | (Port 3002)  |
                                 |   Client     |
                                 +--------------+
```

Current team addresses on Rishihood Learner Wi-Fi (2026-10-02):

| Machine | Role | IPv4 address |
| :--- | :--- | :--- |
| Mac 1 / A | Private DNS and client | `10.7.17.94` |
| Mac 2 / B | Edge proxy | `10.7.3.128` |
| Mac 3 / C | Backend A | `10.7.6.84` |
| Mac 4 / D | Backend B and client | `10.7.17.147` |

---

## 2. Request Journey (Protocol Flow)

```
[Client (Mac 1 / Mac 4)]
        │
        │ 1. DNS Query (UDP 53) for "app.teamX.test"
        ▼
[DNS Server (Mac 1)] ──── Returns Mac 2 IP (A record) ────► [Client]
                                                                  │
        │ 2. TCP 3-Way Handshake (SYN → SYN-ACK → ACK)            │
        │    Port 8443 (or 8080)                                  │
        │ 3. TLS Handshake (ClientHello, ServerHello, Cert, KeyEx)│
        │ 4. HTTPS Encrypted Request GET /api/status              │
        ▼                                                         ▼
[Edge Proxy (Mac 2 / Nginx)]
        │
        │ 5. Round-Robin Load Balancer decision
        ├──────────── Request 1 ────────────► [Backend A (Mac 3:3001)]
        │                                           │ (X-Backend: A)
        │                                           ▼
        │◄─────────── Response 1 ───────────────────┘
        │
        ├──────────── Request 2 ────────────► [Backend B (Mac 4:3002)]
        │                                           │ (X-Backend: B)
        │                                           ▼
        │◄─────────── Response 2 ───────────────────┘
        ▼
[Client receives response with X-Backend header]
```

---

## 3. Protocol & OSI / TCP-IP Layer Mapping

| Layer (TCP/IP) | Layer (OSI) | Protocol | Role in This Project |
| :--- | :--- | :--- | :--- |
| **Application** | Application (7) | **DNS** | Resolves `app.teamX.test` to Mac 2 IP (UDP 53) |
| **Application** | Application (7) | **HTTP/1.1** | Application payload (`GET /api/status`, `Cache-Control`) |
| **Transport** | Presentation (6) / Session (5) | **TLS 1.2 / 1.3** | Encrypts HTTP traffic between Client and Edge (Nginx) |
| **Transport** | Transport (4) | **TCP** | Reliable delivery, 3-way handshake, sequence/ACK tracking |
| **Network** | Network (3) | **IPv4** | Addressing and routing across LAN subnets |
| **Data Link / Physical** | Data Link (2) / Physical (1) | **Ethernet / 802.11 Wi-Fi** | Frame delivery using MAC addresses |

---

## 4. Local Roles vs. Cloud Equivalents

| Team Machine | Local Role | Cloud Architecture Equivalent |
| :--- | :--- | :--- |
| **Mac 1** | Private DNS Server (`dnsmasq`) | AWS Route 53 Private Hosted Zone / Cloud DNS |
| **Mac 2** | Edge Reverse Proxy & Load Balancer (`nginx`) | AWS Application Load Balancer (ALB) / CloudFront Edge |
| **Mac 3** | Backend Instance A (`Node.js Express`) | AWS EC2 Target Instance 1 / Container Pod A |
| **Mac 4** | Backend Instance B (`Node.js Express`) | AWS EC2 Target Instance 2 / Container Pod B |
