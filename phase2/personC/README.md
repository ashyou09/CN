# Phase 2 — Person C (Shreya Suman · Mac 3)

**Role:** Backend A (`:3001`), `pf` Firewall Isolation (**Ext C**), Backend A Stop/Restart for HA Failover (**Ext D**), and Standby Edge `nginx` (`X-Edge: Standby-Mac3`, **Ext E**).

## Files in This Folder
- `firewall/backend_a_isolation.pf` — 4-Mac `pf` rules allowing only Mac 2 (`10.7.3.128`) & Mac 3 (`10.7.6.84`) to `:3001`
- `firewall/local_single_mac_test.pf` — 1-Mac loopback `pf` test (`127.0.0.2` pass, `127.0.0.3` block on `:3001`)
- `nginx/nginx-standby-lan.conf` — 4-Mac Standby Edge (`X-Edge: Standby-Mac3`)
- `nginx/nginx-local-standby.conf` — 1-Mac non-sudo Standby Edge (`127.0.0.1:8081` / `8444`)
- `nginx/nginx-local-standby-alias.conf` — 1-Mac sudo Standby Edge (`127.0.0.2:8080` / `8443`)

## Quick Commands (4-Mac Demo)
```bash
# 1. Start Backend A (3001)
npm run start:a

# 2. Ext C: Back up pf.conf, load backend isolation, then rollback after demo
sudo cp /etc/pf.conf /etc/pf.conf.bak
sudo pfctl -f phase2/personC/firewall/backend_a_isolation.pf -e
sudo pfctl -sr
# Rollback:
sudo pfctl -f /etc/pf.conf

# 3. Ext E: Start Standby Edge nginx on Mac 3
mkdir -p phase2/personC/nginx/logs
nginx -p "$(pwd)/phase2/personC/nginx" -c "$(pwd)/phase2/personC/nginx/nginx-standby-lan.conf" -t
nginx -p "$(pwd)/phase2/personC/nginx" -c "$(pwd)/phase2/personC/nginx/nginx-standby-lan.conf"
```
