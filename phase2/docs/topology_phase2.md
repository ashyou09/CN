# Phase 2 Network Topology & Architecture Document

> **Extends:** [docs/topology.md](../../docs/topology.md) (Phase 1 baseline remains intact)

## 1. Phase 2 Hardened Network Topology

```
                 +--------------------------------------------------+
                 |              Private LAN (Wi-Fi)                 |
                 |           10.7.0.0/19 · gateway 10.7.0.1         |
                 +------------------------+-------------------------+
                                          |
       +----------------------------------+----------------------------------+
       |                                  |                                  |
+------v--------+                 +-------v-------+                  +-------v-------+
|    Mac 1      |                 |     Mac 2     |                  |     Mac 3     |
| Person A      |                 | Person B      |                  | Person C      |
| Pankaj Baid   |                 |Ashutosh Singh |                  | Shreya Suman  |
| Primary DNS   |                 | Primary Edge  |                  | Backend A     |
| dnsmasq (:53) |                 | nginx (:8443) |                  | node (:3001)  |
| TTL = 30s     |                 | X-Edge: Prim. |                  | pf Firewall   |
| Test Client   |                 | Active-Pass LB|                  | Standby Edge  |
+---------------+                 +-------+-------+                  | nginx (:8443) |
                                          |                          +-------+-------+
                                          |   (pf allows only Mac 2/3)       |
                                          +----------------------------------+
                                          |
                                  +-------v-------+
                                  |     Mac 4     |
                                  | Person D      |
                                  |Ranvendra P. S.|
                                  | Backend B     |
                                  | node (:3002)  |
                                  | pf Firewall   |
                                  | Backup DNS    |
                                  | dnsmasq (:53) |
                                  | Client/Capture|
                                  +---------------+
```

## 2. Phase 2 Service & Extension Mapping

| Machine | Member | Phase 1 Services | Phase 2 Additions |
| :--- | :--- | :--- | :--- |
| **Mac 1** | Pankaj Baid (Person A) | Primary `dnsmasq` (`:53`), Client | `30s` DNS TTL + controlled cutover record (`Ext B`, `Ext E`) |
| **Mac 2** | Ashutosh Singh (Person B) | Primary `nginx` (`:8080`, `:8443`), TLS CA | `max_fails=3 fail_timeout=5s` + `proxy_next_upstream` failover (`Ext D`), `X-Edge: Primary-Mac2` (`Ext E`) |
| **Mac 3** | Shreya Suman (Person C) | Backend A (`:3001`) | `pf` firewall blocking direct client access to `:3001` (`Ext C`), Standby `nginx` (`:8443`, `X-Edge: Standby-Mac3`) (`Ext E`) |
| **Mac 4** | Ranvendra Pratap Singh (Person D) | Backend B (`:3002`), Client, Capture | Backup `dnsmasq` (`:53`, `Ext A`), `pf` firewall blocking direct access to `:3002` (`Ext C`), Phase 2 Verification |

## 3. Cloud Architecture Equivalents (Phase 2 Extensions)

| Phase 2 Mechanism | Local Implementation | Cloud Equivalent |
| :--- | :--- | :--- |
| **Backup DNS (Ext A)** | Primary `dnsmasq` (Mac 1) + Backup `dnsmasq` (Mac 4) | Multi-Region / Anycast Managed DNS (Route 53) |
| **TTL & DNS Cutover (Ext B & E)** | `local-ttl=30`, `host-record`, Standby `nginx` on Mac 3 | Route 53 Weighted / Blue-Green DNS Cutover with Low TTL |
| **Service Isolation (Ext C)** | macOS `pf` rules allowing only Edge IP to `:3001`/`:3002` | AWS Security Groups / VPC Private Subnet Isolation |
| **HA Failover (Ext D)** | Nginx `max_fails=3`, `fail_timeout=5s`, `proxy_next_upstream` | ALB Target Group Health Checks & Automatic Unhealthy Target Drain |

## 4. Remaining Single Point of Failure (SPOF) Analysis

Even with Backup DNS (**Ext A**) and dual backends with passive health checks (**Ext D**), **Mac 2 (Primary `nginx` Edge)** remains a Single Point of Failure while DNS points exclusively to `10.7.3.128`. Eliminating that SPOF in production requires an **active-standby edge pair sharing a Virtual IP via VRRP/`keepalived`**, **automated DNS health-check failover**, or an **upstream L4/Anycast load balancer** across multiple edge nodes. **Extension E** demonstrates manual DNS-based migration to the standby edge on Mac 3 (`X-Edge: Standby-Mac3`).
