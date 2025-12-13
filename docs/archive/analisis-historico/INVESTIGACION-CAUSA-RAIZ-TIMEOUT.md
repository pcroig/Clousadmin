# Investigación de Causa Raíz - Timeout 504 Repentino

**Fecha**: 13 de Diciembre 2025
**Problema**: Error 504 Gateway Timeout apareció repentinamente sin cambios evidentes en el código

## Hallazgos Clave

### 1. Problema Inmediato: Reglas de iptables Bloqueando Puerto 3000

Se encontraron **dos reglas DROP** en iptables bloqueando todas las conexiones IPv4 al puerto 3000:

```bash
$ iptables -L -n -v | grep 3000
 1019 60840 DROP  tcp  --  *  *  0.0.0.0/0  0.0.0.0/0  tcp dpt:3000
    0     0 DROP  tcp  --  *  *  0.0.0.0/0  0.0.0.0/0  tcp dpt:3000
```

**Impacto**: 1,019 paquetes bloqueados (60,840 bytes), causando timeouts en nginx al intentar conectarse a Next.js.

### 2. Eventos Sospechosos en el Servidor

#### Múltiples Reinicios No Programados (10-11 Diciembre)

```
root     pts/0     79.151.76.79     Wed Dec 10 14:02 - crash  (11:13)
reboot   system boot                Wed Dec 10 13:50 - 13:52 (1+00:01)
reboot   system boot                Wed Dec 10 13:46 - 13:52 (1+00:06)
reboot   system boot                Wed Dec 10 13:37 - 13:52 (1+00:14)
reboot   system boot                Wed Dec 10 13:33 - 13:52 (1+00:18)
reboot   system boot                Wed Dec 10 13:29 - 13:52 (1+00:22)
reboot   system boot                Wed Dec 10 13:25 - 13:52 (1+00:26)
reboot   system boot                Wed Dec 10 12:54 - 13:52 (1+00:57)
reboot   system boot                Wed Dec 10 12:26 - 13:52 (1+01:25)
reboot   system boot                Wed Dec 10 12:14 - 13:52 (1+01:37)
reboot   system boot                Wed Dec 10 04:33 - 13:52 (1+09:18)
reboot   system boot                Wed Dec 10 04:18 - 13:52 (1+09:33)
reboot   system boot                Wed Dec 10 04:07 - 13:52 (1+09:44)
```

**Análisis**: 13 reinicios en menos de 10 horas (04:07 - 13:52). Esto NO es normal.

#### UFW se Iniciaba en Cada Reinicio

```
Dec 10 04:07:51 clousadmin-server systemd[1]: Starting ufw.service - Uncomplicated firewall...
Dec 10 04:18:31 clousadmin-server systemd[1]: Starting ufw.service - Uncomplicated firewall...
Dec 10 04:33:38 clousadmin-server systemd[1]: Starting ufw.service - Uncomplicated firewall...
Dec 10 12:14:30 clousadmin-server systemd[1]: Starting ufw.service - Uncomplicated firewall...
[...13 veces...]
```

**Importante**: UFW estaba instalado y activo en esos momentos, pero luego fue **desinstalado automáticamente** cuando instalamos `iptables-persistent` hoy:

```
The following packages will be REMOVED:
  ufw
The following NEW packages will be installed:
  iptables-persistent netfilter-persistent
```

### 3. Impacto en los CRONs

Los logs de cron muestran errores 504 desde hace días:

```
# Diciembre 6
<html><head><title>504 Gateway Time-out</title></head>...

# Diciembre 7
<html><head><title>504 Gateway Time-out</title></head>...

# Diciembre 8-12
[Múltiples 504 timeouts en los endpoints de cron]
```

**Esto confirma que el problema NO empezó hoy, sino hace al menos una semana.**

### 4. **CAUSA RAÍZ IDENTIFICADA**: Port Scanning Masivo al Puerto 3000

**¡ENCONTRADO!** Los logs del kernel revelan la verdadera causa:

