# Evidence Checklist & Directory Guide (Evidence C - Person C / Mac 3)

This folder holds screenshots, Wireshark `.pcapng` packet captures, and terminal logs required for evaluation for Person C.

## Current Rishihood Learner run (2026-10-02)

- [Person C evidence](personC/README.md) contains Mac 3's LAN, Backend A, and client test files.
- [LAN ping results](lan/ping-from-C.txt) contains Mac 3's ping reachability to Mac 1, 2, and 4.

### Folders:
- **`personC/`**: Mac 3 evidence, grouped by stage.
- **`lan/`**:
  - `ping_matrix.png` / logs (pairwise reachability among Mac 1, 2, 3, 4).
  - `ifconfig_en0.png` showing IP (`10.7.6.84`), subnet mask, and MAC address.
- **`dns/`**:
  - Output of `dig @<MAC1_IP> app.teamX.test` and `dig @<MAC1_IP> api.teamX.test`.
  - Wireshark capture of DNS query and response (UDP port 53).
- **`load-balancing/`**:
  - Terminal output showing repeated `curl -i` requests alternating between `X-Backend: A` and `X-Backend: B`.
- **`tls/`**:
  - OpenSSL certificate details (`openssl x509 -in server.crt -text -noout`).
  - Terminal curl command over HTTPS (`https://app.teamX.test:8443`) verifying trust without `-k`.
- **`caching/`**:
  - Output showing `Cache-Control: public, max-age=60` and `ETag`.
  - Conditional GET request returning `HTTP/1.1 304 Not Modified`.
- **`wireshark/`**:
  - `.pcapng` export capturing: DNS query/response -> TCP 3-way handshake -> TLS handshake -> HTTP/1.1 data.
- **`failures/`**:
  - Screenshots/logs of the required failure demonstrations.
