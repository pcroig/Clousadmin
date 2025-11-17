# ✅ Checklist de Producción - Clousadmin

Última actualización: 17/11/2025

---

## 1. Pre-flight
- [ ] Code review aprobado y PR mergeado en `main`.
- [ ] CI en GitHub Actions pasó correctamente (lint, tests, build).
- [ ] `npm run build` ejecutado localmente (sin errores de TypeScript).
- [ ] Migraciones Prisma aplicadas en staging (`npx prisma migrate deploy`).
- [ ] Tests ejecutados localmente (`npm run test`).

## 2. Infraestructura
- [ ] **CRÍTICO**: Managed PostgreSQL operativo (monitorización sin alertas).
- [ ] **CRÍTICO**: Object Storage configurado (`ENABLE_CLOUD_STORAGE=true`, `STORAGE_*`).
- [ ] **OPCIONAL**: Redis dedicado/gestionado accesible (`REDIS_URL` actualizado).
  - Nota: La aplicación funciona sin Redis (modo degradado). Redis mejora rendimiento de caché y rate limiting.
- [ ] Servidor de app actualizado (`scripts/hetzner/setup-server.sh`).
- [ ] Nginx + TLS activos (`docs/NGINX_SETUP.md`).
- [ ] Crons instalados (`scripts/hetzner/setup-cron.sh`).

## 3. Despliegue
- [ ] `npm install` + `npm run build` ejecutados en el servidor.
- [ ] `npx prisma migrate deploy`.
- [ ] `pm2 restart clousadmin`.
- [ ] `pm2 start scripts/start-worker.js --name clousadmin-worker` (si no existe).
- [ ] `pm2 save`.

## 4. Verificaciones técnicas
- [ ] **Healthcheck**: `curl https://app.tudominio.com/api/health` devuelve 200.
  - Verifica: `healthy: true`, `database: "ok"`, `storage: "enabled"`
  - Redis puede estar en `degraded` (no crítico)
- [ ] Logs de PM2 sin errores críticos (`pm2 logs clousadmin --lines 100`).
- [ ] Tests de seguridad:
  - [ ] Cifrado de empleados verificado (NIF, NSS, IBAN encriptados)
  - [ ] Rate limiting funciona (probar con >100 requests)
  - [ ] Acceso a logs de auditoría funcional
- [ ] Backups diarios activos (`scripts/backup-db.sh` + cron).
- [ ] Alertas/monitorización configuradas (UptimeRobot/Hetzner).

## 5. Smoke tests (ver `scripts/smoke-tests.sh`)
- [ ] Login HR/Admin.
- [ ] Subida de documento en `/hr/documentos`.
- [ ] Creación de ausencia y aprobación.
- [ ] Importación de nóminas + publicación.
- [ ] Generación de export gestoria.
- [ ] Firma digital: solicitar y firmar documento.
- [ ] Upload nómina en empleado → disponible en `/empleado/mi-espacio/nominas`.
- [ ] Notificaciones push internas visibles.

## 6. Post-deploy
- [ ] Revisar métricas (CPU, RAM, disco).
- [ ] Revisar costos en Hetzner (storage + tráfico).
- [ ] Revisar logs durante primeras 2 horas.
- [ ] Documentar en `docs/daily/` la ejecución y resultados.

