# Phase 2 Team Handover & Execution Guide — Private Network Service Platform

> **Scope:** **Phase 2 — Harden, Recover, and Troubleshoot** (Extensions **A–F**, Review 2 = **50 Marks**)  
> **Rule:** Phase 2 **extends** the Phase 1 infrastructure without rebuilding from scratch. **Do not overwrite or alter frozen Phase 1 files/evidence** — save all Phase 2 configs under `phase2/` (or clearly named Phase 2 config copies) and save all new captures/outputs under `evidence/phase2/`.

---

## 1. Phase 2 Architecture & Team Role Map

Phase 1 reference IPs from [docs/machine-details.md](docs/machine-details.md) are listed below. **Re-verify each Mac's Wi-Fi IP (`ipconfig getifaddr en0`) at the start of every session** and update the shared environment variables before running commands.

| Person | Team Member | Mac & Ref IP | Phase 1 Role | Phase 2 Additions & Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Person A** | **Pankaj Baid** | **Mac 1** (`10.7.17.94`) | Primary DNS (`dnsmasq`, `:53`) + Client | **Ext B** (DNS TTL=30s & cache flush demo), **Ext A** (Primary DNS stop/start failover test), **Ext E** (DNS cutover record update), Client DNS list config |
| **Person B** | **Ashutosh Singh** | **Mac 2** (`10.7.3.128`) | Primary Edge Proxy / LB / TLS (`nginx`, `:8080` / `:8443`) | **Ext D** (HA passive failover config & demo, SPOF explanation), **Ext E** (Share TLS certs & `nginx.conf` for Standby Edge, add `X-Edge: Primary-Mac2` header) |
| **Person C** | **Shreya Suman** | **Mac 3** (`10.7.6.84`) | Backend A (`node`, `:3001`) | **Ext C** (`pf` firewall isolation on `:3001` + rollback), **Ext D** (Stop/restart Backend A on cue), **Ext E** (Run Standby `nginx` on `:8443` with `X-Edge: Standby-Mac3`) |
| **Person D** | **Ranvendra Pratap Singh** | **Mac 4** (`10.7.17.147`) | Backend B (`node`, `:3002`) + Client/Capture | **Ext A** (Run Backup DNS `dnsmasq` on `:53`), **Ext C** (`pf` firewall isolation on `:3002` + rollback), **Ext A–E** Client verification & Wireshark/CLI evidence collection |
| **All** | **Full Team** | All 4 Macs | — | **Ext F** (Layer-by-layer live diagnosis of faculty-injected fault), Phase 2 Final Report & Viva |

### Shared Session Environment Variables (Run in Every Terminal)

```bash
export MAC1_IP="10.7.17.94"     # Person A - Primary DNS
export MAC2_IP="10.7.3.128"     # Person B - Primary Edge (nginx)
export MAC3_IP="10.7.6.84"      # Person C - Backend A + Standby Edge
export MAC4_IP="10.7.17.147"    # Person D - Backend B + Backup DNS
export DOMAIN="app.teamX.test"
export API_DOMAIN="api.teamX.test"
export HTTPS_PORT="8443"
```

---

## 2. Phase 2 Extensions & Marks Breakdown (Review 2: 50 Marks)

| Extension | Title | Lead | Support | Review 2 Rubric Area | Marks |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Ext A** | Backup DNS Resolver | Person D (Mac 4) | Person A (Mac 1) | Resilience & HA Failover (A, B, D) | **15** |
| **Ext B** | DNS TTL & Controlled Record Change | Person A (Mac 1) | Person D (Mac 4) | *(included in 15 above)* | — |
| **Ext D** | High-Availability Failover Behavior | Person B (Mac 2) | Person C (Mac 3) | *(included in 15 above)* | — |
| **Ext C** | Service Isolation (Backend Firewall Rules) | Person C & D (Mac 3/4) | Person B (Mac 2) | Service Isolation & Edge Migration (C, E) | **10** |
| **Ext E** | Controlled Edge Migration (DNS Cutover) | Person C & A (Mac 3/1) | Person B (Mac 2) | *(included in 10 above)* | — |
| **Ext F** | Faculty-Injected Troubleshooting Challenge | **Everyone** | — | Troubleshooting Challenge | **10** |
| **Report** | Phase 2 Final Report & Updated Architecture | **Everyone** | Person A/D consolidate | Final Report Quality & Documentation | **5** |
| **Viva** | Individual Viva (Phase 2 + Full End-to-End) | **Each Student** | — | Individual Viva | **10** |

