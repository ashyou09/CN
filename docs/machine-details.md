# Machine Details & Network Inventory (Task A)

## 1. Network Inventory Table

Fill in this table when all 4 Macs are connected to the team LAN / Wi-Fi segment:

| Parameter | Mac 1 (Person A) | Mac 2 (Person B) | Mac 3 (Person C) | Mac 4 (Person D - You) |
| :--- | :--- | :--- | :--- | :--- |
| **Role** | Private DNS + Client | Edge Proxy / LB / TLS | Backend Server A | Backend Server B + Client |
| **Hostname** | `Pankajs-MacBook-Pro-2.local` | `mac2.local` | `mac3.local` | `Ranvendras-MacBook-Air.local` |
| **Interface** | `en0` (Wi-Fi) | `en0` (Wi-Fi) | `en0` (Wi-Fi) | `en0` (Wi-Fi) |
| **IPv4 Address** | `10.7.17.94` | `10.7.3.128` | `10.7.6.84` | `10.7.17.147` |
| **Subnet Mask** | `255.255.224.0` (`/19`) | `255.255.224.0` (`/19`) | `255.255.224.0` (`/19`) | `255.255.224.0` (`/19`) |
| **Default Gateway**| `10.7.0.1` | `10.7.0.1` | `10.7.0.1` | `10.7.0.1` |
| **MAC Address** | `46:1d:da:58:a4:fb` | `f6:bf:22:4f:e6:62` | `5e:7f:95:17:c2:ab` | `72:1f:ac:57:17:62` |
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

| From \ To | Mac 1 (`10.7.17.94`) | Mac 2 (`10.7.3.128`) | Mac 3 (`10.7.6.84`) | Mac 4 (`10.7.17.147`) |
| **Mac 1** | — | [x] PASS | [x] PASS | [x] PASS |
| **Mac 2** | [x] PASS | — | [x] PASS | [x] PASS |
| **Mac 3** | [x] PASS | [x] PASS | — | [x] PASS |
| **Mac 4** | [x] PASS | [x] PASS | [x] PASS | — |

*Verification command:*
```bash
ping -c 3 <DESTINATION_IP>
```
