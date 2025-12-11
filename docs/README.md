# 📚 DOCUMENTACIÓN - CLOUSADMIN

Esta carpeta contiene toda la documentación del proyecto organizada de forma clara y escalable.

## 📁 Estructura

```
docs/
├── README.md                         # Este archivo
├── ARQUITECTURA.md                   # Decisiones arquitectónicas y estructura
├── API_REFACTORING.md                # Refactorización de patrones API (2025-01-27)
├── AUDITORIA_SEGURIDAD.md            # Auditorías de seguridad vigentes
├── CONFIGURACION_SEGURIDAD.md        # Checklist y configuración de seguridad
├── DESIGN_SYSTEM.md                  # Sistema de diseño UI/UX + patrones de componentes
├── ESTRUCTURA.md                     # Estructura actual del proyecto
├── HOOKS_REUTILIZABLES.md            # Hooks compartidos useApi/useMutation
├── SETUP.md                          # ⭐ Guía de configuración inicial
├── SETUP_GOOGLE_OAUTH.md            # Configuración de Google OAuth y Calendar
├── SETUP_PLANTILLAS.md              # Configuración del sistema de plantillas
├── INVITAR_USUARIOS.md              # Flujo de invitaciones y alta de usuarios
├── ROADMAP_FUNCIONALIDADES_FUTURAS.md # 🚀 Funcionalidades planificadas para el futuro
│
├── ARQUITECTURA.md                   # Decisiones arquitectónicas y estructura
├── ESTRUCTURA.md                     # Estructura actual del proyecto
├── DESIGN_SYSTEM.md                  # Sistema de diseño UI/UX + patrones de componentes
├── PATRONES_CODIGO.md                # Convenciones de código TypeScript/Next.js
├── API_REFACTORING.md                # Patrones de API centralizados (2025-01-27)
├── HOOKS_REUTILIZABLES.md            # Hooks compartidos useApi/useMutation
│
├── DEPLOY_HETZNER.md                 # Guía de despliegue en Hetzner
├── PRODUCCION_CHECKLIST.md           # Checklist de producción
├── NGINX_SETUP.md                    # Configuración de Nginx
├── DISASTER_RECOVERY.md              # Recuperación ante desastres
├── RUNBOOK.md                        # Runbook operacional
├── TROUBLESHOOTING.md                # Resolución de problemas recurrentes
├── TROUBLESHOOTING_PROD.md           # Troubleshooting en producción
│
├── CONFIGURACION_SEGURIDAD.md        # Checklist y configuración de seguridad
├── CONFIGURACION_RESEND.md           # Configuración de emails con Resend
├── CONFIGURACION_CRON_GITHUB.md      # Configuración de cron jobs
│
├── MIGRACION_HETZNER.md              # Guía de migración a Hetzner
├── CHECKLIST_MIGRACION_HETZNER.md    # Checklist de migración
├── MIGRACION_DOCUMENTOS_S3.md        # Migración de documentos a S3
│
├── MOBILE_OPTIMIZACION.md            # ⭐ Guía principal de adaptación mobile
├── MOBILE_ADAPTATION_SUMMARY.md      # Resumen ejecutivo mobile
├── MOBILE_COMPONENTS_GUIDE.md        # Guía de componentes responsive
├── MOBILE_FORM_COMPONENTS.md         # Formularios optimizados para touch
├── MOBILE_PERFORMANCE_OPTIMIZATIONS.md # Optimizaciones de rendimiento mobile
├── MOBILE_TESTING_PLAN.md            # Plan de testing mobile
│
│   ⚠️ **Nota**: Archivos históricos de mobile (`MOBILE_COMMIT_SUMMARY.md`, 
│   `MOBILE_FILES_CHANGED.md`) se encuentran en `historial/`
│
├── daily/                            # Logs diarios y consolidado por mes
│   ├── 2025-01-27-integracion-componentes.md
│   ├── 2025-01-27-unificacion-diseno.md
│   ├── 2025-10-consolidado.md
│   └── 2025-11-05-fix-email-duplicado.md
│
├── funcionalidades/                  # 📘 Lógica de negocio, workflows y validaciones
│   ├── analytics.md
│   ├── ausencias.md
│   ├── autenticacion.md
│   ├── bandeja-entrada.md
│   ├── canal-denuncias.md            # ✨ Sistema de denuncias internas
│   ├── complementos-salariales.md    # ⭐ Sistema de complementos (fijos y variables)
│   ├── documentos.md
│   ├── empleados.md                  # ⭐ Gestión completa de empleados
│   ├── equipos.md                    # ⭐ Gestión de equipos y managers
│   ├── festivos.md
│   ├── fichajes.md
│   ├── gestion-nominas.md
│   ├── importacion-empleados-excel.md # ✨ Importación masiva de empleados desde Excel
│   ├── importacion-puestos-zip.md
│   ├── jornadas.md
│   ├── offboarding.md
│   └── onboarding-documentos.md
│
├── historial/                        # 📚 Documentación histórica (solo referencia)
│   └── README.md                     # Índice de archivos históricos
│
│   ⚠️ **Nota**: Los archivos en `historial/` son referencias históricas.
│   La documentación activa está en la raíz de `docs/`.
│
├── ia/                               # Arquitectura y configuración IA
│   ├── ARQUITECTURA_IA.md
│   ├── ENV_VARIABLES.md
│   └── README.md
│
└── notificaciones/                   # Diseño de notificaciones internas
    ├── README.md
    └── sugerencias-futuras.md
```

