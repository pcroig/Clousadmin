#!/bin/bash

# ========================================
# Script de Verificación de Producción
# ========================================
# Verifica que todo esté actualizado y funcionando correctamente

set -e

echo "🔍 VERIFICACIÓN COMPLETA DE PRODUCCIÓN"
echo "======================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Función para verificar
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

# 1. Verificar que estamos en el directorio correcto
echo "📁 Verificando directorio..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ No se encontró package.json. ¿Estás en el directorio correcto?${NC}"
    exit 1
fi
check "Directorio correcto"

# 2. Verificar estado de Git
echo ""
echo "🔀 Verificando estado de Git..."
cd /opt/clousadmin 2>/dev/null || cd "$(dirname "$0")/.."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main)
LOCAL_COMMIT=$(git rev-parse HEAD)

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
    check "Código sincronizado con origin/main"
else
    warn "Código local no coincide con origin/main"
    echo "   Local:  $LOCAL_COMMIT"
    echo "   Remote: $REMOTE_COMMIT"
fi

# Verificar archivos modificados
MODIFIED=$(git status --short | wc -l)
if [ "$MODIFIED" -gt 0 ]; then
    warn "Hay $MODIFIED archivo(s) modificado(s) localmente"
    git status --short | head -10
fi

# 3. Verificar archivos críticos
echo ""
echo "📄 Verificando archivos críticos..."

CRITICAL_FILES=(
    "app/(auth)/login/login-form.tsx"
    "components/auth/WaitlistRequestForm.tsx"
    "app/(auth)/waitlist/actions.ts"
    "lib/auth.ts"
    "lib/prisma.ts"
    "prisma/schema.prisma"
    "package.json"
    ".env"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        check "Archivo existe: $file"
    else
        warn "Archivo faltante: $file"
    fi
done

# 4. Verificar dependencias
echo ""
echo "📦 Verificando dependencias..."
if [ -d "node_modules" ]; then
    check "node_modules existe"
    
    # Verificar next-auth
    if [ -d "node_modules/next-auth" ]; then
        NEXT_AUTH_VERSION=$(grep '"next-auth"' package.json | cut -d'"' -f4)
        check "next-auth instalado (versión: $NEXT_AUTH_VERSION)"
    else
        warn "next-auth no está instalado"
    fi
else
    warn "node_modules no existe - ejecuta 'npm install'"
fi

# 5. Verificar migraciones
echo ""
echo "🗄️  Verificando migraciones..."
if [ -d "prisma/migrations" ]; then
    MIGRATION_COUNT=$(ls -1 prisma/migrations | grep -E '^[0-9]' | wc -l)
    check "Migraciones encontradas: $MIGRATION_COUNT"
    
    # Verificar migración específica
    if [ -d "prisma/migrations/20251122165000_add_empresas_activo_if_missing" ]; then
        check "Migración 20251122165000 presente"
    else
        warn "Migración 20251122165000 no encontrada"
    fi
else
    warn "Directorio de migraciones no existe"
fi

# 6. Verificar variables de entorno
echo ""
echo "🔐 Verificando variables de entorno..."
if [ -f ".env" ]; then
    check "Archivo .env existe"
    
    # Verificar variables críticas
    REQUIRED_VARS=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "NEXT_PUBLIC_APP_URL"
        "NODE_ENV"
        "ENCRYPTION_KEY"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            check "Variable $var definida"
        else
            warn "Variable $var no encontrada en .env"
        fi
    done
else
    warn "Archivo .env no existe"
fi

# 7. Verificar build
echo ""
echo "🏗️  Verificando build..."
if [ -d ".next" ]; then
    check "Directorio .next existe (aplicación compilada)"
    
    # Verificar que el build no sea muy antiguo
    BUILD_AGE=$(find .next -name "BUILD_ID" -mtime +1 2>/dev/null | wc -l)
    if [ "$BUILD_AGE" -gt 0 ]; then
        warn "Build puede estar desactualizado (más de 1 día)"
    fi
else
    warn "Directorio .next no existe - ejecuta 'npm run build'"
fi

# 8. Verificar componentes críticos
echo ""
echo "🧩 Verificando componentes críticos..."
COMPONENTS=(
    "components/auth/WaitlistRequestForm.tsx"
    "components/ui/button.tsx"
    "components/ui/dialog.tsx"
    "components/ui/input.tsx"
)

for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        check "Componente existe: $component"
    else
        warn "Componente faltante: $component"
    fi
done

# 9. Verificar conexión a base de datos (si es posible)
echo ""
echo "💾 Verificando conexión a base de datos..."
if command -v psql &> /dev/null && [ -f ".env" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"')
    if [ -n "$DATABASE_URL" ]; then
        # Intentar conectar (timeout de 2 segundos)
        timeout 2 psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null
        if [ $? -eq 0 ]; then
            check "Conexión a base de datos exitosa"
        else
            warn "No se pudo conectar a la base de datos"
        fi
    else
        warn "DATABASE_URL no está definida en .env"
    fi
else
    warn "No se puede verificar conexión (psql no disponible o .env no encontrado)"
fi

# 10. Resumen
echo ""
echo "======================================"
echo "📊 RESUMEN"
echo "======================================"
echo -e "${GREEN}✅ Verificaciones exitosas: $((10 - ERRORS - WARNINGS))${NC}"
if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Advertencias: $WARNINGS${NC}"
fi
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Errores: $ERRORS${NC}"
    echo ""
    echo "ACCIONES RECOMENDADAS:"
    echo "1. Ejecuta: git pull origin main"
    echo "2. Ejecuta: npm install"
    echo "3. Ejecuta: npm run build"
    echo "4. Reinicia la aplicación"
    exit 1
fi

if [ $WARNINGS -eq 0 ] && [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Todo está correcto!${NC}"
    exit 0
else
    echo ""
    echo "Revisa las advertencias arriba."
    exit 0
fi

