#!/bin/bash
# ========================================
# Instalar Cron Jobs de Clousadmin (Hetzner)
# ========================================
# Uso:
#   CRON_SECRET="xxx" APP_URL="https://app.tu-dominio.com" \
#   BACKUP_BUCKET="clousadmin-backups" STORAGE_ENDPOINT="https://fsn1.your-objectstorage.com" \
#   STORAGE_ACCESS_KEY="..." STORAGE_SECRET_KEY="..." STORAGE_REGION="eu-central-1" \
#   DATABASE_URL="postgresql://..." \
#   ./scripts/hetzner/setup-cron.sh
#
# Preconfigura las variables anteriores (export o inline).

set -euo pipefail

if ! sudo -n true 2>/dev/null; then
  echo "❌ Este script requiere permisos de sudo (para escribir en /var/log si es necesario)."
  exit 1
fi

if [[ -z "${APP_URL:-}" ]]; then
  echo "❌ Debes definir APP_URL (ej: https://app.tu-dominio.com)"
  exit 1
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "❌ Debes definir CRON_SECRET"
  exit 1
fi

LOG_FILE="/var/log/clousadmin-cron.log"
touch "$LOG_FILE" || true

echo "🗓️  Instalando crons..."

TMP_CRON=$(mktemp)
crontab -l 2>/dev/null > "$TMP_CRON" || true

# 1) Clasificar fichajes: cada día 23:30 UTC
grep -q "api/cron/clasificar-fichajes" "$TMP_CRON" 2>/dev/null || {
  echo '30 23 * * * curl -s -X POST '"$APP_URL"'/api/cron/clasificar-fichajes -H "Authorization: Bearer '"$CRON_SECRET"'" >> '"$LOG_FILE"' 2>&1' >> "$TMP_CRON"
}

# 2) Revisar solicitudes con IA: cada día 02:00 UTC
grep -q "api/cron/revisar-solicitudes" "$TMP_CRON" 2>/dev/null || {
  echo '0 2 * * * curl -s -X POST '"$APP_URL"'/api/cron/revisar-solicitudes -H "Authorization: Bearer '"$CRON_SECRET"'" >> '"$LOG_FILE"' 2>&1' >> "$TMP_CRON"
}

# 3) Backup DB diario 02:00 (requiere envs de storage y DB)
if [[ -n "${DATABASE_URL:-}" && -n "${STORAGE_ENDPOINT:-}" && -n "${STORAGE_ACCESS_KEY:-}" && -n "${STORAGE_SECRET_KEY:-}" && -n "${STORAGE_REGION:-}" && -n "${BACKUP_BUCKET:-}" ]]; then
  # Asegurar permisos de ejecución del script de backup
  chmod +x /opt/clousadmin/scripts/backup-db.sh 2>/dev/null || true
  
  grep -q "scripts/backup-db.sh" "$TMP_CRON" 2>/dev/null || {
    echo '0 2 * * * DATABASE_URL="'"$DATABASE_URL"'" STORAGE_ENDPOINT="'"$STORAGE_ENDPOINT"'" STORAGE_ACCESS_KEY="'"$STORAGE_ACCESS_KEY"'" STORAGE_SECRET_KEY="'"$STORAGE_SECRET_KEY"'" STORAGE_REGION="'"$STORAGE_REGION"'" BACKUP_BUCKET="'"$BACKUP_BUCKET"'" /opt/clousadmin/scripts/backup-db.sh >> '"$LOG_FILE"' 2>&1' >> "$TMP_CRON"
  }
else
  echo "⚠️  Variables de backup incompletas. Saltando instalación de cron de backup."
fi

crontab "$TMP_CRON"
rm -f "$TMP_CRON"

echo "✅ Crons instalados. Revisa $LOG_FILE para logs."

