#!/bin/bash
# ========================================
# Script de Diagnóstico - Base de Datos en Servidor
# ========================================
# Ejecutar en el servidor para diagnosticar problemas de conexión

echo "🔍 DIAGNÓSTICO DE BASE DE DATOS"
echo "================================"
echo ""

# 1. Verificar si PostgreSQL está instalado
echo "1️⃣ Verificando instalación de PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL está instalado: $(psql --version)"
else
    echo "❌ PostgreSQL NO está instalado"
    echo "   Instala con: sudo apt install postgresql postgresql-contrib"
    exit 1
fi
echo ""

# 2. Verificar si PostgreSQL está corriendo
echo "2️⃣ Verificando si PostgreSQL está corriendo..."
if sudo systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL está corriendo"
    sudo systemctl status postgresql --no-pager -l | head -5
else
    echo "❌ PostgreSQL NO está corriendo"
    echo "   Inicia con: sudo systemctl start postgresql"
    echo "   Habilita con: sudo systemctl enable postgresql"
    exit 1
fi
echo ""

# 3. Verificar en qué puerto está escuchando
echo "3️⃣ Verificando puerto de PostgreSQL..."
PG_PORT=$(sudo -u postgres psql -t -c "SHOW port;" 2>/dev/null | xargs)
if [ -n "$PG_PORT" ]; then
    echo "✅ PostgreSQL está escuchando en el puerto: $PG_PORT"
else
    echo "⚠️  No se pudo determinar el puerto (probablemente 5432)"
    PG_PORT=5432
fi
echo ""

# 4. Verificar conexiones permitidas
echo "4️⃣ Verificando configuración de conexiones..."
PG_HBA=$(sudo cat /etc/postgresql/*/main/pg_hba.conf 2>/dev/null | grep -v "^#" | grep -v "^$" | head -3)
if [ -n "$PG_HBA" ]; then
    echo "📋 Configuración de pg_hba.conf (primeras líneas):"
    echo "$PG_HBA" | while IFS= read -r line; do
        echo "   $line"
    done
else
    echo "⚠️  No se pudo leer pg_hba.conf"
fi
echo ""

# 5. Verificar si puede conectarse como postgres
echo "5️⃣ Probando conexión como usuario postgres..."
if sudo -u postgres psql -c "SELECT version();" &> /dev/null; then
    echo "✅ Conexión local funciona"
    sudo -u postgres psql -c "SELECT version();" | head -1
else
    echo "❌ No se puede conectar como postgres"
fi
echo ""

# 6. Verificar bases de datos existentes
echo "6️⃣ Bases de datos existentes:"
sudo -u postgres psql -c "\l" 2>/dev/null | grep -E "^\s|Name|----" | head -10
echo ""

# 7. Verificar usuarios existentes
echo "7️⃣ Usuarios existentes:"
sudo -u postgres psql -c "\du" 2>/dev/null
echo ""

# 8. Verificar DATABASE_URL en .env
echo "8️⃣ Verificando DATABASE_URL en .env..."
if [ -f .env ]; then
    if grep -q "DATABASE_URL" .env; then
        echo "✅ DATABASE_URL encontrada en .env"
        DB_URL=$(grep "DATABASE_URL" .env | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        # Ocultar contraseña
        DB_URL_SAFE=$(echo "$DB_URL" | sed 's/:[^@]*@/:****@/')
        echo "   $DB_URL_SAFE"
        
        # Extraer componentes
        if [[ $DB_URL == postgresql://* ]]; then
            # Extraer host
            HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
            PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
            
            echo ""
            echo "   Host: $HOST"
            echo "   Port: $PORT"
            echo "   Database: $DB_NAME"
            
            # Verificar si la base de datos existe
            if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
                echo "   ✅ La base de datos '$DB_NAME' existe"
            else
                echo "   ❌ La base de datos '$DB_NAME' NO existe"
                echo "      Créala con: CREATE DATABASE $DB_NAME;"
            fi
        fi
    else
        echo "❌ DATABASE_URL NO encontrada en .env"
    fi
else
    echo "❌ Archivo .env no encontrado"
fi
echo ""

# 9. Probar conexión con psql usando DATABASE_URL
echo "9️⃣ Probando conexión con psql..."
if [ -f .env ] && grep -q "DATABASE_URL" .env; then
    DB_URL=$(grep "DATABASE_URL" .env | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        echo "✅ Conexión exitosa usando DATABASE_URL"
    else
        echo "❌ No se puede conectar usando DATABASE_URL"
        echo "   Error:"
        psql "$DB_URL" -c "SELECT 1;" 2>&1 | head -3
    fi
else
    echo "⚠️  No se puede probar (DATABASE_URL no encontrada)"
fi
echo ""

# 10. Resumen y recomendaciones
echo "================================"
echo "📋 RESUMEN Y RECOMENDACIONES"
echo "================================"
echo ""

if sudo systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL está corriendo"
else
    echo "❌ PostgreSQL NO está corriendo - EJECUTA: sudo systemctl start postgresql"
fi

if [ -f .env ] && grep -q "DATABASE_URL" .env; then
    DB_URL=$(grep "DATABASE_URL" .env | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [[ $DB_URL == postgresql://* ]]; then
        HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
        if [ "$HOST" = "localhost" ] || [ "$HOST" = "127.0.0.1" ]; then
            echo "✅ DATABASE_URL apunta a localhost (correcto para servidor local)"
        else
            echo "⚠️  DATABASE_URL apunta a $HOST (verifica que sea correcto)"
        fi
    fi
else
    echo "❌ DATABASE_URL no configurada en .env"
    echo "   Configura: DATABASE_URL=\"postgresql://usuario:password@localhost:5432/clousadmin\""
fi

echo ""
echo "💡 Próximos pasos si hay problemas:"
echo "   1. Si PostgreSQL no está corriendo: sudo systemctl start postgresql"
echo "   2. Si la base de datos no existe, créala:"
echo "      sudo -u postgres psql"
echo "      CREATE DATABASE clousadmin;"
echo "   3. Si el usuario no existe, créalo:"
echo "      CREATE USER clousadmin_user WITH PASSWORD 'tu_password';"
echo "      GRANT ALL PRIVILEGES ON DATABASE clousadmin TO clousadmin_user;"
echo "   4. Verifica el .env tiene la DATABASE_URL correcta"
echo ""








