# 5-Layer Rapid Diagnostic Playbook for Faculty-Injected Faults (Extension F)

> **Phase 2 — Extension F (Troubleshooting Challenge — 10 Marks)**  
> **Target:** Systematically diagnose and remediate an unknown network fault injected live by the evaluation committee within 2 minutes.

---

## ⚡ 1. The 120-Second Diagnostic Decision Tree

When the examiner says *"The application is failing. Tell me why and fix it."*, **never guess randomly**. Execute this bottom-up diagnostic sequence:

```text
Step 1: Check Local IP & Interface (L1/L2)
  └─► Command: ipconfig getifaddr en0
      • If empty: Wi-Fi disconnected or DHCP failure. Reconnect to lab Wi-Fi.

Step 2: Check Physical Node Reachability (L3)
  └─► Command: ping -c 2 10.7.3.128  (Edge) && ping -c 2 10.7.17.94 (DNS)
      • If ping FAILS: Layer 3 routing issue, AP client isolation, or node offline.
      • If ping PASSES: Physical & Network layers are healthy. Move to Step 3.

Step 3: Check Domain Name Resolution (L7 DNS)
  └─► Command: dig @10.7.17.94 app.teamX.test +short
      • If times out: dnsmasq is dead on Mac 1. (Ext A / Failover to Mac 4).
      • If returns wrong IP: Stale record / DNS misdirection (Fault D2).
      • If resolves 10.7.3.128: DNS is healthy. Move to Step 4.

Step 4: Check TCP Port & Listener Binding (L4)
  └─► Command: nc -zv 10.7.3.128 8443
      • If Connection Refused: Nginx is stopped, or port mismatch (Fault D5).
      • If Connection Succeeded: Transport layer is open. Move to Step 5.

Step 5: Check TLS Certificate & Application Payload (L7 TLS & HTTP)
  └─► Command: curl -Iv https://app.teamX.test:8443/api/status --cacert personB/tls/ca.crt
      • If SSL Certificate Error: SAN mismatch, expired cert, or missing CA.
      • If HTTP 502 Bad Gateway: Both backends stopped (Fault D4).
      • If HTTP 200 OK: Inspect headers (`X-Edge`, `X-Backend`) to confirm routing.
```

---

## 🛠️ 2. Rapid Command Reference Cheat Sheet

| Layer | Diagnostic Intent | Terminal Command to Run | Expected Healthy Output |
| :--- | :--- | :--- | :--- |
| **L1/L2** | Wi-Fi IP assigned | `ipconfig getifaddr en0` | Valid IPv4 (e.g. `10.7.17.147`) |
| **L2** | ARP Entry for Edge | `arp -n 10.7.3.128` | Shows MAC address (not `incomplete`) |
| **L3** | ICMP Echo to Edge | `ping -c 2 10.7.3.128` | `0.0% packet loss` |
| **L4** | Edge port 8443 listening | `nc -zv -w 2 10.7.3.128 8443` | `Connection to 10.7.3.128 port 8443 [tcp] succeeded!` |
| **L4** | Backend A listening | `nc -zv -w 2 10.7.6.84 3001` | Succeeded (or blocked if pf is active) |
| **L7 (DNS)** | Direct DNS Query | `dig @10.7.17.94 app.teamX.test +short` | `10.7.3.128` |
| **L7 (OS DNS)**| OS Resolver Query | `dscacheutil -q host -a name app.teamX.test` | `ip_address: 10.7.3.128` |
| **L7 (TLS)** | OpenSSL Certificate Trace | `openssl s_client -connect 10.7.3.128:8443 -servername app.teamX.test` | `Verify return code: 0 (ok)` |
| **L7 (App)** | End-to-End Header Trace | `curl -sI https://app.teamX.test:8443/api/status --cacert personB/tls/ca.crt` | `HTTP/1.1 200 OK`, `X-Backend`, `X-Edge` |

---

## 🕵️ 3. Top 5 Faculty-Injected Fault Scenarios & Instant Solutions

### Scenario 1: Faculty modifies `/etc/resolver/teamX.test`
- **Symptom**: `curl https://app.teamX.test:8443` fails with `Could not resolve host`.
- **Diagnosis**: `cat /etc/resolver/teamX.test`. Notice nameserver points to wrong IP.
- **Fix**:
  ```bash
  printf 'nameserver %s\n' "10.7.17.94" | sudo tee /etc/resolver/teamX.test
  sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
  ```

### Scenario 2: Faculty injects a packet filter rule (`pfctl`) blocking port 8443 or 3001
- **Symptom**: `curl` hangs in connection timeout or gets connection refused, but ping works.
- **Diagnosis**: Check active firewall rules: `sudo pfctl -sr`. Look for `block ... port 8443` or `port 3001`.
- **Fix**: Flush firewall rules or disable pf:
  ```bash
  sudo pfctl -d
  # Or reload valid project rules:
  sudo pfctl -f phase2/personC/firewall/backend_a_isolation.pf -e
  ```

### Scenario 3: Faculty alters Nginx `upstream` configuration
- **Symptom**: `curl` returns `HTTP 502 Bad Gateway` even though both backends are running.
- **Diagnosis**: Inspect Nginx error log: `tail -n 20 personB/nginx/logs/error.log`. Look for wrong upstream ports or wrong IP addresses.
- **Fix**: Correct the IP/port in `personB/nginx/nginx.conf` and reload:
  ```bash
  ./personB/nginx/start_nginx.sh test && ./personB/nginx/start_nginx.sh reload
  ```

### Scenario 4: Faculty changes the system clock or breaks TLS SANs
- **Symptom**: `curl` fails with `SSL certificate problem: certificate has expired` or `SSL: certificate subject name does not match target host name`.
- **Diagnosis**: Inspect certificate SAN:
  ```bash
  openssl x509 -in personB/tls/server.crt -noout -text | grep -A 2 "Subject Alternative Name"
  ```
- **Fix**: Regenerate certificate with correct SANs using `./personB/tls/generate_cert.sh` and restart Nginx.

### Scenario 5: Faculty silently stops one backend microservice
- **Symptom**: Load balancer stops alternating; traffic only routes to one backend.
- **Diagnosis**: Check local and remote backend listeners:
  ```bash
  lsof -nP -iTCP:3001 -sTCP:LISTEN
  lsof -nP -iTCP:3002 -sTCP:LISTEN
  ```
- **Fix**: Restart stopped service (`cd personC/backendA && npm start` or `personD/backendB && npm start`).
