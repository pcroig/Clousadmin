# Guía de Configuración Nginx + TLS (Hetzner)

**Última actualización**: 16 noviembre 2025  
**Entornos aplicables**: Staging y Producción

---

## 1. Prerrequisitos

- VPS Ubuntu 22.04 con acceso sudo.
- Dominio apuntando al servidor (registro `A` o `AAAA`).
- Aplicación Next.js escuchando en `127.0.0.1:3000`.
- Variables `NEXT_PUBLIC_APP_URL` y `NODE_ENV=production`.

---

## 2. Instalación rápida

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## 3. Bloque de servidor

Ruta: `/etc/nginx/sites-available/clousadmin`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name app.tudominio.com;

    client_max_body_size 15m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activar:

```bash
sudo ln -s /etc/nginx/sites-available/clousadmin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. Certificado TLS (Let's Encrypt)

```bash
sudo certbot --nginx -d app.tudominio.com \
  --redirect \
  --non-interactive \
  --agree-tos \
  -m ops@tudominio.com
```

Certbot configura automáticamente el bloque HTTPS y crea el cron de renovación.

---

## 5. Cabeceras recomendadas

Añadir dentro del bloque `server` HTTPS:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

---

## 6. Reinicios y mantenimiento

- Probar configuración: `sudo nginx -t`.
- Recargar sin downtime: `sudo systemctl reload nginx`.
- Logs: `/var/log/nginx/access.log` y `/var/log/nginx/error.log`.

---

## 7. Troubleshooting rápido

| Problema | Causa | Solución |
|----------|-------|----------|
| 502 Bad Gateway | App caída o puerto distinto | Verificar `pm2 status` y `proxy_pass`. |
| Certbot falla | DNS no propagado | Esperar propagación o usar `--staging`. |
| Subidas >10 MB fallan | `client_max_body_size` bajo | Ajustar valor en el bloque `server`. |

---

## 8. Scripts relacionados

- `scripts/hetzner/setup-nginx.sh`: automatiza la instalación + template.
- `scripts/hetzner/setup-server.sh`: instala dependencias base del servidor.


