#!/usr/bin/env bash
# run.sh - Start Backend B on Port 3002
cd "$(dirname "$0")"

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting Backend B (Port 3002)..."
npm start
