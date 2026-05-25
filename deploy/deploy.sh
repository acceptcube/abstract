#!/usr/bin/env bash
# Deploy the static site to the VPS and serve it at the configured domain
# over HTTPS with a Let's Encrypt cert. Handles first time issuance:
#   1. Ship site files to /var/www/abstract.
#   2. If the cert does not exist yet, install a tiny HTTP only bootstrap
#      vhost, reload nginx, run certbot certonly --webroot to issue, then
#      install the full HTTPS vhost.
#   3. Reload nginx, verify.
#
# Idempotent. Re running deploys site updates only.
#
#   bash deploy/deploy.sh

set -euo pipefail

VPS="${VPS:-root@64.227.102.65}"
KEY="${KEY:-$HOME/.ssh/id_ed25519}"
DIR="${DIR:-/var/www/abstract}"
DOMAIN="${DOMAIN:-abstractart.guru}"
EMAIL="${EMAIL:-degencapital999@gmail.com}"
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new"

echo "==> build-site"
node scripts/build-site.js

echo "==> ship site/ -> $VPS:$DIR"
$SSH "$VPS" "mkdir -p $DIR/.well-known/acme-challenge"
tar czf - -C site . | $SSH "$VPS" "tar xzf - -C $DIR"

echo "==> ship nginx configs to /tmp"
tar czf - -C deploy nginx-abstract.conf nginx-abstract-bootstrap.conf | $SSH "$VPS" "tar xzf - -C /tmp"

echo "==> check for existing cert"
HAS_CERT=$($SSH "$VPS" "test -d /etc/letsencrypt/live/$DOMAIN && echo yes || echo no")
echo "    cert exists: $HAS_CERT"

if [ "$HAS_CERT" = "no" ]; then
  echo "==> first time: install HTTP only bootstrap vhost"
  $SSH "$VPS" "
    mv /tmp/nginx-abstract-bootstrap.conf /etc/nginx/sites-available/abstract
    ln -sf /etc/nginx/sites-available/abstract /etc/nginx/sites-enabled/abstract
    nginx -t && systemctl reload nginx && echo bootstrap-reloaded
  "
  echo "==> certbot certonly --webroot for $DOMAIN"
  $SSH "$VPS" "
    certbot certonly --webroot -w $DIR \\
      -d $DOMAIN -d www.$DOMAIN \\
      --non-interactive --agree-tos -m $EMAIL --quiet
    test -d /etc/letsencrypt/live/$DOMAIN && echo cert-issued
  "
else
  echo "    skipping certbot (cert already present, renewal handled by certbot timer)"
fi

echo "==> install final HTTPS vhost"
$SSH "$VPS" "
  mv /tmp/nginx-abstract.conf /etc/nginx/sites-available/abstract
  ln -sf /etc/nginx/sites-available/abstract /etc/nginx/sites-enabled/abstract
  rm -f /tmp/nginx-abstract-bootstrap.conf 2>/dev/null || true
  nginx -t && systemctl reload nginx && echo nginx-reloaded
"

echo "==> verify"
$SSH "$VPS" "
  curl -s -o /dev/null -w 'http  -> %{http_code} (expect 301)\n' http://$DOMAIN/
  curl -s -o /dev/null -w 'https -> %{http_code} %{content_type}\n' https://$DOMAIN/
  echo 'cert:'
  echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null | sed 's/^/  /'
"

echo "==> done: https://$DOMAIN"
