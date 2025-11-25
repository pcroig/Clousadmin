# 🚀 CI/CD Setup - Clousadmin

Documentación completa del sistema de integración y despliegue continuos con GitHub Actions.

---

## 📊 Estado Actual del CI/CD

### ✅ Workflows Configurados

| Workflow | Descripción | Trigger | Estado |
|----------|-------------|---------|--------|
| **ci.yml** | CI Principal (Lint + Test + Build) | Push a `main`, PRs | ✅ Activo |
| **test.yml** | Tests + Coverage | Push a `main`/`develop`, PRs | ✅ Activo |
| **cd.yml** | Deploy a Hetzner | Push a `main`, Manual | ⚠️ Requiere configuración |
| **cron-clasificar-fichajes.yml** | Cierre diario de jornadas | 23:30 UTC, Manual | ✅ Activo |
| **cron-revisar-solicitudes.yml** | Revisión con IA | 02:00 UTC, Manual | ✅ Activo |

---

## 🔧 Workflows Detallados

### 1. CI - Continuous Integration (`ci.yml`)

**Propósito**: Validar código en cada cambio

**Pasos**:
1. ✅ Lint (ESLint)
2. ✅ Tests unitarios (Vitest)
3. ✅ Build de producción (Next.js)
4. ✅ Verificación de artefactos

**Configuración**:
- Node.js: 20.x
- Timeout: 15 minutos
- Ejecuta en: Ubuntu Latest

**Variables de Entorno** (ya configuradas en el workflow):
```yaml
NODE_ENV: test
DATABASE_URL: postgresql://test:test@localhost:5432/test
NEXTAUTH_SECRET: test-secret-min-32-chars-long-for-ci
ENCRYPTION_KEY: 3f70cf35f9f2efeff971a06fb8b3f2440d9b30b0271fd6936c9b72bd183216df
```

### 2. Tests (`test.yml`)

**Propósito**: Ejecutar suite completa de tests con coverage

**Pasos**:
1. ✅ Tests unitarios e integración
2. ✅ Upload coverage a Codecov
3. ✅ Lint y TypeCheck

**Mejoras Aplicadas**:
- ✅ Añadidas variables de entorno necesarias
- ✅ Prisma Client generado antes de tests
- ✅ Node.js 20.x

### 3. CD - Continuous Deployment (`cd.yml`) 🆕

**Propósito**: Deploy automático a Hetzner en producción

**Pasos**:
1. ✅ Verificar que CI pasó
2. ✅ Deploy vía SSH a Hetzner:
   - Pull últimos cambios
   - Backup de .env
   - Install dependencies
   - Prisma migrations
   - Build aplicación
   - Restart PM2
3. ✅ Verificación health check
4. ✅ Rollback automático si falla

**Características**:
- ✅ Ejecución manual opcional
- ✅ Rollback automático en caso de fallo
- ✅ Health check post-deployment
- ✅ Limpieza de backups antiguos

---

## ⚙️ Configuración Requerida

### 1. GitHub Secrets (OBLIGATORIOS)

Para que el CD funcione, necesitas configurar estos **Secrets** en GitHub:

**Ir a**: `GitHub Repo → Settings → Secrets and variables → Actions → New repository secret`

#### Secrets para CD (Deploy):

