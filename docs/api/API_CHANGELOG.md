# Changelog de API de Clousadmin

Todos los cambios notables en la API de Clousadmin serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

### Planned
- Endpoint de refresh token para renovar JWT sin credenciales
- Versionado de API (migración a /v1/)
- Filtros avanzados en listado de empleados (rango de fechas, múltiples equipos)
- Export masivo de datos en formato JSON
- Webhooks salientes (notificar a sistemas externos de cambios en Clousadmin)

---

## [2.0.0] - 2025-12-04

### Changed - Refactorización de API de Equipos

#### Breaking Changes
- **GET /api/equipos**: Ahora retorna objeto paginado `{ data: Equipo[], pagination: {...} }` en lugar de array directo
  - Los componentes frontend han sido actualizados con fallbacks para mantener compatibilidad

#### Added
- **Validación con Zod**: Todos los endpoints de equipos ahora usan schemas de validación
  - `createEquipoSchema`, `updateEquipoSchema`, `addMemberSchema`, `changeManagerSchema`, `politicaAusenciasSchema`
- **Helpers centralizados**: Nuevo módulo `lib/equipos/helpers.ts`
  - `formatEquipoResponse()` - Formateador único para respuestas
  - `validateTeamBelongsToCompany()` - Validación de pertenencia
  - `validateEmployeeIsTeamMember()` - Validación de membresía
  - `getTeamMemberIds()` - Helper para obtener IDs
- **Paginación**: GET /api/equipos ahora soporta paginación con `page` y `limit`
- **Validaciones mejoradas**:
  - Verificación de sedes antes de crear/actualizar
  - Validación de empleados activos antes de añadir
  - Verificación de manager como miembro del equipo

#### Improved
- **Eliminación de código duplicado**: ~200 líneas de código duplicado eliminadas
- **Type safety**: Tipos explícitos en todas las funciones
- **Manejo de errores**: Consistente con `handleApiError()` en todos los endpoints
- **Seguridad**: Validaciones robustas de pertenencia a empresa en todos los endpoints
- **Estructura de respuesta**: Estandarizada en todos los endpoints

#### Fixed
- **Error de runtime**: "equipos.map is not a function" - Corregido en 5 componentes
- **Compatibilidad backward**: Componentes actualizados para soportar ambas estructuras de respuesta

---

## [1.0.0] - 2025-01-27

### Added - Refactorización Completa de API

Esta versión marca la primera release estable de la API después de una refactorización completa de 174 endpoints.

#### Nuevas Características Generales
- **Autenticación centralizada**: JWT con helpers `requireAuth`, `requireAuthAsHR`, `requireAuthAsHROrManager`
- **Validación centralizada**: Schemas Zod para todos los endpoints
- **Respuestas estandarizadas**: `successResponse`, `createdResponse`, `errorResponse`, etc.
- **Manejo de errores consistente**: `handleApiError` en todos los endpoints
- **Multi-tenancy**: Filtrado automático por `empresaId` en todas las queries
- **Paginación**: Soportada en todos los endpoints de listado con params `page` y `limit`

#### Módulos de API Implementados

##### Autenticación (6 endpoints)
- `POST /api/auth/login` - Login con email y contraseña
- `POST /api/auth/google` - Login con Google OAuth
- `POST /api/auth/forgot-password` - Recuperación de contraseña
- `POST /api/auth/reset-password` - Restablecer contraseña
- `GET /api/auth/verify` - Verificar token
- `POST /api/logout` - Cerrar sesión

##### Empleados (15 endpoints)
- `GET /api/empleados` - Listar empleados (con paginación y filtros)
- `GET /api/empleados/{id}` - Obtener empleado
- `POST /api/empleados` - Crear empleado
- `PATCH /api/empleados/{id}` - Actualizar empleado
- `DELETE /api/empleados/{id}` - Dar de baja empleado
- `POST /api/empleados/{id}/avatar` - Subir avatar
- `GET /api/empleados/{id}/balance-horas` - Balance de horas
- `POST /api/empleados/{id}/complementos` - Añadir complemento salarial
- `POST /api/empleados/{id}/baja` - Proceso de baja
- `GET /api/empleados/export` - Exportar a Excel
- `POST /api/empleados/{id}/firma` - Configurar firma digital
- Y más...

##### Ausencias (4 endpoints principales)
- `GET /api/ausencias` - Listar ausencias
- `GET /api/ausencias/{id}` - Obtener ausencia
- `POST /api/ausencias` - Crear ausencia
- `PATCH /api/ausencias/{id}` - Actualizar/aprobar/rechazar ausencia
- `DELETE /api/ausencias/{id}` - Cancelar ausencia
- `GET /api/ausencias/saldo/{empleadoId}` - Consultar saldo

