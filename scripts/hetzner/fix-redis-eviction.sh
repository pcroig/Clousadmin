#!/bin/bash
# ========================================
# Script: Corregir política de evicción de Redis
# ========================================
# Cambia la política de evicción de allkeys-lru a noeviction
# Esto es crítico para BullMQ y evitar pérdida de jobs/documentos

set -euo pipefail

if ! sudo -n true 2>/dev/null; then
  echo "❌ Este script requiere permisos de sudo"
  exit 1
fi

echo "🔧 Corrigiendo política de evicción de Redis..."

# Cambiar la política en caliente (sin reiniciar)
redis-cli CONFIG SET maxmemory-policy noeviction

# Verificar que se aplicó
CURRENT_POLICY=$(redis-cli CONFIG GET maxmemory-policy | tail -n1)
if [ "$CURRENT_POLICY" = "noeviction" ]; then
  echo "✅ Política cambiada correctamente a noeviction"
else
  echo "⚠️  La política actual es: $CURRENT_POLICY"
fi

# Persistir el cambio en el archivo de configuración
sudo sed -i 's/^maxmemory-policy .*/maxmemory-policy noeviction/' /etc/redis/redis.conf

# Verificar que el cambio se guardó
if grep -q "^maxmemory-policy noeviction" /etc/redis/redis.conf; then
  echo "✅ Configuración persistida en /etc/redis/redis.conf"
else
  echo "⚠️  No se encontró la línea en redis.conf, puede que necesite añadirse manualmente"
fi

# Reiniciar Redis para aplicar cambios persistentes
echo "🔄 Reiniciando Redis..."
sudo systemctl restart redis-server

# Verificar que Redis está corriendo
sleep 2
if systemctl is-active --quiet redis-server; then
  echo "✅ Redis está corriendo correctamente"
  
  # Verificar política final
  FINAL_POLICY=$(redis-cli CONFIG GET maxmemory-policy | tail -n1)
  echo "📊 Política de evicción actual: $FINAL_POLICY"
  
  if [ "$FINAL_POLICY" = "noeviction" ]; then
    echo ""
    echo "✅ ¡Todo correcto! La política de evicción está configurada como noeviction"
    echo "   Esto evitará que Redis elimine jobs/documentos cuando se llene la memoria"
  else
    echo "⚠️  La política sigue siendo: $FINAL_POLICY"
    echo "   Puede que necesites revisar la configuración manualmente"
  fi
else
  echo "❌ Error: Redis no está corriendo después del reinicio"
  exit 1
fi

