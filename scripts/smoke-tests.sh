#!/bin/bash
# ========================================
# Smoke tests básicos para Clousadmin
# ========================================
# Uso:
#   BASE_URL="https://app.tudominio.com" ./scripts/smoke-tests.sh

set -euo pipefail

if [[ -z "${BASE_URL:-}" ]]; then
  echo "❌ Debes definir BASE_URL (ej: https://app.tudominio.com)"
  exit 1
fi

function check_endpoint() {
  local name=$1
  local url=$2
  local expected=${3:-200}

  echo "→ ${name} (${url})"
  local status
  status=$(curl -sk -o /dev/null -w "%{http_code}" "$url" || true)
  if [[ "$status" == "$expected" ]]; then
    echo "   ✅ ${status}"
  else
    echo "   ❌ Esperado ${expected}, recibido ${status}"
    exit 1
  }
}

echo "🏁 Iniciando smoke tests contra ${BASE_URL}"

# Público
check_endpoint "Healthcheck" "${BASE_URL}/api/health"
check_endpoint "Login" "${BASE_URL}/login" 200
check_endpoint "Signup" "${BASE_URL}/signup" 200
check_endpoint "Waitlist" "${BASE_URL}/waitlist" 200

echo "ℹ️ Rutas protegidas requieren sesión; validar manualmente:"
echo "   - /hr/dashboard"
echo "   - /hr/documentos"
echo "   - /hr/payroll"
echo "   - /empleado/mi-espacio"

echo "✅ Smoke tests completados"

