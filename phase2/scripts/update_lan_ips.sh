#!/usr/bin/env bash
set -euo pipefail

# Update all 6 Phase 2 4-Mac LAN configuration files when Wi-Fi IPs change.
# Usage: ./phase2/scripts/update_lan_ips.sh <MAC2_EDGE_IP> <MAC3_BACKEND_A_IP> <MAC4_BACKEND_B_IP>

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <MAC2_EDGE_IP> <MAC3_BACKEND_A_IP> <MAC4_BACKEND_B_IP>"
    echo "Example: $0 10.7.3.128 10.7.6.84 10.7.17.147"
    exit 1
fi

MAC2_IP="$1"
MAC3_IP="$2"
MAC4_IP="$3"

for ip in "$MAC2_IP" "$MAC3_IP" "$MAC4_IP"; do
    if ! [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
        echo "❌ Invalid IPv4 address: $ip"
        exit 1
    fi
done

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

DNS_PRIMARY="phase2/personA/dns/dnsmasq-primary-lan.conf"
DNS_BACKUP="phase2/personD/dns/dnsmasq-backup-lan.conf"
NGINX_PRIMARY="phase2/personB/nginx/nginx-primary-lan.conf"
NGINX_STANDBY="phase2/personC/nginx/nginx-standby-lan.conf"
PF_A="phase2/personC/firewall/backend_a_isolation.pf"
PF_B="phase2/personD/firewall/backend_b_isolation.pf"

# 1. Update DNS host records (preserving 30s TTL)
for f in "$DNS_PRIMARY" "$DNS_BACKUP"; do
    sed -i '' -E "s|^host-record=app\.teamX\.test,[^,]+,30|host-record=app.teamX.test,$MAC2_IP,30|" "$f"
    sed -i '' -E "s|^host-record=api\.teamX\.test,[^,]+,30|host-record=api.teamX.test,$MAC2_IP,30|" "$f"
done

# 2. Update Nginx upstream pool in Primary & Standby LAN configs
for f in "$NGINX_PRIMARY" "$NGINX_STANDBY"; do
    sed -i '' -E "s|server [0-9.]+:3001 |server $MAC3_IP:3001 |" "$f"
    sed -i '' -E "s|server [0-9.]+:3002 |server $MAC4_IP:3002 |" "$f"
done

# 3. Update pf firewall allow rules in Mac 3 & Mac 4 isolation files
sed -i '' -E "/# Allow Mac 2/{n;s|from [0-9.]+ to any port 3001|from $MAC2_IP to any port 3001|;}" "$PF_A"
sed -i '' -E "/# Allow Mac 3/{n;s|from [0-9.]+ to any port 3001|from $MAC3_IP to any port 3001|;}" "$PF_A"
sed -i '' -E "/# Allow Mac 2/{n;s|from [0-9.]+ to any port 3002|from $MAC2_IP to any port 3002|;}" "$PF_B"
sed -i '' -E "/# Allow Mac 3/{n;s|from [0-9.]+ to any port 3002|from $MAC3_IP to any port 3002|;}" "$PF_B"

echo "✅ Updated Phase 2 LAN configs:"
echo "   Mac 2 (Primary Edge): $MAC2_IP"
echo "   Mac 3 (Backend A / Standby): $MAC3_IP"
echo "   Mac 4 (Backend B / Backup DNS): $MAC4_IP"

echo ""
echo "=== Validating updated configs ==="
DNSMASQ_BIN="$(command -v dnsmasq 2>/dev/null || echo "/opt/homebrew/sbin/dnsmasq")"
NGINX_BIN="$(command -v nginx 2>/dev/null || echo "/opt/homebrew/bin/nginx")"
"$DNSMASQ_BIN" --test -C "$DNS_PRIMARY"
"$DNSMASQ_BIN" --test -C "$DNS_BACKUP"
mkdir -p phase2/personB/nginx/logs phase2/personC/nginx/logs
"$NGINX_BIN" -p "$(pwd)/phase2/personB/nginx" -c "$(pwd)/$NGINX_PRIMARY" -t
"$NGINX_BIN" -p "$(pwd)/phase2/personC/nginx" -c "$(pwd)/$NGINX_STANDBY" -t
/sbin/pfctl -nf "$PF_A" 2>&1 | head -n 1 || true
/sbin/pfctl -nf "$PF_B" 2>&1 | head -n 1 || true
echo "✅ All Phase 2 LAN configs validated!"
