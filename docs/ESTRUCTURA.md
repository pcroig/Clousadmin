# 📚 ESTRUCTURA Y ORGANIZACIÓN - CLOUSADMIN

## 🎯 Objetivo
Este documento explica la estructura final del proyecto después de la reorganización, para que entiendas cómo funciona todo a grandes rasgos.

---

## 📁 Estructura de Archivos (Raíz)

```
Clousadmin/
├── .cursorrules          # ⭐ REGLAS DE DESARROLLO (máximas integradas)
├── README.md             # Guía principal del proyecto
├── .env.example          # Plantilla de variables de entorno
│
├── app/                  # 🚀 APLICACIÓN NEXT.JS
├── components/           # 🎨 COMPONENTES REACT
├── lib/                  # 🛠️ LÓGICA DE NEGOCIO
├── prisma/               # 💾 BASE DE DATOS
├── types/                # 📝 TIPOS TYPESCRIPT
├── docs/                 # 📚 DOCUMENTACIÓN
│
├── package.json
├── tsconfig.json
├── next.config.ts
└── middleware.ts
```

---

## 📖 ¿Qué es cada cosa?

### 1. `.cursorrules` - Reglas de Desarrollo ⚡

**Qué es**: Archivo de configuración para Cursor AI con TODAS las reglas y principios del proyecto.

**Contiene**:
- 🎯 Máximas de desarrollo (causa raíz, código limpio, largo plazo)
- 🏗️ Principios arquitectónicos
- 📝 Convenciones de código (naming, estructura, patterns)
- ❌ Anti-patrones a evitar

**Cuándo lo usas**: Cursor lo lee automáticamente en cada sesión. No necesitas abrirlo manualmente.

---

### 2. `app/` - La Aplicación (Next.js) 🚀

**Qué es**: El corazón de la aplicación. Usa Next.js App Router.

**Estructura**:
```
app/
├── (auth)/              # Rutas PÚBLICAS (sin login)
│   └── login/           # Página de login
│
├── (dashboard)/         # Rutas PROTEGIDAS (requieren login)
│   ├── empleado/        # Dashboard del empleado
│   ├── hr/              # Dashboard de HR Admin
│   └── manager/         # Dashboard de Manager
│
└── api/                 # API REST endpoints
    ├── ausencias/       # CRUD de ausencias
    ├── fichajes/        # CRUD de fichajes
    └── jornadas/        # CRUD de jornadas
```

**Cómo funciona**:
- Los **paréntesis** `(auth)` y `(dashboard)` son "route groups" - no afectan la URL
- `page.tsx` = una página visible (ej: `/login`, `/hr/dashboard`)
- `route.ts` = un endpoint API (ej: `POST /api/ausencias`)
- `layout.tsx` = diseño compartido por varias páginas

**Ejemplo de URL**:
- `app/(dashboard)/hr/dashboard/page.tsx` → `http://localhost:3000/hr/dashboard`
- `app/api/ausencias/route.ts` → `http://localhost:3000/api/ausencias`

---

### 3. `components/` - Componentes Reutilizables 🎨

**Qué es**: Piezas de UI que usas en múltiples páginas.

**Estructura**:
```
components/
├── ui/                 # shadcn/ui (auto-generados, NO EDITAR)
│   ├── button.tsx
│   ├── input.tsx
│   └── dialog.tsx
│
├── shared/             # Componentes COMPARTIDOS (usados en HR y empleado)
│   ├── fichaje-widget.tsx
│   ├── ausencias-widget.tsx
│   └── table-header.tsx
│
├── empleado/           # Componentes SOLO para empleados
│   └── solicitar-ausencia-modal.tsx
│
└── hr/                 # Componentes SOLO para HR
    └── bandeja-entrada-tabs.tsx
```

**Regla importante**:
- `ui/` = NO TOCAR (auto-generados por shadcn/ui)
- `shared/` = Componentes compartidos entre roles
- `empleado/` y `hr/` = Componentes específicos de cada rol

---

### 4. `lib/` - Lógica de Negocio 🛠️

**Qué es**: Funciones reutilizables, cálculos, validaciones, utilidades.

**Estructura**:
```
lib/
├── auth.ts              # Autenticación (JWT, sessions)
├── prisma.ts            # Cliente de base de datos (singleton)
├── utils.ts             # Utilidades generales
│
├── calculos/            # LÓGICA DE NEGOCIO
│   ├── ausencias.ts     # Calcular días, saldos, etc.
│   ├── fichajes.ts      # Calcular horas trabajadas
│   └── balance-horas.ts # Balance acumulado
│
└── validaciones/        # VALIDACIONES
    ├── schemas.ts       # Zod schemas (validar inputs)
    ├── nif.ts           # Validar NIFs
    └── iban.ts          # Validar IBANs
```

**Separación de responsabilidades**:
- ❌ **NO** pongas lógica de negocio en componentes React
- ✅ **SÍ** ponla en `lib/calculos/`
- Ejemplo: Calcular saldo de vacaciones → `lib/calculos/ausencias.ts`, NO en el componente

---

### 5. `prisma/` - Base de Datos 💾

**Qué es**: Configuración y schema de la base de datos PostgreSQL.

