# Solución: Error 308 y TypeError webpack-runtime.js

**Fecha**: 25 de noviembre de 2025  
**Problema**: El workflow de CD falla en "Verify deployment" con HTTP 308, y la app en Hetzner tiene TypeError en webpack-runtime.js

---

## 🔍 Diagnóstico

### Problema 1: HTTP 308 en /api/health
**Causa**: El workflow estaba intentando acceder al endpoint con HTTP, pero nginx redirige automáticamente HTTP → HTTPS con código 308 (Permanent Redirect) debido a la configuración de Let's Encrypt.

**Solución implementada**: 
- Actualizado el workflow para forzar HTTPS en el health check
- Agregado `-L` a curl para seguir redirects automáticamente
- Validación adicional del JSON de respuesta

### Problema 2: TypeError en webpack-runtime.js
**Causa probable**: 
1. Build corrupto o incompleto en producción
2. Variables de entorno faltantes o incorrectas
3. Problemas con el proceso de build en el servidor

**Soluciones implementadas**:
- Validación de artefactos de build antes de reiniciar PM2
- Verificación de estado de PM2 después del reinicio
- Script de diagnóstico para identificar problemas específicos

---

## 🚀 Pasos para Solucionar el Problema Actual en Hetzner

### 1. Conectarse al servidor

```bash
ssh root@<HETZNER_HOST>
cd /opt/clousadmin
```

### 2. Ejecutar diagnóstico

```bash
./scripts/hetzner/diagnostico-produccion.sh
```

Este script verificará:
- Estado de PM2
- Artefactos de build (.next/)
- Variables de entorno críticas
- Conectividad de servicios (PostgreSQL, Redis, Nginx)
- Logs recientes
- Health endpoint

### 3. Solución paso a paso

#### A. Si el problema es el build corrupto:

```bash
# 1. Detener la aplicación
pm2 stop clousadmin

# 2. Limpiar build anterior
rm -rf .next/

# 3. Asegurar que las dependencias están instaladas
npm ci --production=false

# 4. Generar Prisma Client
npx prisma generate

# 5. Rebuild con más memoria
NODE_OPTIONS="--max-old-space-size=8192" npm run build

# 6. Verificar que el build fue exitoso
ls -la .next/BUILD_ID .next/package.json .next/server/webpack-runtime.js

# 7. Reiniciar la aplicación
pm2 restart clousadmin

# 8. Verificar logs
pm2 logs clousadmin --lines 50
```

#### B. Si el problema son variables de entorno:

```bash
# 1. Verificar que .env existe y tiene las variables críticas
cat .env | grep -E "DATABASE_URL|NEXTAUTH_SECRET|ENCRYPTION_KEY|NEXT_PUBLIC_APP_URL|NODE_ENV"

# 2. Si falta alguna variable, editarla
nano .env

# 3. Reiniciar PM2 para cargar nuevas variables
pm2 restart clousadmin

# 4. Verificar que PM2 cargó las variables
pm2 env clousadmin | grep -E "DATABASE_URL|NEXTAUTH_SECRET|NODE_ENV"
```

#### C. Si el problema persiste:

```bash
# 1. Ver logs detallados en tiempo real
pm2 logs clousadmin --raw

# 2. Si hay errores de webpack-runtime específicos, intentar:
# Limpiar cache de npm
npm cache clean --force

# Reinstalar dependencias desde cero
rm -rf node_modules package-lock.json
npm install

# Rebuild
NODE_OPTIONS="--max-old-space-size=8192" npm run build

# Reiniciar
pm2 restart clousadmin
```

### 4. Verificar que todo funciona

```bash
# Health check local
curl http://localhost:3000/api/health

# Debería responder:
# {"healthy":true,"status":{"database":"ok","redis":"ok","storage":"enabled"},...}

# Si responde correctamente, el problema está resuelto
```

---

## ✅ Cambios Implementados en el Workflow de CD

### 1. Verificación de Health Check mejorada (`.github/workflows/cd.yml`)

**Antes**:
```yaml
http_code=$(curl -s -o /dev/null -w "%{http_code}" ${{ secrets.APP_URL }}/api/health || echo "000")
```

**Después**:
```yaml
# Forzar HTTPS y seguir redirects
HEALTH_URL="${HEALTH_URL/http:/https:}"
http_code=$(curl -L -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
# Validar JSON response
health_response=$(curl -L -s "$HEALTH_URL")
```

