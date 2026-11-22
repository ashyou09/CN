# Network Security Architecture: DMZ Segmentation & Packet Filter Isolation

> **Educational Reference for Evaluators & Students**  
> **Topic:** Enterprise Network Security, Demilitarized Zones (DMZ), and macOS `pfctl` Stateful Packet Filtering.

---

## 🛡️ 1. Security Problem Statement: Direct Backend Exposure

In an unhardened multi-node distributed network (Phase 1):
1. **Bypass of Edge Controls**: Any workstation on the local network (`10.7.0.0/19`) can bypass the Edge Proxy (Mac 2) and send raw HTTP requests directly to Backend A (`10.7.6.84:3001`) or Backend B (`10.7.17.147:3002`).
2. **Loss of Encryption**: Direct connections to backends transit in plaintext HTTP, exposing internal headers and payload data to packet sniffing on the local Wi-Fi.
3. **Loss of Policy Enforcement**: Bypassing the reverse proxy bypasses rate limiting, round-robin load distribution, WAF rules, and logging.
4. **Vulnerability to DoS**: An attacker can flood microservice ports directly without traversing reverse proxy connection buffers.

---

## 🏛️ 2. The DMZ & Zero Trust Architectural Pattern

To eliminate these vulnerabilities, Phase 2 implements a **Demilitarized Zone (DMZ)** pattern enforced via host-based firewalls:

```text
       UNTRUSTED LAN (Clients / Laptops)
                      │
                      ▼ HTTPS (Port 8443)
       ┌──────────────────────────────┐
       │   DMZ / EDGE PROXY (Mac 2)   │
       │   Public Entrance Point      │
       │   • Terminates TLS           │
       │   • Validates Certificates   │
       │   • Enforces Rate Limits     │
       └──────────────┬───────────────┘
                      │
   ═══════════════════╪══════════════════════════════════════════════════════════
                      │  INTERNAL PRIVATE ZONE (Enforced by pf Packet Filter)
                      │  Direct client traffic is BLOCKED at the Kernel level.
                      ├──────────────────────────┐
                      ▼ Plaintext HTTP (:3001)   ▼ Plaintext HTTP (:3002)
       ┌──────────────────────────────┐   ┌──────────────────────────────┐
       │     BACKEND A (Mac 3)        │   │     BACKEND B (Mac 4)        │
       │     Isolated Microservice    │   │     Isolated Microservice    │
       │   [pfctl: Only Edge Allowed] │   │   [pfctl: Only Edge Allowed] │
       └──────────────────────────────┘   └──────────────────────────────┘
```

---

## ⚙️ 3. macOS Packet Filter (`pfctl`) Implementation

macOS includes BSD `pf` (Packet Filter), an enterprise-grade stateful packet filtering engine embedded directly in the Darwin kernel.

### Configuration on Mac 3 (Backend A - Port 3001)
File: [`phase2/personC/firewall/backend_a_isolation.pf`](../phase2/personC/firewall/backend_a_isolation.pf)
```pf
# 1. Default Block: Reject all inbound TCP to microservice port 3001
block return in quick proto tcp to any port 3001

# 2. Allow Rule: Permit incoming TCP strictly from Primary Edge (Mac 2)
pass in quick proto tcp from 10.7.3.128 to any port 3001 keep state

# 3. Allow Rule: Permit incoming TCP strictly from Standby Edge (Mac 3 local)
pass in quick proto tcp from 10.7.6.84 to any port 3001 keep state
```

### Configuration on Mac 4 (Backend B - Port 3002)
File: [`phase2/personD/firewall/backend_b_isolation.pf`](../phase2/personD/firewall/backend_b_isolation.pf)
```pf
# 1. Default Block: Reject all inbound TCP to microservice port 3002
block return in quick proto tcp to any port 3002

# 2. Allow Rule: Permit incoming TCP strictly from Primary Edge (Mac 2)
pass in quick proto tcp from 10.7.3.128 to any port 3002 keep state

# 3. Allow Rule: Permit incoming TCP strictly from Standby Edge (Mac 3)
pass in quick proto tcp from 10.7.6.84 to any port 3002 keep state
```

---

## 🔍 4. Deep-Dive into Packet Filter Directives

| Directive | Purpose & Networking Behavior |
| :--- | :--- |
| `block return in` | Instead of silently dropping the packet (`block drop`), the kernel immediately responds with a TCP `[RST]` (Reset) packet. This ensures the unauthorized client socket fails cleanly (`Connection refused`) rather than hanging in connection timeout. |
| `quick` | Stops further evaluation of subsequent rules. If a packet matches this rule, `pf` takes action immediately without checking rules below it. |
| `keep state` | Creates an entry in the kernel's state table upon successful TCP 3-way handshake (`SYN`). All subsequent packets belonging to that established TCP session (`ACK`, `PSH`, `FIN`) are permitted automatically without re-evaluating the rule set. |

---

## 🧪 5. Verification Commands for Evaluators

1. **Verify Loaded Kernel Rules**:
   ```bash
   sudo pfctl -sr
   ```
   *Expected output*: Shows active `block return` and `pass in` rules on destination ports 3001 and 3002.

2. **Simulate Unauthorized Direct Client Access (Fails)**:
   ```bash
   # Running from an arbitrary client Mac directly to Backend A
   curl -i --connect-timeout 2 http://10.7.6.84:3001/api/status
   ```
   *Observation*: Connection immediately refused or timed out by firewall.

3. **Verify Authorized Reverse Proxy Access (Passes)**:
   ```bash
   # Running through Edge Proxy
   curl -i --cacert personB/tls/ca.crt https://app.teamX.test:8443/api/status
   ```
   *Observation*: HTTP 200 OK with `X-Backend: A` returned successfully.
