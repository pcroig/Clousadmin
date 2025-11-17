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

# 1. Obtener últimos cambios
echo "📥 Obteniendo últimos cambios..."
git pull origin main || git pull origin master

# 2. Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
npm install --production

# 3. Generar cliente Prisma
echo ""
echo "🔧 Generando cliente Prisma..."
npx prisma generate

# 4. Aplicar migraciones
echo ""
echo "🗄️  Aplicando migraciones..."
npx prisma migrate deploy

# 5. Build de la aplicación
echo ""
echo "🏗️  Compilando aplicación..."
npm run build

# 6. Reiniciar aplicación con PM2
echo ""
echo "🔄 Reiniciando aplicación..."
if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart $APP_NAME
else
    pm2 start npm --name $APP_NAME -- start
    pm2 save
fi

# 7. Verificar estado
echo ""
echo "✅ Despliegue completado"
echo ""
echo "📊 Estado de la aplicación:"
pm2 status $APP_NAME

echo ""
echo "📝 Para ver logs: pm2 logs $APP_NAME"
echo ""









