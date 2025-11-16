# 🛠️ Runbook Operativo - Clousadmin

Última actualización: 16/11/2025

---

## 1. Infraestructura
- **Servidor App**: Hetzner CX31/41 (`/opt/clousadmin`).
- **Base de Datos**: Hetzner Managed PostgreSQL.
- **Redis**: Instancia dedicada (Valkey/Hetzner) accesible por `REDIS_URL`.
- **Storage**: Hetzner Object Storage (`STORAGE_*`).
- **Procesos**: PM2 maneja `clousadmin` (web) y `clousadmin-worker`.

---

## 2. Operaciones Comunes

### 2.1 Revisar estado
```bash
pm2 status
tail -f /home/<user>/.pm2/logs/clousadmin-out.log
curl -s https://app.tudominio.com/api/health | jq
```

### 2.2 Reiniciar aplicación
```bash
cd /opt/clousadmin
git pull origin main
npm install
npm run build
pm2 restart clousadmin
pm2 reload clousadmin-worker
pm2 save
```

### 2.3 Desplegar worker dedicado
```bash
pm2 start scripts/start-worker.js --name clousadmin-worker
pm2 save
```

### 2.4 Revisar cron jobs
```bash
crontab -l
tail -f /var/log/clousadmin-cron.log
```

---

## 3. Backups y Restauración
- **Base de datos**: `scripts/backup-db.sh` (cron 02:00). Ubicación `s3://<BACKUP_BUCKET>/backups/postgres/`.
- **Restaurar**:
  ```bash
  aws --endpoint-url $STORAGE_ENDPOINT s3 cp s3://bucket/backups/postgres/file.sql.gz .
  gunzip file.sql.gz
  psql "$DATABASE_URL" < file.sql
  ```
- **Object Storage**: replicación semanal a bucket secundario (ver `docs/DISASTER_RECOVERY.md`).

---

## 4. Troubleshooting rápido
- **Redis down**: revisar servicio en instancia dedicada (`systemctl status redis-server`).
- **Worker detenido**: `pm2 restart clousadmin-worker`.
- **Errores 5xx**: consultar `/home/<user>/.pm2/logs`, health endpoint y `next build` logs.
- **Storage errores**: verificar `STORAGE_*` y credenciales en Hetzner.

---

## 5. Contactos
- Infraestructura: infra@clousadmin.com
- Producto/Soporte: soporte@clousadmin.com
- Hetzner Support: https://console.hetzner.cloud/support

