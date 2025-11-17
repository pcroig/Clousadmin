#!/bin/bash
# ========================================
# Backup PostgreSQL + Upload a Hetzner Object Storage
# ========================================
# Requisitos:
#  - pg_dump
#  - Node.js y npm (ya instalados en el proyecto)
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

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js no está instalado"
  exit 1
fi

# Obtener directorio del script y del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🗄️  Generando backup PostgreSQL..."
if ! pg_dump "$DATABASE_URL" > "$dump_path"; then
  echo "❌ Error generando backup de PostgreSQL"
  rm -f "$dump_path"
  exit 1
fi

# Verificar que el dump se generó correctamente
if [[ ! -s "$dump_path" ]]; then
  echo "❌ El backup generado está vacío"
  rm -f "$dump_path"
  exit 1
fi

echo "📦 Comprimiendo backup..."
gzip -f "$dump_path"

# Verificar que el archivo comprimido existe
if [[ ! -f "$archive_path" ]]; then
  echo "❌ Error al comprimir el backup"
  rm -f "$dump_path"
  exit 1
fi

echo "☁️  Subiendo backup a Hetzner Object Storage..."
cd "$PROJECT_DIR"
if ! STORAGE_ENDPOINT="$STORAGE_ENDPOINT" \
  STORAGE_REGION="$STORAGE_REGION" \
  STORAGE_ACCESS_KEY="$STORAGE_ACCESS_KEY" \
  STORAGE_SECRET_KEY="$STORAGE_SECRET_KEY" \
  BACKUP_BUCKET="$BACKUP_BUCKET" \
  npx tsx scripts/backup-db-upload.ts "$archive_path"; then
  echo "❌ Error subiendo backup a Object Storage"
  rm -f "$archive_path"
  exit 1
fi

echo "🧹 Limpiando archivos temporales..."
rm -f "$archive_path"

echo "✅ Backup completado exitosamente"

