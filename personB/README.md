# Person B — Mac 2 (Edge Reverse Proxy & Load Balancer)

Acts as the single entry point (Cloud Load Balancer / CDN Edge Node) for the Private Network Service Platform.

## Service Details
- **Role**: Edge Reverse Proxy, Round-Robin Load Balancer, and TLS Termination
- **HTTP Port**: `8080` (or `80`)
- **HTTPS Port**: `8443` (or `443`)
- **Upstream Backends**:
  - Backend A: `127.0.0.1:3001` (Local dev) / `PERSON_C_IP:3001` (LAN)
  - Backend B: `127.0.0.1:3002` (Local dev) / `PERSON_D_IP:3002` (LAN)

## Managing Nginx
```bash
cd personB/nginx

# Test configuration syntax
./start_nginx.sh test

# Start Nginx
./start_nginx.sh start

# Check status
./start_nginx.sh status

# Reload after config edits
./start_nginx.sh reload

# Stop Nginx
./start_nginx.sh stop
```

## TLS Setup
```bash
cd personB/tls
./generate_cert.sh app.teamX.test api.teamX.test
```
