# Phase 1 project flow — Private Network Service Platform

This is the execution runbook for **Phase 1 only**. Follow the numbered stages in order on four macOS laptops connected to one private LAN. Person A/B/C/D match the existing folders in this repository. Phase 2 backup DNS, TTL cutover, backend firewall rules, and standby edge are outside this runbook. The five deliberate faults listed under the course's **Phase 1 required failure demonstrations** are included.

## 0. Assign machines and prepare the shared values (everyone)

| Person | Mac | Primary job | Runs | Keeps evidence for |
| --- | --- | --- | --- | --- |
| A | Mac 1 | DNS lead and client | `dnsmasq`, `dig`, `curl` | LAN, DNS, first client checks |
| B | Mac 2 | Edge and TLS lead | `nginx`, certificates | nginx, TLS, proxy logs |
| C | Mac 3 | Backend A lead | Node app on `3001` | backend A and reachability |
| D | Mac 4 | Backend B and capture lead | Node app on `3002`, `curl`, Wireshark/tcpdump | client flow, caching, balancing, packets |

Each person needs a copy of `CN` on their own Mac. Commands below assume the terminal is at the repository root (`cd /path/to/CN`). Keep services running in their own terminal tabs. Install Homebrew, Node.js, nginx, dnsmasq, and Wireshark only on machines that need them. Check before installing:

```bash
command -v brew
command -v node
command -v npm
command -v curl
command -v dig
```

After Stage 1 discovers the addresses, use the same actual LAN addresses in all config files and tests. In every new terminal, set the values for your team, for example:

```bash
export MAC1_IP="192.168.1.11"   # Person A, DNS
export MAC2_IP="192.168.1.12"   # Person B, edge
export MAC3_IP="192.168.1.13"   # Person C, backend A
export MAC4_IP="192.168.1.14"   # Person D, backend B
export DOMAIN="app.teamX.test"
export API_DOMAIN="api.teamX.test"
export HTTPS_PORT="8443"
export HTTP_PORT="8080"
```

The repository is already configured for `app.teamX.test` and `api.teamX.test`. Keep these names for the demo unless the team changes **DNS records, nginx `server_name`, and certificate SANs together**. Port `8443` is the HTTPS port in the current config, so the demo URL is `https://app.teamX.test:8443/`. Port `443` needs a config change and elevated binding privileges. Commands using direct IP addresses below are **diagnostic checks**; the final user request must use the domain name.

## 1. Establish and record the LAN — Task A (everyone; A consolidates)

1. Connect all four Macs to the same lab Wi-Fi/router/hotspot. Avoid guest networks with client isolation. Each person finds the active interface and records its values:

   ```bash
   route -n get default
   networksetup -listallhardwareports
   ipconfig getifaddr en0
   ipconfig getoption en0 subnet_mask
   ifconfig en0
   ```

   Replace `en0` with the active interface from `route -n get default`. In `ifconfig`, record the `ether` address. Record the gateway from `route -n get default`. Enter hostname, interface, IPv4, mask/prefix, gateway, MAC address, role, and ports in [`docs/machine-details.md`](docs/machine-details.md). Person A updates [`docs/topology.md`](docs/topology.md) with the actual IPs.

2. **Every person** pings the other three Macs. For example, A runs:

   ```bash
   ping -c 3 "$MAC2_IP"
   ping -c 3 "$MAC3_IP"
   ping -c 3 "$MAC4_IP"
   ```

   B, C, and D repeat from their own Mac to each of the other addresses. Fill all 12 off-diagonal cells in the ping matrix. If pings fail, fix Wi-Fi isolation, address mistakes, or firewall settings before continuing. Save terminal output/screenshots under `evidence/lan/`.

**Gate:** Every machine has a recorded address and can reach the other three over the LAN.

## 2. Start backend A — Task C (Person C, Mac 3)

1. Install Node.js if needed (`brew install node`). From the `CN` root, install the locked dependencies and start A:

   ```bash
   cd personC/backendA
   npm ci
   npm start
   ```

