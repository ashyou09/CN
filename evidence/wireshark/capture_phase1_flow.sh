#!/usr/bin/env bash
# capture_phase1_flow.sh - Stage 8 (Task G) Packet Capture Script for Person D
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
INTERFACE="${1:-en0}"
PCAP_FILE="$DIR/phase1-flow.pcap"

echo "=========================================================="
echo "📡 Starting Stage 8 Packet Capture on $INTERFACE..."
echo "Filters: udp port 53 or tcp port 53 or tcp port 8443"
echo "Output: $PCAP_FILE"
echo "Press Ctrl+C when finished sending requests."
echo "=========================================================="

sudo tcpdump -i "$INTERFACE" -n -s 0 -w "$PCAP_FILE" 'udp port 53 or tcp port 53 or tcp port 8443'
