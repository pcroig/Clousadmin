# 🏢 CLOUSADMIN

Plataforma de gestión de RRHH para empresas españolas construida con Next.js 16, Prisma, Hetzner y procesamiento de documentos con IA.

---

## 🚀 Quick Start

```bash
# 1. Clonar e instalar
git clone <repository-url>
cd Clousadmin
npm install

# 2. Configurar base de datos
createdb clousadmin
cp .env.example .env.local  # Y completar variables

# 3. Ejecutar migraciones y seed
npx prisma migrate dev
npm run seed

# 4. Iniciar servidor
npm run dev
```

**Accede a:** [http://localhost:3000](http://localhost:3000)

**Credenciales de prueba:**
- HR Admin: `admin@clousadmin.com` / `Admin123!`
- Empleado: `ana.garcia@clousadmin.com` / `Empleado123!`

---

## 📚 Documentación

Toda la documentación está en `docs/`:

### 📚 Documentación Principal

- **[docs/README.md](docs/README.md)** - Índice completo de toda la documentación
- **[docs/SETUP.md](docs/SETUP.md)** - ⭐ Guía de configuración inicial
- **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)** - Decisiones técnicas y estructura
- **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** - Sistema de diseño UI/UX y patrones
- **[docs/PATRONES_CODIGO.md](docs/PATRONES_CODIGO.md)** - Convenciones de código TypeScript/Next.js
- **[.cursorrules](.cursorrules)** - Principios de desarrollo

### 🔐 Autenticación y Configuración

- **[docs/funcionalidades/autenticacion.md](docs/funcionalidades/autenticacion.md)** - Flujos de autenticación y onboarding
- **[docs/INVITAR_USUARIOS.md](docs/INVITAR_USUARIOS.md)** - Invitaciones y alta de usuarios
- **[docs/SETUP_GOOGLE_OAUTH.md](docs/SETUP_GOOGLE_OAUTH.md)** - Configuración de Google OAuth y Calendar
- **[docs/SETUP_PLANTILLAS.md](docs/SETUP_PLANTILLAS.md)** - Sistema de plantillas de documentos

### 📱 Mobile

- **[docs/MOBILE_OPTIMIZACION.md](docs/MOBILE_OPTIMIZACION.md)** - ⭐ Guía principal de adaptación mobile
- **[docs/MOBILE_ADAPTATION_SUMMARY.md](docs/MOBILE_ADAPTATION_SUMMARY.md)** - Resumen ejecutivo
- **[docs/MOBILE_COMPONENTS_GUIDE.md](docs/MOBILE_COMPONENTS_GUIDE.md)** - Componentes responsive
- **[docs/MOBILE_FORM_COMPONENTS.md](docs/MOBILE_FORM_COMPONENTS.md)** - Formularios touch-optimized

### 🚀 CI/CD y Despliegue

- **[docs/CI_CD_SETUP.md](docs/CI_CD_SETUP.md)** - ⭐ Guía completa de CI/CD con GitHub Actions
- **[docs/DEPLOY_HETZNER.md](docs/DEPLOY_HETZNER.md)** - Guía de despliegue en Hetzner
- **[docs/PRODUCCION_CHECKLIST.md](docs/PRODUCCION_CHECKLIST.md)** - Checklist de producción
- **[docs/TROUBLESHOOTING_PROD.md](docs/TROUBLESHOOTING_PROD.md)** - Troubleshooting en producción

### 📖 Funcionalidades

- **[docs/funcionalidades/](docs/funcionalidades/)** - Documentación detallada de cada feature

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 (App Router) con React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Node.js, Prisma, PostgreSQL
- **Auth**: JWT (jose) + bcryptjs + Google OAuth (NextAuth v5) + 2FA TOTP
- **Cloud**: Hetzner Object Storage (S3-compatible)
- **IA**: OpenAI GPT-4 Vision (opcional)

---

## 📁 Estructura del Proyecto

