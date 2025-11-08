#!/bin/bash
# Script para resolver el problema de caché de bcrypt/bcryptjs

echo "🔧 Solucionando problema de caché de bcryptjs..."

# 1. Detener cualquier proceso de Next.js que esté corriendo
echo "1. Deteniendo procesos de Next.js..."
pkill -f "next dev" || echo "   No hay procesos de Next.js corriendo"

# 2. Eliminar caché de Next.js y node_modules
echo "2. Eliminando caché..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# 3. Verificar que bcryptjs está instalado
echo "3. Verificando instalación de bcryptjs..."
if npm list bcryptjs > /dev/null 2>&1; then
  echo "   ✅ bcryptjs está instalado"
else
  echo "   ⚠️  bcryptjs no está instalado, instalando..."
  npm install bcryptjs
fi

# 4. Verificar que NO hay bcrypt instalado
echo "4. Verificando que NO hay bcrypt instalado..."
if npm list bcrypt > /dev/null 2>&1; then
  echo "   ⚠️  bcrypt está instalado, desinstalando..."
  npm uninstall bcrypt
else
  echo "   ✅ bcrypt NO está instalado (correcto)"
fi

# 5. Reinstalar dependencias
echo "5. Reinstalando dependencias..."
npm install

echo ""
echo "✅ Proceso completado. Ahora ejecuta:"
echo "   npm run dev"
echo ""
echo "Si el problema persiste, intenta:"
echo "   rm -rf node_modules package-lock.json"
echo "   npm install"










