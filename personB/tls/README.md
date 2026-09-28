# TLS / HTTPS Configuration for Person B (Mac 2)

Generates and manages the local Root CA and TLS certificates for `app.teamX.test` and `api.teamX.test`.

## Files
- `generate_cert.sh`: Generates Root CA (`ca.key`, `ca.crt`) and Server Certificate (`server.key`, `server.crt`) with SAN (Subject Alternative Names).
- `ca.crt`: Root CA Certificate to install on client Macs.
- `server.crt` & `server.key`: Used by Nginx for TLS termination on port 8443 (or 443).

## Generating Certificates
```bash
./generate_cert.sh app.teamX.test api.teamX.test
```

## Adding Root CA to macOS Trust Store (No `-k` needed!)
Run on Mac 1, Mac 2, Mac 3, Mac 4:
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt
```
Alternatively, test curl using the CA file explicitly without bypassing validation:
```bash
curl --cacert ca.crt https://app.teamX.test:8443/api/status
```
