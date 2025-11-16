# Plan de Disaster Recovery - Clousadmin

**Última actualización**: 16 noviembre 2025  
**Responsable**: Equipo Plataforma

---

## 1. Objetivos

- RPO (Recovery Point Objective): **24 h** (gracias a backups diarios).
- RTO (Recovery Time Objective): **2 h** para restaurar base de datos + aplicación.

---

## 2. Backups (Automatizados)

### 2.1 Base de Datos

- Script: `scripts/backup-db.sh`
- Cron recomendado (servidor de producción):

```cron
0 2 * * * /opt/clousadmin/scripts/backup-db.sh >> /var/log/clousadmin-backups.log 2>&1
```

- Ubicación: `s3://<BACKUP_BUCKET>/backups/postgres/<hostname>_<timestamp>.sql.gz`

### 2.2 Object Storage

- Configurar **Lifecycle + replicación** en Hetzner (fsn1 → hel1) para carpetas críticas (`documentos/`, `nominas/`).
- Alternativa manual: `s3cmd sync s3://clousadmin-storage-prod/ s3://clousadmin-backups-weekly/` semanal.

### 2.3 Configuración y Logs

- PM2 + Nginx config bajo control Git.
- Logs rotados (ver sección Logging).

---

## 3. Restauración

### 3.1 Base de Datos

```bash
aws --endpoint-url $STORAGE_ENDPOINT s3 cp s3://<BACKUP_BUCKET>/backups/postgres/<file>.sql.gz .
gunzip <file>.sql.gz
psql "$DATABASE_URL" < <file>.sql
```

### 3.2 Object Storage

Si se pierde el bucket principal:
1. Crear nuevo bucket.
2. Restaurar desde backup/replicación.
3. Actualizar `STORAGE_BUCKET`.

### 3.3 Aplicación

1. Provisionar nuevo VPS.
2. Ejecutar `scripts/hetzner/setup-server.sh`.
3. Restaurar `.env`.
4. Deploy (`scripts/hetzner/deploy.sh`).

---

## 4. Logging y Monitoreo

- **PM2 Logrotate**: instalar con `pm2 install pm2-logrotate` (script `setup-server.sh` ya lo hace).
  - Config:
    - `pm2 set pm2-logrotate:max_size 10M`
    - `pm2 set pm2-logrotate:retain 10`
    - `pm2 set pm2-logrotate:compress true`
- **Nginx logs**: `/var/log/nginx/*` (rotación con logrotate del sistema).
- **Healthchecks**:
  - Endpoint `/api/health` (ver sección Monitoring) ping cada 5 min (UptimeRobot, Hetzner monitoring).

---

## 5. Checklist Post-Incidencia

1. Confirmar origen y alcance.
2. Restaurar servicios siguiendo orden: DB → Redis → App → Workers.
3. Validar smoke tests (`scripts/smoke-tests.sh`).
4. Documentar incidente (fecha, causa, acciones).
5. Ajustar procedimientos según lecciones aprendidas.

---

## 6. Contactos

- **Hetzner Support**: https://console.hetzner.cloud/support
- **Hetzner Status**: https://status.hetzner.com/
- **Equipo interno**:
  - Infra: infra@clousadmin.com
  - Producto: producto@clousadmin.com


