#!/bin/bash
# ========================================
# Backup PostgreSQL + Upload a Hetzner Object Storage
# ========================================
# Requisitos:
#  - pg_dump
#  - awscli (compatible con Hetzner via endpoint S3)
#  - Variables de entorno:
#       DATABASE_URL           -> Cadena completa de conexión PostgreSQL
#       STORAGE_ENDPOINT       -> https://fsn1.your-objectstorage.com
#       STORAGE_ACCESS_KEY
#       STORAGE_SECRET_KEY
#       STORAGE_REGION
#       BACKUP_BUCKET (opcional, por defecto STORAGE_BUCKET)
#       STORAGE_BUCKET (fallback si no se define BACKUP_BUCKET)

set -euo pipefail

timestamp=$(date +"%Y%m%d_%H%M%S")
host_tag=${HOSTNAME:-clousadmin-server}
tmp_dir=${BACKUP_TMP_DIR:-/tmp}
dump_path="${tmp_dir}/clousadmin_${timestamp}.sql"
archive_path="${dump_path}.gz"

required_vars=(DATABASE_URL STORAGE_ENDPOINT STORAGE_ACCESS_KEY STORAGE_SECRET_KEY STORAGE_REGION)
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ Falta la variable de entorno $var"
    exit 1
  fi
done

BACKUP_BUCKET=${BACKUP_BUCKET:-${STORAGE_BUCKET:-}}
if [[ -z "$BACKUP_BUCKET" ]]; then
  echo "❌ Define BACKUP_BUCKET o STORAGE_BUCKET"
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "❌ pg_dump no está instalado"
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "❌ awscli no está instalado. Ejecuta: sudo apt install -y awscli"
  exit 1
fi

echo "🗄️  Generando backup PostgreSQL..."
pg_dump "$DATABASE_URL" > "$dump_path"
gzip -f "$dump_path"

export AWS_ACCESS_KEY_ID="$STORAGE_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$STORAGE_SECRET_KEY"
export AWS_DEFAULT_REGION="$STORAGE_REGION"

object_path="s3://${BACKUP_BUCKET}/backups/postgres/${host_tag}_${timestamp}.sql.gz"

echo "☁️  Subiendo backup a Hetzner Object Storage..."
aws --endpoint-url "$STORAGE_ENDPOINT" s3 cp "$archive_path" "$object_path"

echo "🧹 Limpiando archivos temporales..."
rm -f "$archive_path"

echo "✅ Backup completado: $object_path"

