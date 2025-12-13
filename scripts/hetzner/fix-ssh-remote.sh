#!/bin/bash
# ========================================
# Arreglar SSH remotamente usando Hetzner API
# ========================================
# Este script:
# 1. Activa rescue mode con tu SSH key
# 2. Reinicia el servidor
# 3. Te conecta por SSH al rescue system
# 4. Monta el disco y arregla SSH
# 5. Desactiva rescue y reinicia

set -euo pipefail

# Configuración
SERVER_IP="46.224.70.156"
SERVER_NAME="clousadmin-server"  # O el ID del servidor
HCLOUD_BIN="/tmp/hcloud"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "ARREGLAR SSH - Hetzner Cloud"
echo "=========================================="
echo ""

# Verificar que hcloud está instalado
if [[ ! -f "$HCLOUD_BIN" ]]; then
  echo -e "${RED}❌ hcloud CLI no encontrado en $HCLOUD_BIN${NC}"
  exit 1
fi

# Verificar que el contexto está configurado
if ! $HCLOUD_BIN context list | grep -q "active"; then
  echo -e "${RED}❌ No hay contexto activo en hcloud${NC}"
  echo "Configura primero con: $HCLOUD_BIN context create clousadmin"
  exit 1
fi

echo -e "${YELLOW}Paso 1: Encontrando servidor...${NC}"
# Intentar por nombre primero, luego por IP
SERVER_ID=$($HCLOUD_BIN server list -o noheader -o columns=id,name,ipv4 | grep -E "$SERVER_NAME|$SERVER_IP" | awk '{print $1}' | head -1)

if [[ -z "$SERVER_ID" ]]; then
  echo -e "${RED}❌ No se encontró el servidor${NC}"
  echo "Servidores disponibles:"
  $HCLOUD_BIN server list
  exit 1
fi

echo -e "${GREEN}✅ Servidor encontrado: ID=$SERVER_ID${NC}"
$HCLOUD_BIN server describe "$SERVER_ID" | head -10
echo ""

echo -e "${YELLOW}Paso 2: Verificando SSH keys disponibles...${NC}"
SSH_KEYS=$($HCLOUD_BIN ssh-key list -o noheader -o columns=id,name)
echo "$SSH_KEYS"
echo ""

# Intentar encontrar la key de Sofia
SSH_KEY_ID=$($HCLOUD_BIN ssh-key list -o noheader -o columns=id,name | grep -i "sofia\|mac-mini\|root" | awk '{print $1}' | head -1 || echo "")

if [[ -z "$SSH_KEY_ID" ]]; then
  echo -e "${YELLOW}⚠️  No se encontró SSH key existente${NC}"
  echo "Creando nueva SSH key..."

  # Leer clave pública local
  if [[ ! -f ~/.ssh/id_rsa.pub ]]; then
    echo -e "${RED}❌ No se encontró ~/.ssh/id_rsa.pub${NC}"
    exit 1
  fi

  PUBLIC_KEY=$(cat ~/.ssh/id_rsa.pub)
  SSH_KEY_ID=$($HCLOUD_BIN ssh-key create --name "sofia-mac-mini" --public-key "$PUBLIC_KEY" -o noheader -o columns=id)
  echo -e "${GREEN}✅ SSH key creada: ID=$SSH_KEY_ID${NC}"
else
  echo -e "${GREEN}✅ Usando SSH key existente: ID=$SSH_KEY_ID${NC}"
fi
echo ""

echo -e "${YELLOW}Paso 3: Activando rescue mode...${NC}"
RESCUE_OUTPUT=$($HCLOUD_BIN server enable-rescue --ssh-key "$SSH_KEY_ID" "$SERVER_ID")
echo "$RESCUE_OUTPUT"

# Extraer root password (por si acaso)
RESCUE_PASSWORD=$(echo "$RESCUE_OUTPUT" | grep -i "password" | awk '{print $NF}' || echo "")
if [[ -n "$RESCUE_PASSWORD" ]]; then
  echo -e "${GREEN}✅ Rescue mode activado${NC}"
  echo -e "${YELLOW}⚠️  Root password del rescue system: $RESCUE_PASSWORD${NC}"
  echo "(Anótalo por si acaso, aunque deberías poder entrar con SSH key)"
