# Person D — Mac 4: Backend Server B & Network Capture Lead

> **Comprehensive Project Runbook & Evaluation Portfolio for Mac 4**  
> **Computer Networks Lab — Private Network Service Platform (Phase 1)**

---

## 🎯 Executive Overview & Machine Profile

| Property | Assigned Value | Description |
| :--- | :--- | :--- |
| **Persona / Machine** | **Person D / Mac 4** | Backend B Provider & Network Capture / Client Lead |
| **Local IP Address** | `10.7.17.147` | Assigned static/DHCP IP on lab private subnet |
| **Network Interface**| `en0` | Primary Wi-Fi / Ethernet adapter |
| **Subnet Mask / CIDR**| `255.255.224.0` (`/19`)| Broadcast: `10.7.31.255` |
| **Default Gateway** | `10.7.0.1` | LAN Default Router |
| **Service Hosted** | **Backend Server B** | Node.js Express REST API on TCP port `3002` |
| **Primary Domain** | `https://app.teamX.test:8443` | Reverse proxied via Edge (Mac 2: `10.7.3.128`) |
| **Private DNS** | `10.7.17.94:53` | Managed by Mac 1 (Person A) |

---

## 🏗️ Architecture & Separation of Concerns

To guarantee clean architecture and maintainability, Person D's repository components follow strict separation of concerns:

```
personD/
├── README.md                          # Master documentation & examiner review guide
├── PERSON_D_EVALUATION_GUIDE.md          # Fast grading sheet & viva defense guide
├── backendB/                          # Headless Application Server B
│   ├── server.js                      # Core Express server (Port 3002, 0.0.0.0, ETag, Caching)
│   ├── package.json                   # Project metadata and dependencies
│   ├── package-lock.json              # Locked dependency tree
│   └── run.sh                         # Safe startup wrapper script
├── client/                            # Independent Test Client Suite
│   └── test.sh                        # Automated verification script (Health, Balancing, 304 Caching)
└── evidence/                          # Direct pointer to Person D evidence
    └── README.md

evidence/                              # Output & Verification Artifacts (Captured by Mac 4)
├── evidence_D/                        # ⭐ Dedicated Person D / Mac 4 Evidence Portfolio
├── lan/                               # Stage 1: Interface discovery & 0.0% packet loss ping logs
├── dns/                               # Stage 5: Private DNS resolution & resolver configuration
├── load-balancing/                    # Stages 3 & 7: Local listener checks & alternating HTTPS round-robin
├── tls/                               # Stage 6: Native TLS 1.3 handshake verification without -k
├── caching/                           # Stage 7: ETag conditional requests returning HTTP 304
├── wireshark/                         # Stage 8: Raw .pcap traces & frame-by-frame protocol analysis
└── failures/                          # Stage 9: All 5 deliberate network fault case demonstrations
```

> 🌟 **Direct Link to Consolidated Person D Portfolio:**  
> All of Person D's deliverables are packaged sequentially in [`../evidence/evidence_D/README.md`](../evidence/evidence_D/README.md).

---

## 📋 Comprehensive Deliverables Checklist (Person D / Mac 4)

