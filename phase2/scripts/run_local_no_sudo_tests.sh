#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

DNSMASQ_BIN="$(command -v dnsmasq 2>/dev/null || echo "/opt/homebrew/sbin/dnsmasq")"
NGINX_BIN="$(command -v nginx 2>/dev/null || echo "/opt/homebrew/bin/nginx")"
NODE_BIN="$(command -v node)"
CURL_BIN="/usr/bin/curl"
[ -x "$CURL_BIN" ] || CURL_BIN="$(command -v curl)"

for bin in "$DNSMASQ_BIN" "$NGINX_BIN" "$NODE_BIN" "$CURL_BIN" dig nc openssl; do
    if ! command -v "$bin" >/dev/null 2>&1 && [ ! -x "$bin" ]; then
        echo "❌ Required tool not found: $bin"
        exit 1
    fi
done

mkdir -p "$REPO_ROOT/phase2/personB/nginx/logs" "$REPO_ROOT/phase2/personC/nginx/logs" "$REPO_ROOT/evidence/phase2/personA" "$REPO_ROOT/evidence/phase2/personB" "$REPO_ROOT/evidence/phase2/personC" "$REPO_ROOT/evidence/phase2/personD"

# Check required ports are free before starting
for port in 3001 3002 15353 15354 15355 8080 8081 8443 8444; do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || lsof -nP -iUDP:"$port" >/dev/null 2>&1; then
        echo "❌ Port $port is already in use. Stop existing processes and retry."
        exit 1
    fi
done

BACKEND_A_PID=""
BACKEND_B_PID=""
DNS1_PID=""
DNS2_PID=""
DNS3_PID=""

cleanup() {
    set +e
    [ -n "$DNS1_PID" ] && kill "$DNS1_PID" 2>/dev/null || true
    [ -n "$DNS2_PID" ] && kill "$DNS2_PID" 2>/dev/null || true
    [ -n "$DNS3_PID" ] && kill "$DNS3_PID" 2>/dev/null || true
    "$NGINX_BIN" -p "$REPO_ROOT/phase2/personB/nginx" -c "$REPO_ROOT/phase2/personB/nginx/nginx-local-primary.conf" -s stop 2>/dev/null || true
    "$NGINX_BIN" -p "$REPO_ROOT/phase2/personC/nginx" -c "$REPO_ROOT/phase2/personC/nginx/nginx-local-standby.conf" -s stop 2>/dev/null || true
    [ -n "$BACKEND_A_PID" ] && kill "$BACKEND_A_PID" 2>/dev/null || true
    [ -n "$BACKEND_B_PID" ] && kill "$BACKEND_B_PID" 2>/dev/null || true
    rm -f /tmp/dnsmasq-ttl-test.conf /tmp/dnsmasq-p2-*.pid
}
trap cleanup EXIT

wait_for_http() {
    local url="$1"
    for _ in $(seq 1 30); do
        if "$CURL_BIN" -sf "$url" >/dev/null 2>&1; then
            return 0
        fi
        sleep 0.2
    done
    echo "❌ Timed out waiting for $url"
    return 1
}

echo "=== 1. Starting Backend A (3001) & Backend B (3002) ==="
"$NODE_BIN" "$REPO_ROOT/personC/backendA/server.js" > /tmp/p2-backend-a.log 2>&1 &
BACKEND_A_PID=$!
"$NODE_BIN" "$REPO_ROOT/personD/backendB/server.js" > /tmp/p2-backend-b.log 2>&1 &
BACKEND_B_PID=$!
wait_for_http "http://127.0.0.1:3001/api/status"
wait_for_http "http://127.0.0.1:3002/api/status"
echo "✅ Both backends healthy."

