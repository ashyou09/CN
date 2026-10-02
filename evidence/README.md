# Evidence Checklist & Directory Guide

This folder holds screenshots, Wireshark `.pcapng` packet captures, and terminal logs required for evaluation.

## Current Rishihood Learner run (2026-10-02)

- [Person A evidence](personA/README.md) contains Mac 1's LAN, DNS, TLS, balancing, and caching files.
- [Mac D capture instructions](wireshark/README.md) are ready. The `.pcap` and D's curl output are pending in this checkout.

### Folders:
- **`personA/`**: Mac 1 evidence, grouped by stage and including the earlier LAN's DNS logs.
- **`lan/`**:
  - `ping_matrix.png` / logs (pairwise reachability among Mac 1, 2, 3, 4).
  - `ifconfig_en0.png` for all 4 machines showing IP, subnet mask, and MAC address.
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
  - Screenshots/logs of the 5 required failure demonstrations:
    1. Wrong DNS server configured on client.
    2. DNS record pointing to wrong IP.
    3. One backend stopped (traffic routes to remaining backend).
    4. Both backends stopped (edge returns 502 Bad Gateway).
    5. Wrong destination port on client.
