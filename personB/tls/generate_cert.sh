#!/usr/bin/env bash
# generate_cert.sh - Generate Local CA and TLS Certificates for app.teamX.test
# Supports SAN (Subject Alternative Names) for app.teamX.test and api.teamX.test

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

DOMAIN="${1:-app.teamX.test}"
ALT_DOMAIN="${2:-api.teamX.test}"

echo "========================================="
echo "🔐 Generating TLS Certificates for $DOMAIN and $ALT_DOMAIN"
echo "========================================="

# 1. Generate Root CA Key and Certificate
if [ ! -f "ca.key" ] || [ ! -f "ca.crt" ]; then
    echo "Creating Root Certificate Authority (CA)..."
    openssl genrsa -out ca.key 2048
    openssl req -x509 -new -nodes -key ca.key -sha256 -days 365 \
        -subj "/C=IN/ST=Karnataka/L=Bengaluru/O=TeamX/OU=NetworkLab/CN=TeamX Local CA" \
        -out ca.crt
    echo "✅ Root CA created: ca.crt, ca.key"
else
    echo "ℹ️ Existing Root CA found. Reusing ca.crt and ca.key."
fi

# 2. Generate Server Private Key
echo "Generating server private key..."
openssl genrsa -out server.key 2048

# 3. Create OpenSSL configuration for SAN (Subject Alternative Name)
cat > server.ext <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = $ALT_DOMAIN
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

# 4. Generate Certificate Signing Request (CSR)
openssl req -new -key server.key \
    -subj "/C=IN/ST=Karnataka/L=Bengaluru/O=TeamX/OU=NetworkLab/CN=$DOMAIN" \
    -out server.csr

# 5. Sign the server certificate with our Root CA
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out server.crt -days 365 -sha256 -extfile server.ext

echo "========================================="
echo "✅ TLS Certificate generated successfully:"
echo "   • Server Certificate: $DIR/server.crt"
echo "   • Server Private Key: $DIR/server.key"
echo "   • Root CA:            $DIR/ca.crt"
echo "========================================="
echo ""
echo "To trust the Root CA on macOS (so curl works without -k):"
echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt"
echo ""