| Stage & Task ID | Description & Role | Deliverable File Link | Verification Status |
| :--- | :--- | :--- | :---: |
| **Stage 1 (Task A)** | **LAN Interface Discovery**<br>Recorded IP, MAC, Subnet Mask, Default Gateway | [`mac4-interface-discovery.txt`](../evidence/lan/mac4-interface-discovery.txt) | **VERIFIED** |
| **Stage 1 (Task A)** | **LAN Reachability Matrix**<br>3-ping sequence to Mac 1, Mac 2, Mac 3 (0.0% loss) | [`ping-from-mac4-to-all.txt`](../evidence/lan/ping-from-mac4-to-all.txt) | **VERIFIED** |
| **Stage 3 (Task C)** | **Backend B Service Deployment**<br>Node.js Express bound to `0.0.0.0:3002` with `X-Backend: B` | [`backend-b-local-test.txt`](../evidence/load-balancing/backend-b-local-test.txt) | **VERIFIED** |
| **Stage 5 (Task B)** | **Private DNS Query Verification**<br>Queried Mac 1 (`10.7.17.94:53`) for `app` & `api.teamX.test` | [`dns-client-D.txt`](../evidence/dns/dns-client-D.txt) | **VERIFIED** |
| **Stage 5 (Task B)** | **macOS Resolver Configuration**<br>Verified system nameserver configuration | [`scutil-dns-mac4.txt`](../evidence/dns/scutil-dns-mac4.txt) | **VERIFIED** |
| **Stage 6 (Task E)** | **Native TLS Keychain Trust**<br>Root CA trusted; HTTPS curl validated without `-k` | [`tls-handshake-curl-verification.txt`](../evidence/tls/tls-handshake-curl-verification.txt) | **VERIFIED** |
| **Stage 7 (Task D)** | **HTTPS Round-Robin Load Balancing**<br>6 consecutive requests alternating between `B` and `A` | [`https-load-balancing-evidence.txt`](../evidence/load-balancing/https-load-balancing-evidence.txt) | **VERIFIED** |
| **Stage 7 (Task F)** | **HTTP Caching & Conditional 304**<br>`Cache-Control: max-age=60`, `ETag`, and `304 Not Modified` | [`caching-and-304-evidence.txt`](../evidence/caching/caching-and-304-evidence.txt) | **VERIFIED** |
| **Stage 8 (Task G)** | **Full Network Packet Capture**<br>Complete capture of DNS (UDP 53), TCP SYN, TLS 1.2, HTTP | [`phase1-flow.pcap`](../evidence/wireshark/phase1-flow.pcap) <br> *(alt: [`tls12-handshake.pcap`](../evidence/wireshark/tls12-handshake.pcap))* | **VERIFIED** |
| **Stage 8 (Task G)** | **Wireshark Frame Analysis**<br>Frame sequence, TCP SEQ/ACK numbers, 5-layer OSI mapping | [`wireshark-packet-analysis.txt`](../evidence/wireshark/wireshark-packet-analysis.txt) | **VERIFIED** |
| **Stage 9 (Fault 1)**| **Failure Case 1: DNS Resolver Failure**<br>Resolver pointed to `127.0.0.1`: DNS times out, IP ping OK | [`failure-case-1-dns-resolver-failure.txt`](../evidence/failures/failure-case-1-dns-resolver-failure.txt) | **VERIFIED** |
| **Stage 9 (Fault 2)**| **Failure Case 2: DNS Record Misdirection**<br>Record points to Mac 3 (no edge): TCP connection refused | [`failure-case-2-dns-misdirection.txt`](../evidence/failures/failure-case-2-dns-misdirection.txt) | **VERIFIED** |
| **Stage 9 (Fault 3)**| **Failure Case 3: Backend Failover**<br>Backend A stopped: Edge routes 100% requests to Backend B | [`failure-case-3-single-backend-stopped.txt`](../evidence/failures/failure-case-3-single-backend-stopped.txt) <br> *(alt: [`backend-A-stopped.txt`](../evidence/failures/backend-A-stopped.txt))* | **VERIFIED** |
| **Stage 9 (Fault 4)**| **Failure Case 4: Both Backends Down**<br>Backend A & B stopped: Edge returns `HTTP 502 Bad Gateway` | [`failure-case-4-both-backends-down.txt`](../evidence/failures/failure-case-4-both-backends-down.txt) | **VERIFIED** |
| **Stage 9 (Fault 5)**| **Failure Case 5: Wrong Edge Port**<br>Connecting to port 8444: ICMP ping succeeds, TCP handshake refused | [`failure-case-5-wrong-port.txt`](../evidence/failures/failure-case-5-wrong-port.txt) | **VERIFIED** |

---

## 🚀 Live Demonstration Quick-Commands for Evaluator

Whenever the examiner requests a live re-run on Mac 4, execute the following commands directly:

### 1. Verify Local Backend B Service
```bash
# Check listener on port 3002
lsof -nP -iTCP:3002 -sTCP:LISTEN

# Test all three API endpoints
curl -i http://localhost:3002/
curl -i http://localhost:3002/api/status
curl -i http://localhost:3002/api/cached
```

### 2. Run Automated Client Test Suite
```bash
# Runs full test sequence against the platform
./personD/client/test.sh "https://app.teamX.test:8443" 6
```

### 3. Verify Round-Robin Load Balancing
```bash
for i in 1 2 3 4 5 6; do
  curl -sS -D - -o /dev/null "https://app.teamX.test:8443/api/status" | \
    awk -v n="$i" 'BEGIN {printf "Request %s: ", n} tolower($1)=="x-backend:" {print $2}'
done
```

### 4. Verify HTTP Caching & 304 Not Modified
```bash
# Step 1: Obtain headers and ETag
curl -sS -D /tmp/headers.txt -o /dev/null "https://app.teamX.test:8443/api/cached"
cat /tmp/headers.txt | grep -E -i "(x-backend|cache-control|etag)"

# Step 2: Extract ETag and send conditional GET
ETAG=$(grep -i "etag:" /tmp/headers.txt | awk '{print $2}' | tr -d '\r')
curl -i -H "If-None-Match: $ETAG" "https://app.teamX.test:8443/api/cached"
```

### 5. Inspect Wireshark Trace
```bash
# Open recorded capture in Wireshark
open evidence/wireshark/phase1-flow.pcap
```

---

## 🛡️ Deliberate Failure Analysis Summary (OSI Layer Breakdown)

| Case | Fault Injected | Layer Affected | Observed Symptom | Root Cause Explanation |
| :---: | :--- | :--- | :--- | :--- |
| **1** | DNS pointed to `127.0.0.1` | **Application (DNS)** | `dig` timeout; `ping 10.7.3.128` passes | No UDP/53 listener on localhost; Layer 3 routing is intact |
| **2** | DNS record pointed to Mac 3 | **Application (DNS) / Transport** | `curl` returns Connection refused | Name resolves, but target IP has no TLS reverse proxy on 8443 |
| **3** | Backend A killed | **Application (Upstream Proxy)** | Zero downtime; responses show `X-Backend: B` | Nginx health detection retries and marks failed upstream inactive |
| **4** | Both Backends killed | **Application (Reverse Proxy)** | `HTTP/1.1 502 Bad Gateway` | Edge cannot establish TCP upstream connections to 3001 or 3002 |
| **5** | Port changed to `8444` | **Transport (TCP)** | Ping succeeds; TCP handshake fails | Target host is online (ICMP works), but no socket is bound to port 8444 |
