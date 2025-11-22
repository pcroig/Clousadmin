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

### Configuración y Arquitectura
- **[docs/README.md](docs/README.md)** - Índice de toda la documentación
- **[docs/SETUP.md](docs/SETUP.md)** - Guía de configuración completa (incluye autenticación)
- **[docs/SETUP_GOOGLE_OAUTH.md](docs/SETUP_GOOGLE_OAUTH.md)** - Configuración de Google OAuth y Calendar
- **[docs/SETUP_PLANTILLAS.md](docs/SETUP_PLANTILLAS.md)** - Configuración del sistema de plantillas
- **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)** - Decisiones técnicas y estructura
- **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** - Guías de diseño UI/UX y patrones de componentes
- **[.cursorrules](.cursorrules)** - Principios de desarrollo

### 📱 Adaptación Mobile (NUEVO)
- **[docs/MOBILE_ADAPTATION_SUMMARY.md](docs/MOBILE_ADAPTATION_SUMMARY.md)** - Resumen ejecutivo de la adaptación mobile completa
- **[docs/MOBILE_COMPONENTS_GUIDE.md](docs/MOBILE_COMPONENTS_GUIDE.md)** - Guía de uso de componentes responsive
- **[docs/MOBILE_FORM_COMPONENTS.md](docs/MOBILE_FORM_COMPONENTS.md)** - Formularios y inputs optimizados para touch
- **[docs/MOBILE_PERFORMANCE_OPTIMIZATIONS.md](docs/MOBILE_PERFORMANCE_OPTIMIZATIONS.md)** - Estrategias de optimización mobile
- **[docs/MOBILE_TESTING_PLAN.md](docs/MOBILE_TESTING_PLAN.md)** - Plan de testing en dispositivos reales
- **[docs/MOBILE_FILES_CHANGED.md](docs/MOBILE_FILES_CHANGED.md)** - Inventario completo de archivos modificados

### Funcionalidades
- **[docs/funcionalidades/](docs/funcionalidades/)** - Documentación detallada de cada feature
- **[docs/funcionalidades/billing.md](docs/funcionalidades/billing.md)** - Pasarela de pago con Stripe y flujo de facturación
- **[docs/historial/](docs/historial/)** - Documentación histórica y migración

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 (App Router) con React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Node.js, Prisma, PostgreSQL
- **Auth**: JWT (jose) + bcryptjs
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
- Autenticación JWT con roles (HR Admin, Manager, Empleado)
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

- Actualmente no hay una batería de tests automatizados publicada. Revísalo en `docs/OPTIMIZACION_PENDIENTE.md`.
- Ejecuta el linting con `npm run lint`.
- Para diagnósticos rápidos de la base de datos utiliza `npm run diagnostico`.
- Accede al visor de Prisma con `npx prisma studio` o `npm run db:studio`.

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

**Versión**: 1.3.0
**Última actualización**: 27 de enero de 2025