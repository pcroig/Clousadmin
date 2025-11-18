#!/bin/bash
# ========================================
# Script: Verificación completa de producción
# ========================================
# Verifica que todos los componentes estén funcionando correctamente

set -euo pipefail

echo "🔍 Verificando configuración de producción..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Verificar Redis
echo "1️⃣  Verificando Redis..."
if systemctl is-active --quiet redis-server; then
  echo -e "${GREEN}✅ Redis está corriendo${NC}"
  
  # Verificar política de evicción
  POLICY=$(redis-cli CONFIG GET maxmemory-policy | tail -n1)
  if [ "$POLICY" = "noeviction" ]; then
    echo -e "${GREEN}✅ Política de evicción: noeviction${NC}"
  else
    echo -e "${RED}❌ Política de evicción: $POLICY (debe ser noeviction)${NC}"
    echo "   Ejecuta: ./scripts/hetzner/fix-redis-eviction.sh"
  fi
else
  echo -e "${RED}❌ Redis no está corriendo${NC}"
fi
echo ""

# 2. Verificar PostgreSQL
echo "2️⃣  Verificando PostgreSQL..."
if systemctl is-active --quiet postgresql; then
  echo -e "${GREEN}✅ PostgreSQL está corriendo${NC}"
else
  echo -e "${RED}❌ PostgreSQL no está corriendo${NC}"
fi
echo ""

# 3. Verificar PM2
echo "3️⃣  Verificando PM2..."
if command -v pm2 >/dev/null 2>&1; then
  if pm2 list | grep -q "clousadmin.*online"; then
    echo -e "${GREEN}✅ Aplicación corriendo en PM2${NC}"
  else
    echo -e "${RED}❌ Aplicación no está corriendo en PM2${NC}"
  fi
else
  echo -e "${RED}❌ PM2 no está instalado${NC}"
fi
echo ""

# 4. Verificar Nginx
echo "4️⃣  Verificando Nginx..."
if systemctl is-active --quiet nginx; then
  echo -e "${GREEN}✅ Nginx está corriendo${NC}"
  
  # Verificar configuración
  if nginx -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Configuración de Nginx válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración de Nginx${NC}"
    nginx -t
  fi
else
  echo -e "${YELLOW}⚠️  Nginx no está corriendo (puede ser normal si no está configurado)${NC}"
fi
echo ""

# 5. Verificar CRONs
echo "5️⃣  Verificando CRONs..."
CRON_COUNT=$(crontab -l 2>/dev/null | grep -c "clousadmin\|api/cron\|backup-db" || echo "0")
if [ "$CRON_COUNT" -ge 3 ]; then
  echo -e "${GREEN}✅ $CRON_COUNT crons configurados${NC}"
  crontab -l | grep -E "(clasificar-fichajes|revisar-solicitudes|backup-db)" | sed 's/^/   /'
else
  echo -e "${RED}❌ Solo $CRON_COUNT crons encontrados (esperado: 3)${NC}"
fi
echo ""

# 6. Verificar variables de entorno
echo "6️⃣  Verificando variables de entorno críticas..."
cd /opt/clousadmin 2>/dev/null || { echo -e "${RED}❌ No se puede acceder a /opt/clousadmin${NC}"; exit 1; }

REQUIRED_VARS=(
  "DATABASE_URL"
  "NEXTAUTH_SECRET"
  "ENCRYPTION_KEY"
  "REDIS_URL"
  "STORAGE_ENDPOINT"
  "STORAGE_ACCESS_KEY"
  "STORAGE_SECRET_KEY"
  "CRON_SECRET"
  "RESEND_API_KEY"
)

MISSING_VARS=0
for var in "${REQUIRED_VARS[@]}"; do
  if grep -q "^${var}=" .env 2>/dev/null; then
    echo -e "${GREEN}✅ $var configurada${NC}"
  else
    echo -e "${RED}❌ $var NO configurada${NC}"
    MISSING_VARS=$((MISSING_VARS + 1))
  fi
done

if [ "$MISSING_VARS" -eq 0 ]; then
  echo -e "${GREEN}✅ Todas las variables críticas están configuradas${NC}"
else
  echo -e "${RED}❌ Faltan $MISSING_VARS variables críticas${NC}"
fi
echo ""

# 7. Verificar conectividad
echo "7️⃣  Verificando conectividad..."
if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Aplicación responde en localhost:3000${NC}"
else
  echo -e "${RED}❌ Aplicación no responde en localhost:3000${NC}"
fi

if [ -n "${APP_URL:-}" ]; then
  if curl -s "$APP_URL/api/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Aplicación responde en $APP_URL${NC}"
  else
    echo -e "${YELLOW}⚠️  Aplicación no responde en $APP_URL (puede ser normal si DNS no está configurado)${NC}"
  fi
fi
echo ""

# Resumen
echo "=========================================="
echo "📊 Resumen de verificación"
echo "=========================================="
echo ""
echo "Para corregir problemas:"
echo "  - Redis eviction: ./scripts/hetzner/fix-redis-eviction.sh"
echo "  - CRONs: ./scripts/hetzner/setup-cron.sh"
echo "  - Nginx: ./scripts/hetzner/setup-nginx.sh"
echo ""

