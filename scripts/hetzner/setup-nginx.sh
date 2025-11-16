#!/bin/bash
# ========================================
# Script: Configuración de Nginx + TLS para Clousadmin
# ========================================
# Uso:
#   ./scripts/hetzner/setup-nginx.sh --domain app.tuempresa.com --email ops@tuempresa.com
# Opcionales:
#   --upstream http://127.0.0.1:3000
#   --skip-certbot

set -e

DOMAIN=""
EMAIL=""
UPSTREAM="http://127.0.0.1:3000"
SKIP_CERTBOT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --upstream)
            UPSTREAM="$2"
            shift 2
            ;;
        --skip-certbot)
            SKIP_CERTBOT=true
            shift
            ;;
        *)
            echo "⚠️  Flag desconocida: $1"
            echo "Uso: $0 --domain app.tuempresa.com --email ops@tuempresa.com [--upstream http://127.0.0.1:3000] [--skip-certbot]"
            exit 1
            ;;
    esac
done

if [[ -z "$DOMAIN" ]]; then
    echo "❌ Debes indicar --domain"
    exit 1
fi

if [[ "$SKIP_CERTBOT" == false && -z "$EMAIL" ]]; then
    echo "❌ Debes indicar --email para ejecutar certbot (o usa --skip-certbot)"
    exit 1
fi

if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "⚠️  Este script está pensado para Ubuntu/Debian en Hetzner"
    exit 1
fi

if ! sudo -n true 2>/dev/null; then
    echo "❌ Necesitas permisos sudo sin password"
    exit 1
fi

echo "📦 Instalando Nginx + Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

CONFIG_PATH="/etc/nginx/sites-available/clousadmin"

echo "📝 Creando configuración Nginx en $CONFIG_PATH"
sudo tee "$CONFIG_PATH" >/dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 15m;

    location / {
        proxy_pass ${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "🔗 Activando sitio..."
sudo ln -sf "$CONFIG_PATH" /etc/nginx/sites-enabled/clousadmin

echo "🔍 Probando configuración..."
sudo nginx -t

echo "🔄 Recargando Nginx..."
sudo systemctl reload nginx

if [[ "$SKIP_CERTBOT" == false ]]; then
    echo "🔐 Ejecutando certbot..."
    sudo certbot --nginx \
        -d "$DOMAIN" \
        --redirect \
        --non-interactive \
        --agree-tos \
        -m "$EMAIL"
fi

echo "✅ Nginx configurado para ${DOMAIN}"
echo "   Upstream: ${UPSTREAM}"
if [[ "$SKIP_CERTBOT" == true ]]; then
    echo "   TLS pendiente (certbot no ejecutado)."
else
    echo "   Certbot instalado. Renovación automática configurada."
fi