else
  echo -e "${GREEN}✅ Rescue mode activado (usando SSH key)${NC}"
fi
echo ""

echo -e "${YELLOW}Paso 4: Reiniciando servidor en rescue mode...${NC}"
$HCLOUD_BIN server reset "$SERVER_ID"
echo -e "${GREEN}✅ Servidor reiniciando...${NC}"
echo ""

echo -e "${YELLOW}Esperando 30 segundos a que el rescue system arranque...${NC}"
for i in {30..1}; do
  echo -ne "   $i segundos restantes...\r"
  sleep 1
done
echo -e "${GREEN}✅ Esperado completado${NC}"
echo ""

echo -e "${YELLOW}Paso 5: Conectando por SSH al rescue system...${NC}"
echo "Intentando conectar a root@$SERVER_IP"
echo ""
echo "Una vez conectado, ejecuta los siguientes comandos:"
echo ""
echo -e "${GREEN}# Montar el disco principal${NC}"
echo "mount /dev/sda1 /mnt  # O /dev/sda3 si sda1 no funciona"
echo ""
echo -e "${GREEN}# Hacer chroot${NC}"
echo "mount --bind /dev /mnt/dev"
echo "mount --bind /proc /mnt/proc"
echo "mount --bind /sys /mnt/sys"
echo "chroot /mnt"
echo ""
echo -e "${GREEN}# Añadir SSH key${NC}"
echo 'mkdir -p /root/.ssh && chmod 700 /root/.ssh'
echo 'echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCp142qrqqhJ6q21hkVtCiwPFUIjIFg9/7oiFJsW1igz28/IeebNNg5kokzpVVaPYYZ9rWeRhVhuobR10ARpMUOYm6gWY57D/ExZx26e2ADzIDJBRS9ni2udOyCQW8iop+hpA//zYLW81XrWsY2nQN0pgViBlBmSIOaHGAn4ICmx3WCmejlvFLHZJdudaU61v/VneUy1Tr/XX7cG43vSmZxdasD0op1fySnKqtOnFL/B83azY7k4w8lkUAMcO5W5LksOtLJbFYcNjqQ62dFT6Q0rGSlRGJWX90r6V2nMBAP7G5jg4nI9hXNeRHpn+UApCNmGmCcKbICz7Hy00vIDdDcjdqgt58muqd06MgU3PID0Oafz0Z9VJ4ZmqrQIa72okI6MiQNIsh13FfPcMpFCUFe6dL2mfJUTKjMYHXUFI+OZNAf3NSfdZNPZEIQlEPQFVpSzqhQCUX0ce2RuT9PDkzpp74nSvuulchMVLcP4BotQFgww2Pu4YqiLA0wP0qszTP0lp6NGCzgTZWRKo9KMhdeRVWsvRQtQ7RSb4ShAQPftjOcgLlnSUgCCm81ahg0z+tK5FpX65tdDysnoqMJEoQtvJNP+31Hyu1tvXIp2sEv9balpwSN/NVY6axI9Eoa2Pwdt5eLJQAdlnB/EXpKvaOArYiDAk0pUcgCs8YcdVO4OQ== sofiaroig@Mac-mini.local" > /root/.ssh/authorized_keys'
echo 'chmod 600 /root/.ssh/authorized_keys'
echo ""
echo -e "${GREEN}# Habilitar y arrancar SSH${NC}"
echo "systemctl enable ssh"
echo "systemctl enable sshd"
echo ""
echo -e "${GREEN}# Verificar configuración SSH${NC}"
echo "grep -E '^Port |^PermitRootLogin|^PubkeyAuthentication' /etc/ssh/sshd_config || echo 'Usando defaults'"
echo ""
echo -e "${GREEN}# Salir del chroot${NC}"
echo "exit"
echo ""
echo -e "${GREEN}# Desmontar${NC}"
echo "umount /mnt/dev /mnt/proc /mnt/sys /mnt"
echo ""
echo -e "${GREEN}# Salir de SSH${NC}"
echo "exit"
echo ""
echo "=========================================="
echo "Cuando hayas terminado, ejecuta este script con el parámetro 'finish' para desactivar rescue:"
echo "  $0 finish"
echo "=========================================="
echo ""

# Conectar por SSH
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$SERVER_IP

exit 0
