#!/bin/bash
# ========================================
# Script de Configuración Inicial del Servidor Hetzner
# ========================================
# Configura el servidor desde cero para Clousadmin

set -e

# Flags
INSTALL_LOCAL_DB=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --local-db)
            INSTALL_LOCAL_DB=true
            shift
            ;;
        *)
            echo "⚠️  Flag desconocida: $1"
            echo "Uso: ./setup-server.sh [--local-db]"
            exit 1
            ;;
    esac
done

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

# 4. Instalar PostgreSQL (opcional, usar --local-db)
echo ""
if [[ "$INSTALL_LOCAL_DB" == true ]]; then
    echo "📦 Instalando PostgreSQL local..."
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
    echo "✅ PostgreSQL instalado"
else
    echo "✅ PostgreSQL ya está instalado"
    fi
else
    echo "ℹ️  Saltando instalación local de PostgreSQL."
    echo "    Recomendamos Hetzner Managed PostgreSQL o un servidor dedicado."
    echo "    Configura DATABASE_URL apuntando a la instancia gestionada."
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

# 6.1 Configurar rotación de logs (pm2-logrotate)
if command -v pm2 &> /dev/null; then
    echo "🌀 Configurando rotación de logs PM2..."
    pm2 install pm2-logrotate >/dev/null 2>&1 || true
    pm2 set pm2-logrotate:max_size 10M >/dev/null 2>&1 || true
    pm2 set pm2-logrotate:retain 10 >/dev/null 2>&1 || true
    pm2 set pm2-logrotate:compress true >/dev/null 2>&1 || true
    pm2 set pm2-logrotate:workerInterval 60 >/dev/null 2>&1 || true
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
if [[ "$INSTALL_LOCAL_DB" == true ]]; then
echo "   ✅ PostgreSQL $(psql --version 2>/dev/null || echo 'instalado')"
else
    echo "   ⚠️  PostgreSQL local no instalado (usa base de datos gestionada)"
fi
echo "   ✅ Redis $(redis-cli --version 2>/dev/null || echo 'instalado')"
echo "   ✅ PM2 $(pm2 --version 2>/dev/null || echo 'instalado')"
echo ""
echo "📝 Próximos pasos:"
NEXT_STEP=1
if [[ "$INSTALL_LOCAL_DB" == true ]]; then
    echo "   $NEXT_STEP. Configurar PostgreSQL local (crear base de datos y usuario)"
else
    echo "   $NEXT_STEP. Configurar conexión a la base de datos gestionada (DATABASE_URL)"
fi
NEXT_STEP=$((NEXT_STEP + 1))
echo "   $NEXT_STEP. Clonar tu repositorio"
NEXT_STEP=$((NEXT_STEP + 1))
echo "   $NEXT_STEP. Configurar variables de entorno (.env)"
NEXT_STEP=$((NEXT_STEP + 1))
echo "   $NEXT_STEP. Ejecutar migraciones: npx prisma migrate deploy"
NEXT_STEP=$((NEXT_STEP + 1))
echo "   $NEXT_STEP. Build de la aplicación: npm run build"
NEXT_STEP=$((NEXT_STEP + 1))
echo "   $NEXT_STEP. Iniciar con PM2: pm2 start npm --name clousadmin -- start"
echo ""
echo "📚 Ver documentación completa en: docs/DEPLOY_HETZNER.md"
echo ""







