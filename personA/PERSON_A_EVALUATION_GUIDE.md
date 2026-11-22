# Examiner & Evaluator Quick-Grading Guide — Person A (Mac 1)

> **Evaluator Note:** This document provides an instant grading and oral examination sheet for **Person A / Mac 1 (Pankaj Baid)**. Every requirement has been executed, logged, verified, and mapped below.

---

## 🎯 Candidate & Machine Profile
- **Candidate Name**: **Pankaj Baid**
- **Assigned Role**: Person A / Mac 1 — Private DNS Resolver Lead & Test Client
- **Local Machine IP**: `10.7.17.94` (`en0`)
- **Gateway**: `10.7.0.1` | **Subnet**: `255.255.224.0` (`/19`)
- **Key Services Hosted**:
  - `dnsmasq` Private DNS Server (Port `53` UDP/TCP)
  - Client diagnostic test harness (`personA/client/test.sh`)

---

## 📊 Rubric Evaluation & Fast-Check Matrix

| Phase / Extension | Evaluation Criteria | Primary Evidence File | Fast Verification Command |
| :--- | :--- | :--- | :--- |
| **Phase 1: Task A (LAN Discovery)** | Interface discovery, IPv4, Subnet, and Gateway documented | [`evidence/final_combined_evidence/lan/`](../evidence/final_combined_evidence/lan/) | `ipconfig getifaddr en0 && route -n get default` |
| **Phase 1: Task A (Reachability)** | 12-cell ping matrix; Mac 1 pings Mac 2, 3, and 4 with 0% packet loss | [`evidence/final_combined_evidence/lan/ping-from-mac1-to-all.txt`](../evidence/final_combined_evidence/lan/ping-from-mac1-to-all.txt) | `ping -c 3 10.7.3.128` |
| **Phase 1: Task B (DNS Zone Setup)**| Authoritative `.test` zone maps `app.teamX.test` to Edge IP (`10.7.3.128`) | [`personA/dns/dnsmasq.conf`](dns/dnsmasq.conf) | `sudo dnsmasq -C personA/dns/dnsmasq.conf --test` |
| **Phase 1: Task B (DNS Query Test)**| Direct DNS query resolves `app.teamX.test` and `api.teamX.test` | [`evidence/final_combined_evidence/dns/dns-local-A.txt`](../evidence/final_combined_evidence/dns/dns-local-A.txt) | `dig @127.0.0.1 app.teamX.test +short` |
| **Phase 2: Ext B (DNS TTL = 30s)** | Configures record with explicit 30-second TTL to allow rapid migration | [`phase2/personA/dns/dnsmasq-primary-lan.conf`](../phase2/personA/dns/dnsmasq-primary-lan.conf) | `dig @127.0.0.1 app.teamX.test \| grep "30\tIN\tA"` |
| **Phase 2: Ext B (Cache Flush)** | Demonstrates immediate OS cutover using `dscacheutil -flushcache` | [`evidence/phase2/personA/extB_dns_ttl_record_change_local.txt`](../evidence/phase2/personA/extB_dns_ttl_record_change_local.txt) | `dscacheutil -flushcache && killall -HUP mDNSResponder` |
| **Phase 2: Ext E (DNS Cutover)** | Updates record to point to Standby Edge IP (`10.7.6.84`) | [`phase2/scripts/run_local_sudo_full_demo.sh`](../phase2/scripts/run_local_sudo_full_demo.sh) | `dig @127.0.0.1 app.teamX.test +short` (returns Mac 3) |

---

## 🧠 Viva Voce Oral Defense — Key Answers for Person A

### 1. How does `dnsmasq` work as a lightweight authoritative resolver?
- `dnsmasq` binds to UDP/TCP port 53. We configure `no-resolv` to prevent leaking queries to upstream public DNS servers, and use `address=/app.teamX.test/10.7.3.128` or `host-record=app.teamX.test,10.7.3.128,30` to supply authoritative answers directly from memory.

### 2. Why is port 53 privileged, and how do client Macs query it?
- Ports below 1024 are system ports requiring `sudo` privileges. Clients configure Mac 1's IP in `/etc/resolver/teamX.test` or as primary DNS in macOS Network Preferences. macOS automatically routes all queries ending in `.teamX.test` specifically to Mac 1 (`10.7.17.94`).

### 3. What happens when Primary DNS fails (Phase 2 Ext A)?
- If Mac 1 becomes unreachable or stops running `dnsmasq`, client queries to Mac 1 time out. The OS resolver automatically fails over to the configured secondary nameserver (Backup DNS on Mac 4: `10.7.17.147`), ensuring zero downtime for domain lookups.