## 📖 Organización de la Documentación

### Separación API vs Funcionalidad

La documentación está organizada en dos categorías complementarias:

**`/docs/api/reference/`** - Referencia Técnica de API
- Contratos de endpoints (requests, responses)
- Parámetros y validaciones técnicas
- Códigos de error y respuestas HTTP
- Ejemplos de curl/JSON
- **Audiencia**: Desarrolladores externos, integraciones, contratos API

**`/docs/funcionalidades/`** - Lógica de Negocio
- Workflows completos (alta, baja, aprobaciones)
- Validaciones de negocio
- Permisos por rol
- Casos de uso y ejemplos prácticos
- Integraciones entre módulos
- **Audiencia**: Desarrolladores internos, product managers

**Ejemplo:**
- [`api/reference/empleados.md`](api/reference/empleados.md) → Lista de endpoints, parámetros, responses
- [`funcionalidades/empleados.md`](funcionalidades/empleados.md) → Ciclo de vida del empleado, onboarding, offboarding, permisos

---

## 📖 Guías rápidas

### Para empezar
1. **Configuración inicial**: [`SETUP.md`](SETUP.md) - Guía completa de instalación y configuración
2. **Autenticación**: [`funcionalidades/autenticacion.md`](funcionalidades/autenticacion.md) - Flujos de autenticación y onboarding
3. **Arquitectura**: [`ARQUITECTURA.md`](ARQUITECTURA.md) - Decisiones técnicas y estructura
4. **Diseño**: [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) - Sistema de diseño UI/UX y patrones de componentes
5. **Código**: [`PATRONES_CODIGO.md`](PATRONES_CODIGO.md) - Convenciones de TypeScript/Next.js
6. **Mobile**: [`MOBILE_OPTIMIZACION.md`](MOBILE_OPTIMIZACION.md) - Guía de adaptación mobile
7. **Roadmap**: [`ROADMAP_FUNCIONALIDADES_FUTURAS.md`](ROADMAP_FUNCIONALIDADES_FUTURAS.md) - 🚀 Funcionalidades planificadas

### Para desarrollar
1. **Reglas de desarrollo**: `.cursorrules` en la raíz del proyecto
2. **Patrones de código**: [`PATRONES_CODIGO.md`](PATRONES_CODIGO.md)
3. **Patrones de API**: [`API_REFACTORING.md`](API_REFACTORING.md) - Refactorización completada (2025-01-27)
4. **Funcionalidades**: [`funcionalidades/`](funcionalidades/) - Documentación detallada de cada feature
5. **Hooks reutilizables**: [`HOOKS_REUTILIZABLES.md`](HOOKS_REUTILIZABLES.md)
6. **Logs diarios**: [`daily/`](daily/) - Registro cronológico de cambios

### Para desplegar
1. **Despliegue en Hetzner**: [`DEPLOY_HETZNER.md`](DEPLOY_HETZNER.md) - Guía completa
2. **Checklist de producción**: [`PRODUCCION_CHECKLIST.md`](PRODUCCION_CHECKLIST.md)
3. **Variables de entorno**: Ver `.env.example` y [`ia/ENV_VARIABLES.md`](ia/ENV_VARIABLES.md)
4. **Troubleshooting**: [`TROUBLESHOOTING_PROD.md`](TROUBLESHOOTING_PROD.md) - Problemas comunes en producción