---

## 3. Per-Person Step-by-Step Handover Guides

> **Order of Operations for Team Integration:**
> 1. **Person B** confirms `nginx.conf` points to `$MAC3_IP:3001` and `$MAC4_IP:3002` and shares `personB/tls/` + `nginx.conf` with **Person C**.
> 2. **Person D** starts Backup DNS (`dnsmasq`) on Mac 4; **Person A** updates Primary DNS (`dnsmasq`) with `TTL = 30s` and configures client Macs with both DNS servers (`Mac 1`, `Mac 4`).
> 3. **Person C** & **Person D** test `pf` isolation rules (and keep rollback scripts ready).
> 4. **Person C** starts Standby `nginx` on Mac 3 for **Ext E** cutover testing.
> 5. **Full Team** practices **Ext F** troubleshooting drills and the **11-step live demo**.

---

### 👤 Person A — Pankaj Baid (Mac 1 · Primary DNS & TTL/Cutover Lead)

**You Own:** Extension B (DNS TTL & Cache Flush), Primary side of Extension A (DNS Failover), and DNS record switch for Extension E (Edge Migration).

#### Step A1 — Use the Phase 2 `dnsmasq` Config with 30-Second TTL (Extension B)
Keep `personA/dns/dnsmasq.conf` untouched for Phase 1. Use `phase2/personA/dns/dnsmasq-primary-lan.conf`:

```conf
# phase2/personA/dns/dnsmasq-primary-lan.conf (Mac 1 - Primary DNS)
listen-address=0.0.0.0
bind-interfaces
domain-needed
bogus-priv
no-hosts

# Keep .test domains local (prevents forwarding AAAA/other queries upstream)
local=/app.teamX.test/
local=/api.teamX.test/

# Extension B: Explicit 30-second TTL for controlled record change & cutover
local-ttl=30
host-record=app.teamX.test,10.7.3.128,30
host-record=api.teamX.test,10.7.3.128,30

# Public fallback for non-project domains
no-resolv
server=8.8.8.8
server=8.8.4.4

log-queries
log-facility=/tmp/dnsmasq-phase2.log
```

Start Primary `dnsmasq`:
```bash
sudo pkill dnsmasq || true
sudo dnsmasq -C phase2/personA/dns/dnsmasq-primary-lan.conf -d
```

Verify TTL is **30** in the `ANSWER SECTION`:
```bash
dig @$MAC1_IP app.teamX.test
# Look for: app.teamX.test.  30  IN  A  10.7.3.128
```

#### Step A2 — Configure Client Macs with Primary + Backup DNS (Extension A)
On client Macs (**Mac 1** and **Mac 4** — System Settings → Network → Wi-Fi → Details → DNS, or via CLI):
```bash
# List DNS servers in order: Mac 1 (Primary), Mac 4 (Backup)
sudo networksetup -setdnsservers Wi-Fi "$MAC1_IP" "$MAC4_IP"
scutil --dns | grep -A4 "nameserver"
```
Verify **Extension A Failover** (coordinate with Person D after Mac 4 `dnsmasq` is running):
1. Query while Primary is up: `dig app.teamX.test` → `SERVER: $MAC1_IP#53`.
2. Stop `dnsmasq` on Mac 1 (`Ctrl+C` or `sudo pkill dnsmasq`).
3. Query again from Mac 1/Mac 4 (`dscacheutil -q host -a name app.teamX.test` or `dig app.teamX.test` / `nslookup app.teamX.test`) → client automatically falls back to `$MAC4_IP` and still resolves `app.teamX.test`.
4. Restart Primary `dnsmasq` on Mac 1.
5. **Viva explanation:** Explain the difference between a **DNS failure** (name cannot be mapped to IP; direct IP ping/TCP still works) and an **application server failure** (DNS returns the IP, TCP/TLS may succeed at the edge, but HTTP returns `502 Bad Gateway` / timeout).

#### Step A3 — Demonstrate TTL Caching & Manual Flush (Extension B)
1. Ensure `app.teamX.test` points to `$MAC2_IP` (`10.7.3.128`) with TTL `30`.
2. From Mac 1 (or Mac 4), resolve via the **OS resolver** (not `dig @ip`, because `dig` bypasses the macOS OS DNS cache!):
   ```bash
   sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
   dscacheutil -q host -a name app.teamX.test
   # Shows old IP: 10.7.3.128 (now cached in mDNSResponder for 30s)
   ```
