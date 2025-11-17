#!/bin/bash
# ========================================
# Verificar último backup almacenado en Hetzner Object Storage
# ========================================
# Requisitos:
#   - Node.js y npm (ya instalados en el proyecto)
#   - Variables de entorno:
#       STORAGE_ENDPOINT
#       STORAGE_REGION
#       STORAGE_ACCESS_KEY
#       STORAGE_SECRET_KEY
#       BACKUP_BUCKET (o STORAGE_BUCKET como fallback)

set -euo pipefail

required_vars=(STORAGE_ENDPOINT STORAGE_REGION STORAGE_ACCESS_KEY STORAGE_SECRET_KEY)
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

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js no está instalado"
  exit 1
fi

# Obtener directorio del script y del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"
STORAGE_ENDPOINT="$STORAGE_ENDPOINT" \
STORAGE_REGION="$STORAGE_REGION" \
STORAGE_ACCESS_KEY="$STORAGE_ACCESS_KEY" \
STORAGE_SECRET_KEY="$STORAGE_SECRET_KEY" \
BACKUP_BUCKET="$BACKUP_BUCKET" \
npx tsx scripts/verify-latest-backup.ts


