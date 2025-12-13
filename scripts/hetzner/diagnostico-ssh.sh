#!/bin/bash
# ========================================
# Diagnóstico completo de SSH en servidor Hetzner
# ========================================
# Ejecutar desde VNC Console del servidor
#
# Este script diagnostica por qué SSH no está funcionando

set -euo pipefail

echo "=========================================="
echo "DIAGNÓSTICO SSH - Hetzner Server"
echo "=========================================="
echo ""

# 1. Verificar si SSH está instalado
echo "1️⃣  Verificando instalación de SSH..."
if command -v sshd >/dev/null 2>&1; then
  echo "✅ SSH está instalado: $(which sshd)"
  sshd -V 2>&1 | head -1 || echo "Versión no disponible"
else
  echo "❌ SSH NO está instalado"
  echo "   Instalar con: apt update && apt install -y openssh-server"
  exit 1
fi
echo ""

# 2. Verificar estado del servicio
echo "2️⃣  Verificando estado del servicio SSH..."
if systemctl is-active --quiet ssh; then
  echo "✅ Servicio SSH está ACTIVO"
elif systemctl is-active --quiet sshd; then
  echo "✅ Servicio SSHD está ACTIVO"
else
  echo "❌ Servicio SSH NO está corriendo"
  echo ""
  echo "Estado detallado:"
  systemctl status ssh --no-pager -l || systemctl status sshd --no-pager -l || true
fi
echo ""

# 3. Verificar si está habilitado para arrancar en boot
echo "3️⃣  Verificando si SSH está habilitado en boot..."
if systemctl is-enabled --quiet ssh 2>/dev/null; then
  echo "✅ SSH está habilitado en boot"
elif systemctl is-enabled --quiet sshd 2>/dev/null; then
  echo "✅ SSHD está habilitado en boot"
else
  echo "❌ SSH NO está habilitado en boot"
  echo "   Habilitar con: systemctl enable ssh"
fi
echo ""

# 4. Verificar puerto de escucha
echo "4️⃣  Verificando puerto de escucha..."
if ss -tlnp | grep -q ':22 '; then
  echo "✅ SSH está escuchando en puerto 22:"
  ss -tlnp | grep ':22 '
else
  echo "❌ SSH NO está escuchando en puerto 22"
  echo ""
  echo "Puertos SSH activos:"
  ss -tlnp | grep sshd || echo "   Ningún puerto SSH encontrado"
fi
echo ""

# 5. Verificar firewall (ufw)
echo "5️⃣  Verificando firewall (ufw)..."
if command -v ufw >/dev/null 2>&1; then
  ufw_status=$(ufw status | head -1)
  echo "Estado UFW: $ufw_status"

  if echo "$ufw_status" | grep -q "active"; then
    echo "UFW está activo. Reglas para SSH:"
    ufw status | grep -E '22|OpenSSH' || echo "   ⚠️  Puerto 22 NO está permitido"
  else
    echo "✅ UFW está inactivo (no bloquea)"
  fi
else
  echo "✅ UFW no instalado (no bloquea)"
fi
echo ""

# 6. Verificar iptables
echo "6️⃣  Verificando iptables..."
if iptables -L INPUT -n | grep -q 'DROP.*dpt:22'; then
  echo "❌ iptables está bloqueando puerto 22:"
  iptables -L INPUT -n | grep 'dpt:22'
else
  echo "✅ iptables no bloquea puerto 22"
fi
echo ""

# 7. Verificar configuración de sshd
echo "7️⃣  Verificando configuración de sshd..."
if [[ -f /etc/ssh/sshd_config ]]; then
  echo "Puerto configurado:"
  grep -E "^Port " /etc/ssh/sshd_config || echo "   Puerto por defecto (22)"

  echo "PermitRootLogin:"
  grep -E "^PermitRootLogin" /etc/ssh/sshd_config || echo "   No configurado explícitamente"

  echo "PasswordAuthentication:"
  grep -E "^PasswordAuthentication" /etc/ssh/sshd_config || echo "   No configurado explícitamente"

  echo "PubkeyAuthentication:"
  grep -E "^PubkeyAuthentication" /etc/ssh/sshd_config || echo "   No configurado explícitamente"
else
  echo "❌ No se encontró /etc/ssh/sshd_config"
fi
echo ""

# 8. Verificar authorized_keys
echo "8️⃣  Verificando authorized_keys de root..."
if [[ -f /root/.ssh/authorized_keys ]]; then
  echo "✅ Archivo existe"
  echo "Permisos:"
  ls -la /root/.ssh/authorized_keys
  echo "Número de claves: $(wc -l < /root/.ssh/authorized_keys)"
  echo "Primeros 50 caracteres de la primera clave:"
  head -1 /root/.ssh/authorized_keys | cut -c1-50
else
  echo "❌ No existe /root/.ssh/authorized_keys"
fi
echo ""

# 9. Verificar logs recientes
echo "9️⃣  Últimas líneas del log de SSH..."
if [[ -f /var/log/auth.log ]]; then
  echo "Últimos 10 eventos SSH:"
  grep -i ssh /var/log/auth.log | tail -10 || echo "   Sin eventos SSH recientes"
elif [[ -f /var/log/secure ]]; then
  echo "Últimos 10 eventos SSH:"
  grep -i ssh /var/log/secure | tail -10 || echo "   Sin eventos SSH recientes"
else
  echo "⚠️  No se encontraron logs de autenticación"
fi
echo ""

# 10. Test de conectividad local
echo "🔟 Test de conectividad local..."
if nc -zv localhost 22 2>&1 | grep -q succeeded; then
  echo "✅ Puerto 22 accesible desde localhost"
else
  echo "❌ Puerto 22 NO accesible desde localhost"
fi
echo ""

# RESUMEN Y RECOMENDACIONES
echo "=========================================="
echo "RESUMEN"
echo "=========================================="

# Verificar problemas críticos
problems=()

if ! systemctl is-active --quiet ssh && ! systemctl is-active --quiet sshd; then
  problems+=("🔴 SSH no está corriendo")
fi

if ! systemctl is-enabled --quiet ssh 2>/dev/null && ! systemctl is-enabled --quiet sshd 2>/dev/null; then
  problems+=("🔴 SSH no está habilitado en boot")
fi

if ! ss -tlnp | grep -q ':22 '; then
  problems+=("🔴 SSH no escucha en puerto 22")
fi

if command -v ufw >/dev/null 2>&1; then
  if ufw status | head -1 | grep -q "active"; then
    if ! ufw status | grep -qE '22|OpenSSH'; then
      problems+=("🟡 UFW activo pero puerto 22 no permitido")
    fi
  fi
fi

if [[ ! -f /root/.ssh/authorized_keys ]]; then
  problems+=("🟡 No hay authorized_keys configurado")
fi

if [[ ${#problems[@]} -eq 0 ]]; then
  echo "✅ No se encontraron problemas obvios"
  echo ""
  echo "Si aún no puedes conectar desde el exterior, verifica:"
  echo "  - Firewall de Hetzner Cloud (Security Groups)"
  echo "  - IP correcta del servidor"
else
  echo "Se encontraron los siguientes problemas:"
  printf '%s\n' "${problems[@]}"
  echo ""
  echo "Ejecuta: ./scripts/hetzner/fix-ssh.sh para intentar resolverlos"
fi

echo ""
echo "=========================================="
