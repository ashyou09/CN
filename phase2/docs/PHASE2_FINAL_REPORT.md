# Phase 2 Final Report — Harden, Recover, and Troubleshoot

## 1. What Changed from Phase 1

Phase 2 extends the Phase 1 four-node infrastructure without modifying or overwriting any frozen Phase 1 configs or evidence:

| Component | Phase 1 Baseline | Phase 2 Additions (`phase2/`) |
| :--- | :--- | :--- |
| **DNS (Mac 1 & Mac 4)** | Single `dnsmasq` on Mac 1 (`address=`, default TTL `0`) | Added Backup `dnsmasq` on Mac 4 (**Ext A**) in `phase2/personD/dns/` and explicit `local-ttl=30` + `host-record` records (**Ext B**) in `phase2/personA/dns/` |
| **Edge Proxy (Mac 2 & Mac 3)** | Single `nginx` on Mac 2 (`8080`/`8443`) | Added explicit `X-Edge` response headers (`Primary-Mac2` / `Standby-Mac3`), verified passive HA upstream settings (`max_fails=3 fail_timeout=5s`, `proxy_next_upstream`), and split Primary (`phase2/personB/nginx/`) & Standby (`phase2/personC/nginx/`) configs (**Ext D & E**) |
| **Backend Isolation (Mac 3 & Mac 4)** | Ports `3001` & `3002` open to all LAN clients on `0.0.0.0` | Added macOS `pf` firewall rulesets allowing only Edge IPs (`10.7.3.128`, `10.7.6.84`) to reach `:3001` (`phase2/personC/firewall/`) and `:3002` (`phase2/personD/firewall/`) (**Ext C**) |
| **Verification & Runbooks** | Phase 1 test scripts | Added local non-sudo verification script (`run_local_no_sudo_tests.sh`), privileged 1-Mac sudo demo script (`run_local_sudo_full_demo.sh`), and per-person handover (`PHASE2_HANDOVER.md`) |

---

## 2. Resilience Tests & Observed Results (Local Mac Verification)

The non-sudo verification suite (`./phase2/scripts/run_local_no_sudo_tests.sh`) executed end-to-end on macOS (`nginx 1.31.6`, `dnsmasq 2.93`, Node.js Express backends, CA-verified TLS without `-k`) with all assertions passing:

| Extension | Test Scenario & Observed Result | Evidence File |
| :--- | :--- | :--- |
| **Ext A — Backup DNS** | Primary `dnsmasq` (`:15353`) resolved `app.teamX.test` (`30 IN A 127.0.0.1`). After stopping Primary (`connection timed out; no servers could be reached`), Backup `dnsmasq` (`:15354`) continued resolving `app.teamX.test` cleanly. | [personD/extA_backup_dns_local.txt](../../evidence/phase2/personD/extA_backup_dns_local.txt) |
| **Ext B — DNS TTL & Record Change** | Confirmed explicit `30`-second TTL (`30 IN A`) before and after controlled record update (`127.0.0.1` → `127.0.0.2`). *(OS resolver caching + `dscacheutil -flushcache` on port 53 is automated in `run_local_sudo_full_demo.sh`.)* | [personA/extB_dns_ttl_record_change_local.txt](../../evidence/phase2/personA/extB_dns_ttl_record_change_local.txt) |
| **Ext C — Service Isolation (`pf`)** | Configured rulesets (`backend_a_isolation.pf`, `backend_b_isolation.pf`, `local_single_mac_test.pf`) to permit only Edge source IPs to `:3001`/`:3002` and block direct clients. *(Live kernel `pfctl` enforcement requires `sudo ./phase2/scripts/run_local_sudo_full_demo.sh` or running on Mac 3/4.)* | `phase2/personC/firewall/` & `phase2/personD/firewall/` |
| **Ext D — HA Failover & Recovery** | Baseline returned alternating `X-Backend: A` / `B`. When Backend A (`3001`) was stopped, `nginx` logged `connect() failed (61: Connection refused)` and `upstream server temporarily disabled`, while all `6/6` client requests still returned `HTTP/1.1 200 OK` via `X-Backend: B`. After restarting Backend A and waiting `6s` (`> fail_timeout=5s`), `nginx` automatically resumed alternating `B, A, B, A, B, A`. | [personB/extD_ha_failover_local.txt](../../evidence/phase2/personB/extD_ha_failover_local.txt) |
| **Ext E — Standby Edge** | Both Primary Edge (`8443`, `X-Edge: Primary-Mac2`) and Standby Edge (`8444`, `X-Edge: Standby-Mac3`) terminated TLS with `ca.crt` and load-balanced across Backends A and B. *(Live DNS record cutover across `127.0.0.1` ↔ `127.0.0.2` on port 53 is automated in `run_local_sudo_full_demo.sh`.)* | [personC/extE_standby_edge_local.txt](../../evidence/phase2/personC/extE_standby_edge_local.txt) |
| **Ext F — Diagnostic Baseline** | Verified all 5 diagnostic layers healthy: DNS `dig` (`30 IN A`), IP `ping` (`0.0%` loss), TCP `nc -zv` (`8443` succeeded), TLS `openssl s_client` (`Verify return code: 0 (ok)`, `CN = TeamX Local CA`), HTTP `200 OK`. | [personD/extF_layer_diagnostic_baseline.txt](../../evidence/phase2/personD/extF_layer_diagnostic_baseline.txt) |

