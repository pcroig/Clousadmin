#!/bin/bash
# ========================================
# Script de Configuración Inicial del Servidor Hetzner
# ========================================
# Configura el servidor desde cero para Clousadmin

set -e

echo "🚀 Configurando servidor Hetzner para Clousadmin..."
echo ""

# Verificar que estamos en Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "⚠️  Este script está diseñado para ejecutarse en el servidor Hetzner (Linux)"
    exit 1
fi

# Verificar permisos de sudo
if ! sudo -n true 2>/dev/null; then
    echo "❌ Este script requiere permisos de sudo"
    exit 1
fi

# 1. Actualizar sistema
echo "📦 Actualizando sistema..."
sudo apt update
sudo apt upgrade -y

# 2. Instalar herramientas básicas
echo ""
echo "📦 Instalando herramientas básicas..."
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# 3. Instalar Node.js 20.x (LTS)
echo ""
echo "📦 Instalando Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✅ Node.js ya está instalado: $(node --version)"
fi

# 4. Instalar PostgreSQL
echo ""
echo "📦 Instalando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
    echo "✅ PostgreSQL instalado"
else
    echo "✅ PostgreSQL ya está instalado"
fi

# 5. Instalar Redis (usando script separado)
echo ""
echo "📦 Instalando Redis..."
if [ -f "$(dirname "$0")/setup-redis.sh" ]; then
    bash "$(dirname "$0")/setup-redis.sh"
else
    echo "⚠️  Script de Redis no encontrado, instalando manualmente..."
    sudo apt install -y redis-server
    sudo systemctl enable redis-server
    sudo systemctl start redis-server
fi

# 6. Instalar PM2 (gestor de procesos)
echo ""
echo "📦 Instalando PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    pm2 startup systemd -u $USER --hp $HOME
    echo "✅ PM2 instalado"
else
    echo "✅ PM2 ya está instalado"
fi

# 7. Configurar firewall (UFW)
echo ""
echo "🔥 Configurando firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw --force enable
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS
    echo "✅ Firewall configurado"
else
    echo "⚠️  UFW no está instalado, saltando configuración de firewall"
fi

# 8. Crear usuario para la aplicación (opcional)
echo ""
read -p "¿Crear usuario dedicado para la aplicación? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Nombre del usuario (default: clousadmin): " APP_USER
    APP_USER=${APP_USER:-clousadmin}
    
    if ! id "$APP_USER" &>/dev/null; then
        sudo adduser --disabled-password --gecos "" $APP_USER
        echo "✅ Usuario $APP_USER creado"
    else
        echo "✅ Usuario $APP_USER ya existe"
    fi
fi

# 9. Resumen
echo ""
echo "=========================================="
echo "✅ Configuración del servidor completada"
echo "=========================================="
echo ""
echo "📋 Software instalado:"
echo "   ✅ Node.js $(node --version)"
echo "   ✅ npm $(npm --version)"
echo "   ✅ PostgreSQL $(psql --version 2>/dev/null || echo 'instalado')"
echo "   ✅ Redis $(redis-cli --version 2>/dev/null || echo 'instalado')"
echo "   ✅ PM2 $(pm2 --version 2>/dev/null || echo 'instalado')"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Configurar PostgreSQL (crear base de datos y usuario)"
echo "   2. Clonar tu repositorio"
echo "   3. Configurar variables de entorno (.env)"
echo "   4. Ejecutar migraciones: npx prisma migrate deploy"
echo "   5. Build de la aplicación: npm run build"
echo "   6. Iniciar con PM2: pm2 start npm --name clousadmin -- start"
echo ""
echo "📚 Ver documentación completa en: docs/DEPLOY_HETZNER.md"
echo ""



