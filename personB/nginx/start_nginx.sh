#!/usr/bin/env bash
# start_nginx.sh - Manage Nginx Edge Proxy for Person B (Mac 2)

DIR="$(cd "$(dirname "$0")" && pwd)"
NGINX_BIN="$(which nginx 2>/dev/null || echo "/opt/homebrew/bin/nginx")"
PID_FILE="$DIR/logs/nginx.pid"
CONF_FILE="$DIR/nginx.conf"

mkdir -p "$DIR/logs"

if [ ! -x "$NGINX_BIN" ]; then
    echo "❌ Error: nginx executable not found at '$NGINX_BIN'."
    echo "Please install it with: brew install nginx"
    exit 1
fi

ACTION="${1:-start}"

case "$ACTION" in
    start)
        if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            echo "⚠️ Nginx is already running (PID: $(cat "$PID_FILE"))."
            exit 0
        fi
        echo "Starting Nginx with config: $CONF_FILE ..."
        "$NGINX_BIN" -p "$DIR" -c "$CONF_FILE"
        if [ $? -eq 0 ]; then
            echo "✅ Nginx started on port 8080 (PID: $(cat "$PID_FILE"))."
        else
            echo "❌ Failed to start Nginx. Check logs at $DIR/logs/error.log"
        fi
        ;;

    stop)
        if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            echo "Stopping Nginx (PID: $(cat "$PID_FILE"))..."
            "$NGINX_BIN" -p "$DIR" -c "$CONF_FILE" -s stop
            rm -f "$PID_FILE"
            echo "✅ Nginx stopped."
        else
            echo "Nginx is not running."
        fi
        ;;

    reload)
        if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            echo "Reloading Nginx configuration..."
            "$NGINX_BIN" -p "$DIR" -c "$CONF_FILE" -s reload
            echo "✅ Nginx reloaded."
        else
            echo "❌ Nginx is not running. Use '$0 start' instead."
        fi
        ;;

    test)
        echo "Testing Nginx configuration syntax..."
        "$NGINX_BIN" -p "$DIR" -c "$CONF_FILE" -t
        ;;

    status)
        if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            echo "🟢 Nginx is running (PID: $(cat "$PID_FILE"))."
        else
            echo "🔴 Nginx is stopped."
        fi
        ;;

    *)
        echo "Usage: $0 {start|stop|reload|restart|test|status}"
        exit 1
        ;;
esac