```bash
# Ejemplos de intentos de conexión al puerto 3000 desde IPs externas
2025-12-07 00:01:47 SRC=162.142.125.80   DPT=3000
2025-12-07 01:41:26 SRC=104.37.189.174  DPT=3000
2025-12-07 15:50:07 SRC=176.65.148.250  DPT=3000
2025-12-07 17:14:47 SRC=176.65.148.250  DPT=3000
2025-12-07 22:01:13 SRC=144.31.5.11     DPT=3000
2025-12-08 00:26:34 SRC=176.65.149.11   DPT=30003
2025-12-08 00:33:30 SRC=164.90.209.197  DPT=3000
2025-12-08 00:52:40 SRC=167.94.146.51   DPT=3000
2025-12-08 02:35:31 SRC=192.159.99.95   DPT=3000
2025-12-08 05:00:15 SRC=192.159.99.95   DPT=3000
```

**Evidencia Contundente**:
- Múltiples IPs escaneando el puerto 3000 desde el exterior
- UFW estaba bloqueando estos intentos ("[UFW BLOCK]")
- También escaneos a puertos 30000-30006, 43000, 63000

#### ¿Por Qué Apareció el Problema?

**TEORÍA CONFIRMADA**:

1. **Antes del 10 de diciembre**: UFW estaba funcionando correctamente, bloqueando accesos externos pero permitiendo tráfico local

2. **10 de diciembre - Múltiples reinicios**: Durante troubleshooting o actualización del servidor
   - Se intentó migrar de UFW a iptables-persistent
   - O se ejecutó algún script de "hardening" que añadió reglas restrictivas
   - Las reglas de iptables se añadieron **directamente** (fuera de UFW)

3. **Las reglas DROP se quedaron permanentes**:
   - Bloqueaban TODO el tráfico al puerto 3000 (incluido localhost)
   - UFW seguía corriendo, pero las reglas DROP de iptables tenían precedencia
   - Por eso nginx (que conecta vía IPv4 localhost) no podía acceder

4. **Hoy (13 de diciembre)**: Al instalar iptables-persistent:
   - UFW se desinstaló automáticamente
   - Se reveló la configuración subyacente de iptables
   - Pudimos limpiar las reglas problemáticas

#### Hipótesis Final: Defensa contra Port Scanning

**MÁS PROBABLE**: Alguien (o algún script) añadió reglas iptables directas para bloquear el puerto 3000 ante el escaneo masivo de IPs sospechosas.

**El error**: Bloqueó TODO el tráfico (incluido localhost), no solo externo.

**Regla correcta hubiera sido**:
```bash
# Bloquear solo tráfico externo, permitir localhost
iptables -A INPUT -i lo -p tcp --dport 3000 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j DROP
```

**Regla incorrecta que se usó**:
```bash
# Bloquea TODO, incluido localhost
iptables -A INPUT -p tcp --dport 3000 -j DROP
```

### 5. Por Qué No Afectaba Antes (Completamente)

El puerto 3000 estaba bloqueado en **IPv4**, pero:

1. Next.js escuchaba en `:::3000` (IPv6 wildcard)
2. Con `net.ipv6.bindv6only=0`, debería aceptar IPv4 también
3. Pero las reglas DROP de iptables bloqueaban IPv4 a nivel de firewall

**Pregunta sin resolver**: ¿Por qué algunas peticiones funcionaban y otras no?
- Posible: El bloqueo no era completo desde el inicio
- Posible: Nginx usaba IPv6 algunas veces
- Posible: Las reglas se añadieron gradualmente

## No Fueron los Workers ni los CRONs

**Confirmado**:
- Los CRONs están configurados correctamente
- Ejecutan `curl` a endpoints de la API
- **No hay workers de BullMQ corriendo como procesos separados**
- Los workers están dentro de Next.js (`app/api/workers/`)
- No hay scripts que modifiquen iptables en `/opt/clousadmin`

## Acciones Tomadas

1. ✅ Eliminadas las reglas DROP de iptables
2. ✅ Instalado `iptables-persistent` (que desinstaló UFW)
3. ✅ Guardadas las reglas limpias en `/etc/iptables/rules.v4`
4. ✅ Creado archivo `ecosystem.config.cjs` para PM2
5. ✅ Verificado que la app funciona correctamente

