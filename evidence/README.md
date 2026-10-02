# Evidence Checklist & Directory Guide

This folder holds screenshots, Wireshark `.pcapng` packet captures, and terminal logs required for evaluation.

## Current Rishihood Learner run (2026-10-02)

- **LAN from Mac 1:** [network inventory](lan/mac1-network-inventory.txt) and three successful ping logs: [Mac 2](lan/mac1-to-mac2-ping.txt), [Mac 3](lan/mac1-to-mac3-ping.txt), [Mac 4](lan/mac1-to-mac4-ping.txt). The [ping matrix](../docs/machine-details.md) has A's row complete; B/C/D must supply the other nine directions.
- **DNS on Mac 1:** [app A answer](dns/mac1-rishihood-app-dig.txt), [API A answer](dns/mac1-rishihood-api-dig.txt), [resolver list](dns/mac1-rishihood-resolver.txt), [local AAAA handling](dns/mac1-local-aaaa-check.txt), and [queries received from B and D](dns/mac1-server-log-client-queries.txt). B and D still need to provide their own dig and resolver outputs.
- **A-side diagnostics pending ordinary client lookup:** [CA fingerprint](tls/mac1-ca-fingerprint-before-trust.txt), [verified edge certificate and HTTPS response with explicit CA](tls/mac1-edge-ca-diagnostic.txt), [both direct backends](load-balancing/mac1-direct-backend-checks.txt), [six HTTPS balancing responses with pinned DNS](load-balancing/mac1-https-balancing-ca-diagnostic.txt), and [cache headers plus 304](caching/mac1-cache-ca-diagnostic.txt). Repeat HTTPS without `--resolve` or `--cacert` after macOS resolver and CA trust are set.
- **Stage 8:** [Mac D capture instructions](wireshark/README.md) are ready. The `.pcap` and D's curl output are pending.

### Folders:
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
