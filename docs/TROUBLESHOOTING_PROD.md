# ⚠️ Troubleshooting Producción - Clousadmin

Última actualización: 16/11/2025

---

## 1. Errores comunes

### 1.1 Redis no disponible
- **Síntomas**: Logs `"[Redis] No disponible"`, workers parados.
- **Acciones**:
  1. `redis-cli ping` en servidor Redis.
  2. Revisar firewall / SG.
  3. Reiniciar servicio (`systemctl restart redis-server` o proveedor gestionado).
  4. Reiniciar worker (`pm2 restart clousadmin-worker`).

### 1.2 Storage (Hetzner) falla
- **Síntomas**: uploads fallan, `Object Storage client no disponible`.
- **Acciones**:
  1. Verificar `STORAGE_*` y `ENABLE_CLOUD_STORAGE`.
  2. Revisar credenciales en Hetzner (Access Keys).
  3. Revisar endpoint correcto (`https://REGION.your-objectstorage.com`).
  4. Consultar bucket con `aws --endpoint-url ... s3 ls s3://bucket`.

### 1.3 Errores 500 en API
- **Síntomas**: respuestas 500 o 503.
- **Acciones**:
  1. Revisar `pm2 logs clousadmin`.
  2. Ejecutar `curl https://app/api/health`.
  3. Comprobar Postgres (`psql -c 'SELECT 1'`).
  4. Revisar Redis/Storage.

### 1.4 Worker atascado
- **Síntomas**: jobs en estado `waiting`, logs `[Queue] Error`.
- **Acciones**:
  1. `pm2 restart clousadmin-worker`.
  2. Revisar `REDIS_URL` y conectividad.
  3. Revisar tabla `jobGeneracionDocumentos` para errores.

---

## 2. Guía rápida de diagnóstico
```bash
# 1. Estado general
pm2 status
curl -s https://app/api/health | jq

# 2. Logs
pm2 logs clousadmin --lines 200
pm2 logs clousadmin-worker --lines 200

# 3. Base de datos
psql "$DATABASE_URL" -c 'SELECT NOW();'
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

