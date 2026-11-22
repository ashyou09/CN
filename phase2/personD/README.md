# Phase 2 — Person D (Ranvendra Pratap Singh · Mac 4)

**Role:** Backend B (`:3002`), Backup DNS (`dnsmasq`, **Ext A**), `pf` Firewall Isolation on `:3002` (**Ext C**), and Client/Wireshark Verification Lead.

## Files in This Folder
- `dns/dnsmasq-backup-lan.conf` — 4-Mac Backup DNS (`30s` TTL, matches Mac 1 records)
- `dns/dnsmasq-local-backup.conf` — 1-Mac non-sudo Backup DNS (`127.0.0.1:15354`)
- `dns/dnsmasq-local-port53-backup.conf` — 1-Mac sudo Backup DNS (`127.0.0.2:53`)
- `firewall/backend_b_isolation.pf` — 4-Mac `pf` rules allowing only Mac 2 (`10.7.3.128`) & Mac 3 (`10.7.6.84`) to `:3002`

## Quick Commands (4-Mac Demo)
```bash
# 1. Start Backend B (3002)
npm run start:b

# 2. Ext A: Start Backup DNS on Mac 4
sudo pkill dnsmasq || true
sudo dnsmasq -C phase2/personD/dns/dnsmasq-backup-lan.conf -d
# Verify: dig @10.7.17.147 app.teamX.test

# 3. Ext C: Back up pf.conf, load backend B isolation, then rollback after demo
sudo cp /etc/pf.conf /etc/pf.conf.bak
sudo pfctl -f phase2/personD/firewall/backend_b_isolation.pf -e
# Rollback:
sudo pfctl -f /etc/pf.conf

# 4. Verify client loop (Ext D / Ext E)
for i in 1 2 3 4 5 6; do
  curl -sI --cacert personB/tls/ca.crt https://app.teamX.test:8443/api/status | grep -iE "HTTP/|X-Backend|X-Edge"
done
```