echo "=== 2. Testing & Starting Primary (8443) and Standby (8444) Nginx ==="
"$NGINX_BIN" -p "$REPO_ROOT/phase2/personB/nginx" -c "$REPO_ROOT/phase2/personB/nginx/nginx-local-primary.conf" -t
"$NGINX_BIN" -p "$REPO_ROOT/phase2/personC/nginx" -c "$REPO_ROOT/phase2/personC/nginx/nginx-local-standby.conf" -t
"$NGINX_BIN" -p "$REPO_ROOT/phase2/personB/nginx" -c "$REPO_ROOT/phase2/personB/nginx/nginx-local-primary.conf"
"$NGINX_BIN" -p "$REPO_ROOT/phase2/personC/nginx" -c "$REPO_ROOT/phase2/personC/nginx/nginx-local-standby.conf"
echo "✅ Primary & Standby nginx started."

echo "=== 3. Starting Primary DNS (15353) & Backup DNS (15354) ==="
"$DNSMASQ_BIN" -k -C "$REPO_ROOT/phase2/personA/dns/dnsmasq-local-primary.conf" -x /tmp/dnsmasq-p2-primary.pid &
DNS1_PID=$!
"$DNSMASQ_BIN" -k -C "$REPO_ROOT/phase2/personD/dns/dnsmasq-local-backup.conf" -x /tmp/dnsmasq-p2-backup.pid &
DNS2_PID=$!
sleep 0.5

# ---------------- Extension A: Backup DNS ----------------
echo "=== 4. Verifying Extension A (Backup DNS Failover) ==="
EXT_A_FILE="$REPO_ROOT/evidence/phase2/personD/extA_backup_dns_local.txt"
{
    echo "# Extension A — Backup DNS Local Verification ($(date))"
    echo "## Step 1: Primary DNS (127.0.0.1:15353) active"
    dig @127.0.0.1 -p 15353 +noall +answer app.teamX.test
} > "$EXT_A_FILE"

grep -qE "app\.teamX\.test\.\s+30\s+IN\s+A\s+127\.0\.0\.1" "$EXT_A_FILE"

# Stop Primary DNS and confirm Backup DNS continues answering
kill "$DNS1_PID" 2>/dev/null || true
wait "$DNS1_PID" 2>/dev/null || true
DNS1_PID=""
sleep 0.3

{
    echo ""
    echo "## Step 2: Primary DNS stopped (15353 should fail)"
    dig @127.0.0.1 -p 15353 +time=1 +tries=1 app.teamX.test 2>&1 || true
    echo ""
    echo "## Step 3: Backup DNS (127.0.0.1:15354) continues serving"
    dig @127.0.0.1 -p 15354 +noall +answer app.teamX.test
} >> "$EXT_A_FILE"

tail -n 5 "$EXT_A_FILE" | grep -qE "app\.teamX\.test\.\s+30\s+IN\s+A\s+127\.0\.0\.1"
echo "✅ Extension A verified -> $EXT_A_FILE"

# ---------------- Extension B: DNS TTL & Record Change ----------------
echo "=== 5. Verifying Extension B (DNS TTL=30s & Controlled Record Change) ==="
EXT_B_FILE="$REPO_ROOT/evidence/phase2/personA/extB_dns_ttl_record_change_local.txt"
sed -e 's/port=15354/port=15355/' \
    -e 's/127\.0\.0\.1,30/127.0.0.2,30/g' \
    -e 's|/tmp/dnsmasq-local-backup.log|/tmp/dnsmasq-ttl-test.log|' \
    "$REPO_ROOT/phase2/personD/dns/dnsmasq-local-backup.conf" > /tmp/dnsmasq-ttl-test.conf

"$DNSMASQ_BIN" -k -C /tmp/dnsmasq-ttl-test.conf -x /tmp/dnsmasq-p2-ttl.pid &
DNS3_PID=$!
sleep 0.5

