# Evaluator Rubric Mapping & 50-Mark Grading Checklist (Review 2)

> **Evaluator Reference:** Phase 2 Harden, Recover & Troubleshoot (Extensions A–F)  
> **Course:** Computer Networks Laboratory — Review 2 Evaluation (Total: **50 Marks**)

---

## 📋 Comprehensive 50-Mark Rubric Breakdown

| Evaluation Area | Extensions Included | Max Marks | Primary Lead / Machine | Verification Artifact / Command |
| :--- | :--- | :---: | :--- | :--- |
| **1. Resilience & HA Failover** | **Ext A, Ext B, Ext D** | **15** | Person A (Mac 1), Person B (Mac 2), Person D (Mac 4) | `./phase2/scripts/run_local_no_sudo_tests.sh` (Tests 1, 2, 4) |
| **2. Service Isolation & Migration** | **Ext C, Ext E** | **10** | Person C (Mac 3), Person D (Mac 4) | `sudo ./phase2/scripts/run_local_sudo_full_demo.sh` (Test 8) & Test 5 |
| **3. Faculty Troubleshooting** | **Ext F** | **10** | **All Team Members** | Live layer-by-layer diagnosis via [`docs/TROUBLESHOOTING_PLAYBOOK.md`](../../docs/TROUBLESHOOTING_PLAYBOOK.md) |
| **4. Final Report & Documentation** | Architecture, Topology, Evidence | **5** | Consolidated by Team | [`phase2/docs/PHASE2_FINAL_REPORT.md`](PHASE2_FINAL_REPORT.md) & [`evidence/phase2/`](../../evidence/phase2/) |
| **5. Individual Viva Voce** | Concept mastery across OSI layers | **10** | **Each Candidate Individually** | See Candidate Defense Guides: [`personA`](../../personA/PERSON_A_EVALUATION_GUIDE.md), [`personB`](../../personB/PERSON_B_EVALUATION_GUIDE.md), [`personC`](../../personC/PERSON_C_EVALUATION_GUIDE.md), [`personD`](../../personD/PERSON_D_EVALUATION_GUIDE.md) |
| **TOTAL** | **Review 2 Full Score** | **50** | — | — |

---

## 🔍 Detailed Evidence Checklist for Evaluators

### Area 1: Resilience & HA Failover (15 Marks)
- [x] **Ext A — Backup DNS Resolver (Mac 4)**:
  - Configuration: [`phase2/personD/dns/dnsmasq-backup-lan.conf`](../personD/dns/dnsmasq-backup-lan.conf).
  - Evidence: [`evidence/phase2/personD/extA_backup_dns_local.txt`](../../evidence/phase2/personD/extA_backup_dns_local.txt).
  - Validation: Resolves `app.teamX.test` to Edge IP independently on port 53.
- [x] **Ext B — DNS TTL & Cache Flushing (Mac 1)**:
  - Configuration: `host-record=app.teamX.test,10.7.3.128,30` (30s TTL).
  - Evidence: [`evidence/phase2/personA/extB_dns_ttl_record_change_local.txt`](../../evidence/phase2/personA/extB_dns_ttl_record_change_local.txt).
  - Validation: Demonstrates cache retention during 30s window and instant cutover upon `dscacheutil -flushcache`.
- [x] **Ext D — Nginx Passive Health Check (Mac 2)**:
  - Configuration: `max_fails=3 fail_timeout=5s; proxy_next_upstream error timeout;`.
  - Evidence: [`evidence/phase2/personB/extD_ha_failover_local.txt`](../../evidence/phase2/personB/extD_ha_failover_local.txt).
  - Validation: When Backend A is killed, Nginx automatically routes 100% of traffic to Backend B without throwing client-facing HTTP errors.

---

### Area 2: Service Isolation & Edge Migration (10 Marks)
- [x] **Ext C — Host Firewall (`pfctl`) Isolation (Mac 3 & Mac 4)**:
  - Rules: [`phase2/personC/firewall/backend_a_isolation.pf`](../personC/firewall/backend_a_isolation.pf) and [`phase2/personD/firewall/backend_b_isolation.pf`](../personD/firewall/backend_b_isolation.pf).
  - Behavior: Blocks direct client connections to microservice ports 3001/3002; permits strictly Edge IPs.
- [x] **Ext E — Controlled Standby Edge Migration (Mac 3)**:
  - Configuration: [`phase2/personC/nginx/nginx-standby-lan.conf`](../personC/nginx/nginx-standby-lan.conf).
  - Evidence: [`evidence/phase2/personC/extE_standby_edge_local.txt`](../../evidence/phase2/personC/extE_standby_edge_local.txt).
  - Validation: Standby Edge returns header `X-Edge: Standby-Mac3`, confirming seamless migration from Primary Edge.

---

### Area 3: Faculty Troubleshooting Challenge (10 Marks)
- [x] Live interactive diagnosis using the 5-layer methodology:
  1. Layer 1/2: Physical & ARP table check.
  2. Layer 3: ICMP reachability (`ping`).
  3. Layer 4: TCP port availability (`nc -zv` / `lsof`).
  4. Layer 7: DNS resolution (`dig` / `dscacheutil`).
  5. Layer 7: TLS trust & HTTP headers (`curl -Iv`).

---

### Area 4: Final Report Quality (5 Marks)
- [x] Comprehensive architectural documentation: [`phase2/docs/PHASE2_FINAL_REPORT.md`](PHASE2_FINAL_REPORT.md).
- [x] High-fidelity network topology: [`phase2/docs/topology_phase2.md`](topology_phase2.md).
- [x] Full evidence portfolio indexed in [`evidence/phase2/README.md`](../../evidence/phase2/README.md).

---

### Area 5: Individual Viva Voce (10 Marks)
- [x] Evaluated individually per student using role-specific guides:
  - **Pankaj Baid (Person A)**: [`personA/PERSON_A_EVALUATION_GUIDE.md`](../../personA/PERSON_A_EVALUATION_GUIDE.md)
  - **Ashutosh Singh (Person B)**: [`personB/PERSON_B_EVALUATION_GUIDE.md`](../../personB/PERSON_B_EVALUATION_GUIDE.md)
  - **Shreya Suman (Person C)**: [`personC/PERSON_C_EVALUATION_GUIDE.md`](../../personC/PERSON_C_EVALUATION_GUIDE.md)
  - **Ranvendra Pratap Singh (Person D)**: [`personD/PERSON_D_EVALUATION_GUIDE.md`](../../personD/PERSON_D_EVALUATION_GUIDE.md)
  - **Master Viva Cheat Sheet (25 Q&A)**: [`docs/VIVA_QUESTIONS_AND_DEFENSE.md`](../../docs/VIVA_QUESTIONS_AND_DEFENSE.md)