3. Change `host-record=app.teamX.test,...` in `phase2/personA/dns/dnsmasq-primary-lan.conf` (and have Person D match on Backup DNS) to a different IP (e.g., `$MAC3_IP` for Extension E or a test IP) and restart `dnsmasq`.
4. **Immediately** query via OS resolver again (`dscacheutil -q host -a name app.teamX.test` or `curl -v https://app.teamX.test:8443/api/status`) → still shows the **old cached IP** while the 30s TTL has not expired!
5. Wait ~35 seconds and run `dscacheutil -q host -a name app.teamX.test` again → now returns the **new IP**.
6. **Manual Cache Flush Demo:** Change the IP back (or switch again), immediately observe the stale cached IP, then flush:
   ```bash
   sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
   dscacheutil -q host -a name app.teamX.test
   ```
   Observe the **immediate** switch to the new IP without waiting 30s.
7. **Viva explanation:** Relate TTL to production blue/green DNS cutovers (lower TTL ahead of migration, wait for old TTL to drain, switch record, restore normal TTL afterward).

#### Step A4 — Execute Controlled Edge Migration DNS Cutover (Extension E)
1. Confirm Person C has Standby `nginx` running on **Mac 3** (`$MAC3_IP:8443`).
2. Update `host-record=app.teamX.test,$MAC3_IP,30` in `phase2/personA/dns/dnsmasq-primary-lan.conf` and restart `dnsmasq` (and have Person D update Backup DNS to match).
3. Observe cached client requests hitting `X-Edge: Primary-Mac2` until the 30s TTL expires (or until flushed), then hitting `X-Edge: Standby-Mac3`.
4. After capturing evidence, restore `host-record=app.teamX.test,$MAC2_IP,30` before the next test.

#### Person A Evidence Checklist (`evidence/phase2/personA/`)
- [ ] `extA_primary_stopped_failover.txt` (`dig` + `dscacheutil` output while Mac 1 `dnsmasq` is stopped)
- [ ] `extB_ttl_30_dig.txt` (`dig app.teamX.test` showing `30 IN A`)
- [ ] `extB_stale_cache_then_expire_and_flush.txt` (before TTL, after 30s, and after `dscacheutil -flushcache`)
- [ ] `extE_dns_cutover.txt` (`dnsmasq` log + `dig` showing record switch to `$MAC3_IP`)

---

### 👤 Person B — Ashutosh Singh (Mac 2 · Primary Edge Proxy & HA Failover Lead)

**You Own:** Extension D (High-Availability Backend Failover) and providing the Edge config/TLS bundle for Extension E (Standby Edge).

#### Step B1 — Verify & Tag `nginx.conf` for Phase 2 (Extension D + E)
Your Phase 1 [personB/nginx/nginx.conf](personB/nginx/nginx.conf) **already includes** passive health-check directives:
- `server <IP>:3001 max_fails=3 fail_timeout=5s;`
- `server <IP>:3002 max_fails=3 fail_timeout=5s;`
- `proxy_connect_timeout 1s;`, `proxy_read_timeout 2s;`
- `proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;`
- `proxy_next_upstream_tries 2;`

Use the Phase 2 config `phase2/personB/nginx/nginx-primary-lan.conf` based on `personB/nginx/nginx.conf` with two updates:
1. Ensure `upstream backend_pool` uses the real LAN IPs of **Mac 3** and **Mac 4** (do **not** leave `127.0.0.1:3001` when running across 4 Macs):
   ```nginx
   upstream backend_pool {
       server 10.7.6.84:3001 max_fails=3 fail_timeout=5s;    # Mac 3 - Backend A
       server 10.7.17.147:3002 max_fails=3 fail_timeout=5s;  # Mac 4 - Backend B
   }
   ```
2. Add an edge identifier header inside both `server` blocks (`8080` and `8443`) so **Extension E** proves which edge machine handled each request:
   ```nginx
   add_header X-Edge "Primary-Mac2" always;
   ```

Test and run Primary `nginx`:
```bash
mkdir -p phase2/personB/nginx/logs
nginx -p "$(pwd)/phase2/personB/nginx" -c "$(pwd)/phase2/personB/nginx/nginx-primary-lan.conf" -t
nginx -p "$(pwd)/phase2/personB/nginx" -c "$(pwd)/phase2/personB/nginx/nginx-primary-lan.conf"
```