{
    echo "# Extension B — DNS TTL (30s) & Record Change Verification ($(date))"
    echo "## Before change (Backup DNS :15354 -> 127.0.0.1, TTL 30s)"
    dig @127.0.0.1 -p 15354 +noall +answer app.teamX.test
    echo ""
    echo "## After controlled record change (:15355 -> 127.0.0.2, TTL 30s)"
    dig @127.0.0.1 -p 15355 +noall +answer app.teamX.test
} > "$EXT_B_FILE"

grep -qE "app\.teamX\.test\.\s+30\s+IN\s+A\s+127\.0\.0\.2" "$EXT_B_FILE"
kill "$DNS3_PID" 2>/dev/null || true
wait "$DNS3_PID" 2>/dev/null || true
DNS3_PID=""
echo "✅ Extension B verified -> $EXT_B_FILE"

# ---------------- Extension D: HA Failover ----------------
echo "=== 6. Verifying Extension D (HA Backend Failover & Recovery) ==="
EXT_D_FILE="$REPO_ROOT/evidence/phase2/personB/extD_ha_failover_local.txt"
{
    echo "# Extension D — High-Availability Backend Failover ($(date))"
    echo "## Phase 1: Both Backends A & B healthy (4 requests)"
    for i in 1 2 3 4; do
        echo "--- Request $i ---"
        "$CURL_BIN" -si --resolve app.teamX.test:8443:127.0.0.1 \
            --cacert "$REPO_ROOT/personB/tls/ca.crt" \
            https://app.teamX.test:8443/api/status | grep -iE "^HTTP/|^X-Backend:|^X-Edge:|\"backend\""
    done
} > "$EXT_D_FILE"

grep -q "X-Backend: A" "$EXT_D_FILE"
grep -q "X-Backend: B" "$EXT_D_FILE"

echo "Stopping Backend A (3001)..."
kill "$BACKEND_A_PID"
wait "$BACKEND_A_PID" 2>/dev/null || true
BACKEND_A_PID=""
sleep 0.5

FAILOVER_TMP=$(mktemp)
for i in 1 2 3 4 5 6; do
    "$CURL_BIN" -si --resolve app.teamX.test:8443:127.0.0.1 \
        --cacert "$REPO_ROOT/personB/tls/ca.crt" \
        https://app.teamX.test:8443/api/status | grep -iE "^HTTP/|^X-Backend:|^X-Edge:" >> "$FAILOVER_TMP"
done

{
    echo ""
    echo "## Phase 2: Backend A stopped (6 requests -> all must be 200 OK via Backend B)"
    cat "$FAILOVER_TMP"
} >> "$EXT_D_FILE"

COUNT_200=$(grep -c "200 OK" "$FAILOVER_TMP" || true)
COUNT_B=$(grep -ci "X-Backend: B" "$FAILOVER_TMP" || true)
COUNT_A=$(grep -ci "X-Backend: A" "$FAILOVER_TMP" || true)
rm -f "$FAILOVER_TMP"
if [ "$COUNT_200" -ne 6 ] || [ "$COUNT_B" -ne 6 ] || [ "$COUNT_A" -ne 0 ]; then
    echo "❌ Failover check failed: 200=$COUNT_200 B=$COUNT_B A=$COUNT_A"
    exit 1
fi

echo "Restarting Backend A (3001) and waiting 6s (> fail_timeout=5s) for recovery..."
"$NODE_BIN" "$REPO_ROOT/personC/backendA/server.js" > /tmp/p2-backend-a.log 2>&1 &
BACKEND_A_PID=$!
wait_for_http "http://127.0.0.1:3001/api/status"
sleep 6

RECOVERY_TMP=$(mktemp)
for i in 1 2 3 4 5 6; do
    "$CURL_BIN" -si --resolve app.teamX.test:8443:127.0.0.1 \
        --cacert "$REPO_ROOT/personB/tls/ca.crt" \
        https://app.teamX.test:8443/api/status | grep -iE "^HTTP/|^X-Backend:|^X-Edge:" >> "$RECOVERY_TMP"
