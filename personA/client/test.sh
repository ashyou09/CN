#!/usr/bin/env bash
# test.sh - Client Test Script for Person A (Mac 1)
# Tests DNS resolution, HTTP/HTTPS connectivity, load balancing, and caching.

DNS_SERVER="${1:-127.0.0.1}"
DOMAIN="${2:-app.teamX.test}"
PORT="${3:-8080}"
HTTPS_PORT="${4:-8443}"

echo "========================================="
echo "🔍 1. Testing DNS Resolution via $DNS_SERVER"
echo "========================================="
dig @"$DNS_SERVER" "$DOMAIN" +short || nslookup "$DOMAIN" "$DNS_SERVER"

echo ""
echo "========================================="
echo "🔄 2. Testing HTTP Load Balancing (Port $PORT)"
echo "========================================="
for i in {1..6}; do
    HDR=$(curl -s -i "http://$DOMAIN:$PORT/api/status" 2>/dev/null | grep -i "x-backend:" | tr -d '\r')
    echo "Request $i: $HDR"
done

echo ""
echo "========================================="
echo "🔒 3. Testing HTTPS Connection (Port $HTTPS_PORT)"
echo "========================================="
curl -i "https://$DOMAIN:$HTTPS_PORT/api/status"

echo ""
echo "========================================="
echo "⚡ 4. Testing HTTP Caching Header"
echo "========================================="
curl -s -i "http://$DOMAIN:$PORT/api/cached" | grep -E -i "(x-backend|cache-control|etag)"
echo "========================================="
