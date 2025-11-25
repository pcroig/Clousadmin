#!/bin/bash

# Script de diagnóstico para problemas en producción
# Uso: ./scripts/hetzner/diagnostico-produccion.sh

set -e

echo "🔍 Diagnóstico de Producción - Clousadmin"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funciones auxiliares
check_ok() {
  echo -e "${GREEN}✅ $1${NC}"
}

check_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

check_error() {
  echo -e "${RED}❌ $1${NC}"
}

echo "1️⃣ Verificando estado de PM2..."
echo "-----------------------------------"
if pm2 list | grep -q "clousadmin"; then
  if pm2 list | grep "clousadmin" | grep -q "online"; then
    check_ok "PM2 está corriendo"
  elif pm2 list | grep "clousadmin" | grep -q "errored"; then
    check_error "PM2 está en estado 'errored'"
  else
    check_warn "PM2 está en estado desconocido"
  fi
else
  check_error "Aplicación 'clousadmin' no encontrada en PM2"
fi
echo ""

echo "2️⃣ Verificando artefactos de build..."
echo "-----------------------------------"
if [ -d "/opt/clousadmin/.next" ]; then
  check_ok "Directorio .next existe"
  
  if [ -f "/opt/clousadmin/.next/BUILD_ID" ]; then
    BUILD_ID=$(cat /opt/clousadmin/.next/BUILD_ID)
    check_ok "BUILD_ID: $BUILD_ID"
  else
    check_error "BUILD_ID no encontrado"
  fi
  
  if [ -f "/opt/clousadmin/.next/package.json" ]; then
    check_ok "package.json de build existe"
  else
    check_error "package.json de build no encontrado"
  fi

  if [ -f "/opt/clousadmin/.next/server/webpack-runtime.js" ]; then
    check_ok "webpack-runtime.js existe"
    
    # Verificar tamaño del archivo
    SIZE=$(stat -f%z "/opt/clousadmin/.next/server/webpack-runtime.js" 2>/dev/null || stat -c%s "/opt/clousadmin/.next/server/webpack-runtime.js" 2>/dev/null || echo "0")
    if [ "$SIZE" -gt "100" ]; then
      check_ok "webpack-runtime.js tiene tamaño válido ($SIZE bytes)"
    else
      check_error "webpack-runtime.js es demasiado pequeño ($SIZE bytes)"
    fi
  else
    check_error "webpack-runtime.js no encontrado"
  fi
  
else
  check_error "Directorio .next no existe - ejecuta 'npm run build'"
fi
echo ""

echo "3️⃣ Verificando variables de entorno críticas..."
echo "-----------------------------------"
cd /opt/clousadmin

# Verificar que .env existe
if [ -f ".env" ]; then
  check_ok "Archivo .env existe"
  
  # Variables críticas para Next.js runtime
  CRITICAL_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "ENCRYPTION_KEY" "NEXT_PUBLIC_APP_URL" "NODE_ENV")
  
  for var in "${CRITICAL_VARS[@]}"; do
    if grep -q "^${var}=" .env; then
      check_ok "$var está configurado"
    else
      check_error "$var NO está configurado en .env"
    fi
  done
else
  check_error "Archivo .env no encontrado"
fi
echo ""

echo "4️⃣ Verificando conectividad de servicios..."
echo "-----------------------------------"

# PostgreSQL
if systemctl is-active --quiet postgresql; then
  check_ok "PostgreSQL está corriendo"
else
  check_error "PostgreSQL no está corriendo"
fi

# Redis
if systemctl is-active --quiet redis-server; then
  check_ok "Redis está corriendo"
else
  check_warn "Redis no está corriendo (no crítico)"
fi

# Nginx
if systemctl is-active --quiet nginx; then
  check_ok "Nginx está corriendo"
else
  check_warn "Nginx no está corriendo"
fi
echo ""

echo "5️⃣ Últimas líneas de logs de PM2..."
echo "-----------------------------------"
pm2 logs clousadmin --lines 30 --nostream
echo ""

echo "6️⃣ Verificando health endpoint..."
echo "-----------------------------------"
if command -v curl &> /dev/null; then
  # Intentar con localhost primero
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")
  
  if [ "$HTTP_CODE" = "200" ]; then
    check_ok "Health endpoint responde correctamente (HTTP $HTTP_CODE)"
    
    # Mostrar respuesta
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
    echo "Respuesta: $HEALTH_RESPONSE"
  else
    check_error "Health endpoint no responde correctamente (HTTP $HTTP_CODE)"
  fi
else
  check_warn "curl no está instalado, no se puede verificar health endpoint"
fi
echo ""

echo "7️⃣ Verificando versión de Node.js y npm..."
echo "-----------------------------------"
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
check_ok "Node.js: $NODE_VERSION"
check_ok "npm: $NPM_VERSION"
echo ""

echo "8️⃣ Verificando espacio en disco..."
echo "-----------------------------------"
DISK_USAGE=$(df -h /opt/clousadmin | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
  check_ok "Espacio en disco: ${DISK_USAGE}% usado"
else
  check_warn "Espacio en disco alto: ${DISK_USAGE}% usado"
fi
echo ""

echo "9️⃣ Verificando memoria disponible..."
echo "-----------------------------------"
FREE_MEM=$(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2 }')
check_ok "Uso de memoria: $FREE_MEM"
echo ""

echo "=========================================="
echo "🏁 Diagnóstico completado"
echo ""
echo "💡 Siguientes pasos recomendados:"
echo "   1. Si hay errores en el build (.next), ejecuta: npm run build"
echo "   2. Si hay errores de variables, revisa el .env"
echo "   3. Si PM2 está 'errored', reinicia: pm2 restart clousadmin"
echo "   4. Si el health endpoint falla, revisa los logs detallados"
echo ""