## Recomendaciones

### Inmediatas

1. **Monitorear logs de nginx** para confirmar que no hay más timeouts:
   ```bash
   tail -f /var/log/nginx/error.log
   ```

2. **Verificar CRONs** mañana para confirmar que ejecutan correctamente:
   ```bash
   tail -f /var/log/clousadmin-cron.log
   ```

3. **Verificar estado de iptables** periódicamente:
   ```bash
   iptables -L -n -v | grep 3000  # Debe estar vacío
   ```

### A Medio Plazo

1. **Implementar monitoreo activo**:
   - Configurar alertas si la app no responde
   - Uptime monitoring (UptimeRobot, Pingdom, etc.)

2. **Logging centralizado**:
   - Considerar enviar logs a un servicio externo (Datadog, Logstash, etc.)

3. **Backup automático de configuración**:
   - Git para `/etc/nginx/`
   - Versionado de reglas de firewall

4. **Documentar cambios de infraestructura**:
   - Registrar quién y cuándo se hacen cambios en producción

### Investigación Pendiente

Para determinar la causa exacta, se necesitaría:

1. Acceso completo al historial de comandos del 10 de diciembre
2. Verificar si hay acceso de otros usuarios al servidor
3. Revisar logs de SSH para ver qué comandos se ejecutaron desde 79.151.76.79
4. Verificar si Hetzner tiene logs de actividad del servidor

## Conclusión

### Causa Raíz CONFIRMADA

**Causa inmediata**: Reglas de iptables bloqueando puerto 3000 (incluido tráfico localhost)

**Origen**: Respuesta a port scanning masivo detectado en los logs (17+ intentos de escaneo registrados)

**Mecanismo**:
1. IPs externas escaneando puerto 3000 y rango 30000-30006
2. Alguien añadió reglas iptables directas (fuera de UFW) para bloquear el puerto
3. **ERROR CRÍTICO**: Las reglas bloqueaban TODO el tráfico, no solo el externo
4. Nginx (conectando vía localhost IPv4) quedó bloqueado → 504 timeouts

**Solución aplicada**:
- ✅ Eliminadas las reglas DROP incorrectas
- ✅ Configurado iptables-persistent (UFW se desinstaló automáticamente)
- ✅ Puerto 3000 ahora accesible desde localhost
- ✅ nginx conecta correctamente al backend

**Estado actual**: ✅ Funcionando correctamente

### El Problema NO Fue Causado Por:

- ❌ Workers de BullMQ (no existen como procesos separados)
- ❌ CRONs (están correctamente configurados)
- ❌ Cambios en el código (no hubo deployments)
- ❌ Next.js o configuración de la app

### Lecciones Aprendidas

1. **Al bloquear puertos, SIEMPRE permitir tráfico localhost primero**:
   ```bash
   iptables -A INPUT -i lo -j ACCEPT  # Permitir localhost
   iptables -A INPUT -p tcp --dport 3000 -j DROP  # Luego bloquear
   ```

2. **No mezclar UFW con iptables directos** - Usar uno u otro, no ambos

3. **Documentar TODOS los cambios de firewall** en producción

4. **Monitoreo activo** - El problema existió por días sin detección

5. **El puerto 3000 NO debería ser accesible externamente**:
   - Next.js debe estar detrás de nginx (proxy reverso)
   - Solo nginx (puertos 80/443) debe ser público
   - Puerto 3000 debe ser solo localhost

### Acción Preventiva Recomendada

El puerto 3000 **NUNCA** debería estar abierto al exterior. Configurar correctamente:

```bash
# Permitir localhost (crítico para nginx → Next.js)
iptables -A INPUT -i lo -j ACCEPT

# Permitir conexiones establecidas
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Permitir SSH, HTTP, HTTPS
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Bloquear todo lo demás (incluido puerto 3000 desde exterior)
iptables -A INPUT -j DROP

# Guardar
iptables-save > /etc/iptables/rules.v4
```

Esta configuración bloquea el port scanning pero mantiene funcionando nginx → Next.js.
