#!/bin/bash

# Script para rebuild completo en producción
# Uso: ./scripts/hetzner/rebuild-produccion.sh
# 
# Este script hace una limpieza completa y reconstruye la aplicación
# desde cero. Úsalo cuando el build esté corrupto o haya problemas
# persistentes con el runtime de Next.js.

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║        Rebuild Completo - Clousadmin (Producción)     ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: No se encontró package.json${NC}"
  echo "   Asegúrate de ejecutar este script desde /opt/clousadmin"
  exit 1
fi

# Función para confirmar acción
confirm() {
  read -p "$(echo -e ${YELLOW}$1 [y/N]: ${NC})" -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Cancelado por el usuario${NC}"
    exit 1
  fi
}

echo -e "${YELLOW}⚠️  Este script va a:${NC}"
echo "   1. Detener la aplicación (PM2)"
echo "   2. Limpiar build anterior (.next/)"
echo "   3. Limpiar cache de npm"
echo "   4. Reinstalar dependencias"
echo "   5. Generar Prisma Client"
echo "   6. Rebuild de Next.js"
echo "   7. Reiniciar la aplicación"
echo ""
echo -e "${YELLOW}⚠️  La aplicación estará OFFLINE durante el proceso (2-5 minutos)${NC}"
echo ""

confirm "¿Continuar con el rebuild?"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Paso 1: Detener aplicación
echo -e "${BLUE}📛 Paso 1/7: Deteniendo aplicación...${NC}"
if pm2 list | grep -q "clousadmin"; then
  pm2 stop clousadmin
  echo -e "${GREEN}✅ Aplicación detenida${NC}"
else
  echo -e "${YELLOW}⚠️  Aplicación no estaba corriendo en PM2${NC}"
fi
echo ""

# Paso 2: Limpiar build anterior
echo -e "${BLUE}🧹 Paso 2/7: Limpiando build anterior...${NC}"
if [ -d ".next" ]; then
  rm -rf .next/
  echo -e "${GREEN}✅ Directorio .next eliminado${NC}"
else
  echo -e "${YELLOW}⚠️  Directorio .next no existía${NC}"
fi
echo ""

# Paso 3: Limpiar cache de npm
echo -e "${BLUE}🧹 Paso 3/7: Limpiando cache de npm...${NC}"
npm cache clean --force
echo -e "${GREEN}✅ Cache de npm limpiado${NC}"
echo ""

# Paso 4: Reinstalar dependencias
echo -e "${BLUE}📦 Paso 4/7: Reinstalando dependencias...${NC}"
# Backup de package-lock.json
if [ -f "package-lock.json" ]; then
  cp package-lock.json package-lock.json.backup
fi

# Limpiar node_modules solo si está muy corrupto (opcional)
# rm -rf node_modules/

# Instalar dependencias (incluye devDependencies necesarias para build)
npm ci --production=false

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Dependencias instaladas correctamente${NC}"
else
  echo -e "${RED}❌ Error instalando dependencias${NC}"
  exit 1
fi
echo ""

# Paso 5: Generar Prisma Client
echo -e "${BLUE}🔧 Paso 5/7: Generando Prisma Client...${NC}"
npx prisma generate

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Prisma Client generado${NC}"
else
  echo -e "${RED}❌ Error generando Prisma Client${NC}"
  exit 1
fi
echo ""

# Paso 6: Build de Next.js
echo -e "${BLUE}🏗️  Paso 6/7: Compilando aplicación...${NC}"
echo -e "${YELLOW}   (Esto puede tardar 2-3 minutos)${NC}"
NODE_OPTIONS="--max-old-space-size=8192" npm run build

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Build completado exitosamente${NC}"
else
  echo -e "${RED}❌ Error en el build${NC}"
  exit 1
fi

# Verificar artefactos críticos
echo ""
echo -e "${BLUE}🔍 Verificando artefactos de build...${NC}"

if [ -f ".next/BUILD_ID" ]; then
  BUILD_ID=$(cat .next/BUILD_ID)
  echo -e "${GREEN}✅ BUILD_ID encontrado: $BUILD_ID${NC}"
else
  echo -e "${RED}❌ BUILD_ID no encontrado - el build puede estar incompleto${NC}"
  exit 1
fi

if [ -f ".next/package.json" ]; then
  echo -e "${GREEN}✅ .next/package.json encontrado${NC}"
else
  echo -e "${RED}❌ .next/package.json no encontrado${NC}"
  exit 1
fi

if [ -f ".next/server/webpack-runtime.js" ]; then
  SIZE=$(stat -f%z ".next/server/webpack-runtime.js" 2>/dev/null || stat -c%s ".next/server/webpack-runtime.js" 2>/dev/null || echo "0")
  echo -e "${GREEN}✅ webpack-runtime.js encontrado ($SIZE bytes)${NC}"
  
  if [ "$SIZE" -lt "100" ]; then
    echo -e "${RED}❌ webpack-runtime.js es demasiado pequeño, puede estar corrupto${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ webpack-runtime.js no encontrado${NC}"
  exit 1
fi

echo ""

# Paso 7: Reiniciar aplicación
echo -e "${BLUE}♻️  Paso 7/7: Reiniciando aplicación...${NC}"
pm2 restart clousadmin || pm2 start npm --name clousadmin -- start
pm2 save

# Esperar a que arranque
echo -e "${YELLOW}⏳ Esperando a que la aplicación arranque...${NC}"
sleep 5

# Verificar estado
if pm2 list | grep "clousadmin" | grep -q "online"; then
  echo -e "${GREEN}✅ Aplicación reiniciada correctamente${NC}"
else
  echo -e "${RED}❌ Error al reiniciar la aplicación${NC}"
  echo -e "${YELLOW}📋 Mostrando logs...${NC}"
  pm2 logs clousadmin --lines 50 --nostream
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificación final
echo -e "${BLUE}🔍 Verificación final...${NC}"
sleep 3

# Health check local
if command -v curl &> /dev/null; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Health check exitoso (HTTP $HTTP_CODE)${NC}"
    
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
    echo -e "${GREEN}📊 Respuesta: $HEALTH_RESPONSE${NC}"
  else
    echo -e "${YELLOW}⚠️  Health check retornó HTTP $HTTP_CODE${NC}"
    echo -e "${YELLOW}   Esto puede ser normal si la app aún está iniciando${NC}"
    echo -e "${YELLOW}   Verifica en unos segundos con: curl http://localhost:3000/api/health${NC}"
  fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Rebuild completado exitosamente${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📝 Próximos pasos:${NC}"
echo "   1. Verifica los logs: pm2 logs clousadmin"
echo "   2. Verifica el estado: pm2 status"
echo "   3. Prueba el health endpoint: curl http://localhost:3000/api/health"
echo "   4. Monitorea por unos minutos para asegurar estabilidad"
echo ""
echo -e "${GREEN}🎉 La aplicación debería estar funcionando correctamente${NC}"
echo ""

