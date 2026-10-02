# Person C Evidence Portfolio — Backend Server A Lead (Mac 3)

This directory contains verified terminal outputs, service status checks, and failure demonstration logs captured directly from **Mac 3 (Person C, `10.7.6.84`)**, the Backend Server A lead for the **Private Network Service Platform (Phase 1)**.

---

## 🧭 Fast Navigation for Evaluator (Under 30 Seconds)

| Stage & Topic | Primary File | Machine / Host | Verification Summary |
| :--- | :--- | :--- | :--- |
| **Stage 1: LAN Discovery** | [`lan/mac3-interface-discovery.txt`](lan/mac3-interface-discovery.txt) | Mac 3 (`10.7.6.84`) | Interface `en0`, IP `10.7.6.84`, `/19` Subnet Mask, Gateway `10.7.0.1` |
| **Stage 1: Ping Reachability** | [`lan/ping-from-C.txt`](lan/ping-from-C.txt) | Mac 3 ➔ All | 0.0% packet loss pinging Mac 1 (`10.7.17.94`), Mac 2 (`10.7.3.128`), Mac 4 (`10.7.17.147`) |
| **Stage 2: Backend A Service** | [`load-balancing/backend-a-listener-and-endpoints.txt`](load-balancing/backend-a-listener-and-endpoints.txt) | Mac 3 (`10.7.6.84`) | Port 3001 listener, `GET /`, `GET /api/status` with `X-Backend: A`, remote check |
| **Stage 5: Private DNS** | [`dns/mac3-dns-resolution.txt`](dns/mac3-dns-resolution.txt) | Mac 3 ➔ Mac 1 | `dig @10.7.17.94` resolves `app.teamX.test` and `api.teamX.test` to Edge `10.7.3.128` |
| **Stage 6: TLS CA Trust** | [`tls/mac3-tls-ca-verification.txt`](tls/mac3-tls-ca-verification.txt) | Mac 3 (`10.7.6.84`) | `curl -v --cacert ca.crt https://app.teamX.test:8443/api/status` succeeds with HTTP 200 |
| **Stage 7: HTTP Caching (304)**| [`caching/mac3-caching-endpoint.txt`](caching/mac3-caching-endpoint.txt) | Mac 3 (`10.7.6.84`) | `Cache-Control: public, max-age=60`, `ETag`, and conditional `304 Not Modified` |
| **Stage 8: Port 3001 Traffic** | [`wireshark/mac3-traffic-observation.txt`](wireshark/mac3-traffic-observation.txt) | Mac 3 (`10.7.6.84`) | Packet trace showing Edge Mac 2 establishing TCP connection to Backend A |
| **Stage 9: Failure Case 3** | [`failures/case-3-backend-a-planned-stop.txt`](failures/case-3-backend-a-planned-stop.txt) | Mac 3 | Planned stop of Node process: Edge automatically shifts 100% traffic to B |

---

## 📁 Directory Structure

```
evidenceC/
├── README.md
├── caching/
│   └── mac3-caching-endpoint.txt
├── dns/
│   └── mac3-dns-resolution.txt
├── failures/
│   └── case-3-backend-a-planned-stop.txt
├── lan/
│   ├── mac3-interface-discovery.txt
│   └── ping-from-C.txt
├── load-balancing/
│   └── backend-a-listener-and-endpoints.txt
├── tls/
│   └── mac3-tls-ca-verification.txt
└── wireshark/
    └── mac3-traffic-observation.txt
```
