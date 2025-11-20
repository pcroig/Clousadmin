#!/bin/bash
# ========================================
# Script para verificar y corregir DATABASE_URL
# ========================================

echo "🔍 Verificando DATABASE_URL en .env"
echo "===================================="
echo ""

if [ ! -f .env ]; then
    echo "❌ Archivo .env no encontrado"
    exit 1
fi

# Buscar DATABASE_URL
if grep -q "^DATABASE_URL=" .env; then
    echo "✅ DATABASE_URL encontrada en .env"
    echo ""
    
    # Mostrar la línea actual (ocultando contraseña)
    CURRENT_URL=$(grep "^DATABASE_URL=" .env | head -1)
    SAFE_URL=$(echo "$CURRENT_URL" | sed 's/:[^@]*@/:****@/')
    echo "📋 URL actual: $SAFE_URL"
    echo ""
    
    # Extraer valores
    FULL_URL=$(echo "$CURRENT_URL" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    
    if [[ $FULL_URL == postgresql://* ]]; then
        # Extraer componentes
        USER=$(echo "$FULL_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
        PASSWORD=$(echo "$FULL_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
        HOST=$(echo "$FULL_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
        PORT=$(echo "$FULL_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
        DB_NAME=$(echo "$FULL_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
        
        echo "📊 Componentes extraídos:"
        echo "   Usuario: $USER"
        echo "   Host: $HOST"
        echo "   Puerto: $PORT"
        echo "   Base de datos: $DB_NAME"
        echo ""
        
        # Verificar formato
        ERRORS=0
        
        if [ -z "$USER" ]; then
            echo "❌ Usuario no encontrado en la URL"
            ERRORS=$((ERRORS + 1))
        fi
        
        if [ -z "$PASSWORD" ]; then
            echo "❌ Contraseña no encontrada en la URL"
            ERRORS=$((ERRORS + 1))
        fi
        
        if [ "$HOST" != "localhost" ] && [ "$HOST" != "127.0.0.1" ]; then
            echo "⚠️  Host es '$HOST' (esperado: localhost o 127.0.0.1)"
        fi
        
        if [ "$PORT" != "5432" ]; then
            echo "⚠️  Puerto es '$PORT' (esperado: 5432)"
        fi
        
        if [ -z "$DB_NAME" ]; then
            echo "❌ Nombre de base de datos no encontrado"
            ERRORS=$((ERRORS + 1))
        fi
        
        echo ""
        
        if [ $ERRORS -eq 0 ]; then
            echo "✅ Formato de DATABASE_URL es correcto"
            echo ""
            echo "🧪 Probando conexión..."
            
            if psql "$FULL_URL" -c "SELECT 1;" &> /dev/null; then
                echo "✅ Conexión exitosa!"
            else
                echo "❌ No se puede conectar. Posibles causas:"
                echo "   - PostgreSQL no está corriendo"
                echo "   - El usuario '$USER' no existe"
                echo "   - La contraseña es incorrecta"
                echo "   - La base de datos '$DB_NAME' no existe"
                echo ""
                echo "💡 Ejecuta: bash scripts/diagnostico-bd-servidor.sh"
            fi
        else
            echo "❌ Hay $ERRORS error(es) en el formato de DATABASE_URL"
            echo ""
            echo "📝 Formato correcto:"
            echo "   DATABASE_URL=\"postgresql://usuario:password@localhost:5432/nombre_db\""
            echo ""
            echo "💡 Ejemplo:"
            echo "   DATABASE_URL=\"postgresql://clousadmin_user:mi_password@localhost:5432/clousadmin\""
        fi
    else
        echo "❌ La URL no tiene el formato correcto (debe empezar con postgresql://)"
        echo ""
        echo "📝 Formato correcto:"
        echo "   DATABASE_URL=\"postgresql://usuario:password@localhost:5432/nombre_db\""
    fi
else
    echo "❌ DATABASE_URL no encontrada en .env"
    echo ""
    echo "💡 Añade esta línea al .env:"
    echo "   DATABASE_URL=\"postgresql://clousadmin_user:tu_password@localhost:5432/clousadmin\""
fi

echo ""





