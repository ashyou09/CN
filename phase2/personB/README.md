# Phase 2 — Person B (Ashutosh Singh · Mac 2)

**Role:** Primary Edge Reverse Proxy / Load Balancer / TLS (`nginx`, `:8080` / `:8443`), HA Passive Failover (**Ext D**), Primary Edge Identification (`X-Edge: Primary-Mac2`, **Ext E**).

## Files in This Folder
- `nginx/nginx-primary-lan.conf` — 4-Mac Primary Edge (upstreams `10.7.6.84:3001` & `10.7.17.147:3002`, `max_fails=3 fail_timeout=5s`, `X-Edge: Primary-Mac2`)
- `nginx/nginx-local-primary.conf` — 1-Mac local Primary Edge (`127.0.0.1:8080` / `8443`)

## Quick Commands (4-Mac Demo)
```bash
# 1. Test & start Primary Edge nginx (Mac 2)
mkdir -p phase2/personB/nginx/logs
nginx -p "$(pwd)/phase2/personB/nginx" -c "$(pwd)/phase2/personB/nginx/nginx-primary-lan.conf" -t
nginx -p "$(pwd)/phase2/personB/nginx" -c "$(pwd)/phase2/personB/nginx/nginx-primary-lan.conf"

# 2. Watch failover & recovery events in error log (Ext D)
tail -f phase2/personB/nginx/logs/primary-lan-error.log

# 3. Stop Primary Edge when done
nginx -p "$(pwd)/phase2/personB/nginx" -c "$(pwd)/phase2/personB/nginx/nginx-primary-lan.conf" -s stop
```

> **Viva SPOF Point:** Even with Ext D backend failover, **Mac 2 (`nginx`)** remains a Single Point of Failure until paired with VRRP/`keepalived` VIP or DNS cutover (Ext E).
