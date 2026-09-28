# Person B — Mac 2: Edge Reverse Proxy & Load Balancer

Person B (Mac 2) acts as the **single entry point** for the Private Network Service Platform.

It is responsible for:

- Reverse proxying incoming requests
- Round-robin load balancing
- TLS/HTTPS termination
- Routing requests to Backend A and Backend B
- Providing a single endpoint for clients

---

## Service Details

| Component | Details |
|---|---|
| **Role** | Edge Reverse Proxy, Load Balancer & TLS Termination |
| **Web Server** | Nginx |
| **HTTP Port** | `8080` or `80` |
| **HTTPS Port** | `8443` or `443` |
| **Load Balancing** | Round Robin |
| **Backend A** | `127.0.0.1:3001` / `PERSON_C_IP:3001` |
| **Backend B** | `127.0.0.1:3002` / `PERSON_D_IP:3002` |

---

## Architecture

```text
                         Client
                           │
                           │ HTTP / HTTPS
                           ▼
                ┌──────────────────────┐
                │      Person B        │
                │       Mac 2          │
                │                      │
                │       Nginx          │
                │                      │
                │  ┌────────────────┐  │
                │  │ TLS Termination│  │
                │  └────────────────┘  │
                │                      │
                │  ┌────────────────┐  │
                │  │ Reverse Proxy  │  │
                │  └────────────────┘  │
                │                      │
                │  ┌────────────────┐  │
                │  │ Round-Robin LB │  │
                │  └────────────────┘  │
                └──────────┬───────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
             ┌────────────┐ ┌────────────┐
             │ Backend A  │ │ Backend B  │
             │ Port 3001  │ │ Port 3002  │
             │ Person C   │ │ Person D   │
             └────────────┘ └────────────┘