```
Clousadmin/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Rutas públicas
│   ├── (dashboard)/        # Rutas protegidas (empleado, hr, manager)
│   └── api/                # API Routes
├── components/             # Componentes React
│   ├── ui/                 # shadcn/ui (auto-generados)
│   ├── shared/             # Compartidos
│   ├── empleado/           # Específicos empleado
│   └── hr/                 # Específicos HR
├── lib/                    # Utilidades y lógica de negocio
│   ├── calculos/           # Lógica de negocio
│   └── validaciones/       # Validaciones Zod
├── prisma/                 # Schema y migraciones
├── docs/                   # Documentación
└── .cursorrules            # Principios de desarrollo
```

---

## 🎯 Funcionalidades

### ✅ Completadas
- Autenticación JWT con roles (HR Admin, Manager, Empleado, Platform Admin)
- Login con Google OAuth (NextAuth v5)
- Recuperación de contraseña
- Autenticación en dos pasos (2FA TOTP + Backup Codes)
- Dashboard multi-rol con widgets personalizados
- Gestión de empleados, equipos y puestos
- Gestión de ausencias (solicitud, aprobación, saldo)
- Fichajes y control horario (entrada/salida, pausas)
- Jornadas laborales configurables
- Analytics HR con filtros avanzados y reporting (plantilla, compensación, fichajes)
- Balance de horas acumulado en analytics
- **Billing con Stripe** (checkout, portal del cliente y sincronización vía webhooks)
- **Gestión documental avanzada** (plantillas, carpetas globales y mobile-first UI)
- **Motor de nóminas** con importación inteligente y sincronización de eventos/nóminas
- **📱 Adaptación Mobile Completa** (93.75% completado)
  - Sistema de diseño mobile con touch targets >=44px (WCAG 2.1)
  - Componentes responsive (containers, grids, headers)
  - Modales adaptativos (bottom sheets, full-screen)
  - Formularios touch-optimized (selects, date pickers)
  - DataTable responsive con prioridades de columnas
  - Todas las páginas principales adaptadas
  - Performance optimizado (lazy loading, memoization)

### 🚧 En Desarrollo
- Auto-completado de fichajes con IA
- Motor de facturación avanzada (prorrateo, límites por plan, métricas en tiempo real)
- Firma digital sobre documentos y campañas de onboarding
- Testing exhaustivo mobile en dispositivos reales (última fase)

### 📋 Roadmap
- Extracción IA de contratos y nóminas con más proveedores
- Calendario inteligente de vacaciones
- Integración Google Calendar/Outlook
- Analytics y reporting avanzado
- Módulo de formación y desarrollo

---

## 🧪 Testing

**Cobertura de Tests**: 159 tests implementados (87 unit, 43 E2E, 19 integration)

### Ejecutar Tests

```bash
# Tests unitarios
npm run test

# Tests E2E (requiere servidor corriendo)
npm run test:e2e

# Tests de integración
npm run test:integration

# Cobertura
npm run test:coverage
```

### Documentación de Testing

- **[docs/TESTING_FINAL_REPORT.md](docs/TESTING_FINAL_REPORT.md)** - ⭐ Reporte completo de testing
- **[docs/TESTING_SUMMARY.md](docs/TESTING_SUMMARY.md)** - Resumen técnico

### Infraestructura de Tests

- **Test Runner**: Vitest con happy-dom
- **E2E**: Playwright (Chrome, Firefox, Safari)
- **Coverage Target**: 60% (70%+ en módulos críticos)
- **Helpers**: Auth utilities, data factories, API mocking

### Áreas Cubiertas

✅ Autenticación JWT y seguridad
✅ Cálculos de ausencias y validaciones
✅ Schemas de empleados (Zod)
✅ Sistema de alertas de nóminas
✅ Flujos E2E: login, fichajes, ausencias
✅ CRUD de empleados con DB real

### Otras Utilidades

```bash
# Linting
npm run lint

# Diagnóstico de base de datos
npm run diagnostico

# Visor de Prisma
npm run db:studio
```

---

## 🔄 CI/CD - Integración y Despliegue Continuo

**Sistema automatizado** con GitHub Actions para validación de código y despliegue a Hetzner.

### Workflows Activos

| Workflow | Trigger | Estado |
|----------|---------|--------|
| **CI** - Lint, Test, Build | Push a `main`, PRs | ✅ Activo |
| **Tests** - Coverage | Push, PRs | ✅ Activo |
| **CD** - Deploy Hetzner | Push a `main` | ⚠️ Requiere configuración |
| **Cron** - Fichajes | Diario 23:30 UTC | ✅ Activo |
| **Cron** - Solicitudes IA | Diario 02:00 UTC | ✅ Activo |

