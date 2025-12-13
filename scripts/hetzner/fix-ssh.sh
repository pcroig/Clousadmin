#!/bin/bash
# ========================================
# Reparación automática de SSH
# ========================================
# Ejecutar desde VNC Console del servidor
# Requiere permisos de root

set -euo pipefail

echo "=========================================="
echo "REPARACIÓN SSH - Hetzner Server"
echo "=========================================="
echo ""

# Verificar que somos root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Este script debe ejecutarse como root"
   exit 1
fi

echo "⚠️  Este script va a:"
echo "   1. Instalar/reinstalar openssh-server"
echo "   2. Habilitar y arrancar el servicio SSH"
echo "   3. Configurar sshd_config"
echo "   4. Permitir puerto 22 en firewall"
echo "   5. Configurar authorized_keys para root"
echo ""
echo "Presiona ENTER para continuar o Ctrl+C para cancelar..."
read -r

# 1. Instalar openssh-server
echo ""
echo "1️⃣  Instalando openssh-server..."
apt update
apt install -y openssh-server
echo "✅ Instalación completada"

# 2. Verificar/corregir configuración de sshd
echo ""
echo "2️⃣  Configurando sshd_config..."
SSHD_CONFIG="/etc/ssh/sshd_config"

# Backup de configuración actual
if [[ -f "$SSHD_CONFIG" ]]; then
  cp "$SSHD_CONFIG" "${SSHD_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
  echo "   Backup creado"
fi

# Asegurar configuraciones críticas
sed -i 's/^#*Port .*/Port 22/' "$SSHD_CONFIG"
sed -i 's/^#*PermitRootLogin .*/PermitRootLogin prohibit-password/' "$SSHD_CONFIG"
sed -i 's/^#*PubkeyAuthentication .*/PubkeyAuthentication yes/' "$SSHD_CONFIG"
sed -i 's/^#*PasswordAuthentication .*/PasswordAuthentication no/' "$SSHD_CONFIG"

# Si las líneas no existen, añadirlas
grep -q "^Port " "$SSHD_CONFIG" || echo "Port 22" >> "$SSHD_CONFIG"
grep -q "^PermitRootLogin " "$SSHD_CONFIG" || echo "PermitRootLogin prohibit-password" >> "$SSHD_CONFIG"
grep -q "^PubkeyAuthentication " "$SSHD_CONFIG" || echo "PubkeyAuthentication yes" >> "$SSHD_CONFIG"
grep -q "^PasswordAuthentication " "$SSHD_CONFIG" || echo "PasswordAuthentication no" >> "$SSHD_CONFIG"

echo "✅ Configuración actualizada:"
echo "   - Puerto: 22"
echo "   - PermitRootLogin: prohibit-password"
echo "   - PubkeyAuthentication: yes"
echo "   - PasswordAuthentication: no"

# 3. Configurar authorized_keys
echo ""
echo "3️⃣  Configurando authorized_keys..."
mkdir -p /root/.ssh
chmod 700 /root/.ssh

if [[ ! -f /root/.ssh/authorized_keys ]]; then
  touch /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
  echo "✅ Archivo authorized_keys creado"
  echo ""
  echo "⚠️  IMPORTANTE: Necesitas añadir tu clave pública SSH"
  echo "   Desde tu Mac, ejecuta:"
  echo "   cat ~/.ssh/id_rsa.pub"
  echo ""
  echo "   Luego añade esa clave a /root/.ssh/authorized_keys en este servidor"
  echo "   Puedes usar nano o vim:"
  echo "   nano /root/.ssh/authorized_keys"
else
  chmod 600 /root/.ssh/authorized_keys
  echo "✅ authorized_keys ya existe ($(wc -l < /root/.ssh/authorized_keys) claves)"
fi

# 4. Habilitar y arrancar SSH
echo ""
echo "4️⃣  Habilitando y arrancando SSH..."

# Intentar con 'ssh' primero, luego 'sshd'
if systemctl list-unit-files | grep -q "^ssh.service"; then
  SERVICE_NAME="ssh"
elif systemctl list-unit-files | grep -q "^sshd.service"; then
  SERVICE_NAME="sshd"
else
  echo "❌ No se encontró el servicio SSH"
  exit 1
fi

echo "   Usando servicio: $SERVICE_NAME"

systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
sleep 2

if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "✅ SSH está corriendo"
  systemctl status "$SERVICE_NAME" --no-pager -l | head -10
else
  echo "❌ SSH no pudo arrancar"
  systemctl status "$SERVICE_NAME" --no-pager -l
  exit 1
fi

# 5. Verificar puerto de escucha
echo ""
echo "5️⃣  Verificando puerto de escucha..."
sleep 1
if ss -tlnp | grep -q ':22 '; then
  echo "✅ SSH está escuchando en puerto 22"
  ss -tlnp | grep ':22 '
else
  echo "❌ SSH NO está escuchando en puerto 22"
  echo "   Verificar logs: journalctl -u $SERVICE_NAME -n 50"
  exit 1
fi

# 6. Configurar firewall
echo ""
echo "6️⃣  Configurando firewall..."

if command -v ufw >/dev/null 2>&1; then
  echo "   UFW detectado"

  # Si UFW está activo, permitir SSH
  if ufw status | grep -q "Status: active"; then
    echo "   UFW está activo, permitiendo puerto 22..."
    ufw allow 22/tcp
    echo "✅ Puerto 22 permitido en UFW"
  else
    echo "   UFW está inactivo"
    # No activar UFW automáticamente para no bloquear el servidor
    echo "   Si quieres activar UFW:"
    echo "   ufw allow 22/tcp && ufw enable"
  fi
else
  echo "   UFW no instalado"
fi

# Verificar iptables
if iptables -L INPUT -n | grep -q 'DROP.*dpt:22'; then
  echo "   ⚠️  iptables está bloqueando puerto 22"
  echo "   Eliminando regla DROP..."
  iptables -D INPUT -p tcp --dport 22 -j DROP 2>/dev/null || true
fi

echo "✅ Firewall configurado"

# 7. Test de conectividad local
echo ""
echo "7️⃣  Test de conectividad local..."
if nc -zv localhost 22 2>&1 | grep -q succeeded; then
  echo "✅ Puerto 22 accesible desde localhost"
else
  echo "❌ Puerto 22 NO accesible desde localhost"
  exit 1
fi

# RESUMEN FINAL
echo ""
echo "=========================================="
echo "✅ REPARACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Estado del servicio:"
systemctl status "$SERVICE_NAME" --no-pager | head -5
echo ""
echo "Puerto de escucha:"
ss -tlnp | grep ':22 '
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Verificar que tu clave pública está en /root/.ssh/authorized_keys:"
echo "   cat /root/.ssh/authorized_keys"
echo ""
echo "2. Desde tu Mac, prueba la conexión:"
echo "   ssh root@46.224.70.156"
echo ""
echo "3. Si no funciona, verifica el firewall de Hetzner Cloud:"
echo "   - Ve a Hetzner Cloud Console"
echo "   - Selecciona tu servidor"
echo "   - Ve a 'Firewalls' o 'Networking'"
echo "   - Asegúrate de que el puerto 22 (SSH) está permitido"
echo ""
echo "4. Verifica la IP del servidor:"
echo "   ip addr show | grep 'inet '"
echo ""
