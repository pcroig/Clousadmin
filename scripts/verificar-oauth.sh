#!/bin/bash

# ========================================
# Script de Verificación de Google OAuth
# ========================================
# Verifica que las variables de Google OAuth estén configuradas correctamente

set -e

echo "🔍 VERIFICACIÓN DE GOOGLE OAUTH"
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

# 1. Verificar archivo .env
echo "📄 Verificando archivo .env..."
if [ -f ".env.local" ]; then
    ENV_FILE=".env.local"
elif [ -f ".env" ]; then
    ENV_FILE=".env"
else
    echo -e "${RED}❌ No se encontró archivo .env.local ni .env${NC}"
    echo "   Crea uno de estos archivos con las variables necesarias."
    exit 1
fi

check "Archivo de entorno encontrado: $ENV_FILE"
echo ""

# 2. Verificar GOOGLE_CLIENT_ID
echo "🔑 Verificando GOOGLE_CLIENT_ID..."
if grep -q "^GOOGLE_CLIENT_ID=" "$ENV_FILE" 2>/dev/null; then
    CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "your-google-client-id.apps.googleusercontent.com" ]; then
        if [[ "$CLIENT_ID" == *".apps.googleusercontent.com"* ]]; then
            check "GOOGLE_CLIENT_ID configurado correctamente"
            echo "   Valor: ${CLIENT_ID:0:30}..."
        else
            warn "GOOGLE_CLIENT_ID no tiene el formato esperado (debe terminar en .apps.googleusercontent.com)"
        fi
    else
        warn "GOOGLE_CLIENT_ID está vacío o tiene el valor por defecto"
    fi
else
    echo -e "${RED}❌ GOOGLE_CLIENT_ID no encontrado en $ENV_FILE${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Verificar GOOGLE_CLIENT_SECRET
echo "🔐 Verificando GOOGLE_CLIENT_SECRET..."
if grep -q "^GOOGLE_CLIENT_SECRET=" "$ENV_FILE" 2>/dev/null; then
    CLIENT_SECRET=$(grep "^GOOGLE_CLIENT_SECRET=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$CLIENT_SECRET" ] && [ "$CLIENT_SECRET" != "your-google-client-secret" ]; then
        if [ ${#CLIENT_SECRET} -ge 20 ]; then
            check "GOOGLE_CLIENT_SECRET configurado correctamente"
            echo "   Longitud: ${#CLIENT_SECRET} caracteres"
        else
            warn "GOOGLE_CLIENT_SECRET parece demasiado corto (mínimo 20 caracteres recomendado)"
        fi
    else
        warn "GOOGLE_CLIENT_SECRET está vacío o tiene el valor por defecto"
    fi
else
    echo -e "${RED}❌ GOOGLE_CLIENT_SECRET no encontrado en $ENV_FILE${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. Verificar NEXTAUTH_SECRET
echo "🔒 Verificando NEXTAUTH_SECRET..."
if grep -q "^NEXTAUTH_SECRET=" "$ENV_FILE" 2>/dev/null; then
    NEXTAUTH_SECRET=$(grep "^NEXTAUTH_SECRET=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$NEXTAUTH_SECRET" ] && [ ${#NEXTAUTH_SECRET} -ge 32 ]; then
        check "NEXTAUTH_SECRET configurado correctamente"
    else
        warn "NEXTAUTH_SECRET debe tener al menos 32 caracteres"
    fi
else
    echo -e "${RED}❌ NEXTAUTH_SECRET no encontrado en $ENV_FILE${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 5. Verificar NEXT_PUBLIC_APP_URL
echo "🌐 Verificando NEXT_PUBLIC_APP_URL..."
if grep -q "^NEXT_PUBLIC_APP_URL=" "$ENV_FILE" 2>/dev/null; then
    APP_URL=$(grep "^NEXT_PUBLIC_APP_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$APP_URL" ]; then
        check "NEXT_PUBLIC_APP_URL configurado: $APP_URL"
        
        # Verificar que la URL de callback coincida
        EXPECTED_CALLBACK="${APP_URL}/api/auth/callback/google"
        echo "   Callback esperado: $EXPECTED_CALLBACK"
        echo ""
        echo "   ⚠️  IMPORTANTE: Asegúrate de que esta URL esté configurada en:"
        echo "      Google Cloud Console → APIs & Services → Credentials"
        echo "      → Tu OAuth 2.0 Client ID → Authorized redirect URIs"
    else
        warn "NEXT_PUBLIC_APP_URL está vacío"
    fi
else
    warn "NEXT_PUBLIC_APP_URL no encontrado (usará http://localhost:3000 por defecto)"
fi
echo ""

# Resumen
echo "=========================================="
echo "📊 Resumen de verificación"
echo "=========================================="
echo ""

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✅ ¡Todo está configurado correctamente!${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "1. Verifica que las URLs de callback estén configuradas en Google Cloud Console"
    echo "2. Reinicia el servidor si acabas de añadir las variables"
    echo "3. Prueba el login con Google en /login"
    exit 0
elif [ "$ERRORS" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Configuración completa con advertencias${NC}"
    echo "   Revisa las advertencias arriba"
    exit 0
else
    echo -e "${RED}❌ Hay $ERRORS error(es) que deben corregirse${NC}"
    echo ""
    echo "Para configurar Google OAuth:"
    echo "1. Ve a https://console.cloud.google.com/apis/credentials"
    echo "2. Crea un OAuth 2.0 Client ID"
    echo "3. Añade las credenciales a tu archivo $ENV_FILE:"
    echo ""
    echo "   GOOGLE_CLIENT_ID=\"tu-client-id.apps.googleusercontent.com\""
    echo "   GOOGLE_CLIENT_SECRET=\"tu-client-secret\""
    echo ""
    echo "4. Ver documentación completa en: docs/SETUP_GOOGLE_OAUTH.md"
    exit 1
fi


