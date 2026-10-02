# Person A evidence

## Rishihood Learner Wi-Fi (2026-10-02)

- **LAN:** [Mac 1 inventory](lan/mac1-network-inventory.txt) and three successful ping logs: [to B](lan/mac1-to-mac2-ping.txt), [to C](lan/mac1-to-mac3-ping.txt), [to D](lan/mac1-to-mac4-ping.txt). The [ping matrix](../../docs/machine-details.md) has A's row complete; B/C/D must supply the other nine directions.
- **DNS:** [app A answer](dns/mac1-rishihood-app-dig.txt), [API A answer](dns/mac1-rishihood-api-dig.txt), [resolver list](dns/mac1-rishihood-resolver.txt), [local AAAA handling](dns/mac1-local-aaaa-check.txt), and [queries received from B and D](dns/mac1-server-log-client-queries.txt). Client-side dig and resolver outputs from B and D are still needed.
- **TLS and edge diagnostics:** [CA fingerprint](tls/mac1-ca-fingerprint-before-trust.txt), [verified edge certificate and HTTPS response with explicit CA](tls/mac1-edge-ca-diagnostic.txt), [direct backend checks](load-balancing/mac1-direct-backend-checks.txt), [edge HTTP check](load-balancing/mac1-edge-http-diagnostic.txt), [six HTTPS balancing responses with pinned DNS](load-balancing/mac1-https-balancing-ca-diagnostic.txt), and [cache headers plus 304](caching/mac1-cache-ca-diagnostic.txt). An [earlier balancing diagnostic](load-balancing/mac1-https-balancing-diagnostic.txt) records transient timeouts before both backends responded. Repeat HTTPS without `--resolve` or `--cacert` after A's macOS resolver and CA trust are configured.

## Earlier LAN

The previous Mac 1 DNS checks at `10.124.23.210` are retained for provenance: [app](dns/mac1-app-dig.txt), [API](dns/mac1-api-dig.txt), [resolver address](dns/mac1-resolver.txt), and [Wi-Fi DNS list before the current network update](dns/mac1-wifi-dns-before-task-b.txt). The active Rishihood Learner addresses are documented above.
