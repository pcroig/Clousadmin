#!/bin/bash
# Script para configurar la base de datos PostgreSQL

echo "🔧 Configurando base de datos PostgreSQL para Clousadmin"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cargar variables de entorno
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

# Extraer información de la URL
DB_URL=$(echo "$DATABASE_URL" | sed 's|postgresql://||')
DB_USER=$(echo "$DB_URL" | cut -d: -f1)
DB_PASS=$(echo "$DB_URL" | cut -d: -f2 | cut -d@ -f1)
DB_HOST=$(echo "$DB_URL" | cut -d@ -f2 | cut -d: -f1)
DB_PORT=$(echo "$DB_URL" | cut -d: -f3 | cut -d/ -f1)
DB_NAME=$(echo "$DB_URL" | cut -d/ -f2 | cut -d? -f1)

echo "📋 Información detectada:"
echo "   Usuario: $DB_USER"
echo "   Base de datos: $DB_NAME"
echo "   Host: $DB_HOST"
echo "   Puerto: ${DB_PORT:-5432}"
echo ""

# Preguntar qué hacer
echo "¿Qué quieres hacer?"
echo "  1) Crear usuario '$DB_USER' y base de datos '$DB_NAME'"
echo "  2) Usar usuario 'postgres' existente (recomendado para desarrollo)"
echo "  3) Salir"
echo ""
read -p "Selecciona opción (1-3): " option

case $option in
    1)
        echo ""
        echo "⚠️  Necesitarás la contraseña del superusuario 'postgres'"
        echo ""
        # Crear usuario
        psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || \
            echo -e "${YELLOW}⚠️  Usuario ya existe o error al crearlo${NC}"
        
        # Crear base de datos
        psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || \
            echo -e "${YELLOW}⚠️  Base de datos ya existe o error al crearla${NC}"
        
        # Dar permisos
        psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null
        
        echo -e "${GREEN}✅ Usuario y base de datos configurados${NC}"
        ;;
    2)
        echo ""
        echo "📝 Actualizando .env para usar usuario 'postgres'..."
        read -sp "Ingresa la contraseña de 'postgres': " postgres_pass
        echo ""
        
        # Actualizar .env con postgres
        if [ -f .env ]; then
            sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://postgres:${postgres_pass}@localhost:5432/clousadmin\"|g" .env
            echo -e "${GREEN}✅ .env actualizado${NC}"
        fi
        
        # Crear base de datos si no existe
        PGPASSWORD="$postgres_pass" psql -U postgres -h localhost -c "CREATE DATABASE clousadmin;" 2>/dev/null || \
            echo -e "${YELLOW}⚠️  Base de datos ya existe${NC}"
        
        echo -e "${GREEN}✅ Configuración completada. Usa 'postgres' como usuario.${NC}"
        ;;
    3)
        echo "👋 Saliendo..."
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Opción inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo "🧪 Probando conexión..."
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión exitosa!${NC}"
    echo ""
    echo "🚀 Ahora puedes ejecutar:"
    echo "   npx prisma migrate dev"
else
    echo -e "${RED}❌ Error de conexión. Verifica las credenciales.${NC}"
    exit 1
fi