2. In another terminal on C, confirm the listener and endpoints:

   ```bash
   lsof -nP -iTCP:3001 -sTCP:LISTEN
   curl -i http://localhost:3001/
   curl -i http://localhost:3001/api/status
   ```

3. From B, verify A is reachable across the LAN:

   ```bash
   curl -i "http://$MAC3_IP:3001/api/status"
   ```

   The JSON must report `backend: A`, `status: ok`, and the response must contain `X-Backend: A`. The app already binds to `0.0.0.0`; if only local curl works, investigate C's firewall/LAN before configuring nginx.

## 3. Start backend B — Task C (Person D, Mac 4)

1. Install Node.js if needed (`brew install node`). From the `CN` root:

   ```bash
   cd personD/backendB
   npm ci
   npm start
   ```

2. On D, verify the port and endpoints:

   ```bash
   lsof -nP -iTCP:3002 -sTCP:LISTEN
   curl -i http://localhost:3002/
   curl -i http://localhost:3002/api/status
   ```

3. From B, verify cross-machine access:

   ```bash
   curl -i "http://$MAC4_IP:3002/api/status"
   ```

   Expect `X-Backend: B`. C and D keep their Node processes running. Save a local and a remote response for each backend under `evidence/load-balancing/`.

**Gate:** B can independently reach A on `MAC3_IP:3001` and B on `MAC4_IP:3002`.

## 4. Configure the edge and load balancer — Task D (Person B, Mac 2)

1. Install nginx if necessary (`brew install nginx`). Edit [`personB/nginx/nginx.conf`](personB/nginx/nginx.conf). In `upstream backend_pool`, replace the two `127.0.0.1` entries with the actual IPs:

   ```nginx
   upstream backend_pool {
       server 192.168.1.13:3001 max_fails=3 fail_timeout=5s;
       server 192.168.1.14:3002 max_fails=3 fail_timeout=5s;
   }
   ```

   Use your recorded C and D addresses, not the example values. nginx uses round robin by default. Its current HTTP listener is `8080` and HTTPS listener is `8443`.

2. Check the `mime.types` path in that file. It currently says `/opt/homebrew/etc/nginx/mime.types` (Apple Silicon). On an Intel Mac, run `brew --prefix` and change the include to that prefix's `etc/nginx/mime.types`, commonly `/usr/local/etc/nginx/mime.types`.

3. Test, start, and inspect nginx from the repository root:

   ```bash
   ./personB/nginx/start_nginx.sh test
   ./personB/nginx/start_nginx.sh start
   ./personB/nginx/start_nginx.sh status
   lsof -nP -iTCP:8080 -sTCP:LISTEN
   lsof -nP -iTCP:8443 -sTCP:LISTEN
   ```

   After edits use `./personB/nginx/start_nginx.sh test` and then `./personB/nginx/start_nginx.sh reload`. If startup fails, read `personB/nginx/logs/error.log`.

4. Before DNS is ready, B can test the proxy by sending the expected Host header to the edge IP:

   ```bash
   curl -i -H 'Host: app.teamX.test' "http://$MAC2_IP:8080/api/status"
   ```

   Repeat it several times and look for both `X-Backend: A` and `X-Backend: B`. This is a diagnostic smoke test; the later client demo uses the domain.

**Gate:** nginx returns successful responses from both backend addresses. If the result is `502`, first repeat B's direct backend checks from Stages 2–3.

## 5. Start private DNS and configure clients — Task B (Person A leads)

1. On A, install dnsmasq if needed (`brew install dnsmasq`). From `CN`, update the two A records in [`personA/dns/dnsmasq.conf`](personA/dns/dnsmasq.conf) to Mac 2's address using the existing script:

   ```bash
   ./personA/dns/setup_dns.sh "$MAC2_IP"
   rg '^address=' personA/dns/dnsmasq.conf
   dnsmasq --test -C personA/dns/dnsmasq.conf
   ```

   Both `app.teamX.test` and `api.teamX.test` must point to `MAC2_IP`. Make sure port 53 is free (`sudo lsof -nP -iUDP:53 -iTCP:53`). If a Homebrew dnsmasq service is already running, stop that instance before starting this foreground config; do not run two resolvers on the same port.

