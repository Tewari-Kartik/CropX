#!/bin/bash
set -e

DOMAIN=${1:-"3-109-69-185.sslip.io"}
EMAIL=${2:-"admin@cropx.click"}
STAGING=${3:-0}

echo "=== SSL Management for domain: $DOMAIN ($EMAIL) ==="

RSA_KEY_SIZE=4096
DATA_PATH="./certbot"

# Check if we already have a valid Let's Encrypt cert in any live folder
if [ -f "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" ]; then
  echo "Found existing Let's Encrypt certificate for $DOMAIN. Activating in Nginx..."
  mkdir -p "$DATA_PATH/conf/live/cropx"
  cp -rfL "$DATA_PATH/conf/live/$DOMAIN/." "$DATA_PATH/conf/live/cropx/"
elif [ -f "$DATA_PATH/conf/live/cropx/fullchain.pem" ] && ! openssl x509 -in "$DATA_PATH/conf/live/cropx/fullchain.pem" -noout -subject | grep -q "localhost"; then
  echo "Found existing valid non-dummy certificate. Preserving..."
else
  echo "Generating temporary dummy certificate for initial Nginx startup..."
  mkdir -p "$DATA_PATH/conf/live/cropx"
  mkdir -p "$DATA_PATH/www"

  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout "$DATA_PATH/conf/live/cropx/privkey.pem" \
    -out "$DATA_PATH/conf/live/cropx/fullchain.pem" \
    -subj "/CN=localhost"
fi

echo "Ensuring Nginx is running..."
docker compose -f docker-compose.prod.yml up -d nginx

# If we don't have a real Let's Encrypt certificate for $DOMAIN, request one
if [ "$DOMAIN" != "localhost" ] && [ ! -f "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" ]; then
  echo "Requesting new Let's Encrypt certificate for $DOMAIN..."
  
  STAGING_ARG=""
  if [ "$STAGING" != "0" ]; then
    STAGING_ARG="--staging"
  fi

  docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
    certbot certonly --webroot -w /var/www/certbot \
      $STAGING_ARG \
      --email $EMAIL \
      -d $DOMAIN \
      --rsa-key-size $RSA_KEY_SIZE \
      --agree-tos \
      --force-renewal --non-interactive" certbot || true

  if [ -f "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "Copying live certificate into active Nginx path..."
    cp -rfL "$DATA_PATH/conf/live/$DOMAIN/." "$DATA_PATH/conf/live/cropx/"
    docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
  fi
elif [ -f "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" ]; then
  cp -rfL "$DATA_PATH/conf/live/$DOMAIN/." "$DATA_PATH/conf/live/cropx/"
  docker compose -f docker-compose.prod.yml exec nginx nginx -s reload || true
fi

echo "=== SSL Setup Completed for $DOMAIN ==="
