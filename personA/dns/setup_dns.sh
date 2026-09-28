#!/usr/bin/env bash
# setup_dns.sh - Configure and run dnsmasq on Mac 1 (Person A)

DIR="$(cd "$(dirname "$0")" && pwd)"
CONF_FILE="$DIR/dnsmasq.conf"

MAC2_IP="${1:-127.0.0.1}"

echo "========================================="
echo "🌐 Configuring DNS Server on Mac 1"
echo "Target Edge Proxy (Mac 2) IP: $MAC2_IP"
echo "========================================="

# Update IP in dnsmasq.conf
sed -i '' -E "s|address=/app.teamX.test/.*|address=/app.teamX.test/$MAC2_IP|" "$CONF_FILE"
sed -i '' -E "s|address=/api.teamX.test/.*|address=/api.teamX.test/$MAC2_IP|" "$CONF_FILE"

echo "Updated $CONF_FILE with:"
grep "address=" "$CONF_FILE"
echo ""

if ! command -v dnsmasq &>/dev/null; then
    echo "dnsmasq is not installed. Installing via Homebrew..."
    brew install dnsmasq
fi

echo "To start dnsmasq in foreground for testing (requires sudo for port 53):"
echo "  sudo dnsmasq -C $CONF_FILE -d"
echo ""
echo "To test DNS resolution from any client Mac:"
echo "  dig @<MAC1_IP> app.teamX.test"
echo "========================================="