2. On A, start dnsmasq and leave the terminal open:

   ```bash
   sudo dnsmasq -C personA/dns/dnsmasq.conf -d
   ```

3. From D and at least one other Mac, query A explicitly:

   ```bash
   dig @"$MAC1_IP" app.teamX.test A
   dig @"$MAC1_IP" api.teamX.test A
   ```

   In the `ANSWER SECTION`, both names must return `MAC2_IP`, and `SERVER` must show `MAC1_IP#53`.

4. On A, B, C, and D, set the Wi-Fi/Ethernet network service's DNS server to `MAC1_IP` so both designated client Macs can browse by name. In macOS: **System Settings → Network → active service → Details → DNS**. Record the original DNS values first so they can be restored later. CLI alternative, after checking the exact service name with `networksetup -listallnetworkservices`:

   ```bash
   networksetup -getdnsservers "Wi-Fi"
   sudo networksetup -setdnsservers "Wi-Fi" "$MAC1_IP" 8.8.8.8 8.8.4.4
   scutil --dns
   dig app.teamX.test A
   ```

   The command above retains A's existing `8.8.8.8` and `8.8.4.4`; on other Macs, append their own recorded DNS entries instead. Replace `"Wi-Fi"` if the active service is named differently. D must also confirm ordinary system lookup through `curl` in Stage 7. `dig @MAC1_IP` proves A answers; `dig` without `@` plus `scutil --dns` help check the client resolver configuration. Save both outputs in `evidence/dns/`.

   If `dig` succeeds but `curl` or `dscacheutil -q host -a name app.teamX.test` cannot resolve the name, check whether macOS is sending the private name to a public DNS server. Keep the existing DNS entries and add a domain-specific resolver after checking that `/etc/resolver/teamX.test` does not already exist:

   ```bash
   sudo mkdir -p /etc/resolver
   printf 'nameserver %s\n' "$MAC1_IP" | sudo tee /etc/resolver/teamX.test
   scutil --dns
   dscacheutil -q host -a name app.teamX.test
   ```

**Gate:** At least two other Macs use A as resolver and resolve both private names to Mac 2.

## 6. Prepare and trust TLS — Task E (Person B leads; A and D install trust)

1. On B, inspect the existing local CA and server certificate. Regenerate if they are expired, use different names, or do not match the team's chosen domain:

   ```bash
   openssl x509 -in personB/tls/server.crt -noout -dates -subject -ext subjectAltName
   openssl verify -CAfile personB/tls/ca.crt personB/tls/server.crt
   ```

   The repository's `generate_cert.sh` creates a **local CA and CA-signed server certificate**, with `app.teamX.test` and `api.teamX.test` in the SAN. If regeneration is needed, on B run:

   ```bash
   ./personB/tls/generate_cert.sh app.teamX.test api.teamX.test
   ./personB/nginx/start_nginx.sh test
   ./personB/nginx/start_nginx.sh reload
   ```

   A regenerated CA certificate must be redistributed and trusted again. Give clients **only `ca.crt`**; keep `ca.key` and `server.key` on B. The current repository tracks both private keys, so treat this checkout as private and remove/rotate those keys before publishing the project publicly.

2. Transfer `personB/tls/ca.crt` from B to A and D (and C if it will browse the site), for example with AirDrop or a trusted LAN copy. On each client Mac, from the directory containing the copied certificate:

   ```bash
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt
   ```

   The team must verify the certificate fingerprint out of band before trusting it. Safari/Chrome normally use the macOS trust store; if a browser uses its own certificate store, import this CA there as well.

3. On D, use the domain and check that curl validates the server without `-k`:

   ```bash
   curl -v "https://$DOMAIN:$HTTPS_PORT/"
   curl -i "https://$API_DOMAIN:$HTTPS_PORT/api/status"
   ```

   Look for a successful TLS verification and HTTP response. The address in the URL must be the private name; the certificate SAN must match it. Open the same HTTPS URL in the browser and confirm no warning. Save certificate details and curl/browser results in `evidence/tls/`.

**Gate:** HTTPS by name works from D and A without bypassing certificate validation.