**Archivos clave**:
```
prisma/
├── schema.prisma        # SCHEMA (define tablas, campos, relaciones)
├── seed.ts              # DATOS DE PRUEBA (crear empleados, ausencias, etc.)
└── migrations/          # MIGRACIONES (cambios en la BD)
```

**Comandos importantes**:
```bash
npm run db:generate        # Regenerar Prisma Client
npm run db:migrate -- --name add_feature   # Crear nueva migración
npm run db:deploy          # Aplicar migraciones pendientes
npm run db:studio          # Ver BD en navegador
npm run diagnostico        # Diagnóstico rápido de integridad Prisma
npm run seed               # Poblar con datos de prueba
```

---

### 6. `docs/` - Documentación 📚

**Estructura actual**:
```
docs/
├── README.md                    # Índice general
├── ARQUITECTURA.md              # Decisiones técnicas
├── SETUP.md                     # Guía de instalación
├── DESIGN_SYSTEM.md             # Guía UI/UX y patrones de componentes
├── API_REFACTORING.md           # Patrones API centralizados
│
├── daily/                       # Changelog y consolidado mensual
│   ├── 2025-01-27-integracion-componentes.md
│   ├── 2025-01-27-unificacion-diseno.md
│   ├── 2025-10-consolidado.md
│   └── 2025-11-05-fix-email-duplicado.md
├── funcionalidades/             # Documentación por feature
│   ├── ausencias.md
│   ├── fichajes.md
│   ├── documentos.md
│   └── ...
├── ia/                          # Arquitectura IA y variables
├── notificaciones/              # Comunicación interna (ideas y estado)
├── incidencias/                 # RCA de incidencias detectadas
└── historial/                   # Documentación legacy / referencia
```

**Qué hay en cada carpeta**:
- **SETUP.md**: Cómo instalar y configurar desde cero
- **ARQUITECTURA.md**: Decisiones y stack
- **DESIGN_SYSTEM.md**: Guía de UI, tokens de color y patrones de componentes
- **API_REFACTORING.md**: Patrón de API handler unificado
- **funcionalidades/**: Manual por módulo (ausencias, fichajes, etc.)
- **daily/**: Registro cronológico y consolidado mensual
- **ia/**: Procesos de IA, variables y arquitectura
- **notificaciones/**: Estrategia de notificaciones y backlog
- **incidencias/**: Post-mortems y acciones correctivas
- **historial/**: Versiones antiguas (solo lectura)

---

## 🔄 Flujo de Trabajo Típico

### Ejemplo: Agregar una nueva funcionalidad

1. **Planificar** → Lee `.cursorrules` y `docs/ARQUITECTURA.md`
2. **Schema** → Actualiza `prisma/schema.prisma` si necesitas nuevas tablas
3. **Migración** → `npm run db:migrate -- --name add_feature`
4. **Lógica** → Crea funciones en `lib/calculos/` o `lib/validaciones/`
5. **API** → Crea endpoints en `app/api/`
6. **UI** → Crea componentes en `components/`
7. **Páginas** → Crea páginas en `app/(dashboard)/`
8. **Documentar** → Actualiza `docs/funcionalidades/` y `docs/daily/`

---

## 🎯 Principios de Organización

### 1. **Separación de Responsabilidades**
- `app/` = Routing y páginas
- `components/` = UI reutilizable
- `lib/` = Lógica de negocio
- `prisma/` = Base de datos

### 2. **Convención sobre Configuración**
- Nombres consistentes (camelCase para funciones, PascalCase para componentes)
- Estructura predecible (siempre sabes dónde buscar)

### 3. **Documentación Viva**
- Todo está documentado en `docs/`
- Changelog diario en `docs/daily/`
- Principios en `.cursorrules`

---

## 📖 Para Aprender Más

### Si quieres entender...

**...cómo funciona Next.js**
→ Lee `docs/ARQUITECTURA.md` sección "Flujo de Datos"

**...cómo se estructura la BD**
→ Abre `prisma/schema.prisma` y `docs/ARQUITECTURA.md` sección "Base de Datos"

**...cómo funciona la autenticación**
→ Lee `docs/ARQUITECTURA.md` sección "Autenticación y Autorización"

**...cómo funciona una funcionalidad específica**
→ Lee `docs/funcionalidades/[nombre].md`

---

## ✅ Checklist: ¿Entiendes la Estructura?

- [ ] Sé dónde están las **reglas de desarrollo** (.cursorrules)
- [ ] Entiendo la diferencia entre `app/`, `components/` y `lib/`
- [ ] Sé cómo crear una nueva página (en `app/`)
- [ ] Sé cómo crear un nuevo componente (en `components/`)
- [ ] Sé dónde poner lógica de negocio (`lib/calculos/`)
- [ ] Sé cómo modificar la base de datos (`prisma/schema.prisma`)
- [ ] Sé dónde buscar documentación (`docs/`)

---

---

## 📚 Relación con Otra Documentación

- **Para entender la estructura básica**: Lee este documento (ESTRUCTURA.md)
- **Para decisiones técnicas y patrones**: Lee [ARQUITECTURA.md](ARQUITECTURA.md)
- **Para configuración inicial**: Lee [SETUP.md](SETUP.md)
- **Para guías de desarrollo**: Lee [.cursorrules](../.cursorrules)

---

**Versión**: 1.2  
**Creado**: 25 de octubre 2025  
**Última actualización**: 7 de noviembre 2025
