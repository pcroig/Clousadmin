#!/bin/bash
# Script para instalar y configurar Redis en macOS

set -e

echo "🔴 Configurando Redis para Clousadmin..."

# Verificar si Redis ya está instalado
if command -v redis-server &> /dev/null; then
    echo "✅ Redis ya está instalado"
    redis-server --version
else
    echo "📦 Redis no está instalado. Instalando..."
    
    # Intentar con Homebrew
    if command -v brew &> /dev/null; then
        echo "Instalando Redis con Homebrew..."
        brew install redis
        brew services start redis
        echo "✅ Redis instalado y iniciado con Homebrew"
    else
        echo "❌ Homebrew no está instalado."
        echo ""
        echo "Opciones para instalar Redis:"
        echo ""
        echo "1. Instalar Homebrew (recomendado):"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        echo "   Luego ejecuta: brew install redis && brew services start redis"
        echo ""
        echo "2. Instalar Redis desde source:"
        echo "   Visita: https://redis.io/download"
        echo ""
        echo "3. Usar Docker (si tienes Docker instalado):"
        echo "   docker run -d -p 6379:6379 --name redis redis:latest"
        echo ""
        exit 1
    fi
fi

# Verificar que Redis esté corriendo
if redis-cli ping &> /dev/null; then
    echo "✅ Redis está corriendo correctamente"
    echo "   URL: redis://localhost:6379"
else
    echo "⚠️  Redis no está corriendo. Iniciando..."
    
    if command -v brew &> /dev/null; then
        brew services start redis
    else
        echo "Inicia Redis manualmente con: redis-server"
    fi
fi

echo ""
echo "✅ Configuración de Redis completada!"
echo "   Asegúrate de que REDIS_URL está en tu .env.local:"
echo "   REDIS_URL=\"redis://localhost:6379\""