## 7. Show HTTPS balancing and HTTP caching — Tasks D and F (Person D; A repeats)

1. From D, run six separate HTTPS requests. Each new `curl` process opens a new client connection; note the returned backend header:

   ```bash
   for i in 1 2 3 4 5 6; do
     curl -sS -D - -o /dev/null "https://$DOMAIN:$HTTPS_PORT/api/status" | \
       awk -v n="$i" 'BEGIN {printf "Request %s: ", n} tolower($1)=="x-backend:" {print $2}'
   done
   ```

   Expect both A and B, usually alternating with no other concurrent traffic. Round robin is shared across all traffic, so exact A/B order may shift. A repeats from Mac 1. Save the headers in `evidence/load-balancing/`. The client knows only `app.teamX.test` and Mac 2's IP; nginx chooses the backend.

2. Show the cache headers and a conditional response from D:

   ```bash
   curl -I "https://$DOMAIN:$HTTPS_PORT/api/cached"
   curl -sS -D /tmp/cn-cache-headers.txt -o /dev/null "https://$DOMAIN:$HTTPS_PORT/api/cached"
   cat /tmp/cn-cache-headers.txt
   ```

   Copy the exact `ETag` value shown in the headers, including quotes, into this next command:

   ```bash
   export ETAG='PASTE_ETAG_HERE'
   curl -i -H "If-None-Match: $ETAG" "https://$DOMAIN:$HTTPS_PORT/api/cached"
   ```

   Expect `Cache-Control: public, max-age=60`, `ETag`, and `HTTP/1.1 304 Not Modified` for the conditional request. Both backend implementations return the same static cached body, so their ETags should match. A plain `curl` does **not** maintain a browser cache between runs; use browser Developer Tools to show a fresh cache hit if desired. Save the headers and 304 output in `evidence/caching/`.

**Gate:** Repeated HTTPS requests show A and B, and the cached endpoint demonstrates cache headers plus a 304.

## 8. Capture one complete request — Task G (Person D captures; A/B help explain)

1. On D, identify the active LAN interface from `route -n get default`. Open Wireshark on that interface, or start a pcap capture in a second terminal:

   ```bash
   sudo tcpdump -i en0 -n -s 0 -w evidence/wireshark/phase1-flow.pcap 'udp port 53 or tcp port 53 or tcp port 8443'
   ```

   Replace `en0` with D's active interface. Open the resulting `.pcap` file in Wireshark. Keep capture running for the next step and stop with Ctrl+C afterward.

2. In another D terminal, issue an explicit DNS query and one new HTTPS request:

   ```bash
   dig @"$MAC1_IP" "$DOMAIN" A
   curl --tls-max 1.2 -v "https://$DOMAIN:$HTTPS_PORT/api/status"
   ```

   TLS 1.2 is selected here so Wireshark can show the server Certificate and ChangeCipherSpec messages clearly. The normal service may also support TLS 1.3, whose Certificate message is encrypted and whose ChangeCipherSpec may be absent or only a compatibility record. Do not claim that HTTPS request headers are readable in the capture; show them with `curl -v` or browser Developer Tools.

3. In Wireshark, locate and annotate:

   - `dns`: D's UDP source port → A's UDP/53 query; reply contains B's A record.
   - `tcp.port == 8443`: D's ephemeral TCP source port → B's TCP/8443; SYN, SYN-ACK, ACK occur before TLS.
   - `tls`: ClientHello, ServerHello, Certificate, ChangeCipherSpec/Finished in the TLS 1.2 trace, followed by encrypted Application Data.
   - A TCP packet's sequence and acknowledgement numbers. Explain that ACKs confirm received bytes and sequence numbers support ordered, reliable delivery.

   Record source/destination IPs, ports, packet numbers, and screenshots in `evidence/wireshark/`. Capture B→C/D backend traffic separately if you want to prove that nginx starts a **second TCP connection** to `3001` or `3002`; the client↔edge TLS capture alone does not show that hop. In the report, map DNS and HTTP to application, TCP/UDP to transport, IP to network, and Wi-Fi/Ethernet to link; describe TLS as securing application data over TCP.

