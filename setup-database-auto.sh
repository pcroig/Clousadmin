#!/bin/bash
# Script automático para configurar base de datos usando usuario postgres

echo "🔧 Configurando base de datos PostgreSQL automáticamente..."

# Cargar variables de entorno
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

# Extraer información de la URL actual
DB_URL=$(echo "$DATABASE_URL" | sed 's|postgresql://||')
DB_USER=$(echo "$DB_URL" | cut -d: -f1)
DB_PASS=$(echo "$DB_URL" | cut -d: -f2 | cut -d@ -f1)
DB_HOST=$(echo "$DB_URL" | cut -d@ -f2 | cut -d: -f1)
DB_PORT=$(echo "$DB_URL" | cut -d: -f3 | cut -d/ -f1)
DB_NAME=$(echo "$DB_URL" | cut -d/ -f2 | cut -d? -f1)

echo "📋 Configuración detectada:"
echo "   Usuario actual: $DB_USER"
echo "   Base de datos: $DB_NAME"
echo ""
echo "🔐 Intentando usar usuario 'postgres'..."
echo ""

# Intentar conectarse como postgres sin contraseña primero
if psql -U postgres -h localhost -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    POSTGRES_PASS=""
    echo "✅ Conexión exitosa sin contraseña"
elif [ -f .env.local ]; then
    # Intentar con .env.local
    export $(grep -v '^#' .env.local | grep DATABASE_URL | xargs)
    DB_LOCAL_URL=$(echo "$DATABASE_URL" | sed 's|postgresql://||')
    POSTGRES_USER=$(echo "$DB_LOCAL_URL" | cut -d: -f1)
    POSTGRES_PASS=$(echo "$DB_LOCAL_URL" | cut -d: -f2 | cut -d@ -f1)
    
    if [ "$POSTGRES_USER" = "postgres" ]; then
        echo "✅ Usando credenciales de .env.local"
    else
        echo "⚠️  Necesitas ingresar la contraseña de postgres manualmente"
        echo ""
        echo "Ejecuta:"
        echo "  psql -U postgres -c \"CREATE DATABASE clousadmin;\""
        echo ""
        echo "O actualiza .env con:"
        echo "  DATABASE_URL=\"postgresql://postgres:TU_PASSWORD@localhost:5432/clousadmin\""
        exit 1
    fi
else
    echo "⚠️  No se pudo conectar sin contraseña"
    echo ""
    echo "Por favor, crea la base de datos manualmente:"
    echo "  psql -U postgres -c \"CREATE DATABASE clousadmin;\""
    echo ""
    echo "O actualiza .env con la contraseña de postgres:"
    echo "  DATABASE_URL=\"postgresql://postgres:TU_PASSWORD@localhost:5432/clousadmin\""
    exit 1
fi

# Crear base de datos
echo "📦 Creando base de datos '$DB_NAME'..."
if [ -z "$POSTGRES_PASS" ]; then
    psql -U postgres -h localhost -c "CREATE DATABASE $DB_NAME;" 2>/dev/null && \
        echo "✅ Base de datos creada" || \
        echo "ℹ️  Base de datos ya existe (continuando...)"
    
    # Actualizar .env para usar postgres
    echo "📝 Actualizando .env para usar usuario 'postgres'..."
    sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://postgres@localhost:5432/$DB_NAME\"|g" .env
else
    PGPASSWORD="$POSTGRES_PASS" psql -U postgres -h localhost -c "CREATE DATABASE $DB_NAME;" 2>/dev/null && \
        echo "✅ Base de datos creada" || \
        echo "ℹ️  Base de datos ya existe (continuando...)"
    
    # Actualizar .env para usar postgres con contraseña
    echo "📝 Actualizando .env para usar usuario 'postgres'..."
    sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://postgres:${POSTGRES_PASS}@localhost:5432/$DB_NAME\"|g" .env
fi

echo ""
echo "🧪 Probando conexión..."
export $(grep -v '^#' .env | grep DATABASE_URL | xargs)

if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa!"
    echo ""
    echo "🚀 Ahora puedes ejecutar:"
    echo "   npx prisma migrate dev"
else
    echo "❌ Error de conexión"
    echo ""
    echo "Por favor, configura manualmente el DATABASE_URL en .env con:"
    echo "  DATABASE_URL=\"postgresql://postgres:TU_PASSWORD@localhost:5432/clousadmin\""
    exit 1
fi