---

---

## 📚 Documentación Histórica

Los archivos históricos y versiones antiguas se encuentran en `docs/historial/`. Esta carpeta contiene:
- Versiones antiguas de documentación
- Resúmenes de migraciones completadas
- Análisis y evaluaciones históricas
- Especificaciones y tests obsoletos

Ver [docs/historial/README.md](historial/README.md) para el índice completo.

---

**Nota**: La documentación activa y actualizada está en la raíz de `docs/`. Los archivos históricos se conservan únicamente como referencia.

---

## 📝 Notas de Actualización

### Cambios Recientes (27 de enero 2025)

#### Consolidación y Limpieza
- ✅ Movidos archivos históricos `RESUMEN_*` a `historial/` (3 archivos)
- ✅ Movido `REFACTOR_AUSENCIAS_V3.2.md` a `historial/`
- ✅ Consolidada documentación de optimización (referencias cruzadas mejoradas)
- ✅ Unificada documentación de mobile con referencias claras
- ✅ Consolidados archivos de testing con referencias cruzadas
- ✅ Consolidada documentación de seguridad (3 archivos con referencias cruzadas)

#### Actualización de Contenido
- ✅ Actualizada documentación de autenticación con información completa
- ✅ Eliminadas redundancias entre `SETUP.md` y `autenticacion.md`
- ✅ Actualizado `README.md` principal con estructura mejorada
- ✅ Mejoradas referencias cruzadas entre documentos
- ✅ Actualizada información de autenticación (Google OAuth, 2FA, recuperación de contraseña)
- ✅ Actualizada documentación de API con referencia a refactorización
- ✅ Actualizada documentación de especificaciones con fecha

#### Organización
- ✅ Movidos archivos históricos de mobile a `historial/`
- ✅ Mejorada estructura de `docs/README.md` con secciones claras
- ✅ Agregadas notas de referencia entre documentos relacionados
- ✅ Creado `INDICE_COMPLETO.md` con todos los 136 documentos organizados

#### Referencias Cruzadas
- ✅ Agregadas referencias entre documentos de seguridad
- ✅ Agregadas referencias entre documentos de configuración
- ✅ Agregadas referencias entre documentos de mobile
- ✅ Agregadas referencias entre documentos de optimización
- ✅ Agregadas referencias entre documentos de testing

### Cambios Recientes (11 de diciembre 2025)

#### Fix Crítico: Balance de Fichajes y Formateo de Horas Negativas
- ✅ **Bug corregido**: `formatearHorasMinutos()` mostraba balances negativos incorrectos
- ✅ **Causa raíz**: `Math.floor(-7.48) = -8` en lugar de `-7` (uso correcto: `Math.trunc()`)
- ✅ **Impacto**: Toda la plataforma (HR, Empleados, Widgets, Exportaciones)
- ✅ **Archivos modificados**:
  - `lib/utils/formatters.ts` → Fix centralizado con `Math.trunc()`
  - `components/shared/mi-espacio/fichajes-tab.tsx` → Eliminar código duplicado
  - `app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx` → Limpieza de DEBUG logs
- ✅ **Documentación**: [`historial/2025-12-11-fix-balance-fichajes-formateo.md`](historial/2025-12-11-fix-balance-fichajes-formateo.md)
- ✅ **Resultado**: Balance correcto en todas las vistas (ej: `-7.48h` → `-7h 29m` ✅ en lugar de `-8h 31m` ❌)

### Cambios Anteriores (10 de diciembre 2025)

#### Reorganización de Documentación API
- ✅ **Opción A implementada**: Separación clara entre API reference y funcionalidades
- ✅ Refactorizado `api/reference/empleados.md` a resumen de endpoints (de 786 a 150 líneas)
- ✅ Refactorizado `api/reference/equipos.md` a resumen de endpoints (de 603 a 188 líneas)
- ✅ Creado `funcionalidades/empleados.md` con lógica de negocio completa
- ✅ Creado `funcionalidades/equipos.md` con workflows y validaciones
- ✅ Actualizado `api/README.md` con tabla de referencias cruzadas
- ✅ Mejoradas referencias cruzadas entre documentos

#### Estructura Actual
- **`/docs/api/reference/`** → Contratos técnicos de API (requests, responses, parámetros)
- **`/docs/funcionalidades/`** → Lógica de negocio, workflows, validaciones, casos de uso

**Versión**: 1.7
**Última actualización**: 11 de diciembre 2025
