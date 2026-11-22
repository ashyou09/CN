#!/usr/bin/env bash
set -euo pipefail

# Full privileged 1-Mac Phase 2 demo (Extensions A, B, C, D, E) using:
#   - Loopback aliases (127.0.0.2, 127.0.0.3)
#   - Real port 53 Primary + Backup dnsmasq
#   - macOS Wi-Fi DNS resolver + dscacheutil 30s TTL / flush test
#   - Real macOS pfctl backend isolation test
#   - Real DNS cutover from Primary Edge (127.0.0.1:8443) to Standby Edge (127.0.0.2:8443)
#
# Run as: sudo ./phase2/scripts/run_local_sudo_full_demo.sh

if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run with sudo: sudo $0"
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

DNSMASQ_BIN="$(command -v dnsmasq 2>/dev/null || echo "/opt/homebrew/sbin/dnsmasq")"
NGINX_BIN="$(command -v nginx 2>/dev/null || echo "/opt/homebrew/bin/nginx")"
NODE_BIN="$(command -v node)"
CURL_BIN="/usr/bin/curl"
[ -x "$CURL_BIN" ] || CURL_BIN="$(command -v curl)"

WIFI_SERVICE="Wi-Fi"
ORIG_DNS=$(networksetup -getdnsservers "$WIFI_SERVICE" 2>/dev/null || true)

mkdir -p "$REPO_ROOT/phase2/personB/nginx/logs" "$REPO_ROOT/phase2/personC/nginx/logs" "$REPO_ROOT/evidence/phase2/personA" "$REPO_ROOT/evidence/phase2/personB" "$REPO_ROOT/evidence/phase2/personC" "$REPO_ROOT/evidence/phase2/personD"

# Back up /etc/pf.conf once if not already backed up
if [ ! -f /etc/pf.conf.bak ]; then
    cp /etc/pf.conf /etc/pf.conf.bak
fi

BACKEND_A_PID=""
BACKEND_B_PID=""
DNS1_PID=""
DNS2_PID=""

cleanup() {
    set +e
    echo ""
    echo "🧹 Cleaning up local sudo demo state..."
    pfctl -f /etc/pf.conf >/dev/null 2>&1 || true
    [ -n "$DNS1_PID" ] && kill "$DNS1_PID" 2>/dev/null || true
    [ -n "$DNS2_PID" ] && kill "$DNS2_PID" 2>/dev/null || true
    "$NGINX_BIN" -p "$REPO_ROOT/phase2/personB/nginx" -c "$REPO_ROOT/phase2/personB/nginx/nginx-local-primary.conf" -s stop >/dev/null 2>&1 || true
    "$NGINX_BIN" -p "$REPO_ROOT/phase2/personC/nginx" -c "$REPO_ROOT/phase2/personC/nginx/nginx-local-standby-alias.conf" -s stop >/dev/null 2>&1 || true
    [ -n "$BACKEND_A_PID" ] && kill "$BACKEND_A_PID" 2>/dev/null || true
    [ -n "$BACKEND_B_PID" ] && kill "$BACKEND_B_PID" 2>/dev/null || true

    if echo "$ORIG_DNS" | grep -qi "There aren't any DNS Servers"; then
        networksetup -setdnsservers "$WIFI_SERVICE" Empty >/dev/null 2>&1 || true
    elif [ -n "$ORIG_DNS" ]; then
        # shellcheck disable=SC2086
        networksetup -setdnsservers "$WIFI_SERVICE" $ORIG_DNS >/dev/null 2>&1 || true
    else
        networksetup -setdnsservers "$WIFI_SERVICE" Empty >/dev/null 2>&1 || true
    fi
    dscacheutil -flushcache >/dev/null 2>&1 || true
    killall -HUP mDNSResponder >/dev/null 2>&1 || true

    ifconfig lo0 -alias 127.0.0.2 >/dev/null 2>&1 || true
    ifconfig lo0 -alias 127.0.0.3 >/dev/null 2>&1 || true
    rm -f /tmp/p2-sudo-*.conf /tmp/p2-sudo-*.pid
    echo "✅ Cleanup complete. Original DNS and pf rules restored."
}
trap cleanup EXIT

echo "=== 1. Adding loopback aliases 127.0.0.2 and 127.0.0.3 ==="
ifconfig lo0 alias 127.0.0.2 up
ifconfig lo0 alias 127.0.0.3 up

echo "=== 2. Starting Backends A (3001) & B (3002) ==="
"$NODE_BIN" "$REPO_ROOT/personC/backendA/server.js" > /tmp/p2-sudo-a.log 2>&1 &
BACKEND_A_PID=$!
"$NODE_BIN" "$REPO_ROOT/personD/backendB/server.js" > /tmp/p2-sudo-b.log 2>&1 &
BACKEND_B_PID=$!
sleep 1

echo "=== 3. Starting Primary Nginx (127.0.0.1:8443) & Standby Nginx (127.0.0.2:8443) ==="
"$NGINX_BIN" -p "$REPO_ROOT/phase2/personB/nginx" -c "$REPO_ROOT/phase2/personB/nginx/nginx-local-primary.conf"
"$NGINX_BIN" -p "$REPO_ROOT/phase2/personC/nginx" -c "$REPO_ROOT/phase2/personC/nginx/nginx-local-standby-alias.conf"