#### Step B2 — Demonstrate High-Availability Failover (Extension D)
Coordinate with **Person C** (Backend A) and **Person D** (Client):
1. **Steady State:** Client runs repeated requests:
   ```bash
   for i in 1 2 3 4; do curl -sI --cacert personB/tls/ca.crt https://app.teamX.test:8443/api/status | grep -iE "HTTP/|X-Backend|X-Edge"; done
   ```
   Confirm `X-Backend: A` and `X-Backend: B` alternate.
2. **Backend A Down:** Person C stops Backend A (`Ctrl+C` on Mac 3). Client runs 6 more requests.
   - All requests succeed (`200 OK`) and return `X-Backend: B`.
   - Note in `personB/nginx/logs/error.log`: nginx marks Mac 3 (`3001`) temporarily down for `fail_timeout=5s` and retries via `proxy_next_upstream` on Mac 4 (`3002`).
3. **Backend A Recovery:** Person C restarts Backend A (`npm run start:a`). After `5s` (`fail_timeout`), client repeats requests → `X-Backend: A` and `X-Backend: B` alternate again.
4. **Viva SPOF Point (Mandatory in Prompt):** Clearly state that **Mac 2 (`nginx` Edge)** is still a **Single Point of Failure** in Extension D, and explain what removes it: an **active-standby edge pair with a Virtual IP (VRRP / `keepalived`)**, **DNS failover with health checks**, or a **cloud L4 load balancer** in front of multiple edge nodes.

#### Step B3 — Hand Off TLS & Nginx Bundle to Person C (Extension E)
Share these files from Mac 2 to Mac 3 (via Git pull or `scp`):
- `personB/tls/ca.crt`, `personB/tls/server.crt`, `personB/tls/server.key` (Note: `personB/tls/server.ext` already has `DNS.1 = app.teamX.test` and `DNS.2 = api.teamX.test`, so the same cert works on Mac 3 when accessed by domain name!)
- `phase2/personC/nginx/nginx-standby-lan.conf` (already set up with `X-Edge: "Standby-Mac3"`).

#### Person B Evidence Checklist (`evidence/phase2/personB/`)
- [ ] `extD_nginx_error_and_access_failover.log` (showing upstream retry to Backend B and recovery after `5s`)
- [ ] `extD_ha_failover_curl.txt` (before stop → during stop → after restart)
- [ ] `extD_spof_notes.txt` (short note identifying Mac 2 edge as SPOF & mitigation)

---

### 👤 Person C — Shreya Suman (Mac 3 · Backend A, Firewall Isolation & Standby Edge)

**You Own:** Extension C (`pf` firewall on port `3001`), Backend A stop/restart for Extension D, and running the **Standby `nginx` Edge** for Extension E.

#### Step C1 — Ensure Backend A is Running on `0.0.0.0:3001`
```bash
npm run start:a
```

#### Step C2 — Configure macOS `pf` Service Isolation on Port `3001` (Extension C)
1. **Back up the original macOS `pf` configuration first (MANDATORY):**
   ```bash
   sudo cp /etc/pf.conf /etc/pf.conf.bak
   ```
2. **Use `phase2/personC/firewall/backend_a_isolation.pf`** (allows only **Mac 2 Primary Edge** — plus **Mac 3 itself** so Standby Edge on Mac 3 also works in Ext E — and blocks everyone else on port `3001`):
   ```pf
   # Skip loopback so local macOS traffic and local Standby Edge -> 127.0.0.1:3001 are unaffected
   set skip on lo0

   # Allow Mac 2 (Primary Edge) to reach Backend A (3001)
   pass in quick proto tcp from 10.7.3.128 to any port 3001

   # Allow Mac 3 (Standby Edge during Ext E) to reach Backend A (3001)
   pass in quick proto tcp from 10.7.6.84 to any port 3001

   # Block all other direct client access to Backend A (3001)
   block in quick proto tcp from any to any port 3001
   ```
   *(Double-check `10.7.3.128` = `$MAC2_IP` and `10.7.6.84` = `$MAC3_IP` on demo day.)*
3. **Load & enable the `pf` rule:**
   ```bash
   sudo pfctl -f phase2/personC/firewall/backend_a_isolation.pf -e
   sudo pfctl -sr   # Verify loaded rules
   ```
