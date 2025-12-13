#!/bin/bash
# ========================================
# Configurar clave SSH para acceso root
# ========================================
# Ejecutar desde VNC Console del servidor como root
# Este script añade la clave pública SSH de Sofia

set -euo pipefail

# Verificar que somos root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Este script debe ejecutarse como root"
   exit 1
fi

echo "=========================================="
echo "CONFIGURACIÓN SSH KEY"
echo "=========================================="
echo ""

# Clave pública SSH de Sofia (desde Mac-mini.local)
PUBLIC_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCp142qrqqhJ6q21hkVtCiwPFUIjIFg9/7oiFJsW1igz28/IeebNNg5kokzpVVaPYYZ9rWeRhVhuobR10ARpMUOYm6gWY57D/ExZx26e2ADzIDJBRS9ni2udOyCQW8iop+hpA//zYLW81XrWsY2nQN0pgViBlBmSIOaHGAn4ICmx3WCmejlvFLHZJdudaU61v/VneUy1Tr/XX7cG43vSmZxdasD0op1fySnKqtOnFL/B83azY7k4w8lkUAMcO5W5LksOtLJbFYcNjqQ62dFT6Q0rGSlRGJWX90r6V2nMBAP7G5jg4nI9hXNeRHpn+UApCNmGmCcKbICz7Hy00vIDdDcjdqgt58muqd06MgU3PID0Oafz0Z9VJ4ZmqrQIa72okI6MiQNIsh13FfPcMpFCUFe6dL2mfJUTKjMYHXUFI+OZNAf3NSfdZNPZEIQlEPQFVpSzqhQCUX0ce2RuT9PDkzpp74nSvuulchMVLcP4BotQFgww2Pu4YqiLA0wP0qszTP0lp6NGCzgTZWRKo9KMhdeRVWsvRQtQ7RSb4ShAQPftjOcgLlnSUgCCm81ahg0z+tK5FpX65tdDysnoqMJEoQtvJNP+31Hyu1tvXIp2sEv9balpwSN/NVY6axI9Eoa2Pwdt5eLJQAdlnB/EXpKvaOArYiDAk0pUcgCs8YcdVO4OQ== sofiaroig@Mac-mini.local"

# 1. Crear directorio .ssh si no existe
echo "1️⃣  Creando directorio /root/.ssh..."
mkdir -p /root/.ssh
chmod 700 /root/.ssh
echo "✅ Directorio creado con permisos 700"

# 2. Backup de authorized_keys anterior si existe
if [[ -f /root/.ssh/authorized_keys ]]; then
  echo ""
  echo "2️⃣  Haciendo backup de authorized_keys existente..."
  cp /root/.ssh/authorized_keys "/root/.ssh/authorized_keys.backup.$(date +%Y%m%d_%H%M%S)"
  echo "✅ Backup creado"
fi

# 3. Añadir clave pública
echo ""
echo "3️⃣  Añadiendo clave pública SSH..."

# Verificar si la clave ya existe
if grep -q "sofiaroig@Mac-mini.local" /root/.ssh/authorized_keys 2>/dev/null; then
  echo "⚠️  La clave ya existe en authorized_keys"
  echo "   Reemplazando con la versión actualizada..."
  # Eliminar la línea existente y añadir la nueva
  grep -v "sofiaroig@Mac-mini.local" /root/.ssh/authorized_keys > /root/.ssh/authorized_keys.tmp || true
  echo "$PUBLIC_KEY" >> /root/.ssh/authorized_keys.tmp
  mv /root/.ssh/authorized_keys.tmp /root/.ssh/authorized_keys
else
  # Añadir la clave
  echo "$PUBLIC_KEY" >> /root/.ssh/authorized_keys
fi

chmod 600 /root/.ssh/authorized_keys
echo "✅ Clave pública añadida"

# 4. Verificar configuración
echo ""
echo "4️⃣  Verificando configuración..."
echo "Permisos /root/.ssh:"
ls -ld /root/.ssh
echo ""
echo "Permisos /root/.ssh/authorized_keys:"
ls -l /root/.ssh/authorized_keys
echo ""
echo "Número de claves en authorized_keys: $(wc -l < /root/.ssh/authorized_keys)"
echo ""
echo "Primeros 80 caracteres de la clave añadida:"
grep "sofiaroig@Mac-mini.local" /root/.ssh/authorized_keys | cut -c1-80

# 5. Test de configuración SSH
echo ""
echo "5️⃣  Verificando configuración de SSH..."

# Verificar que SSH permite autenticación por clave pública
if grep -q "^PubkeyAuthentication yes" /etc/ssh/sshd_config; then
  echo "✅ PubkeyAuthentication está habilitado"
elif grep -q "^PubkeyAuthentication no" /etc/ssh/sshd_config; then
  echo "⚠️  PubkeyAuthentication está deshabilitado"
  echo "   Habilitando..."
  sed -i 's/^PubkeyAuthentication no/PubkeyAuthentication yes/' /etc/ssh/sshd_config
  echo "✅ Habilitado. Necesitas reiniciar SSH: systemctl restart ssh"
else
  echo "✅ PubkeyAuthentication no está configurado (usa default: yes)"
fi

echo ""
echo "=========================================="
echo "✅ CONFIGURACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Si SSH no está corriendo, ejecútalo:"
echo "   systemctl restart ssh"
echo ""
echo "2. Verifica que SSH está escuchando:"
echo "   ss -tlnp | grep :22"
echo ""
echo "3. Desde tu Mac, prueba la conexión:"
echo "   ssh root@46.224.70.156"
echo ""
echo "Si sigue sin funcionar, ejecuta el diagnóstico completo:"
echo "   ./scripts/hetzner/diagnostico-ssh.sh"
echo ""