##### Fichajes (13 endpoints)
- `GET /api/fichajes` - Listar fichajes
- `POST /api/fichajes` - Registrar fichaje
- `GET /api/fichajes/balance/{empleadoId}` - Balance de horas
- `GET /api/fichajes/eventos/{empleadoId}` - Eventos de fichaje
- `POST /api/fichajes/correccion` - Solicitar corrección
- `POST /api/fichajes/bolsa-horas` - Gestionar bolsa de horas
- Y más...

##### Nóminas (24 endpoints)
- `GET /api/nominas` - Listar nóminas
- `GET /api/nominas/{id}` - Obtener nómina
- `POST /api/nominas` - Crear nómina
- `PATCH /api/nominas/{id}` - Actualizar nómina
- `GET /api/nominas/{id}/download` - Descargar PDF
- `POST /api/nominas/eventos` - Registrar evento de nómina
- `GET /api/nominas/alertas` - Obtener alertas
- `GET /api/nominas/analytics` - Analytics de nóminas
- Y más...

##### Equipos (5 endpoints)
- `GET /api/equipos` - Listar equipos
- `GET /api/equipos/{id}` - Obtener equipo
- `POST /api/equipos` - Crear equipo
- `PATCH /api/equipos/{id}` - Actualizar equipo
- `DELETE /api/equipos/{id}` - Eliminar equipo

##### Documentos y Plantillas (13 endpoints)
- `GET /api/documentos` - Listar documentos
- `POST /api/documentos` - Subir documento
- `POST /api/documentos/extract-ia` - Extracción con IA
- `GET /api/plantillas` - Listar plantillas
- `POST /api/plantillas` - Crear plantilla
- `POST /api/plantillas/{id}/generar` - Generar documento desde plantilla
- Y más...

##### Onboarding (11 endpoints)
- `POST /api/onboarding/iniciar` - Iniciar proceso
- `GET /api/onboarding/{token}` - Obtener datos del proceso
- `POST /api/onboarding/{token}/datos-personales` - Guardar datos
- `POST /api/onboarding/{token}/documentos` - Subir documentos
- `POST /api/onboarding/{token}/firma` - Firmar documentos
- `POST /api/onboarding/{token}/completar` - Completar proceso
- Y más...

##### Integraciones (9 endpoints)
- `GET /api/integrations/calendar/auth` - Iniciar OAuth Google
- `GET /api/integrations/calendar/callback` - Callback OAuth
- `POST /api/integrations/calendar/sync` - Sincronizar calendario
- `POST /api/integrations/calendar/webhook` - Webhook de Google Calendar
- `POST /api/billing/checkout` - Crear sesión de checkout Stripe
- `POST /api/billing/portal` - Portal de cliente Stripe
- `POST /api/webhooks/stripe` - Webhook de Stripe
- Y más...

##### Analytics (5 endpoints)
- `GET /api/analytics/compensacion` - Analytics de compensación
- `GET /api/analytics/equipos` - Analytics de equipos
- `GET /api/analytics/fichajes` - Analytics de fichajes
- `GET /api/analytics/plantilla` - Analytics de plantilla
- `GET /api/analytics/export` - Exportar analytics

##### Otros Módulos
- Campañas de vacaciones (11 endpoints)
- Jornadas laborales (4 endpoints)
- Festivos (4 endpoints)
- Puestos de trabajo (3 endpoints)
- Sedes (1 endpoint)
- Notificaciones (3 endpoints)
- Firma digital (6 endpoints)
- Canal de denuncias (2 endpoints)
- Configuración de empresa (5 endpoints)
- Y más... (174 endpoints en total)

#### Mejoras de Seguridad
- Validación de JWT en todos los endpoints protegidos
- Verificación de roles y permisos por endpoint
- Sanitización de inputs con Zod
- Prevención de inyección SQL con Prisma
- Rate limiting implementado (1000 req/hora, 100 req/minuto)

#### Mejoras de Performance
- Paginación por defecto en listados
- Eager loading de relaciones frecuentes
- Índices de base de datos optimizados
- Caché de queries frecuentes

#### Documentación
- Especificación OpenAPI 3.0 completa
- Swagger UI en `/api-docs`
- Guías de autenticación y manejo de errores
- Documentación detallada de webhooks
- Ejemplos de código en múltiples lenguajes

---

## [0.9.0] - 2025-01-20

### Added
- Sistema de campañas de vacaciones con cuadrado inteligente
- Gestión de compensación de horas extras
- Importación masiva de festivos nacionales
- Sistema de firma digital de documentos

### Changed
- Mejorado el proceso de onboarding con más pasos
- Refactorizado el sistema de ausencias (v3.2.2)

