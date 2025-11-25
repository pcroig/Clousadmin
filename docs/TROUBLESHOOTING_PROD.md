# ⚠️ Troubleshooting Producción - Clousadmin

Última actualización: 25/11/2025

---

## 1. Errores comunes

### 1.1 TypeError: Cannot read properties of undefined (reading 'call') en webpack-runtime.js
- **Síntomas**: App no arranca, logs con error en `.next/server/webpack-runtime.js`, PM2 en estado `errored`.
- **Causa**: Build corrupto o incompleto, variables de entorno faltantes.
- **Solución rápida**:
  ```bash
  # Ejecutar diagnóstico completo
  ./scripts/hetzner/diagnostico-produccion.sh
  
  # Si el diagnóstico muestra problemas, hacer rebuild completo
  ./scripts/hetzner/rebuild-produccion.sh
  ```
- **Solución manual**:
  1. `pm2 stop clousadmin`
  2. `rm -rf .next/`
  3. `npm ci --production=false`
  4. `npx prisma generate`
  5. `NODE_OPTIONS="--max-old-space-size=8192" npm run build`
  6. Verificar: `ls -la .next/BUILD_ID .next/server/webpack-runtime.js`
  7. `pm2 restart clousadmin`

### 1.2 Health check retorna 308 (Permanent Redirect)
- **Síntomas**: Workflow de CD falla en "Verify deployment", curl retorna 308.
- **Causa**: Nginx redirige HTTP → HTTPS automáticamente.
- **Solución**: Usar HTTPS en health checks: `curl -L https://tu-dominio.com/api/health`
- **Nota**: El workflow de CD ya está actualizado para manejar esto automáticamente.

### 1.3 Redis no disponible
- **Síntomas**: Logs `"[Redis] No disponible"`, workers parados.
- **Acciones**:
  1. `redis-cli ping` en servidor Redis.
  2. Revisar firewall / SG.
  3. Reiniciar servicio (`systemctl restart redis-server` o proveedor gestionado).
  4. Reiniciar worker (`pm2 restart clousadmin-worker`).

### 1.4 Storage (Hetzner) falla
- **Síntomas**: uploads fallan, `Object Storage client no disponible`.
- **Acciones**:
  1. Verificar `STORAGE_*` y `ENABLE_CLOUD_STORAGE`.
  2. Revisar credenciales en Hetzner (Access Keys).
  3. Revisar endpoint correcto (`https://REGION.your-objectstorage.com`).
  4. Consultar bucket con `aws --endpoint-url ... s3 ls s3://bucket`.

### 1.5 Errores 500 en API
- **Síntomas**: respuestas 500 o 503.
- **Acciones**:
  1. Revisar `pm2 logs clousadmin`.
  2. Ejecutar `curl https://app/api/health`.
  3. Comprobar Postgres (`psql -c 'SELECT 1'`).
  4. Revisar Redis/Storage.

### 1.6 Worker atascado
- **Síntomas**: jobs en estado `waiting`, logs `[Queue] Error`.
- **Acciones**:
  1. `pm2 restart clousadmin-worker`.
  2. Revisar `REDIS_URL` y conectividad.
  3. Revisar tabla `jobGeneracionDocumentos` para errores.

---

## 2. Guía rápida de diagnóstico

### Diagnóstico automatizado
```bash
# Ejecutar diagnóstico completo (recomendado)
./scripts/hetzner/diagnostico-produccion.sh
```

### Diagnóstico manual
```bash
# 1. Estado general
pm2 status
curl -s https://app/api/health | jq

# 2. Logs
pm2 logs clousadmin --lines 200
pm2 logs clousadmin-worker --lines 200

# 3. Base de datos
psql "$DATABASE_URL" -c 'SELECT NOW();'

# 4. Verificar build
ls -la .next/BUILD_ID .next/server/webpack-runtime.js
```

---

## 3. Escalado de emergencia
- **CPU alta**: escalar VPS (Hetzner Console) o distribuir con balanceador.
- **Storage**: activar compresión / lifecycle. Ver `docs/MIGRACION_HETZNER.md`.
- **Workers**: iniciar otro worker `pm2 start scripts/start-worker.js --name clousadmin-worker-2`.

---

## 4. Comunicación
- Reportar incidentes en `docs/historial/` + Slack #infra.
- Enviar resumen al equipo producto con impacto, causa raíz y acciones.

