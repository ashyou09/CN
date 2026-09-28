#!/usr/bin/env bash
# test.sh - Mac 4 Test Client Script
# Tests direct backend access, reverse proxy, round-robin load balancing, and caching.

TARGET="${1:-http://localhost:8080}"
COUNT="${2:-6}"

echo "========================================="
echo "🧪 Running Network Client Tests on $TARGET"
echo "========================================="

echo ""
echo "--- 1. Testing Root Endpoint (GET /) ---"
curl -s -i "$TARGET/"
echo ""

echo ""
echo "--- 2. Testing Status Endpoint (GET /api/status) ---"
curl -s -i "$TARGET/api/status"
echo ""

echo ""
echo "--- 3. Testing Round-Robin Load Balancing ($COUNT requests) ---"
for i in $(seq 1 $COUNT); do
    BACKEND_HEADER=$(curl -s -i "$TARGET/api/status" | grep -i "x-backend:" | tr -d '\r')
    echo "Request $i: $BACKEND_HEADER"
done

echo ""
echo "--- 4. Testing HTTP Caching (Task F: Cache-Control & ETag 304) ---"
RES_HEADERS=$(curl -s -i "$TARGET/api/cached")
ETAG=$(echo "$RES_HEADERS" | grep -i "etag:" | awk '{print $2}' | tr -d '\r')
echo "$RES_HEADERS" | grep -E -i "(x-backend|cache-control|etag)"

if [ -n "$ETAG" ]; then
    echo ""
    echo "Sending conditional request with If-None-Match: $ETAG"
    COND_RESP=$(curl -s -i -H "If-None-Match: $ETAG" "$TARGET/api/cached")
    echo "$COND_RESP" | head -n 5
fi

echo "========================================="
echo "✅ Test script completed."