4. **Verify Isolation (with Person D & Person B):**
   - Direct from Mac 4/Mac 1 (**MUST FAIL / TIMEOUT**):
     ```bash
     curl --connect-timeout 3 http://$MAC3_IP:3001/api/status
     ```
   - Via Edge Mac 2 (**MUST SUCCEED**):
     ```bash
     curl --cacert personB/tls/ca.crt https://app.teamX.test:8443/api/status
     ```
5. **Rollback / Restore after demo (MANDATORY):**
   ```bash
   sudo pfctl -f /etc/pf.conf
   # Or disable pf if it was disabled before: sudo pfctl -d
   ```

#### Step C3 — Support HA Failover Demo (Extension D)
On Person B's cue:
1. Stop Backend A (`Ctrl+C` in the terminal running `npm run start:a`) → verify requests still succeed via Mac 4.
2. Restart Backend A (`npm run start:a`) → verify load balancing resumes after `5s`.

#### Step C4 — Configure & Run Standby `nginx` Edge on Mac 3 (Extension E)
1. Copy `personB/tls/` (`ca.crt`, `server.crt`, `server.key`) from Person B into `personB/tls/` on Mac 3 (already in repo, ensure certs match Mac 2).
2. Use `phase2/personC/nginx/nginx-standby-lan.conf` (identical to `nginx-primary-lan.conf`, except `add_header X-Edge "Standby-Mac3" always;`):
   ```nginx
   # Only difference from nginx-primary-lan.conf:
   add_header X-Edge "Standby-Mac3" always;
   ```
   *(Make sure `upstream backend_pool` points to `$MAC3_IP:3001` and `$MAC4_IP:3002`, and `ssl_certificate` / `ssl_certificate_key` point to `../../../personB/tls/server.crt` and `server.key`.)*
3. Test and start Standby `nginx` on Mac 3 (`8080` / `8443`):
   ```bash
   mkdir -p phase2/personC/nginx/logs
   nginx -p "$(pwd)/phase2/personC/nginx" -c "$(pwd)/phase2/personC/nginx/nginx-standby-lan.conf" -t
   nginx -p "$(pwd)/phase2/personC/nginx" -c "$(pwd)/phase2/personC/nginx/nginx-standby-lan.conf"
   ```
4. Once Person A switches DNS for `app.teamX.test` to `$MAC3_IP`, verify from Mac 1/Mac 4 that `X-Edge: Standby-Mac3` appears in response headers.
5. Stop Standby `nginx` after Extension E demo if reverting to Phase 2 normal state:
   ```bash
   nginx -p "$(pwd)/phase2/personC/nginx" -c "$(pwd)/phase2/personC/nginx/nginx-standby-lan.conf" -s stop
   ```

#### Person C Evidence Checklist (`evidence/phase2/personC/`)
- [ ] `extC_pf_rules_and_verify.txt` (`pfctl -sr`, blocked direct `curl` from Mac 1/4, allowed edge `curl`)
- [ ] `extC_pf_rollback.txt` (proof `/etc/pf.conf` restored after demo)
- [ ] `extE_standby_nginx_access.log` (showing incoming requests handled on Mac 3 after DNS cutover)

---

### 👤 Person D — Ranvendra Pratap Singh (Mac 4 · Backend B, Backup DNS, Firewall & Verification Lead)

**You Own:** Extension A (**Backup DNS Resolver** on Mac 4), Extension C (`pf` firewall on port `3002`), and running/saving **client verification & packet evidence** for Extensions A–E.

#### Step D1 — Ensure Backend B is Running on `0.0.0.0:3002`
```bash
npm run start:b
```

#### Step D2 — Set Up & Run Backup DNS (`dnsmasq`) on Mac 4 (Extension A)
1. Install `dnsmasq` if not already installed on Mac 4:
   ```bash
   brew install dnsmasq
   ```
