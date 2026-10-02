# Machine Details & Network Inventory (Task A)

## 1. Network Inventory Table

Fill in this table when all 4 Macs are connected to the team LAN / Wi-Fi segment:

| Parameter | Mac 1 (Person A) | Mac 2 (Person B) | Mac 3 (Person C) | Mac 4 (Person D - You) |
| :--- | :--- | :--- | :--- | :--- |
| **Role** | Private DNS + Client | Edge Proxy / LB / TLS | Backend Server A | Backend Server B + Client |
| **Hostname** | `mac1.local` | `mac2.local` | `mac3.local` | `mac4.local` |
| **Interface** | `en0` | `en0` | `en0` | `en0` |
| **IPv4 Address** | `10.7.17.94` | `10.7.3.128` | `10.7.6.84` | `10.7.17.147` |
| **Subnet Mask** | `255.255.255.0` (`/24`) | `255.255.255.0` (`/24`) | `255.255.255.0` (`/24`) | `255.255.255.0` (`/24`) |
| **Default Gateway**| `10.124.23.114` | `10.124.23.114` | `10.124.23.114` | `10.124.23.114` |
| **MAC Address** | `ea:7f:5f:22:d7:11` | `fe:ce:ae:d9:87:58` | `a6:68:f6:cc:1c:db` | `32:9b:fc:5e:3b:91` |
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
| **Mac 4** | [x] PASS | [x] PASS | [x] PASS | — |

*Verification command:*
```bash
ping -c 3 <DESTINATION_IP>
```
