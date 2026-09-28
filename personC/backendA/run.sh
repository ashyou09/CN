#!/usr/bin/env bash
# run.sh - Start Backend A on Port 3001
cd "$(dirname "$0")"

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting Backend A (Port 3001)..."
npm start