echo "=== 4. Starting Primary DNS (127.0.0.1:53) & Backup DNS (127.0.0.2:53) ==="
cp "$REPO_ROOT/phase2/personA/dns/dnsmasq-local-port53-primary.conf" /tmp/p2-sudo-dns1.conf
cp "$REPO_ROOT/phase2/personD/dns/dnsmasq-local-port53-backup.conf" /tmp/p2-sudo-dns2.conf
"$DNSMASQ_BIN" -k -C /tmp/p2-sudo-dns1.conf -x /tmp/p2-sudo-dns1.pid &
DNS1_PID=$!
"$DNSMASQ_BIN" -k -C /tmp/p2-sudo-dns2.conf -x /tmp/p2-sudo-dns2.pid &
DNS2_PID=$!
sleep 1

echo "=== 5. Setting Wi-Fi DNS to [127.0.0.1, 127.0.0.2] ==="
networksetup -setdnsservers "$WIFI_SERVICE" 127.0.0.1 127.0.0.2
dscacheutil -flushcache
killall -HUP mDNSResponder
sleep 1

OUT_DNS="$REPO_ROOT/evidence/phase2/personA/extABE_local_sudo_port53.txt"
{
    echo "# Phase 2 Sudo 1-Mac Verification — Extensions A, B, E ($(date))"
    echo "## Ext A1: OS Resolution via Primary DNS (127.0.0.1:53)"
    dig @127.0.0.1 +noall +answer app.teamX.test
    dscacheutil -q host -a name app.teamX.test
    "$CURL_BIN" -sI --cacert "$REPO_ROOT/personB/tls/ca.crt" https://app.teamX.test:8443/api/status | grep -iE "^HTTP/|^X-Edge:|^X-Backend:"
} > "$OUT_DNS"

echo "=== 6. Stopping Primary DNS (127.0.0.1) to prove Backup DNS (127.0.0.2) Failover ==="
kill "$DNS1_PID" 2>/dev/null || true
wait "$DNS1_PID" 2>/dev/null || true
DNS1_PID=""
dscacheutil -flushcache
killall -HUP mDNSResponder
sleep 1

{
    echo ""
    echo "## Ext A2: Primary DNS stopped; OS falls back to Backup DNS (127.0.0.2:53)"
    dig @127.0.0.2 +noall +answer app.teamX.test
    dscacheutil -q host -a name app.teamX.test
} >> "$OUT_DNS"

echo "=== 7. Testing Ext B (30s TTL Caching) + Ext E (DNS Cutover to Standby 127.0.0.2) ==="
{
    echo ""
    echo "## Ext B + E Step 1: Prime OS DNS cache with 127.0.0.1 (Primary-Mac2)"
    "$CURL_BIN" -sI --cacert "$REPO_ROOT/personB/tls/ca.crt" https://app.teamX.test:8443/api/status | grep -iE "^HTTP/|^X-Edge:|^X-Backend:"
} >> "$OUT_DNS"

sed -i '' -E 's/127\.0\.0\.1,30/127.0.0.2,30/g' /tmp/p2-sudo-dns2.conf
kill "$DNS2_PID" 2>/dev/null || true
wait "$DNS2_PID" 2>/dev/null || true
"$DNSMASQ_BIN" -k -C /tmp/p2-sudo-dns2.conf -x /tmp/p2-sudo-dns2.pid &
DNS2_PID=$!
sleep 0.5

{
    echo ""
    echo "## Ext B Step 2: Immediately after DNS record update (cached OS still hits Primary 127.0.0.1)"
    dscacheutil -q host -a name app.teamX.test
    "$CURL_BIN" -sI --cacert "$REPO_ROOT/personB/tls/ca.crt" https://app.teamX.test:8443/api/status | grep -iE "^HTTP/|^X-Edge:|^X-Backend:"
} >> "$OUT_DNS"

echo "Flushing macOS DNS cache to demonstrate immediate cutover..."
dscacheutil -flushcache
killall -HUP mDNSResponder
sleep 0.5

{
    echo ""
    echo "## Ext B + E Step 3: After manual cache flush -> immediate cutover to Standby (127.0.0.2 / Standby-Mac3)"
    dscacheutil -q host -a name app.teamX.test
    "$CURL_BIN" -sI --cacert "$REPO_ROOT/personB/tls/ca.crt" https://app.teamX.test:8443/api/status | grep -iE "^HTTP/|^X-Edge:|^X-Backend:"
} >> "$OUT_DNS"

echo "=== 8. Testing Ext C (pfctl Service Isolation on lo0 port 3001) ==="
OUT_PF="$REPO_ROOT/evidence/phase2/personC/extC_local_pf_isolation.txt"
pfctl -f "$REPO_ROOT/phase2/personC/firewall/local_single_mac_test.pf" -e 2>&1 || true

{
    echo "# Extension C — macOS pfctl Service Isolation ($(date))"
    echo "## Active pf rules:"
    pfctl -sr
    echo ""
    echo "## Allowed Edge IP (127.0.0.2 -> 127.0.0.1:3001):"
    "$CURL_BIN" -s --connect-timeout 2 --interface 127.0.0.2 http://127.0.0.1:3001/api/status
    echo ""
    echo "## Blocked Direct Client IP (127.0.0.3 -> 127.0.0.1:3001):"
    "$CURL_BIN" -s --connect-timeout 2 --interface 127.0.0.3 http://127.0.0.1:3001/api/status 2>&1 || echo "BLOCKED as expected (exit $?)"
} > "$OUT_PF"

echo "🎉 Sudo 1-Mac full demo complete! Evidence saved to:"
echo "   - $OUT_DNS"
echo "   - $OUT_PF"
