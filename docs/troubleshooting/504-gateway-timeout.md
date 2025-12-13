# 🔧 Solución: Error 504 Gateway Timeout en Producción

**Fecha**: 2025-01-28  
**Problema**: Error `504 Gateway Time-out nginx/1.24.0 (Ubuntu)` al acceder a la aplicación en producción

---

## 🔍 Diagnóstico

El error 504 Gateway Timeout indica que **nginx está esperando una respuesta de Next.js pero no la recibe a tiempo**. Por defecto, nginx tiene un timeout de **60 segundos**.

### Posibles Causas

1. **Timeout de nginx muy corto** (más probable)
2. **Conexión a base de datos lenta o bloqueada**
3. **Queries de base de datos muy pesadas**
4. **Middleware bloqueante** (verificación de tokens lenta)
5. **Servidor sobrecargado** (CPU/memoria)
6. **Next.js no está respondiendo** (proceso caído o bloqueado)

---

## ✅ Soluciones

### 1. Aumentar Timeout de Nginx (SOLUCIÓN INMEDIATA)

Conectarse al servidor Hetzner y editar la configuración de nginx:

```bash
# Conectarse al servidor
ssh root@46.224.70.156

# Editar configuración de nginx
sudo nano /etc/nginx/sites-available/default
# O si tienes un archivo específico:
sudo nano /etc/nginx/sites-available/clousadmin
```

Añadir o modificar estas directivas en el bloque `server` o `location`:

```nginx
server {
    listen 80;
    server_name app.hrcron.com;

    # Aumentar timeouts
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;
    
    # Buffer settings
    proxy_buffering off;
    proxy_request_buffering off;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts específicos para esta location
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

**Reiniciar nginx**:
```bash
sudo nginx -t  # Verificar configuración
sudo systemctl reload nginx  # O restart si es necesario
```

---

### 2. Verificar Estado de Next.js (PM2)

```bash
# Conectarse al servidor
ssh root@46.224.70.156

# Verificar estado de PM2
pm2 status

# Ver logs de la aplicación
pm2 logs clousadmin --lines 100

# Verificar si hay errores
pm2 logs clousadmin --err --lines 50
```

**Si la aplicación está caída o reiniciándose constantemente**:
```bash
# Reiniciar la aplicación
pm2 restart clousadmin

# Verificar recursos del sistema
pm2 monit
```

---

### 3. Verificar Conexión a Base de Datos

El problema puede ser que Prisma está intentando conectarse a la base de datos y tarda demasiado.

```bash
# Conectarse al servidor
ssh root@46.224.70.156

# Probar conexión a la base de datos
# (ajustar DATABASE_URL según tu configuración)
psql $DATABASE_URL -c "SELECT 1;"
```

**Si la conexión es lenta o falla**:
- Verificar que la base de datos esté accesible
- Verificar que `DATABASE_URL` esté correctamente configurada
- Verificar que no haya demasiadas conexiones abiertas

**Verificar conexiones activas en PostgreSQL**:
```sql
SELECT count(*) FROM pg_stat_activity;
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

---

### 4. Optimizar Queries de Base de Datos

Si hay queries muy lentas, pueden estar causando el timeout. Revisar logs de Prisma:

```bash
# En el servidor, ver logs de la aplicación
pm2 logs clousadmin | grep -i "prisma\|query\|slow"
```

**Queries comunes que pueden ser lentas**:
- Dashboard con múltiples `findMany` sin límites
- Queries sin índices apropiados
- Queries con `include` que cargan muchas relaciones

**Solución temporal**: Añadir límites y optimizar queries en:
- `app/(dashboard)/hr/dashboard/page.tsx`
- `app/(dashboard)/empleado/dashboard/page.tsx`
- `app/(dashboard)/manager/dashboard/page.tsx`

---

### 5. Verificar Middleware

El middleware se ejecuta en cada request y puede estar bloqueando si hay problemas con la verificación de tokens.

**Verificar logs del middleware**:
```bash
pm2 logs clousadmin | grep -i "middleware\|auth\|token"
```

**Si el middleware es el problema**, considerar:
- Cachear verificaciones de tokens
- Optimizar `verifyToken` en `lib/auth-edge.ts`
- Reducir la frecuencia de verificaciones

---

### 6. Verificar Recursos del Servidor

```bash
# Conectarse al servidor
ssh root@46.224.70.156

# Ver uso de CPU y memoria
htop
# O
top

# Ver uso de memoria específico
free -h

# Ver procesos de Node.js
ps aux | grep node
```

**Si el servidor está sobrecargado**:
- Aumentar recursos del servidor (Hetzner Cloud)
- Optimizar la aplicación
- Considerar usar un connection pooler (PgBouncer)

---

### 7. Verificar Variables de Entorno

Asegurarse de que todas las variables de entorno estén correctamente configuradas:

```bash
# En el servidor
cd /ruta/a/clousadmin
cat .env.production
# O si usas PM2 con ecosystem:
pm2 env 0
```

**Variables críticas**:
- `DATABASE_URL`
- `NODE_ENV=production`
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`

---

## 🔧 Solución Rápida (Checklist)

1. ✅ **Aumentar timeout de nginx** (5 minutos)
2. ✅ **Verificar que PM2 esté corriendo** (`pm2 status`)
3. ✅ **Revisar logs de la aplicación** (`pm2 logs clousadmin`)
4. ✅ **Verificar conexión a base de datos** (`psql $DATABASE_URL`)
5. ✅ **Reiniciar servicios si es necesario**:
   ```bash
   pm2 restart clousadmin
   sudo systemctl reload nginx
   ```

---

## 📊 Monitoreo Continuo

### Verificar que la solución funciona:

```bash
# Probar desde el servidor
curl -I https://app.hrcron.com

# Ver logs en tiempo real
pm2 logs clousadmin --lines 0
```

### Configurar alertas:

- Monitorear tiempo de respuesta de la aplicación
- Alertar si PM2 reinicia la aplicación frecuentemente
- Alertar si hay errores 504 en los logs de nginx

---

## 🚨 Si el Problema Persiste

1. **Revisar logs de nginx**:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

2. **Revisar logs del sistema**:
   ```bash
   sudo journalctl -u nginx -f
   sudo journalctl -xe
   ```

3. **Verificar que Next.js esté escuchando en el puerto correcto**:
   ```bash
   netstat -tlnp | grep 3000
   # O
   ss -tlnp | grep 3000
   ```

4. **Probar conexión directa a Next.js** (bypass nginx):
   ```bash
   curl http://localhost:3000
   ```

---

## 📝 Notas Adicionales

- **Timeout por defecto de nginx**: 60 segundos
- **Timeout recomendado para Next.js**: 300 segundos (5 minutos)
- **Si aumentas el timeout demasiado**: Puede ocultar problemas reales de rendimiento
- **Mejor solución a largo plazo**: Optimizar queries y reducir tiempo de respuesta de la aplicación

---

**Última actualización**: 2025-01-28
