# Private Network Service Platform — Phase 1

A fully local private network service platform built on a four-machine topology running across macOS laptops.

## Interactive demo

Run `npm run demo` on Mac 2, then open `http://localhost:5050`. The page walks through DNS, the edge, both backends, and the response path. Each live check shows its scope and command output; the evidence library lists saved files and missing categories. You can export results from the current browser session as JSON.

The demo probes from the machine running it. For the full four-machine proof, collect client-side DNS, trusted HTTPS, ping matrix, and packet captures using [`projectflow.md`](projectflow.md). Configure IPs in the demo when the LAN changes; also update dnsmasq and Nginx separately. Saved evidence and live checks represent different times and should be read separately.

---

## Architecture & Team Role Division

```text
CN/
├── personA/                    # Mac 1: Private DNS Resolver (dnsmasq) + Test Client
│   ├── dns/
│   │   ├── dnsmasq.conf
│   │   └── setup_dns.sh
│   ├── client/
│   │   └── test.sh
│   └── README.md
│
├── personB/                    # Mac 2: Edge Reverse Proxy + Load Balancer + TLS (nginx)
│   ├── nginx/
│   │   ├── nginx.conf
│   │   ├── logs/
│   │   └── start_nginx.sh
│   ├── tls/
│   │   ├── generate_cert.sh
│   │   └── README.md
│   └── README.md
│
├── personC/                    # Mac 3: Backend Instance A (Port 3001)
│   ├── backendA/
│   │   ├── server.js
│   │   ├── package.json
│   │   └── run.sh
│   └── README.md
│
├── personD/                    # Mac 4: Backend Instance B (Port 3002) + Test Client (testing)
│   ├── backendB/
│   │   ├── server.js
│   │   ├── package.json
│   │   └── run.sh
│   ├── client/
│   │   └── test.sh
│   └── README.md
│
├── evidence/                   # Packet captures (.pcapng), logs, and screenshots
│   ├── lan/
│   ├── dns/
│   ├── load-balancing/
│   ├── tls/
│   ├── caching/
│   ├── wireshark/
│   └── failures/
│
├── docs/                       # Architecture & Network details
│   ├── topology.md
│   └── machine-details.md
│
├── README.md
└── .gitignore
```

---

## Phase 1 Quickstart (Local Testing on Single Machine)

### Step 1: Start Backend A (Mac 3)
```bash
npm run start:a
# Runs on http://0.0.0.0:3001 with X-Backend: A
```

### Step 2: Start Backend B (Mac 4)
```bash
npm run start:b
# Runs on http://0.0.0.0:3002 with X-Backend: B
```

### Step 3: Start Edge Nginx Proxy (Mac 2)
```bash
npm run start:nginx
# Listens on http://localhost:8080 and https://localhost:8443
```

### Step 4: Run Client Tests
```bash
npm run test:client
# Demonstrates:
#  1. GET /
#  2. GET /api/status
#  3. Round-Robin Load Balancing alternating X-Backend: A and X-Backend: B
#  4. HTTP Caching with Cache-Control: max-age=60 and 304 Not Modified
```

### Step 5: Stop Nginx
```bash
npm run stop:nginx
```

---

## Transitioning to Four Physical Macs

1. **Connect All Macs to Same LAN/Wi-Fi**:
   - Check and record each machine's IP address (`ifconfig en0 | grep "inet "`).
   - Fill in [`docs/machine-details.md`](file:///Users/pankajbaid/projects/CN/docs/machine-details.md).
   - Test pairwise reachability with `ping`.

2. **Configure Mac 2 (Edge Nginx)**:
   - Edit [`personB/nginx/nginx.conf`](file:///Users/pankajbaid/projects/CN/personB/nginx/nginx.conf) to point the upstream pool to the LAN IPs of Mac 3 and Mac 4:
     ```nginx
     upstream backend_pool {
         server <PERSON_C_IP>:3001 max_fails=3 fail_timeout=5s;
         server <PERSON_D_IP>:3002 max_fails=3 fail_timeout=5s;
     }
     ```
   - Start nginx: `./personB/nginx/start_nginx.sh start`.

3. **Configure Mac 1 (DNS Resolver)**:
   - Run: `./personA/dns/setup_dns.sh <PERSON_B_IP>`
   - Start dnsmasq: `sudo dnsmasq -C personA/dns/dnsmasq.conf -d`
   - Configure Mac 2, 3, 4 to use Mac 1 as their primary DNS server.

4. **Verify Domain Resolution & Full Flow**:
   ```bash
   dig @<PERSON_A_IP> app.teamX.test
   curl -i http://app.teamX.test:8080/api/status
   curl -i https://app.teamX.test:8443/api/status
   ```