### Features

✅ **CI Automático**: Lint + Tests + Build en cada PR
✅ **Coverage Reports**: Upload automático a Codecov
✅ **Deploy Automático**: Push a `main` → Deploy a producción
✅ **Rollback Automático**: Si el deploy falla, vuelve a versión anterior
✅ **Cron Jobs**: Tareas automatizadas diarias
✅ **Health Checks**: Verificación post-deploy

### Configuración Necesaria

Para activar el deploy automático, configura estos **Secrets** en GitHub:

```bash
HETZNER_SSH_KEY      # Clave privada SSH
HETZNER_HOST         # IP del servidor
HETZNER_USER         # Usuario SSH (ej: root)
APP_URL              # URL pública
CRON_SECRET          # Secret para cron jobs
```

### Documentación Completa

- **[docs/CI_CD_SETUP.md](docs/CI_CD_SETUP.md)** - ⭐ Guía completa de configuración CI/CD
- Instrucciones paso a paso para configurar secrets
- Troubleshooting y resolución de problemas
- Monitoreo y verificación de deploys

### Quick Start - Activar CD

1. **Generar SSH Key**:
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy
```

2. **Añadir secrets en GitHub**:
   - Settings → Secrets → New repository secret
   - Añade los 5 secrets mencionados arriba

3. **Probar deploy manual**:
   - GitHub → Actions → "CD - Deploy to Hetzner" → Run workflow

4. **Deploy automático activado** 🎉:
   - Cada push a `main` despliega automáticamente
   - Rollback automático si falla

Ver [docs/CI_CD_SETUP.md](docs/CI_CD_SETUP.md) para instrucciones detalladas.

---

## 🚀 Despliegue

### Producción

Ver **[docs/DEPLOY_HETZNER.md](docs/DEPLOY_HETZNER.md)** para la guía completa de despliegue en Hetzner.

**Resumen rápido:**
```bash
# Build
npm run build

# Ejecutar producción
npm start
```

**Variables de Entorno (Producción):**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection (generado automáticamente)
- `NEXTAUTH_SECRET` - JWT secret (generar con `openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL` - URL pública de la app
- `NEXT_PUBLIC_BILLING_ENABLED` - Activa/desactiva la UI de facturación
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` - Credenciales Stripe
- `STRIPE_WEBHOOK_SECRET` - Firma del webhook `/api/webhooks/stripe`

---

## 📖 Guías

### Para Desarrolladores
1. Lee [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) para entender la estructura
2. Sigue las **máximas de desarrollo** en [.cursorrules](.cursorrules)
3. Consulta [docs/funcionalidades/](docs/funcionalidades/) para cada feature

### Para Contribuir
1. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
2. Sigue las convenciones de código en `.cursorrules`
3. Documenta cambios en `docs/daily/`
4. Crea PR con descripción clara

---

## 🐛 Troubleshooting

### Error: "Can't reach database server"
```bash
# Verifica que PostgreSQL esté corriendo
pg_ctl status

# Verifica tu DATABASE_URL en .env.local
```

### Error: permisos npm
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

### Puerto 3000 en uso
```bash
killall node
npm run dev
```

Más ayuda en [docs/SETUP.md](docs/SETUP.md#troubleshooting).

---

## 📝 License

Proprietary - Clousadmin © 2025

---

## 📧 Contacto

Para preguntas o soporte: [info@clousadmin.com](mailto:info@clousadmin.com)

---

**Versión**: 1.4.0  
**Última actualización**: 27 de enero de 2025

---

## 📝 Cambios Recientes en Documentación

**27 de enero de 2025** - Revisión exhaustiva de documentación:
- ✅ Consolidados archivos históricos (movidos a `docs/historial/`)
- ✅ Unificada documentación de mobile, optimización y seguridad
- ✅ Mejoradas referencias cruzadas entre documentos
- ✅ Creado índice completo (`docs/INDICE_COMPLETO.md`)
- ✅ Actualizada información de autenticación y funcionalidades