### Remaining Single Point of Failure (SPOF)
While **Ext A** removes DNS SPOF and **Ext D** removes single-backend SPOF, **Mac 2 (Primary `nginx` Edge)** remains a Single Point of Failure whenever DNS resolves solely to `10.7.3.128`. Eliminating it requires active-standby edges sharing a floating Virtual IP (VRRP/`keepalived`), automated health-checked DNS failover, or an upstream L4/Anycast load balancer.

---

## 3. Extension F Troubleshooting Methodology

For faculty-injected configuration faults, diagnostics run strictly bottom-up so each layer isolates the fault before checking higher layers:

1. **DNS Layer (`scutil --dns`, `dig`):** Confirm the client points to the team DNS servers and receives the expected Edge IP.
2. **Network / IP Layer (`ipconfig getifaddr en0`, `ping`):** Confirm same LAN subnet and L3 reachability.
3. **Transport / Firewall Layer (`nc -zv`, `sudo pfctl -sr`):** Distinguish `Connection refused` (service down / wrong port) from `Operation timed out` (`pf` firewall dropping packets).
4. **TLS Layer (`openssl s_client -servername app.teamX.test -CAfile ...`):** Verify certificate SANs, expiration, and local CA trust.
5. **Application / Upstream Layer (`curl -v`, `nginx` `error.log`):** Distinguish Edge failures from `502 Bad Gateway` (both backends unreachable or blocked by `pf`).

---

## 4. Learning Summary (One Paragraph per Extension)

- **Extension A (Backup DNS Resolver):** Running a secondary `dnsmasq` instance with identical zone records and configuring client resolvers with both primary and backup DNS addresses eliminates name resolution as a single point of failure. When the primary DNS process stops, clients automatically fall back to the backup server without interrupting service discovery, clearly separating DNS availability from backend application uptime.

- **Extension B (DNS TTL and Controlled Record Change):** Setting an explicit `30`-second TTL demonstrates how recursive/OS resolvers (`mDNSResponder`) cache DNS answers instead of querying authoritative servers on every request. Clients continue routing to the stale IP until the TTL expires unless the local cache is explicitly flushed (`dscacheutil -flushcache`), explaining why production teams lower DNS TTL well before a scheduled migration.

- **Extension C (Service Isolation via Backend Firewall Rules):** Applying host-level `pf` rules on backend ports `3001` and `3002` enforces network segmentation so only the reverse-proxy edge machines can reach upstream application servers. Direct client access to backend ports fails at the transport layer even on the same flat LAN, ensuring all traffic passes through TLS termination, logging, and load balancing at the edge.

- **Extension D (High-Availability Failover Behavior):** Configuring `nginx` with passive health-check parameters (`max_fails=3`, `fail_timeout=5s`) and `proxy_next_upstream` enables zero-downtime backend failover when one node crashes or stops. Traffic seamlessly drains to the surviving backend and automatically re-balances once the failed node recovers and passes the timeout window, while also highlighting the edge proxy itself as the next SPOF to address.

- **Extension E (Controlled Edge Migration / DNS Cutover):** Deploying a standby `nginx` edge with identical TLS certificates and upstream configuration allows traffic to be shifted away from the primary edge purely through a DNS record update. Combined with short TTL values, in-flight cached clients drain gracefully from `Primary-Mac2` while newly resolved lookups route to `Standby-Mac3` without replacing hardware.

- **Extension F (Systematic Troubleshooting):** Isolating faults layer by layer—checking DNS first, then IP reachability, TCP port/firewall state, TLS handshake trust, and finally HTTP upstream responses—prevents guesswork under pressure. Each protocol boundary produces distinct failure signatures (`NXDOMAIN`/timeout vs. `Connection refused` vs. TLS verify error vs. HTTP `502`), making root-cause localization fast and repeatable.
