#!/bin/bash
# ========================================
# Script de Despliegue Rápido
# ========================================
# Actualiza la aplicación en producción

set -e

APP_DIR="/opt/clousadmin"
APP_NAME="clousadmin"

echo "🚀 Desplegando Clousadmin..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json"
    echo "   Ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

# 1. Restaurar artefactos generados
echo "🧹 Restaurando artefactos generados..."
git checkout -- public/sw.js 2>/dev/null || true

# 2. Obtener últimos cambios
echo "📥 Obteniendo últimos cambios..."
git pull origin main || git pull origin master

# 3. Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
npm ci

# 4. Generar cliente Prisma
echo ""
echo "🔧 Generando cliente Prisma..."
npx prisma generate

# 5. Aplicar migraciones
echo ""
echo "🗄️  Aplicando migraciones..."
npx prisma migrate deploy

# 6. Build de la aplicación
echo ""
echo "🏗️  Compilando aplicación..."
NODE_OPTIONS="--max-old-space-size=8192" npm run build

# 7. Verificar que .next existe
if [ ! -f ".next/prerender-manifest.json" ]; then
    echo "❌ Error: el build no generó .next/prerender-manifest.json"
    exit 1
fi

# 8. Reiniciar aplicación con PM2
echo ""
echo "🔄 Reiniciando aplicación..."
if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart $APP_NAME
else
    pm2 start npm --name $APP_NAME -- start
    pm2 save
fi

# 9. Verificar estado
echo ""
echo "✅ Despliegue completado"
echo ""
echo "📊 Estado de la aplicación:"
pm2 status $APP_NAME

echo ""
echo "📝 Para ver logs: pm2 logs $APP_NAME"
echo ""

