### Fixed
- Corrección de bug en cálculo de días laborables
- Fix en sincronización de Google Calendar
- Corrección en generación de PDF de nóminas

---

## [0.8.0] - 2024-12-15

### Added
- Integración con Google Calendar
- Webhooks de Stripe para facturación
- Sistema de notificaciones en tiempo real
- Canal de denuncias interno

### Changed
- Migrado de NextAuth a autenticación JWT custom
- Actualizado Prisma a v5

---

## [0.7.0] - 2024-11-01

### Added
- Sistema de analytics
- Export de datos a Excel
- Gestión de complementos salariales
- Sistema de auditoría

### Fixed
- Múltiples bugs en cálculo de nóminas
- Corrección en permisos de managers

---

## [0.6.0] - 2024-10-01

### Added
- Sistema de fichajes con geolocalización
- Balance de horas trabajadas
- Solicitudes de corrección de fichajes
- Dashboard de fichajes para managers

---

## [0.5.0] - 2024-09-01

### Added
- Gestión completa de nóminas
- Generación de PDFs de nóminas
- Alertas de incidencias en nóminas
- Proceso de envío de nóminas

### Changed
- Mejorado el sistema de roles y permisos

---

## [0.4.0] - 2024-08-01

### Added
- Sistema de ausencias (v3.0)
- Aprobación de ausencias por managers
- Consulta de saldo de vacaciones
- Calendario de ausencias

---

## [0.3.0] - 2024-07-01

### Added
- Gestión de equipos
- Asignación de managers
- Vista de empleados por equipo

---

## [0.2.0] - 2024-06-01

### Added
- CRUD completo de empleados
- Gestión de puestos de trabajo
- Gestión de sedes
- Sistema de onboarding básico

---

## [0.1.0] - 2024-05-01

### Added
- Primera versión de la API
- Autenticación básica con email y contraseña
- Login con Google OAuth
- Sistema multi-tenant por empresa
- Base de datos con Prisma + PostgreSQL

---

## Tipos de Cambios

### Added
Para nuevas funcionalidades.

### Changed
Para cambios en funcionalidades existentes.

### Deprecated
Para funcionalidades que serán eliminadas pronto.

### Removed
Para funcionalidades eliminadas.

### Fixed
Para corrección de bugs.

### Security
Para correcciones de seguridad.

---

## Breaking Changes

Los breaking changes (cambios que rompen compatibilidad) se marcarán con el emoji ⚠️ y se explicarán detalladamente.

### Guía de Migración

Cuando haya breaking changes, se proporcionará una guía de migración en este documento.

**Ejemplo:**

#### ⚠️ [1.0.0] - Cambio en formato de respuesta de paginación

**Antes (v0.x):**
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1
  }
}
```

**Después (v1.0+):**
```json
{
  "empleados": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

**Cómo migrar:**
- Actualiza tu código para leer el campo con el nombre del recurso (`empleados`, `ausencias`, etc.) en vez de `data`
- El campo `pagination` ya no existe, los campos están en el nivel raíz

---

## Política de Deprecación

Cuando una funcionalidad se marca como **Deprecated**:

1. Se anunciará con al menos **2 versiones de anticipación**
2. Se proporcionará una alternativa recomendada
3. Se mantendrá funcionando pero con warning en logs
4. Se eliminará en una versión major futura

**Ejemplo:**

### Deprecated in v1.2.0 (será eliminado en v2.0.0)
- `GET /api/empleados/search` - Usar `GET /api/empleados?search={query}` en su lugar

---

## Roadmap

### v1.1.0 (Q2 2025)
- [ ] Refresh tokens para renovación de JWT
- [ ] Webhooks salientes (notificar cambios a sistemas externos)
- [ ] Filtros avanzados en APIs de listado
- [ ] Rate limiting por endpoint

### v1.2.0 (Q3 2025)
- [ ] Versionado de API (/v1/, /v2/)
- [ ] GraphQL API (experimental)
- [ ] WebSocket para notificaciones en tiempo real
- [ ] API keys para integraciones

### v2.0.0 (Q4 2025)
- [ ] Refactorización major con breaking changes
- [ ] Eliminación de endpoints deprecated
- [ ] Nueva arquitectura de permisos más granular
- [ ] Soporte para multi-idioma en respuestas

---

## Contacto

Para reportar bugs o sugerir nuevas funcionalidades:
- Email: soporte@clousadmin.com
- GitHub Issues: [github.com/clousadmin/api/issues](https://github.com/clousadmin/api/issues)
- Slack: [clousadmin.slack.com](https://clousadmin.slack.com)

---

Última actualización: 27 de enero de 2025