2. Use `phase2/personD/dns/dnsmasq-backup-lan.conf` with **identical records and TTL (`30s`)** as Mac 1:
   ```conf
   # phase2/personD/dns/dnsmasq-backup-lan.conf (Mac 4 - Backup DNS)
   listen-address=0.0.0.0
   bind-interfaces
   domain-needed
   bogus-priv
   no-hosts

   local=/app.teamX.test/
   local=/api.teamX.test/

   local-ttl=30
   host-record=app.teamX.test,10.7.3.128,30
   host-record=api.teamX.test,10.7.3.128,30

   no-resolv
   server=8.8.8.8
   server=8.8.4.4

   log-queries
   log-facility=/tmp/dnsmasq-backup.log
   ```
   *(Reminder: During Extension E DNS cutover, update `10.7.3.128` → `10.7.6.84` here too so Primary and Backup DNS never serve conflicting IPs.)*
3. Start Backup `dnsmasq` on Mac 4:
   ```bash
   sudo pkill dnsmasq || true
   sudo dnsmasq -C phase2/personD/dns/dnsmasq-backup-lan.conf -d
   ```
4. Verify directly and via failover:
   ```bash
   dig @$MAC4_IP app.teamX.test
   # After Person A stops dnsmasq on Mac 1:
   dscacheutil -q host -a name app.teamX.test
   tail -n 20 /tmp/dnsmasq-backup.log   # Proves queries arrived at Mac 4!
   ```

#### Step D3 — Configure macOS `pf` Service Isolation on Port `3002` (Extension C)
1. Back up `/etc/pf.conf`:
   ```bash
   sudo cp /etc/pf.conf /etc/pf.conf.bak
   ```
2. Use `phase2/personD/firewall/backend_b_isolation.pf`:
   ```pf
   set skip on lo0

   # Allow Mac 2 (Primary Edge) to reach Backend B (3002)
   pass in quick proto tcp from 10.7.3.128 to any port 3002

   # Allow Mac 3 (Standby Edge during Ext E) to reach Backend B (3002)
   pass in quick proto tcp from 10.7.6.84 to any port 3002

   # Block all other direct client access to Backend B (3002)
   block in quick proto tcp from any to any port 3002
   ```
3. Load, verify, and keep rollback ready:
   ```bash
   sudo pfctl -f phase2/personD/firewall/backend_b_isolation.pf -e
   # Test from Mac 1 (must timeout/fail): curl --connect-timeout 3 http://$MAC4_IP:3002/api/status
   # Test via Edge (must pass): curl --cacert personB/tls/ca.crt https://app.teamX.test:8443/api/status
   # Rollback after demo:
   sudo pfctl -f /etc/pf.conf
   ```

#### Step D4 — Run Client Verification & Wireshark Captures (Extensions A–E)
Configure Mac 4 DNS to `[$MAC1_IP, $MAC4_IP]` and make sure `personB/tls/ca.crt` is trusted in Mac 4 Keychain (or pass `--cacert personB/tls/ca.crt` while testing, and **no `-k` flag** in the final demo). Capture:
- **Ext A:** `dig` + `/tmp/dnsmasq-backup.log` + Wireshark capture showing DNS queries switching to `$MAC4_IP` when `$MAC1_IP` stops answering.
- **Ext B:** Timestamped `dscacheutil` / `curl -v` output before TTL expiry, after 30s, and after `dscacheutil -flushcache`.
- **Ext C:** Direct `curl` failure (`exit 28` timeout) vs Edge `curl` `200 OK`.
- **Ext D:** Loop of `curl -sI https://app.teamX.test:8443/api/status` showing `A/B` → `B only` → `A/B`.
- **Ext E:** Loop of `curl -sI https://app.teamX.test:8443/api/status` showing `X-Edge: Primary-Mac2` transitioning to `X-Edge: Standby-Mac3`.

#### Person D Evidence Checklist (`evidence/phase2/personD/`)
- [ ] `extA_backup_dns_log_and_client.txt`
- [ ] `extC_pf_rules_and_direct_vs_edge.txt`
- [ ] `extD_client_failover_loop.txt`
- [ ] `extE_edge_cutover_headers.txt`
- [ ] `phase2-failover-and-cutover.pcap` (Wireshark capture of DNS failover / TTL cutover)

---

## 4. Extension F — Faculty-Injected Troubleshooting Playbook (All Team Members)

During evaluation, the faculty will break one setting. **Always diagnose bottom-up layer by layer and speak your reasoning out loud** (partial credit is awarded for systematic methodology).

