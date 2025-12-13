#!/bin/bash
# ========================================
# Script para ejecutar DENTRO del rescue system
# ========================================
# Este script automatiza la reparación de SSH desde rescue mode

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "REPARACIÓN SSH DESDE RESCUE MODE"
echo "=========================================="
echo ""

# SSH key de Sofia
SSH_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCp142qrqqhJ6q21hkVtCiwPFUIjIFg9/7oiFJsW1igz28/IeebNNg5kokzpVVaPYYZ9rWeRhVhuobR10ARpMUOYm6gWY57D/ExZx26e2ADzIDJBRS9ni2udOyCQW8iop+hpA//zYLW81XrWsY2nQN0pgViBlBmSIOaHGAn4ICmx3WCmejlvFLHZJdudaU61v/VneUy1Tr/XX7cG43vSmZxdasD0op1fySnKqtOnFL/B83azY7k4w8lkUAMcO5W5LksOtLJbFYcNjqQ62dFT6Q0rGSlRGJWX90r6V2nMBAP7G5jg4nI9hXNeRHpn+UApCNmGmCcKbICz7Hy00vIDdDcjdqgt58muqd06MgU3PID0Oafz0Z9VJ4ZmqrQIa72okI6MiQNIsh13FfPcMpFCUFe6dL2mfJUTKjMYHXUFI+OZNAf3NSfdZNPZEIQlEPQFVpSzqhQCUX0ce2RuT9PDkzpp74nSvuulchMVLcP4BotQFgww2Pu4YqiLA0wP0qszTP0lp6NGCzgTZWRKo9KMhdeRVWsvRQtQ7RSb4ShAQPftjOcgLlnSUgCCm81ahg0z+tK5FpX65tdDysnoqMJEoQtvJNP+31Hyu1tvXIp2sEv9balpwSN/NVY6axI9Eoa2Pwdt5eLJQAdlnB/EXpKvaOArYiDAk0pUcgCs8YcdVO4OQ== sofiaroig@Mac-mini.local"

echo -e "${YELLOW}1️⃣  Identificando disco principal...${NC}"
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT

# Intentar encontrar el disco principal
DISK_DEVICE=""
for dev in /dev/sda3 /dev/sda1 /dev/nvme0n1p1 /dev/vda1; do
  if [[ -b "$dev" ]]; then
    echo -e "${GREEN}✅ Encontrado: $dev${NC}"
    DISK_DEVICE="$dev"
    break
  fi
done

if [[ -z "$DISK_DEVICE" ]]; then
  echo -e "${RED}❌ No se encontró el disco principal${NC}"
  echo "Discos disponibles:"
  lsblk
  echo ""
  echo "Introduce manualmente el dispositivo (ej: /dev/sda3):"
  read -r DISK_DEVICE
fi

echo -e "${GREEN}Usando dispositivo: $DISK_DEVICE${NC}"
echo ""

echo -e "${YELLOW}2️⃣  Montando disco en /mnt...${NC}"
mkdir -p /mnt
if mount "$DISK_DEVICE" /mnt; then
  echo -e "${GREEN}✅ Disco montado${NC}"
else
  echo -e "${RED}❌ Error montando disco${NC}"
  exit 1
fi
echo ""

echo -e "${YELLOW}3️⃣  Verificando contenido del disco...${NC}"
if [[ -d /mnt/root ]] && [[ -d /mnt/etc ]]; then
  echo -e "${GREEN}✅ Estructura de directorios correcta${NC}"
  ls -la /mnt/ | head -15
else
  echo -e "${RED}❌ No parece un sistema de archivos válido${NC}"
  ls -la /mnt/
  umount /mnt
  exit 1
fi
echo ""

echo -e "${YELLOW}4️⃣  Montando sistemas virtuales para chroot...${NC}"
mount --bind /dev /mnt/dev
mount --bind /proc /mnt/proc
mount --bind /sys /mnt/sys
echo -e "${GREEN}✅ Sistemas montados${NC}"
echo ""

echo -e "${YELLOW}5️⃣  Configurando SSH key en chroot...${NC}"

# Crear script temporal dentro del chroot
cat > /mnt/tmp/fix-ssh.sh << 'EOF'
#!/bin/bash
set -euo pipefail

echo "Dentro del chroot..."

# Crear directorio SSH
mkdir -p /root/.ssh
chmod 700 /root/.ssh

# Añadir SSH key
echo "SSH_KEY_PLACEHOLDER" > /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

echo "✅ SSH key configurada"

# Verificar permisos
ls -la /root/.ssh/

# Habilitar SSH en systemd
if systemctl list-unit-files | grep -q "^ssh.service"; then
  systemctl enable ssh
  echo "✅ SSH service habilitado"
elif systemctl list-unit-files | grep -q "^sshd.service"; then
  systemctl enable sshd
  echo "✅ SSHD service habilitado"
fi

# Verificar configuración SSH
if [[ -f /etc/ssh/sshd_config ]]; then
  echo "Configuración SSH actual:"
  grep -E '^Port |^PermitRootLogin|^PubkeyAuthentication' /etc/ssh/sshd_config || echo "Usando configuración por defecto"
fi

echo "✅ Configuración completada"
EOF

# Reemplazar placeholder con la key real
sed -i "s|SSH_KEY_PLACEHOLDER|$SSH_KEY|g" /mnt/tmp/fix-ssh.sh
chmod +x /mnt/tmp/fix-ssh.sh

# Ejecutar dentro del chroot
chroot /mnt /tmp/fix-ssh.sh

echo -e "${GREEN}✅ SSH configurado dentro del sistema${NC}"
echo ""

echo -e "${YELLOW}6️⃣  Limpiando y desmontando...${NC}"
rm -f /mnt/tmp/fix-ssh.sh
umount /mnt/dev /mnt/proc /mnt/sys
umount /mnt
echo -e "${GREEN}✅ Sistemas desmontados${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}✅ REPARACIÓN COMPLETADA${NC}"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Sal de este SSH: exit"
echo "2. Desactiva rescue mode y reinicia:"
echo "   /tmp/hcloud server disable-rescue <server-id>"
echo "   /tmp/hcloud server reboot <server-id>"
echo "3. Espera 1 minuto y prueba SSH:"
echo "   ssh root@46.224.70.156"
echo ""
