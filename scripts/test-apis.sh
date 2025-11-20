#!/bin/bash
# Script para probar APIs básicas de Clousadmin

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
echo "🧪 Probando APIs de Clousadmin en: $BASE_URL"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para hacer requests
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    
    echo -n "Testing $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" || echo "000")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" || echo "000")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ OK (${http_code})${NC}"
        return 0
    elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
        echo -e "${YELLOW}⚠️  Requiere autenticación (${http_code})${NC}"
        return 0
    elif [ "$http_code" = "404" ]; then
        echo -e "${YELLOW}⚠️  Endpoint no encontrado (${http_code})${NC}"
        return 0
    elif [ "$http_code" = "000" ]; then
        echo -e "${RED}❌ Error de conexión${NC}"
        return 1
    else
        echo -e "${RED}❌ Error (${http_code})${NC}"
        return 1
    fi
}

# Verificar que el servidor esté corriendo
echo "Verificando que el servidor esté corriendo..."
if ! curl -s "$BASE_URL" > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo en $BASE_URL${NC}"
    echo "Inicia el servidor con: npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Servidor está corriendo${NC}"
echo ""

# Tests básicos (sin autenticación)
echo "=== Tests Básicos (sin autenticación) ==="
test_endpoint "GET" "/api/health" "Health check" || true
test_endpoint "GET" "/" "Página principal" || true
echo ""

# Tests que requieren autenticación (esperamos 401/403)
echo "=== Tests que Requieren Autenticación ==="
test_endpoint "GET" "/api/carpetas" "Obtener carpetas" || true
test_endpoint "GET" "/api/empleados" "Obtener empleados" || true
test_endpoint "GET" "/api/ausencias" "Obtener ausencias" || true
echo ""

# Resumen
echo "=== Resumen ==="
echo "✅ Tests básicos completados"
echo ""
echo "Nota: Los endpoints protegidos requieren autenticación."
echo "Para probar endpoints protegidos, necesitas:"
echo "  1. Iniciar sesión en la aplicación"
echo "  2. Obtener el token/cookie de sesión"
echo "  3. Usar el token en los headers de las requests"
echo ""
echo "Ejemplo con token:"
echo "  curl -H 'Authorization: Bearer YOUR_TOKEN' $BASE_URL/api/carpetas"