| Secret | Descripción | Cómo obtenerlo |
|--------|-------------|----------------|
| `HETZNER_SSH_KEY` | Clave privada SSH para acceder al servidor | Ver sección [Generar SSH Key](#generar-ssh-key) |
| `HETZNER_HOST` | IP o dominio del servidor Hetzner | `123.45.67.89` o `tu-servidor.com` |
| `HETZNER_USER` | Usuario SSH del servidor | Típicamente `root` o `deploy` |
| `APP_URL` | URL pública de la aplicación | `https://clousadmin.tu-dominio.com` |
| `CRON_SECRET` | Secret para autenticar cron jobs | Generar con `openssl rand -base64 32` |

#### Secrets Opcionales:

| Secret | Descripción | Cuándo necesario |
|--------|-------------|------------------|
| `CODECOV_TOKEN` | Token para subir coverage | Si quieres reportes de coverage en Codecov |

### 2. GitHub Variables (Opcionales)

**Ir a**: `GitHub Repo → Settings → Secrets and variables → Actions → Variables`

| Variable | Valor | Propósito |
|----------|-------|-----------|
| `ENABLE_GITHUB_CRONS` | `true` / `false` | Activar/desactivar cron jobs desde GitHub |

---

## 🔐 Generar SSH Key

Para que el CD pueda conectarse a tu servidor Hetzner:

### Opción 1: Usar una clave existente

Si ya tienes acceso SSH al servidor:

```bash
# En tu máquina local
cat ~/.ssh/id_rsa
```

Copia TODO el contenido (incluido `-----BEGIN OPENSSH PRIVATE KEY-----` y `-----END OPENSSH PRIVATE KEY-----`)

### Opción 2: Crear una clave específica para CI/CD

```bash
# Generar nueva clave SSH
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Ver la clave privada (para GitHub Secret)
cat ~/.ssh/github_actions_deploy

# Ver la clave pública (para añadir al servidor)
cat ~/.ssh/github_actions_deploy.pub
```

**Añadir la clave pública al servidor Hetzner**:

```bash
# Conectarte a tu servidor Hetzner
ssh root@tu-servidor-ip

# Añadir la clave pública
echo "CONTENIDO_DE_github_actions_deploy.pub" >> ~/.ssh/authorized_keys

# Verificar permisos
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

**Añadir la clave privada a GitHub**:
1. Copia el contenido de `github_actions_deploy` (clave privada)
2. Ve a GitHub → Settings → Secrets → New repository secret
3. Nombre: `HETZNER_SSH_KEY`
4. Valor: Pega el contenido completo de la clave privada

---

## 🚀 Activar el CD (Deploy Automático)

### Paso 1: Configurar Secrets en GitHub

```bash
# 1. Generar CRON_SECRET
openssl rand -base64 32
# Copiarlo y añadirlo como secret CRON_SECRET

# 2. Obtener datos del servidor
# HETZNER_HOST: tu IP o dominio
# HETZNER_USER: típicamente "root"
# APP_URL: https://tu-dominio.com

# 3. Añadir SSH key (ver sección anterior)
```

### Paso 2: Verificar estructura en servidor

Asegúrate de que tu servidor Hetzner tiene:

```bash
# Conectar al servidor
ssh root@tu-servidor-ip

# Verificar que existe el directorio de la app
cd /var/www/clousadmin || exit 1

# Verificar que es un repositorio git
git status

# Verificar que PM2 está instalado
pm2 list

# Verificar que el .env existe
ls -la .env
```

### Paso 3: Probar deploy manual

Antes de activar el deploy automático, pruébalo manualmente:

1. Ve a GitHub → Actions
2. Selecciona "CD - Deploy to Hetzner"
3. Click en "Run workflow"
4. Selecciona branch `main`
5. Skip tests: `false`
6. Click "Run workflow"

Si todo va bien, verás:
- ✅ Verify CI Status
- ✅ Deploy to Production
- ✅ Verificación exitosa

### Paso 4: Activar deploy automático

Una vez verificado que funciona el deploy manual, el deploy automático ya está activo:

- **Push a `main`** → Deploy automático
- **Falla el deploy** → Rollback automático

---

## 📋 Cron Jobs Automatizados

### 1. Clasificar Fichajes (23:30 UTC)

**Propósito**: Cerrar jornadas del día anterior

**Configuración necesaria**:
- ✅ Secret `APP_URL`
- ✅ Secret `CRON_SECRET`
- ✅ Variable `ENABLE_GITHUB_CRONS` = `true` (opcional)

**Ejecutar manualmente**:
```bash
# Desde GitHub Actions
Actions → Cron - Clasificar Fichajes → Run workflow

# Desde CLI
curl -X POST https://tu-dominio.com/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 2. Revisar Solicitudes con IA (02:00 UTC)

**Propósito**: Revisar solicitudes pendientes con IA

**Configuración necesaria**:
- ✅ Secret `APP_URL`
- ✅ Secret `CRON_SECRET`
- ✅ Variable `ENABLE_GITHUB_CRONS` = `true` (opcional)
- ✅ API Key de IA configurada en producción

---

## 🔍 Monitoreo y Troubleshooting

### Ver logs de CI/CD

```bash
# GitHub Actions UI
GitHub Repo → Actions → Seleccionar workflow → Ver logs

# Ver logs en el servidor después de deploy
ssh root@tu-servidor
pm2 logs clousadmin --lines 100
```

### Rollback Manual

Si necesitas hacer rollback manualmente:

```bash
ssh root@tu-servidor
cd /var/www/clousadmin

# Ver commits recientes
git log --oneline -5

# Volver a commit anterior
git reset --hard COMMIT_SHA

# Reinstalar y rebuild
npm ci
npx prisma generate
npm run build
pm2 restart clousadmin
```

### Verificar health de la aplicación

```bash
# Health check endpoint
curl https://tu-dominio.com/api/health

# Verificar PM2 status
ssh root@tu-servidor "pm2 list"
```

### Problemas comunes

#### 1. Deploy falla con error de permisos

**Solución**:
```bash
ssh root@tu-servidor
chown -R $USER:$USER /var/www/clousadmin
```

#### 2. Build falla por falta de memoria

**Solución**: El workflow ya usa `NODE_OPTIONS="--max-old-space-size=8192"`

Si sigue fallando:
```bash
# En el servidor, aumentar memoria swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 3. Migrations fallan

**Solución**:
```bash
ssh root@tu-servidor
cd /var/www/clousadmin
npx prisma migrate resolve --rolled-back MIGRATION_NAME
npx prisma migrate deploy
```

#### 4. CI falla porque "tests no pasan"

**Solución**: Los workflows ya tienen las env vars configuradas. Si siguen fallando:

```bash
# Local
npm test

# Ver qué test falla específicamente en GitHub Actions logs
```

---

## 📊 Métricas y Coverage

### Codecov (Opcional)

Si quieres reportes de coverage:

1. Ve a [codecov.io](https://codecov.io)
2. Conecta tu repositorio de GitHub
3. Obtén el token de Codecov
4. Añádelo como secret `CODECOV_TOKEN` en GitHub

Los workflows ya están configurados para subir coverage automáticamente.

---

## 🎯 Checklist de Configuración

Usa esta checklist para verificar que todo está configurado:

### Secrets de GitHub
- [ ] `HETZNER_SSH_KEY` - Clave privada SSH
- [ ] `HETZNER_HOST` - IP/dominio del servidor
- [ ] `HETZNER_USER` - Usuario SSH (ej: root)
- [ ] `APP_URL` - URL pública de la app
- [ ] `CRON_SECRET` - Secret para cron jobs
- [ ] `CODECOV_TOKEN` - (Opcional) Token de Codecov

### Servidor Hetzner
- [ ] Directorio `/var/www/clousadmin` existe
- [ ] Es un repositorio git con remote configurado
- [ ] PM2 está instalado y configurado
- [ ] `.env` existe con variables de producción
- [ ] SSH key añadida a `~/.ssh/authorized_keys`
- [ ] Permisos correctos en archivos

### Variables de Entorno en Servidor
- [ ] `DATABASE_URL` configurada
- [ ] `NEXTAUTH_SECRET` configurada (producción)
- [ ] `ENCRYPTION_KEY` configurada (producción)
- [ ] `REDIS_URL` configurada
- [ ] `CRON_SECRET` configurada (mismo que en GitHub)
- [ ] `NEXT_PUBLIC_APP_URL` configurada

### Pruebas
- [ ] Deploy manual exitoso desde GitHub Actions
- [ ] Health check responde correctamente
- [ ] PM2 muestra app en estado `online`
- [ ] Logs no muestran errores críticos

---

## 📚 Recursos Adicionales

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Hetzner Deploy Guide](./DEPLOY_HETZNER.md)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

## 🆘 Soporte

Si encuentras problemas con la configuración de CI/CD:

1. Revisa los logs en GitHub Actions
2. Verifica que todos los secrets están configurados
3. Prueba el deploy manual primero
4. Consulta la sección de Troubleshooting

**Última actualización**: 27 de enero de 2025
