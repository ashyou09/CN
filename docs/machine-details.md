# Machine Details & Network Inventory (Task A)

## 1. Network Inventory Table

Fill in this table when all 4 Macs are connected to the team LAN / Wi-Fi segment:

| Parameter | Mac 1 (Person A) | Mac 2 (Person B) | Mac 3 (Person C) | Mac 4 (Person D) |
| :--- | :--- | :--- | :--- | :--- |
| **Role** | Private DNS + Client | Edge Proxy / LB / TLS | Backend Server A | Backend Server B + Client |
| **Hostname** | `mac1.local` | `mac2.local` | `mac3.local` | `mac4.local` |
| **Interface** | e.g. `en0` | e.g. `en0` | e.g. `en0` | e.g. `en0` |
| **IPv4 Address** | | | | |
| **Subnet Mask** | e.g. `255.255.255.0` (`/24`) | | | |
| **Default Gateway**| e.g. `10.7.0.1` | | | |
| **MAC Address** | | | | |
| **Open Service Port**| `53` (UDP/TCP) | `8080`, `8443` | `3001` | `3002` |

---

## 2. Useful macOS Network Discovery Commands

Run these on your Mac to retrieve the table values:

```bash
# 1. Active IPv4 address and Interface name
ipconfig getifaddr en0

# 2. Subnet Mask
ipconfig getoption en0 subnet_mask

# 3. Default Gateway / Router IP
route -n get default | grep gateway

# 4. MAC Address (Hardware Address)
ifconfig en0 | grep ether

# 5. ARP Cache (to see other team machines' MAC addresses on LAN)
arp -a
```

---

## 3. Pairwise Ping Reachability Matrix

All machines must verify reachability before starting higher layer services:

| From \ To | Mac 1 | Mac 2 | Mac 3 | Mac 4 |
| :--- | :---: | :---: | :---: | :---: |
| **Mac 1** | — | [ ] PASS | [ ] PASS | [ ] PASS |
| **Mac 2** | [ ] PASS | — | [ ] PASS | [ ] PASS |
| **Mac 3** | [ ] PASS | [ ] PASS | — | [ ] PASS |
| **Mac 4** | [ ] PASS | [ ] PASS | [ ] PASS | — |

*Verification command:*
```bash
ping -c 3 <DESTINATION_IP>
```