### 2. Validación de Build Artifacts

Agregado antes de reiniciar PM2:
```bash
# Verificar que el build fue exitoso
if [ ! -f ".next/BUILD_ID" ]; then
  echo "❌ Build failed: .next/BUILD_ID not found"
  exit 1
fi

if [ ! -f ".next/package.json" ]; then
  echo "❌ Build failed: .next/package.json not found"
  exit 1
fi
```

### 3. Verificación de Estado de PM2

Agregado después de reiniciar:
```bash
# Esperar un momento para que PM2 detecte errores
sleep 3

# Verificar que no hay errores inmediatos
if pm2 list | grep -q "errored"; then
  echo "❌ Application errored immediately after start"
  pm2 logs clousadmin --lines 100 --nostream
  exit 1
fi
```

---

## 🛡️ Prevención de Problemas Futuros

### 1. Variables de Entorno

**Siempre verificar** antes de deploy que estas variables están configuradas en el servidor:

```bash
# Variables CRÍTICAS (la app no arrancará sin ellas)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<secret>
ENCRYPTION_KEY=<key>
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
NODE_ENV=production

# Variables IMPORTANTES (la app arranca pero con funcionalidad degradada)
REDIS_URL=redis://...
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>

# Variables OPCIONALES (features específicos)
STORAGE_ENDPOINT=https://...
STORAGE_BUCKET=...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

### 2. Proceso de Build

**Siempre seguir este orden**:
1. `npm ci --production=false` (instalar TODAS las dependencias)
2. `npx prisma generate` (generar Prisma Client)
3. `npx prisma migrate deploy` (aplicar migraciones)
4. `NODE_OPTIONS="--max-old-space-size=8192" npm run build` (build con memoria suficiente)
5. Verificar artefactos (`.next/BUILD_ID`, `.next/package.json`)
6. `pm2 restart clousadmin` (reiniciar aplicación)

### 3. Monitoreo

Agregar al crontab para monitoreo automático:

```bash
# Ejecutar diagnóstico cada hora y enviar alerta si hay problemas
0 * * * * /opt/clousadmin/scripts/hetzner/diagnostico-produccion.sh >> /var/log/clousadmin-health.log 2>&1
```

### 4. Checklist antes de Deploy

- [ ] Build local pasa (`npm run build`)
- [ ] Tests pasan (`npm test`)
- [ ] Linter pasa (`npm run lint`)
- [ ] Variables de entorno verificadas en servidor
- [ ] Backup de base de datos realizado
- [ ] Monitoreo activo durante el deploy

---

## 📋 Script de Diagnóstico

Se ha creado el script `scripts/hetzner/diagnostico-produccion.sh` que verifica:

1. ✅ Estado de PM2
2. ✅ Artefactos de build (.next/)
3. ✅ Variables de entorno críticas
4. ✅ Conectividad de servicios (PostgreSQL, Redis, Nginx)
5. ✅ Logs recientes
6. ✅ Health endpoint
7. ✅ Versión de Node.js y npm
8. ✅ Espacio en disco
9. ✅ Memoria disponible

**Uso**:
```bash
./scripts/hetzner/diagnostico-produccion.sh
```

---

## 🔗 Referencias

- [Documentación de despliegue en Hetzner](./DEPLOY_HETZNER.md)
- [Configuración de Nginx](./NGINX_SETUP.md)
- [Troubleshooting de producción](./TROUBLESHOOTING_PROD.md)
- [GitHub Actions CD Workflow](../.github/workflows/cd.yml)

---

## 📝 Notas Finales

Este problema es típico cuando:
1. **nginx redirige HTTP → HTTPS** pero el health check usa HTTP
2. **El build en producción es diferente** del build local por falta de dependencias o variables
3. **PM2 reinicia antes de verificar** que el build fue exitoso

Las soluciones implementadas cubren todos estos casos y deberían prevenir problemas futuros.

**Próximos pasos**:
1. ✅ Ejecutar el script de diagnóstico en el servidor
2. ✅ Seguir los pasos de solución según el diagnóstico
3. ✅ Hacer push de los cambios al repositorio
4. ✅ Ejecutar el workflow de CD manualmente para verificar
5. ✅ Monitorear logs durante y después del deploy

---

**Última actualización**: 25 de noviembre de 2025