| Step | Layer | Exact Command to Run | What It Proves / Failure Signature |
| :---: | :--- | :--- | :--- |
| **1** | **DNS Layer** | `scutil --dns \| grep -A3 nameserver`<br>`dig app.teamX.test`<br>`dig @$MAC1_IP app.teamX.test` | Wrong resolver configured? `dnsmasq` stopped? Wrong A record IP (e.g., pointing to dead host instead of `$MAC2_IP`)? |
| **2** | **Network / IP Layer** | `ipconfig getifaddr en0`<br>`ping -c 3 $MAC2_IP` | Client off the Wi-Fi/LAN? Host unreachable or wrong subnet? |
| **3** | **Transport / Port / Firewall** | `nc -zv -w 3 $MAC2_IP 8443`<br>`sudo pfctl -sr` | `Connection refused` = `nginx`/backend not listening on that port or wrong port. `Operation timed out` = `pf` firewall blocking port! |
| **4** | **TLS Layer** | `openssl s_client -connect app.teamX.test:8443 -servername app.teamX.test -CAfile personB/tls/ca.crt` | Cert expired, SAN mismatch (domain vs cert), missing `ca.crt` in System Keychain, or wrong TLS protocol/key path in `nginx.conf`. |
| **5** | **HTTP / Edge / Upstream** | `curl -v https://app.teamX.test:8443/api/status`<br>`tail -n 30 personB/nginx/logs/error.log` | `502 Bad Gateway` = Edge works, **both** backends down or blocked by `pf`! `404`/`500` = wrong proxy path or backend app error. |

---

## 5. Single-Mac Local Practice Guide (Practice Everything Alone on 1 Mac)

You can build, test, and rehearse **all of Extensions A–F** on your own Mac before meeting your teammates by adding extra loopback IP aliases (`127.0.0.2`, `127.0.0.3`, `127.0.0.4`).

### Virtual Loopback Role Mapping (1-Mac Mode)

| Alias IP | Simulated Mac | Simulated Role | Port |
| :--- | :--- | :--- | :--- |
| `127.0.0.1` | Mac 1 & Mac 2 | Primary DNS + Primary Edge (`nginx`) + Backends A & B | `:53`, `:8443`, `:3001`, `:3002` |
| `127.0.0.2` | Mac 4 & Mac 3 | Backup DNS + Standby Edge (`nginx`) | `:53`, `:8443` |
| `127.0.0.3` | Mac 1 (Client) | Simulated external client IP for `pf` block testing | — |

### 1-Mac Practice Steps

1. **Add loopback aliases (temporary until reboot):**
   ```bash
   sudo ifconfig lo0 alias 127.0.0.2 up
   sudo ifconfig lo0 alias 127.0.0.3 up
   ```
2. **Start Backends A & B (in two terminals):**
   ```bash
   npm run start:a    # :3001
   npm run start:b    # :3002
   ```
3. **Test Extension A & B (Primary + Backup `dnsmasq` on `127.0.0.1` & `127.0.0.2`):**
   - Create two temp configs with `listen-address=127.0.0.1` (Primary) and `listen-address=127.0.0.2` (Backup), both with `bind-interfaces`, `local-ttl=30`, and `host-record=app.teamX.test,127.0.0.1,30`.
   - Start both (`sudo dnsmasq -C /tmp/dns1.conf -x /tmp/dns1.pid` and `sudo dnsmasq -C /tmp/dns2.conf -x /tmp/dns2.pid`).
   - Point macOS DNS to both: `sudo networksetup -setdnsservers Wi-Fi 127.0.0.1 127.0.0.2`.
   - Kill `dns1.pid` and verify resolution still works via `127.0.0.2`.
   - Change `host-record` IP from `127.0.0.1` to `127.0.0.2`, observe `30s` cache via `dscacheutil -q host -a name app.teamX.test`, then test `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder`.
4. **Test Extension D (HA Failover):**
   - Ensure `personB/nginx/nginx.conf` upstream has `127.0.0.1:3001` and `127.0.0.1:3002` (both `max_fails=3 fail_timeout=5s`).
   - Run `npm run start:nginx`, hit `https://app.teamX.test:8443/api/status`, stop Backend A (`Ctrl+C`), confirm all responses return `X-Backend: B`, restart Backend A, confirm `A/B` resumes after `5s`.