**Gate:** One saved capture plus curl output supports the DNS → TCP → TLS → encrypted HTTP request story.

## 9. Deliberate Phase 1 failure demonstrations (A/B/C/D coordinate)

Take a screenshot or save output for each case under `evidence/failures/`. Change **one thing at a time**, observe, then restore it before the next case. These are the five failure cases called out in the course's Phase 1 section; Phase 2 resilience extensions remain for later.

| Order | Owner and action | Commands/evidence | Expected layer diagnosis and restore |
| --- | --- | --- | --- |
| 1 | D points the active network service to a wrong resolver, such as `127.0.0.1` if D has no DNS listener. | `sudo networksetup -setdnsservers "Wi-Fi" 127.0.0.1`; `dig app.teamX.test`; `ping -c 1 "$MAC2_IP"` | Name lookup fails while IP reachability remains. Restore with `sudo networksetup -setdnsservers "Wi-Fi" "$MAC1_IP"` and recheck. |
| 2 | A changes the project DNS record to C's IP. Stop foreground dnsmasq with Ctrl+C first. | `./personA/dns/setup_dns.sh "$MAC3_IP"`; restart `sudo dnsmasq -C personA/dns/dnsmasq.conf -d`; D runs `dig @"$MAC1_IP" "$DOMAIN" A` and HTTPS curl by name. | DNS succeeds but sends clients to a host without the edge HTTPS service. Restore A's record with `./personA/dns/setup_dns.sh "$MAC2_IP"`, restart dnsmasq, then on D run `sudo dscacheutil -flushcache` and `sudo killall -HUP mDNSResponder` before rechecking. |
| 3 | C stops backend A with Ctrl+C. | D repeats `curl -i "https://$DOMAIN:$HTTPS_PORT/api/status"` several times and checks `X-Backend`. | nginx should retry/mark A failed and serve B. The first request may be slower while A is detected as unavailable. Restart A with `cd personC/backendA && npm start`, wait for `fail_timeout`, and show A and B again. |
| 4 | C and D stop both backend processes with Ctrl+C. | D runs `dig @"$MAC1_IP" "$DOMAIN" A` and `curl -i "https://$DOMAIN:$HTTPS_PORT/api/status"`. | DNS and edge TLS can still succeed; nginx returns `502 Bad Gateway` because no upstream works. Restart both backends and recheck. |
| 5 | D tries a wrong edge port while B remains reachable. | `ping -c 1 "$MAC2_IP"`; `nc -vz "$MAC2_IP" 8444`; `curl --connect-timeout 3 -v "https://$DOMAIN:8444/api/status"` | IP reachability is present, but TCP to the wrong destination port fails or times out. Restore by using `8443`. |

For case 2, use an address you control and verify it is not running HTTPS on `8443`. For case 1, substitute the actual network service name if it is not `Wi-Fi`. Avoid leaving a client with broken DNS after the demo.

## 10. Assemble the Phase 1 review pack (everyone; A integrates)

1. **A:** Finish [`docs/machine-details.md`](docs/machine-details.md), [`docs/topology.md`](docs/topology.md), DNS config, and `evidence/lan/` + `evidence/dns/`.
2. **B:** Include the edited nginx config, certificate generation/trust notes, certificate SAN/verification output, and `evidence/tls/`.
3. **C and D:** Include both backend source folders, launch commands, and backend response output. **D** adds balancing, caching, and packet files.
4. **Everyone:** Review the five fault observations and be ready to explain what failed at DNS, TCP, TLS, or application layer. The evaluator should find each file in under 30 seconds; use descriptive names such as `dns-client-D.txt`, `tls12-handshake.pcap`, and `backend-A-stopped.txt`.
5. Rehearse the Phase 1 portion of the live demo in this order: IP/topology → all-pair ping → DNS from client → trusted HTTPS by name → A/B balancing → packet capture → cache header and 304 → controlled failures → individual explanation.

**Phase 1 completion check:** A client resolves `app.teamX.test` through A, connects to B over validated HTTPS, receives responses from both C and D, and the team can explain the evidence for each network step. Then freeze the Phase 1 evidence and begin Phase 2 separately.
