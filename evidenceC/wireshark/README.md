# Stage 8 capture on Mac 4 (Person D)

Run this after Mac 4 resolves `app.teamX.test` through Mac 1 and trusts the verified TeamX CA. Mac 4 is currently `10.7.17.147`; Mac 1 DNS is `10.7.17.94`; Mac 2 edge is `10.7.3.128`.

1. On D, use `route -n get default` to confirm the active interface. From the `CN` root, start the capture in one terminal, replacing `en0` if needed:

   ```bash
   sudo tcpdump -i en0 -n -s 0 -w evidence/wireshark/phase1-flow-D.pcap 'udp port 53 or tcp port 53 or tcp port 8443'
   ```

2. In a second D terminal, issue exactly one explicit DNS query and one trusted HTTPS request:

   ```bash
   dig @10.7.17.94 app.teamX.test A | tee evidence/wireshark/mac4-dig.txt
   curl --tls-max 1.2 -v https://app.teamX.test:8443/api/status 2>&1 | tee evidence/wireshark/mac4-curl-tls12.txt
   ```

3. Stop `tcpdump` with Ctrl+C. Keep the `.pcap` and both text files. The curl command must succeed without `-k`; if it fails, fix D's ordinary DNS lookup or CA trust and repeat the capture.

Person A will review the actual packets and record the DNS query/reply, TCP SYN/SYN-ACK/ACK, TLS handshake, encrypted application data, IPs, ports, and packet numbers. Do not label HTTP request headers as visible inside encrypted TLS packets.
