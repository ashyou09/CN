# Person A — Mac 1 (Private DNS Server + Test Client)

Runs the private DNS resolver (`dnsmasq`) representing a managed DNS service (such as AWS Route 53) for the Private Network Service Platform.

## Service Details
- **Role**: Private DNS Resolver + Test Client
- **Port**: `53` (UDP/TCP)
- **Domain Mappings**:
  - `app.teamX.test` → Mac 2 IP (Edge Nginx)
  - `api.teamX.test` → Mac 2 IP (Edge Nginx)

## Setup & Running DNS Server
```bash
cd personA/dns

# 1. Update config with Mac 2's IP and check dnsmasq installation
./setup_dns.sh <MAC2_IP>

# 2. Run dnsmasq in foreground with debug logging
sudo dnsmasq -C dnsmasq.conf -d
```

## Configuring Client Macs to use Mac 1 as DNS Resolver
On other Macs (Mac 2, Mac 3, Mac 4):
1. Open **System Settings** → **Network** → **Wi-Fi / Ethernet** → **Details...** → **DNS**.
2. Add `<MAC1_IP>` at the top of the DNS Servers list.
3. Verify with:
   ```bash
   dig @<MAC1_IP> app.teamX.test
   ```

## Running Client Verification
```bash
cd personA/client
./test.sh <MAC1_IP> app.teamX.test 8080 8443
```
