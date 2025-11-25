# Scripts de Hetzner - Herramientas de Producción

Scripts para gestión, diagnóstico y mantenimiento del servidor de producción en Hetzner.

---

## 📋 Scripts Disponibles

### 🔧 Configuración Inicial

#### `setup-server.sh`
Configuración completa del servidor (primera vez).

**Instala**:
- Node.js 20.x
- PostgreSQL 16
- Redis
- Nginx
- PM2
- Certbot (Let's Encrypt)
- Firewall (UFW)

**Uso**:
```bash
./setup-server.sh
```

---

#### `setup-redis.sh`
Instalación y configuración de Redis con autenticación.

**Uso**:
```bash
./setup-redis.sh
```

**Output**: Genera una contraseña automática. Guárdala para `REDIS_URL`.

---

#### `setup-nginx.sh`
Configuración de Nginx como proxy reverso para Next.js.

**Uso**:
```bash
./setup-nginx.sh
```

**Configura**:
- Proxy a `localhost:3000`
- Certificado SSL (Let's Encrypt)
- Headers de seguridad
- Client max body size (15MB)

---

### 🚀 Despliegue

#### `deploy.sh`
Actualización rápida de la aplicación en producción.

**Pasos**:
1. Backup de `.env`
2. Pull de cambios (`git pull`)
3. Instalación de dependencias
4. Prisma generate + migrate
5. Build de Next.js
6. Reinicio de PM2

**Uso**:
```bash
./deploy.sh
```

---

### 🔍 Diagnóstico

#### `diagnostico-produccion.sh` ⭐ **NUEVO**
Script completo de diagnóstico para identificar problemas en producción.

**Verifica**:
1. ✅ Estado de PM2 (online, errored, stopped)
2. ✅ Artefactos de build (.next/BUILD_ID, webpack-runtime.js)
3. ✅ Variables de entorno críticas (DATABASE_URL, NEXTAUTH_SECRET, etc)
4. ✅ Servicios del sistema (PostgreSQL, Redis, Nginx)
5. ✅ Logs recientes de PM2
6. ✅ Health endpoint (`/api/health`)
7. ✅ Versiones de Node.js y npm
8. ✅ Espacio en disco
9. ✅ Memoria disponible

**Uso**:
```bash
./diagnostico-produccion.sh
```

**Cuándo usarlo**:
- La app no responde o está caída
- Después de un deploy fallido
- Error 500/502/503 en producción
- TypeError o errores de runtime
- Antes de reportar un bug crítico

**Output**: Reporte detallado con ✅ (OK), ⚠️ (Warning), ❌ (Error) + recomendaciones.

---

### 🛠️ Mantenimiento

#### `rebuild-produccion.sh` ⭐ **NUEVO**
Rebuild completo de la aplicación desde cero (limpieza total).

**Pasos**:
1. Detener aplicación (PM2)
2. Limpiar build anterior (`.next/`)
3. Limpiar cache de npm
4. Reinstalar dependencias (`npm ci`)
5. Generar Prisma Client
6. Rebuild de Next.js
7. Reiniciar aplicación
8. Verificación final (health check)

**Uso**:
```bash
./rebuild-produccion.sh
```

**Cuándo usarlo**:
- Build corrupto o incompleto
- `TypeError: Cannot read properties of undefined (reading 'call')` en webpack-runtime.js
- Problemas persistentes después de múltiples deploys
- Después de actualizar dependencias críticas (Next.js, React, etc)
- Como última opción antes de escalar el problema

**⚠️ ADVERTENCIA**: 
- La app estará **OFFLINE** durante 2-5 minutos
- Pide confirmación antes de ejecutar
- Hace backup automático de `package-lock.json`

---

#### `backup-db.sh`
Backup de la base de datos PostgreSQL.

**Uso**:
```bash
./backup-db.sh
```

**Output**: Archivo `.sql.gz` en `/opt/backups/`

---

#### `restore-db.sh`
Restaurar backup de base de datos.

**Uso**:
```bash
./restore-db.sh <archivo-backup.sql.gz>
```

---

### 🚨 Troubleshooting

#### `logs.sh`
Ver logs de PM2, Nginx y sistema en tiempo real.

**Uso**:
```bash
./logs.sh [pm2|nginx|system|all]
```

**Ejemplos**:
```bash
./logs.sh pm2          # Solo logs de PM2
./logs.sh nginx        # Solo logs de Nginx
./logs.sh all          # Todos los logs juntos
```

---

## 📊 Flujo de Trabajo Recomendado

### 1. Deploy Normal
```bash
./deploy.sh
```

Si falla, continuar con:

### 2. Diagnóstico
```bash
./diagnostico-produccion.sh
```

Lee el output y sigue las recomendaciones. Si persiste:

### 3. Rebuild Completo
```bash
./rebuild-produccion.sh
```

Si **aún** persiste:

### 4. Revisar Logs Detallados
```bash
./logs.sh pm2
pm2 logs clousadmin --raw
```

### 5. Verificar Servicios
```bash
systemctl status postgresql
systemctl status redis-server
systemctl status nginx
```

---

## 🔥 Problemas Comunes y Soluciones Rápidas

### Error: "TypeError: Cannot read properties of undefined (reading 'call')"

**Causa**: Build corrupto o variables de entorno faltantes.

**Solución**:
```bash
./diagnostico-produccion.sh
# Revisar output
./rebuild-produccion.sh
```

---

### Error: "502 Bad Gateway"

**Causa**: App no está corriendo o PM2 falló.

**Solución**:
```bash
pm2 status
pm2 restart clousadmin
# Si no existe:
pm2 start npm --name clousadmin -- start
pm2 save
```

---

### Error: "Health check returns 308"

**Causa**: Intentando acceder con HTTP, nginx redirige a HTTPS.

**Solución**:
```bash
# Usar HTTPS en lugar de HTTP
curl https://tu-dominio.com/api/health

# O seguir redirects
curl -L http://tu-dominio.com/api/health
```

---

### Error: "Build failed: Cannot find module '@tailwindcss/postcss'"

**Causa**: Dependencias dev no instaladas.

**Solución**:
```bash
npm ci --production=false  # NO usar --production en servers que hacen build
npm run build
```

---

### Error: "PM2 | App [clousadmin] exited with code [1]"

**Causa**: Error en el código o variables de entorno faltantes.

**Solución**:
```bash
pm2 logs clousadmin --lines 100
# Revisar el error específico
./diagnostico-produccion.sh  # Para verificar env vars
```

---

## 📚 Documentación Relacionada

- [DEPLOY_HETZNER.md](../../docs/DEPLOY_HETZNER.md) - Guía completa de despliegue
- [NGINX_SETUP.md](../../docs/NGINX_SETUP.md) - Configuración de Nginx
- [TROUBLESHOOTING_PROD.md](../../docs/TROUBLESHOOTING_PROD.md) - Troubleshooting detallado
- [SOLUCION_ERROR_308_WEBPACK.md](../../docs/SOLUCION_ERROR_308_WEBPACK.md) - Solución específica para error actual

---

## 🔐 Seguridad

**IMPORTANTE**: 
- Nunca commitear estos scripts si contienen credenciales hardcodeadas
- Las variables sensibles deben estar en `.env` (nunca en Git)
- Ejecutar estos scripts solo como root o con sudo en el servidor
- Hacer backups antes de cualquier operación destructiva

---

## 🤝 Contribuir

Si agregas un nuevo script:
1. Hazlo ejecutable: `chmod +x script.sh`
2. Agrega documentación aquí
3. Incluye comentarios en el script
4. Testea en staging antes de producción

---

**Última actualización**: 25 de noviembre de 2025

