# Phase 2 — Person A (Pankaj Baid · Mac 1)

**Role:** Primary DNS (`dnsmasq`, port `53`), DNS TTL & Cache Flush (**Ext B**), Primary DNS Failover Test (**Ext A**), DNS Cutover (**Ext E**).

## Files in This Folder
- `dns/dnsmasq-primary-lan.conf` — 4-Mac LAN Primary DNS (`30s` TTL, points to Mac 2 `10.7.3.128`)
- `dns/dnsmasq-local-primary.conf` — 1-Mac non-sudo test (`127.0.0.1:15353`)
- `dns/dnsmasq-local-port53-primary.conf` — 1-Mac sudo port-53 test (`127.0.0.1:53`)

## Quick Commands (4-Mac Demo)
```bash
# 1. Start Primary DNS (Mac 1)
sudo pkill dnsmasq || true
sudo dnsmasq -C phase2/personA/dns/dnsmasq-primary-lan.conf -d

# 2. Verify 30s TTL directly
dig @10.7.17.94 app.teamX.test

# 3. Configure client DNS order: [Primary Mac 1, Backup Mac 4]
sudo networksetup -setdnsservers Wi-Fi 10.7.17.94 10.7.17.147

# 4. Ext B: Observe OS DNS cache & manual flush
dscacheutil -q host -a name app.teamX.test
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```
