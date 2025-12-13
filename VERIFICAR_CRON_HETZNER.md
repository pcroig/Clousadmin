# Verificación y Corrección de CRON en Hetzner

## 🚨 Problema Detectado

**Fecha**: 2025-12-11
**Síntoma**: Fichajes del 10/12 aún en estado `en_curso` el 11/12
**Causa**: CRON `clasificar-fichajes` no ejecutó la noche del 10/12

---

## 📋 Comandos para Ejecutar en Hetzner

### 1. Conectar al servidor

```bash
ssh root@<IP_HETZNER>
```

### 2. Verificar crontab instalado

```bash
crontab -l | grep -E "clousadmin|api/cron|clasificar"
```

**Esperado**: Debe aparecer algo como:
```
30 23 * * * curl -s -X POST https://app.clousadmin.com/api/cron/clasificar-fichajes -H "Authorization: Bearer <SECRET>" >> /var/log/clousadmin-cron.log 2>&1
```

**Si NO aparece**: El crontab no está instalado → **IR A PASO 5**

### 3. Verificar logs de ejecución

```bash
tail -50 /var/log/clousadmin-cron.log
```

**Buscar**: Líneas con fecha 2025-12-10 23:30 (o similar)

**Si NO hay logs recientes**: El CRON no está ejecutando → **IR A PASO 5**

### 4. Verificar logs del sistema

```bash
grep CRON /var/log/syslog | tail -20
```

**Buscar**: Errores de cron, permisos, etc.

### 5. Re-instalar CRONs (si es necesario)

```bash
cd /opt/clousadmin

# Cargar variables de entorno
source .env.local 2>/dev/null || source .env

# Verificar que existan las variables
echo "APP_URL: $APP_URL"
echo "CRON_SECRET: ${CRON_SECRET:0:10}..."

# Re-instalar crons
./scripts/hetzner/setup-cron.sh
```

**Verificar instalación**:
```bash
crontab -l
```

### 6. Probar CRON manualmente

```bash
# Opción A: Ejecutar el script de pruebas
./scripts/hetzner/test-crons.sh

# Opción B: Ejecutar CRON directamente
curl -X POST "https://app.clousadmin.com/api/cron/clasificar-fichajes" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -v
```

**Esperado**: Respuesta HTTP 200 con JSON de éxito

---

## 🔧 Comandos de Emergencia

### Ejecutar CRON para cerrar fichajes del 10/12

```bash
# Desde Hetzner o local (con .env configurado)
curl -X POST "https://app.clousadmin.com/api/cron/clasificar-fichajes" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Esto cerrará todos los fichajes `en_curso` del 10/12 inmediatamente.**

---

## 📊 Verificación Post-Corrección

### Ejecutar diagnóstico desde local

```bash
npx tsx scripts/diagnostico-limites-fichaje.ts
```

**Esperado**:
- ✅ 0 fichajes en_curso del día anterior
- ✅ 0 eventos después del límite superior
- ✅ Evidencia de ejecución reciente del CRON

---

## 🎯 Prevención Futura

### Monitoreo de CRONs

1. **Verificar logs diariamente** (primeros días):
   ```bash
   tail -20 /var/log/clousadmin-cron.log
   ```

2. **Configurar alertas** (opcional):
   - Dead Man's Snitch: https://deadmanssnitch.com/
   - Healthchecks.io: https://healthchecks.io/

   Agregar al final del comando CRON:
   ```bash
   30 23 * * * curl -s ... && curl https://hc-ping.com/<UUID>
   ```

3. **Backup del crontab**:
   ```bash
   crontab -l > /opt/clousadmin/crontab.backup
   ```

---

## 📝 Checklist de Verificación

- [ ] Conectado a Hetzner vía SSH
- [ ] Crontab instalado y visible
- [ ] Logs de CRON recientes (últimas 24h)
- [ ] Variables de entorno correctas (APP_URL, CRON_SECRET)
- [ ] CRON ejecuta manualmente sin errores
- [ ] Fichajes del 10/12 cerrados
- [ ] Diagnóstico local muestra 0 problemas

---

## 🆘 Si Todo Falla

**Contactar**:
- Revisar documentación en `docs/funcionalidades/fichajes.md`
- Verificar que el servidor no se reinició (uptime)
- Verificar que Next.js está corriendo en producción
- Verificar que la base de datos está accesible

**Logs adicionales**:
```bash
# Logs de Next.js
pm2 logs clousadmin --lines 100

# Estado del proceso
pm2 status

# Reiniciar si es necesario
pm2 restart clousadmin
```
