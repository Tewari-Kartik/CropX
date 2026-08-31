#!/bin/bash
set -e

DOMAIN=${1:-"cropx.click"}
EMAIL=${2:-"admin@cropx.click"}
STAGING=${3:-0} # Set to 1 if testing to avoid Let's Encrypt rate limits

echo "=== Initializing SSL for domain: $DOMAIN ($EMAIL) ==="

RSA_KEY_SIZE=4096
DATA_PATH="./certbot"

if [ -d "$DATA_PATH/conf/live/$DOMAIN" ]; then
  echo "Existing certificate found for $DOMAIN. Skipping dummy cert generation."
else
  echo "Generating dummy certificate for initial Nginx startup..."
  mkdir -p "$DATA_PATH/conf/live/cropx"
  mkdir -p "$DATA_PATH/www"

  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout "$DATA_PATH/conf/live/cropx/privkey.pem" \
    -out "$DATA_PATH/conf/live/cropx/fullchain.pem" \
    -subj "/CN=localhost"
fi

echo "Starting Nginx reverse proxy..."
docker compose -f docker-compose.prod.yml up --force-recreate -d nginx

if [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "cropx.click" ]; then
  echo "Requesting Let's Encrypt certificate for $DOMAIN..."
  
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
      --force-renewal --non-interactive" certbot

  echo "Copying live certificate into active Nginx path..."
  cp -rfL "$DATA_PATH/conf/live/$DOMAIN/." "$DATA_PATH/conf/live/cropx/"

  echo "Reloading Nginx with new certificate..."
  docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
fi

echo "=== SSL Setup Completed ==="
