# Person A — Mac 1: Private DNS Resolver & Test Client

> **Team Member:** **Pankaj Baid**  
> **Course:** Computer Networks Laboratory  
> **Machine Role:** Mac 1 · Authoritative Private DNS Lead & Client Node  
> **Evaluator Quick Guide:** [`personA/PERSON_A_EVALUATION_GUIDE.md`](PERSON_A_EVALUATION_GUIDE.md)

---

## 🎯 Role Overview

Person A operates the **Private DNS Resolver** using `dnsmasq`. In a real-world enterprise cloud architecture, this component represents a private managed DNS service such as **AWS Route 53 Private Hosted Zones** or **CoreDNS** in Kubernetes.

It translates human-friendly domain names (`app.teamX.test` and `api.teamX.test`) into the private IP address of the Edge Proxy (Mac 2: `10.7.3.128`), decoupling the client applications from raw IP addresses.

```text
+-----------------------+              +-----------------------+
|  Client (Mac 2/3/4)   |              |  Mac 1 (dnsmasq)      |
|  "Where is            |              |  Authoritative Zone   |
|   app.teamX.test?"    |              |  .test                |
+-----------+-----------+              +-----------+-----------+
            |                                      |
            | 1. DNS Query (UDP Port 53)           |
            +------------------------------------->|
            |                                      |
            | 2. DNS Answer (A: 10.7.3.128)        |
            |<-------------------------------------+
            |
            v
   Connects to Mac 2 (Edge Proxy)
```

---

## ⚙️ Service Specifications

| Parameter | Assigned Value | Description |
| :--- | :--- | :--- |
| **Component** | `dnsmasq` | Lightweight authoritative & caching DNS server |
| **Listener Port** | `53` (UDP and TCP) | Standard privileged DNS service port |
| **Domain Zones** | `app.teamX.test`, `api.teamX.test` | Custom private `.test` top-level domain |
| **Target Mapping** | `10.7.3.128` (Mac 2 Edge) | Points clients to the secure HTTPS Edge Proxy |
| **Configuration** | [`personA/dns/dnsmasq.conf`](dns/dnsmasq.conf) | Zone mapping directives (`address=...`) |

---

## 🚀 Setup & Execution Guide

### 1. Start DNS Server on Mac 1
```bash
cd personA/dns

# Step 1: Update dnsmasq.conf with the current Edge IP (Mac 2)
./setup_dns.sh <MAC2_IP>

# Step 2: Start dnsmasq in foreground with verbose debug logging
sudo dnsmasq -C dnsmasq.conf -d
```

### 2. Configure Client Macs to Query Mac 1
On client nodes (Mac 2, Mac 3, Mac 4):
```bash
# Method A: Domain-Specific macOS Resolver (Recommended)
sudo mkdir -p /etc/resolver
printf 'nameserver %s\n' "<MAC1_IP>" | sudo tee /etc/resolver/teamX.test

# Method B: Flush local cache after configuring
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### 3. Verify DNS Resolution
```bash
# Test direct query against Mac 1
dig @<MAC1_IP> app.teamX.test +short

# Test system resolver
dscacheutil -q host -a name app.teamX.test
```

---

## 🧪 Client Test Suite Execution
Person A also serves as a client verification node:
```bash
cd personA/client
./test.sh <MAC1_IP> app.teamX.test 8080 8443
```

---

## 🛡️ Phase 2 Contributions (Review 2)
- **Extension B**: Configured DNS records with short `30s` TTL and proved client OS cache flush mechanisms.
- **Extension A**: Tested primary DNS outage handling with automatic failover to Mac 4 (Backup DNS).
- **Extension E**: Updated DNS host records to cut over client traffic to Standby Edge (Mac 3).
- **Phase 2 Configs & Runbook**: See [`phase2/personA/`](../phase2/personA/) and [`phase2/docs/EVALUATOR_RUBRIC_MAPPING.md`](../phase2/docs/EVALUATOR_RUBRIC_MAPPING.md).
