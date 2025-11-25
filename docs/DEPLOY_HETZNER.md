# 🚀 Despliegue en Hetzner - Consideraciones Importantes

**Guía concisa de lo que necesitas saber antes y durante el despliegue.**

---

## ⚠️ Antes de Desplegar - Checklist Crítico

### 1. Variables de Entorno de Producción

**Generar nuevos secrets (NUNCA usar los de desarrollo):**

```bash
# JWT Secret (mínimo 32 caracteres)
openssl rand -base64 32

# Encryption Key (64 caracteres hexadecimales)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Platform Admin Secret (mínimo 32 caracteres)
openssl rand -hex 32

# Cron Secret (mínimo 32 caracteres)
openssl rand -base64 32
```

**Variables críticas a configurar:**
- `DATABASE_URL` - PostgreSQL (crear usuario dedicado, no usar postgres)
- `REDIS_URL` - Redis (obtener contraseña del script de instalación)
- `NEXTAUTH_SECRET` - **NUEVO para producción**
- `ENCRYPTION_KEY` - **NUEVO para producción**
- `NEXT_PUBLIC_APP_URL` - URL de producción (https://tu-dominio.com)
- `NODE_ENV=production`

### 2. Base de Datos

**Crear usuario dedicado (no usar postgres):**
```sql
CREATE USER clousadmin_user WITH PASSWORD 'password_seguro';
CREATE DATABASE clousadmin OWNER clousadmin_user;
GRANT ALL PRIVILEGES ON DATABASE clousadmin TO clousadmin_user;
```

**Aplicar migraciones:**
```bash
npx prisma generate
npx prisma migrate deploy  # NO usar migrate dev en producción
```

### 3. Redis

**Instalación automática:**
```bash
./scripts/hetzner/setup-redis.sh
```

El script genera una contraseña automáticamente. **Guárdala** para `REDIS_URL`.

### 4. Seguridad

- ✅ PostgreSQL solo acepta conexiones locales (por defecto)
- ✅ Redis solo acepta conexiones locales (configurado en script)
- ✅ Firewall: solo puertos 22 (SSH), 80 (HTTP), 443 (HTTPS)
- ✅ SSL/HTTPS obligatorio (Let's Encrypt gratuito)
- ✅ Contraseñas seguras en `.env` (nunca commitear)

---

## 🚀 Proceso de Despliegue

### Configuración Inicial (Una vez)

```bash
# 1. Configurar servidor completo
./scripts/hetzner/setup-server.sh

# 2. Crear base de datos (ver arriba)

# 3. Configurar .env con valores de producción

# 4. Desplegar aplicación
npm ci  # instala dependencias + devDependencies necesarias para el build
npx prisma generate
npx prisma migrate deploy
NODE_OPTIONS="--max-old-space-size=8192" npm run build
pm2 start npm --name clousadmin -- start
pm2 save
```

### Actualizaciones Futuras

```bash
./scripts/hetzner/deploy.sh
```

---

## ⚠️ Problemas detectados recientemente (noviembre 2025)

### Build falla con `@tailwindcss/postcss`

- **Síntoma**: `next build` termina con `Cannot find module '@tailwindcss/postcss'`.
- **Causa raíz**: se ejecutó `npm install --production`, que omite todas las `devDependencies` necesarias para Tailwind/PostCSS/TypeScript.
- **Qué hacer**:
  - En cualquier servidor donde se compile Next.js, usa siempre `npm ci` (o `npm install`) **sin** `--production`.
  - Si quieres lanzar solo dependencias de producción en runtime, hazlo en dos fases: primero instala todo y ejecuta `npm run build`; después, si lo necesitas, reinstala con `npm ci --omit=dev` una vez generado `.next/`.

### `git pull` bloqueado por `public/sw.js`

- **Síntoma**: `git pull` aborta porque `public/sw.js` tiene cambios locales.
- **Causa raíz**: `next-pwa` regenera `public/sw.js` en cada build; Git lo ve como modificado.
- **Qué hacer**:
  - No editar `public/sw.js` manualmente (es un artefacto generado).
  - Antes de `git pull`, descartar el archivo si aparece como modificado:
    ```bash
    git checkout -- public/sw.js
    git pull origin main
    ```

### PM2 arranca sin `.next`

- **Síntoma**: logs con `ENOENT: .next/prerender-manifest.json`.
- **Causa raíz**: se reinició PM2 antes de que existiera la carpeta `.next` (sin build previo o build fallido).
- **Qué hacer**:
  - Ejecutar siempre el orden completo: `npm ci` → `npx prisma generate` → `npx prisma migrate deploy` → `npm run build` → `pm2 restart`.
  - Verificar que `.next/prerender-manifest.json` existe antes de reiniciar:
    ```bash
    ls -l .next/prerender-manifest.json
    ```
  - Si el archivo falta, repetir el build y luego reiniciar PM2.

> Estos apuntes se añadieron tras la incidencia de noviembre 2025. Revísalos antes de cada despliegue para evitar recurrencias.

---

## 🔧 Configuración de Nginx (Recomendado)

**Configuración básica:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**SSL con Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

---

## ⚡ Consideraciones Importantes

### Recursos del Servidor

**Mínimo recomendado:**
- 2-4 GB RAM (PostgreSQL + Redis + Next.js)
- 2 vCPU
- 40 GB SSD

**Hetzner CPX11 (4€/mes)** o **CPX21 (8€/mes)** son suficientes.

### Base de Datos

- **NO usar** `prisma migrate dev` en producción (usa `migrate deploy`)
- **Backups regulares** (configurar cron job)
- **Usuario dedicado** (no usar postgres)

### Redis

- Se instala automáticamente con el script
- Contraseña generada automáticamente (guardarla)
- Solo conexiones locales (seguro por defecto)

### PM2

- Gestor de procesos (mantiene la app corriendo)
- Auto-reinicio si falla
- Logs: `pm2 logs clousadmin`
- Estado: `pm2 status`

### Actualizaciones

- **Siempre** probar en desarrollo primero
- **Siempre** hacer backup de BD antes de actualizar
- Usar `deploy.sh` para actualizaciones rápidas

---

## 🐛 Problemas Comunes

### App no inicia
```bash
pm2 logs clousadmin --lines 100  # Ver logs
pm2 env clousadmin               # Verificar variables de entorno
```

### Error de conexión a BD
```bash
sudo systemctl status postgresql
psql -U clousadmin_user -d clousadmin -h localhost  # Probar conexión
```

### Error de conexión a Redis
```bash
sudo systemctl status redis-server
redis-cli ping  # Debería responder PONG
```

### 502 Bad Gateway
- Verificar que la app está corriendo: `pm2 status`
- Verificar Nginx: `sudo nginx -t`
- Ver logs: `sudo tail -f /var/log/nginx/error.log`

---

## 📝 Checklist Rápido

- [ ] Secrets generados nuevos (no usar desarrollo)
- [ ] Base de datos creada con usuario dedicado
- [ ] Variables de entorno configuradas
- [ ] Migraciones aplicadas (`migrate deploy`)
- [ ] Build funciona (`npm run build`)
- [ ] App inicia con PM2
- [ ] Nginx configurado (opcional)
- [ ] SSL configurado (opcional pero recomendado)
- [ ] Firewall configurado
- [ ] Backups configurados

---

## 📚 Scripts Disponibles

- `scripts/hetzner/setup-server.sh` - Configuración completa del servidor
- `scripts/hetzner/setup-redis.sh` - Instalación de Redis
- `scripts/hetzner/deploy.sh` - Actualización rápida

---

**Última actualización**: 24 de noviembre 2025
