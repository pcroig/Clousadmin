#!/bin/bash
# ========================================
# Script de prueba para verificar CRONs
# ========================================
# Uso: ./scripts/hetzner/test-crons.sh

set -euo pipefail

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Probando CRONs de Clousadmin..."
echo ""

# Cargar variables de entorno desde .env si existe
if [[ -f /opt/clousadmin/.env ]]; then
  export $(grep -v '^#' /opt/clousadmin/.env | grep -E '^(APP_URL|CRON_SECRET|DATABASE_URL|STORAGE_ENDPOINT|STORAGE_ACCESS_KEY|STORAGE_SECRET_KEY|STORAGE_REGION|BACKUP_BUCKET)=' | xargs)
fi

# Verificar variables requeridas
if [[ -z "${APP_URL:-}" ]]; then
  echo -e "${RED}❌ APP_URL no está definida${NC}"
  exit 1
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo -e "${RED}❌ CRON_SECRET no está definida${NC}"
  exit 1
fi

# Test 1: Clasificar fichajes
echo -e "${YELLOW}1. Probando CRON: Clasificar Fichajes${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "${APP_URL}/api/cron/clasificar-fichajes" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [[ "$http_code" == "200" ]]; then
  echo -e "${GREEN}✅ Clasificar fichajes: OK${NC}"
  echo "   Respuesta: $body" | head -c 200
  echo ""
else
  echo -e "${RED}❌ Clasificar fichajes: ERROR (HTTP $http_code)${NC}"
  echo "   Respuesta: $body"
fi
echo ""

# Test 2: Revisar solicitudes
echo -e "${YELLOW}2. Probando CRON: Revisar Solicitudes${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "${APP_URL}/api/cron/revisar-solicitudes" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [[ "$http_code" == "200" ]]; then
  echo -e "${GREEN}✅ Revisar solicitudes: OK${NC}"
  echo "   Respuesta: $body" | head -c 200
  echo ""
else
  echo -e "${RED}❌ Revisar solicitudes: ERROR (HTTP $http_code)${NC}"
  echo "   Respuesta: $body"
fi
echo ""

# Test 3: Backup DB (si las variables están disponibles)
if [[ -n "${DATABASE_URL:-}" && -n "${STORAGE_ENDPOINT:-}" && -n "${STORAGE_ACCESS_KEY:-}" && -n "${STORAGE_SECRET_KEY:-}" && -n "${STORAGE_REGION:-}" && -n "${BACKUP_BUCKET:-}" ]]; then
  echo -e "${YELLOW}3. Probando CRON: Backup DB${NC}"
  
  # Verificar que el script existe y tiene permisos
  if [[ ! -f /opt/clousadmin/scripts/backup-db.sh ]]; then
    echo -e "${RED}❌ Script backup-db.sh no encontrado${NC}"
  elif [[ ! -x /opt/clousadmin/scripts/backup-db.sh ]]; then
    echo -e "${YELLOW}⚠️  Script sin permisos de ejecución. Intentando corregir...${NC}"
    chmod +x /opt/clousadmin/scripts/backup-db.sh
  fi
  
  # Ejecutar backup (solo test, no guardar realmente)
  echo "   Ejecutando backup de prueba..."
  export DATABASE_URL STORAGE_ENDPOINT STORAGE_ACCESS_KEY STORAGE_SECRET_KEY STORAGE_REGION BACKUP_BUCKET
  
  if /opt/clousadmin/scripts/backup-db.sh 2>&1 | head -20; then
    echo -e "${GREEN}✅ Backup DB: OK${NC}"
  else
    echo -e "${RED}❌ Backup DB: ERROR${NC}"
  fi
else
  echo -e "${YELLOW}3. Backup DB: Saltado (variables de entorno no disponibles)${NC}"
fi
echo ""

# Verificar crontab
echo -e "${YELLOW}4. Verificando configuración de crontab${NC}"
crontab_count=$(crontab -l 2>/dev/null | grep -c "clousadmin\|api/cron\|backup-db" || echo "0")
if [[ "$crontab_count" -gt 0 ]]; then
  echo -e "${GREEN}✅ Crontab configurado ($crontab_count entradas encontradas)${NC}"
  echo ""
  echo "   Entradas de cron:"
  crontab -l 2>/dev/null | grep -E "clousadmin|api/cron|backup-db" | sed 's/^/   /'
else
  echo -e "${RED}❌ No se encontraron entradas de cron${NC}"
fi
echo ""

# Verificar logs
echo -e "${YELLOW}5. Últimas ejecuciones (logs)${NC}"
if [[ -f /var/log/clousadmin-cron.log ]]; then
  echo "   Últimas 5 líneas del log:"
  tail -5 /var/log/clousadmin-cron.log | sed 's/^/   /'
else
  echo -e "${YELLOW}   ⚠️  Archivo de log no encontrado${NC}"
fi
echo ""

echo -e "${GREEN}✅ Pruebas completadas${NC}"