done

{
    echo ""
    echo "## Phase 3: Backend A restarted + fail_timeout elapsed (6 requests -> A & B resume)"
    cat "$RECOVERY_TMP"
    echo ""
    echo "## Nginx Primary Error Log Excerpt (upstream failover events)"
    tail -n 20 "$REPO_ROOT/phase2/personB/nginx/logs/primary-error.log" || true
} >> "$EXT_D_FILE"

grep -qi "X-Backend: A" "$RECOVERY_TMP"
grep -qi "X-Backend: B" "$RECOVERY_TMP"
rm -f "$RECOVERY_TMP"
echo "✅ Extension D verified -> $EXT_D_FILE"

# ---------------- Extension E: Standby Edge ----------------
echo "=== 7. Verifying Extension E (Primary vs Standby Edge TLS + LB) ==="
EXT_E_FILE="$REPO_ROOT/evidence/phase2/personC/extE_standby_edge_local.txt"
{
    echo "# Extension E — Primary Edge vs Standby Edge Verification ($(date))"
    echo "## Primary Edge (127.0.0.1:8443)"
    for i in 1 2; do
        "$CURL_BIN" -sI --resolve app.teamX.test:8443:127.0.0.1 \
            --cacert "$REPO_ROOT/personB/tls/ca.crt" \
            https://app.teamX.test:8443/api/status | grep -iE "^HTTP/|^X-Edge:|^X-Backend:"
    done
    echo ""
    echo "## Standby Edge (127.0.0.1:8444)"
    for i in 1 2 3 4; do
        "$CURL_BIN" -sI --resolve app.teamX.test:8444:127.0.0.1 \
            --cacert "$REPO_ROOT/personB/tls/ca.crt" \
            https://app.teamX.test:8444/api/status | grep -iE "^HTTP/|^X-Edge:|^X-Backend:"
    done
} > "$EXT_E_FILE"

grep -q "X-Edge: Primary-Mac2" "$EXT_E_FILE"
grep -q "X-Edge: Standby-Mac3" "$EXT_E_FILE"
echo "✅ Extension E verified -> $EXT_E_FILE"

# ---------------- Extension F: 5-Layer Diagnostic Baseline ----------------
echo "=== 8. Verifying Extension F (5-Layer Diagnostic Baseline) ==="
EXT_F_FILE="$REPO_ROOT/evidence/phase2/personD/extF_layer_diagnostic_baseline.txt"
{
    echo "# Extension F — 5-Layer Diagnostic Baseline ($(date))"
    echo "## Layer 1: DNS Resolution"
    dig @127.0.0.1 -p 15354 +noall +answer app.teamX.test
    echo ""
    echo "## Layer 2: Network / IP Reachability"
    ping -c 1 127.0.0.1
    echo ""
    echo "## Layer 3: Transport / TCP Port 8443"
    nc -zv -w 2 127.0.0.1 8443 2>&1
    echo ""
    echo "## Layer 4: TLS Handshake & CA Validation"
    echo | openssl s_client -connect 127.0.0.1:8443 -servername app.teamX.test -CAfile "$REPO_ROOT/personB/tls/ca.crt" 2>/dev/null | grep -E "subject=|issuer=|Verification:|Verify return code:"
    echo ""
    echo "## Layer 5: HTTP Edge & Upstream"
    "$CURL_BIN" -sI --resolve app.teamX.test:8443:127.0.0.1 \
        --cacert "$REPO_ROOT/personB/tls/ca.crt" \
        https://app.teamX.test:8443/api/status
} > "$EXT_F_FILE"

grep -q "Verify return code: 0 (ok)" "$EXT_F_FILE"
grep -q "200 OK" "$EXT_F_FILE"
echo "✅ Extension F baseline verified -> $EXT_F_FILE"

echo ""
echo "🎉 All local non-sudo Phase 2 tests PASSED!"
