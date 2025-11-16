# 🏢 CLOUSADMIN

Plataforma de gestión de RRHH para empresas españolas construida con Next.js 14, Prisma, AWS y procesamiento de documentos con IA.

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

- **[docs/README.md](docs/README.md)** - Índice de toda la documentación
- **[docs/SETUP.md](docs/SETUP.md)** - Guía de configuración completa
- **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)** - Decisiones técnicas y estructura
- **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** - Guías de diseño UI/UX y patrones de componentes
- **[docs/funcionalidades/](docs/funcionalidades/)** - Documentación de cada feature
- **[.cursorrules](.cursorrules)** - Principios de desarrollo

Para documentación histórica, ver [docs/historial/](docs/historial/)

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 (App Router) con React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Node.js, Prisma, PostgreSQL
- **Auth**: JWT (jose) + bcryptjs
- **Cloud**: AWS S3, RDS, Cognito, SES (opcional)
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

### 🚧 En Desarrollo
- Auto-completado de fichajes con IA
- Módulo de nóminas
- Módulo de documentos con firma digital

### 📋 Roadmap
- Integración AWS S3 para documentos
- Extracción IA de contratos y nóminas
- Calendario inteligente de vacaciones
- Integración Google Calendar/Outlook
- Analytics y reporting avanzado

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

**Versión**: 1.1.0  
**Última actualización**: 7 de noviembre de 2025
**Última limpieza**: 7 de noviembre de 2025