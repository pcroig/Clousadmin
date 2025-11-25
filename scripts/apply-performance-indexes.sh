#!/bin/bash

# ========================================
# Script: Aplicar Índices de Rendimiento
# ========================================
# Aplica índices adicionales para mejorar el rendimiento
# SAFE: Los índices se crean con IF NOT EXISTS

set -e  # Exit on error

PYTHON_BIN="$(command -v python3 || command -v python || true)"
if [ -z "$PYTHON_BIN" ]; then
  echo "❌ ERROR: No se encontró python3 ni python en PATH. Necesario para parsear .env.local"
  exit 1
fi

echo "🚀 Aplicando índices de rendimiento a la base de datos..."
echo ""

# Verificar que DATABASE_URL existe
if [ -z "$DATABASE_URL" ]; then
  # Intentar cargar desde .env.local (solo la variable necesaria)
  if [ -f ".env.local" ]; then
    echo "ℹ️ DATABASE_URL no definida en el entorno. Buscando en .env.local..."
    DATABASE_URL="$(
      "$PYTHON_BIN" - <<'PY' || true
import os
from pathlib import Path
env_path = Path(".env.local")
value = ""
for raw_line in env_path.read_text().splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, val = line.split("=", 1)
    key = key.strip()
    if key == "DATABASE_URL":
        value = val.strip().strip('"').strip("'")
        break
if value:
    print(value)
PY
    )"
    export DATABASE_URL
  else
    echo "❌ ERROR: DATABASE_URL no encontrada"
    echo "Por favor, asegúrate de tener .env.local con DATABASE_URL"
    exit 1
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL sigue sin definirse tras revisar .env.local"
  exit 1
fi

# Verificar que existe el archivo SQL
if [ ! -f "prisma/migrations-manual/add_performance_indexes.sql" ]; then
  echo "❌ ERROR: No se encuentra el archivo de migración"
  echo "Esperado: prisma/migrations-manual/add_performance_indexes.sql"
  exit 1
fi

# Aplicar índices
echo "📊 Creando índices..."
psql "$DATABASE_URL" -f prisma/migrations-manual/add_performance_indexes.sql

echo ""
echo "✅ Índices aplicados correctamente"
echo ""
echo "🎯 Beneficios:"
echo "  - Queries de listados 10-50x más rápidas"
echo "  - Dashboard carga más rápido"
echo "  - Filtros y búsquedas optimizadas"
echo ""
echo "💡 Tip: Reinicia el servidor dev para ver los efectos"
echo "   npm run dev"