5. **Test Extension E (Primary Edge on `127.0.0.1:8443` → Standby Edge on `127.0.0.2:8443`):**
   - Run Primary `nginx` with `listen 127.0.0.1:8443 ssl;` and `add_header X-Edge "Primary-Mac2" always;`.
   - Run Standby `nginx` with `listen 127.0.0.2:8443 ssl;` and `add_header X-Edge "Standby-Mac3" always;`.
   - Switch `host-record=app.teamX.test,127.0.0.2,30` in `dnsmasq` and watch `curl -sI https://app.teamX.test:8443/api/status` shift from `Primary-Mac2` to `Standby-Mac3` after TTL expiry/flush.
6. **Test Extension C (`pf` isolation locally):**
   - Back up `/etc/pf.conf`, then load a **loopback-specific** test file (`/tmp/pf_local_test.pf`, **no** `set skip on lo0`, targeted strictly to port `3001` so nothing else breaks):
     ```pf
     pass in quick on lo0 proto tcp from 127.0.0.2 to 127.0.0.1 port 3001
     block return-rst in quick on lo0 proto tcp from 127.0.0.3 to 127.0.0.1 port 3001
     ```
   - Test allowed vs blocked source IP:
     ```bash
     sudo pfctl -f /tmp/pf_local_test.pf -e
     curl --interface 127.0.0.2 http://127.0.0.1:3001/api/status   # PASS (Edge IP)
     curl --interface 127.0.0.3 http://127.0.0.1:3001/api/status   # BLOCKED (Client IP)
     ```
7. **Clean up 1-Mac practice environment (MANDATORY before going to class):**
   ```bash
   sudo pfctl -f /etc/pf.conf
   sudo pkill dnsmasq || true
   sudo networksetup -setdnsservers Wi-Fi Empty
   sudo ifconfig lo0 -alias 127.0.0.2
   sudo ifconfig lo0 -alias 127.0.0.3
   ```

---

## 6. Final 11-Step Live Demo Sequence & Deliverables Checklist

### 11-Step Evaluation Runbook (PDF Section 8)

| # | Step | Lead Mac | Command / Action |
| :---: | :--- | :--- | :--- |
| **1** | Show topology & IP/service inventory | All | Display updated Phase 2 topology + IP table |
| **2** | Confirm all machines on private LAN | Mac 1 & 4 | `ping` across all 4 Macs |
| **3** | Resolve private domain from client | Mac 1 / 4 | `dig app.teamX.test` → `$MAC2_IP` |
| **4** | Open service over HTTPS by domain | Mac 1 / 4 | `https://app.teamX.test:8443` (no `-k`, no cert warning) |
| **5** | Show load balancing across backends | Mac 4 | Repeated `curl -sI` → alternating `X-Backend: A` / `B` |
| **6** | Show Wireshark DNS, TCP, TLS evidence | Mac 4 | Open saved `.pcap` and trace DNS → SYN/SYN-ACK/ACK → TLS |
| **7** | Show HTTP headers & caching (`304`) | Mac 4 | `curl -I .../api/cached` (`Cache-Control`, `ETag`, `304`) |
| **8** | Fail one backend (HA failover) | Mac 3 & 4 | Stop Backend A → requests still return `200` via Backend B |
| **9** | Demonstrate Phase 2 resilience | Mac 1/3/4 | Show **Ext A** (Backup DNS), **Ext B** (30s TTL + flush), **Ext C** (`pf` block), **Ext E** (`X-Edge` cutover) |
| **10** | Diagnose faculty-injected fault | **All** | Layer-by-layer diagnosis out loud (DNS → IP → TCP/pf → TLS → HTTP) |
| **11** | Individual viva questions | **Each** | Answer from personal understanding (no reading notes) |

### Required Phase 2 Deliverables (PDF Section 9)

- [ ] **Updated Architecture Document:** Add Backup DNS (Mac 4), Backend `pf` Firewalls (Mac 3 & 4), and Standby Edge (Mac 3) to `docs/topology.md` (or a Phase 2 section inside it).
- [ ] **Configuration Bundle:** Phase 1 + Phase 2 `dnsmasq` configs (Primary + Backup with TTL=30), `nginx` configs (Primary + Standby), TLS notes, backend launch commands, and `pf` rules + rollback instructions.
- [ ] **Evidence Folder:** Organised so any item can be pulled up in **< 30 seconds** (`evidence/phase2/personA..D/`).
- [ ] **Phase 2 Final Report:**
  - What changed from Phase 1
  - Resilience tests & results (Extensions A–E)
  - Troubleshooting findings (Extension F methodology)
  - Learning summary (**1 paragraph per extension A–F**)
