#!/bin/bash
# ========================================
# Script de Instalación de Redis para Hetzner
# ========================================
# Instala y configura Redis en el servidor de producción

set -e

echo "🔴 Instalando Redis en servidor Hetzner..."
echo ""

# Verificar que estamos en Linux (no ejecutar en macOS)
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "⚠️  Este script está diseñado para ejecutarse en el servidor Hetzner (Linux)"
    echo "   No lo ejecutes en tu máquina local (macOS)"
    exit 1
fi

# Verificar que tenemos permisos de sudo
if ! sudo -n true 2>/dev/null; then
    echo "❌ Este script requiere permisos de sudo"
    exit 1
fi

# 1. Actualizar sistema
echo "📦 Actualizando sistema..."
sudo apt update
sudo apt upgrade -y

# 2. Instalar Redis
echo ""
echo "📦 Instalando Redis..."
sudo apt install redis-server -y

# 3. Configurar Redis
echo ""
echo "⚙️  Configurando Redis..."

# Backup de configuración original
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Configuraciones de seguridad
sudo sed -i 's/^# bind 127.0.0.1/bind 127.0.0.1/' /etc/redis/redis.conf
sudo sed -i 's/^protected-mode no/protected-mode yes/' /etc/redis/redis.conf

# Generar contraseña segura si no existe
if ! grep -q "^requirepass" /etc/redis/redis.conf; then
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    echo "requirepass $REDIS_PASSWORD" | sudo tee -a /etc/redis/redis.conf
    echo ""
    echo "✅ Contraseña de Redis generada: $REDIS_PASSWORD"
    echo "   ⚠️  GUARDA ESTA CONTRASEÑA - La necesitarás para REDIS_URL"
    echo ""
fi

# Optimizaciones para producción
sudo sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sudo sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

# 4. Habilitar y iniciar Redis
echo ""
echo "🚀 Iniciando Redis..."
sudo systemctl enable redis-server
sudo systemctl restart redis-server

# 5. Verificar instalación
echo ""
echo "🔍 Verificando instalación..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis está funcionando correctamente"
else
    echo "❌ Error: Redis no responde"
    exit 1
fi

# 6. Verificar estado del servicio
echo ""
echo "📊 Estado del servicio Redis:"
sudo systemctl status redis-server --no-pager | head -5

# 7. Mostrar información de conexión
echo ""
echo "=========================================="
echo "✅ Redis instalado correctamente"
echo "=========================================="
echo ""
echo "📝 Información de conexión:"
echo "   Host: localhost"
echo "   Puerto: 6379"
echo ""

# Obtener contraseña si existe
if grep -q "^requirepass" /etc/redis/redis.conf; then
    REDIS_PASS=$(grep "^requirepass" /etc/redis/redis.conf | cut -d' ' -f2)
    echo "   Contraseña: $REDIS_PASS"
    echo ""
    echo "   REDIS_URL para .env:"
    echo "   redis://:$REDIS_PASS@localhost:6379"
else
    echo "   Sin contraseña (solo conexiones locales)"
    echo ""
    echo "   REDIS_URL para .env:"
    echo "   redis://localhost:6379"
fi

echo ""
echo "🔒 Seguridad:"
echo "   - Redis solo acepta conexiones desde localhost"
echo "   - Protected mode activado"
echo ""
echo "📚 Próximos pasos:"
echo "   1. Guarda la contraseña de Redis (si se generó)"
echo "   2. Actualiza REDIS_URL en tu .env de producción"
echo "   3. Reinicia tu aplicación Next.js"
echo ""







