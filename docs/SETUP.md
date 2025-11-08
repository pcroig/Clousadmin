# 🚀 SETUP - CLOUSADMIN

Guía completa para configurar el proyecto desde cero.

---

## 📋 Prerequisitos

- **Node.js** 18+ ([nodejs.org](https://nodejs.org))
- **PostgreSQL** 15+ ([postgresql.org](https://www.postgresql.org/download/))
- **npm** o **pnpm**
- **Git**

---

## ⚙️ 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd Clousadmin
```

---

## 📦 2. Instalar Dependencias

```bash
npm install
```

Si hay errores de permisos:
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

---

## 🗄️ 3. Configurar Base de Datos

### 3.1 Crear base de datos PostgreSQL

```bash
# Acceder a PostgreSQL
psql postgres

# Crear base de datos
CREATE DATABASE clousadmin;

# Crear usuario (opcional)
CREATE USER clousadmin_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE clousadmin TO clousadmin_user;

# Salir
\q
```

### 3.2 Configurar variables de entorno

Crea el archivo `.env.local` en la raíz:

```env
# Database (CRÍTICO)
DATABASE_URL="postgresql://postgres:password@localhost:5432/clousadmin"

# Auth (CRÍTICO - genera con: openssl rand -base64 32)
NEXTAUTH_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# AWS (OPCIONAL para desarrollo local)
AWS_REGION="eu-west-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
S3_BUCKET=""

# OpenAI (OPCIONAL)
OPENAI_API_KEY=""

# Platform Admin - Invitar usuarios al signup (OPCIONAL)
# Genera una clave segura: openssl rand -hex 32
PLATFORM_ADMIN_SECRET_KEY=""
PLATFORM_ADMIN_EMAIL="admin@tu-plataforma.com"

# Feature Flags
ENABLE_AI_EXTRACTION="false"
ENABLE_S3_UPLOAD="false"
ENABLE_EMAIL_NOTIFICATIONS="false"
```

**Generar JWT Secret:**
```bash
openssl rand -base64 32
```

Copia el resultado y pégalo en `NEXTAUTH_SECRET`.

---

## 🔨 4. Configurar Prisma

### 4.1 Generar el cliente

```bash
npx prisma generate
```

### 4.2 Ejecutar migraciones

```bash
# Aplicar todas las migraciones
npx prisma migrate deploy

# O crear nuevas si no existen
npx prisma migrate dev --name initial_setup
```

### 4.3 Poblar con datos de prueba

```bash
npm run seed
```

Esto crea:
- ✅ 1 empresa (Clousadmin Demo)
- ✅ 2 jornadas predefinidas (40h y 35h)
- ✅ 1 HR Admin + 5 empleados
- ✅ 2 equipos de trabajo
- ✅ 10 ausencias de ejemplo
- ✅ 10 festivos de España 2025
- ✅ Saldos de ausencias
- ✅ Carpetas de documentos

**Credenciales de acceso:**
```
HR Admin:
  Email:    admin@clousadmin.com
  Password: Admin123!

Empleado:
  Email:    ana.garcia@clousadmin.com
  Password: Empleado123!
```

---

## 🚀 5. Ejecutar el Proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🧪 6. Verificación

### Verificar base de datos
```bash
npx prisma studio
```

Abre [http://localhost:5555](http://localhost:5555) para ver la base de datos.

### Verificar login
1. Ve a `http://localhost:3000`
2. Login como HR Admin: `admin@clousadmin.com` / `Admin123!`
3. Deberías ver el dashboard de HR

---

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build            # Build para producción
npm start                # Ejecutar producción

# Base de datos
npm run seed             # Poblar con datos de prueba
npm run db:studio        # Interfaz visual de BD (Prisma Studio)
npm run db:migrate       # Crear nueva migración
npm run db:deploy        # Aplicar migraciones (producción)
npm run db:generate      # Regenerar cliente Prisma
npm run diagnostico      # Diagnóstico rápido de Prisma

# Linting
npm run lint             # Ejecutar ESLint
```

---

## 🐛 Troubleshooting

### Error: "Can't reach database server"
- Verifica que PostgreSQL esté corriendo: `pg_ctl status`
- Verifica el `DATABASE_URL` en `.env.local`
- Intenta conectar manualmente: `psql postgresql://...`

### Error: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: permisos de npm
```bash
sudo chown -R $(whoami) ~/.npm
```

### Error: puerto 3000 en uso
```bash
killall node
npm run dev
```

---

## 📚 Siguiente Paso

Lee `docs/ARQUITECTURA.md` para entender la estructura del proyecto.

---

**Versión**: 1.1  
**Última actualización**: 7 de noviembre 2025
