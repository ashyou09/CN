#!/usr/bin/env bash
# run_demo.sh - 1-Click Launch for CN Demonstration Dashboard
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=5050

echo "=========================================================="
echo "🚀 Launching CN Phase 1 Live Demonstration Dashboard..."
echo "=========================================================="

# Do not terminate another process that happens to own the demo port.
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $PORT is already in use. Open http://localhost:$PORT or stop that process first."
    exit 1
fi

# Start the demo server
echo "Starting Node.js server on port $PORT..."
node "$DIR/server.js" &
SERVER_PID=$!

sleep 1

# Open in default macOS browser
echo "Opening dashboard in browser..."
open "http://localhost:$PORT"

echo ""
echo "=========================================================="
echo "✅ Dashboard is running at: http://localhost:$PORT"
echo "Press Ctrl+C to stop the demo server."
echo "=========================================================="

# Wait for Ctrl+C
trap "echo 'Stopping demo server...'; kill $SERVER_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait $SERVER_PID
