feat(notificaciones): implementar sistema completo de notificaciones y solicitudes con IA

## 🎯 Resumen

Sistema completo de notificaciones tipadas, solicitudes con clasificador IA, 
React Query para optimistic updates, y modal de complementos de nómina.

## ✅ Nuevas Características

### Sistema de Notificaciones
- 8 funciones helper tipadas para notificaciones específicas
- Metadatos ricos con URLs de acción y prioridades
- Sistema centralizado y reutilizable

### Clasificador IA de Solicitudes
- Implementado con Classification Pattern del core IA
- Multi-proveedor (OpenAI, Anthropic, Google) con fallback
- Criterios de auto-aprobación vs revisión manual
- Logging detallado para debugging y auditoría

### Cron Job de Auto-Aprobación
- Endpoint `/api/cron/revisar-solicitudes`
- Periodo configurable (default 48h)
- Clasificación IA automática
- Notificaciones automáticas a empleados

### React Query & Optimistic Updates
- Provider configurado en toda la app
- Hooks reutilizables: `useNotificaciones`, `useSolicitudes`
- Eliminados todos los `window.location.reload()`
- Invalidación inteligente de queries

### UI/UX
- Modal de complementos de nómina para managers
- Componente optimizado de bandeja (HR, Manager, Empleado)
- Toast notifications con sonner
- Estados de loading y error

## 🔧 Cambios Técnicos

### Schema y Database
- Nuevo enum `EstadoSolicitud` (5 estados)
- Campos IA en `SolicitudCambio`: `revisionIA`, `revisadaPorIA`, `requiereAprobacionManual`
- Migración aplicada: `20251108032428_add_estado_solicitud_enum`

### Refactorizaciones
- Whitelist centralizada en `lib/constants/whitelist-campos.ts`
- Clasificador alineado con arquitectura IA del proyecto
- Bandeja del empleado refactorizada (usa tabla real de notificaciones)
- Estados normalizados en todas las bandejas

### Fixes
- Estados inconsistentes (`EstadoAusencia` → `EstadoSolicitud`)
- Notificaciones genéricas → notificaciones tipadas
- Código duplicado → reutilización con DRY
- Linter errors en `lib/onboarding.ts` y `components/layout/sidebar.tsx`

## 📦 Archivos Afectados

### Nuevos (10)
- `lib/constants/whitelist-campos.ts`
- `lib/hooks/useNotificaciones.ts`
- `lib/hooks/useSolicitudes.ts`
- `app/providers.tsx`
- `app/api/cron/revisar-solicitudes/route.ts`
- `components/hr/bandeja-entrada-tabs-optimized.tsx`
- `components/hr/modal-complementos-nomina.tsx`
- `docs/GUIA_COMPLETA_NOTIFICACIONES.md`
- `docs/RESUMEN_PROGRESO_FINAL.md`
- `prisma/migrations/20251108032428_add_estado_solicitud_enum/`

### Modificados (15)
- `prisma/schema.prisma`
- `lib/constants/enums.ts`
- `lib/notificaciones.ts`
- `lib/ia/clasificador-solicitudes.ts`
- `lib/ia/index.ts`
- `lib/onboarding.ts`
- `app/layout.tsx`
- `app/(dashboard)/hr/bandeja-entrada/page.tsx`
- `app/(dashboard)/manager/bandeja-entrada/page.tsx`
- `app/(dashboard)/empleado/bandeja-entrada/page.tsx`
- `app/api/solicitudes/route.ts`
- `app/api/solicitudes/[id]/route.ts`
- `app/api/solicitudes/autoaprobar/route.ts`
- `app/api/ausencias/route.ts`
- `app/api/campanas-vacaciones/route.ts`

## 🧪 Testing

- ✅ Build: 3.3 min, 0 errores
- ✅ Linting: 0 errores
- ✅ TypeScript: 0 errores de tipos
- ✅ Testing manual de flujos completos

## 📚 Documentación

- Guía completa para desarrolladores (40+ páginas)
- Ejemplos de código y troubleshooting
- Best practices y checklist de producción
- Resumen ejecutivo de progreso

## ⚙️ Configuración Requerida

```bash
# Variables de entorno (producción)
CRON_SECRET=tu-secret-aqui
SOLICITUDES_PERIODO_REVISION_HORAS=48  # Opcional

# Programar cron job
# Vercel: vercel.json → crons
# O llamada externa diaria a /api/cron/revisar-solicitudes
```

## 🚀 Status

**Build**: ✅ PASSING  
**Linting**: ✅ PASSING  
**Production**: ✅ READY

## 📖 Referencias

- `docs/GUIA_COMPLETA_NOTIFICACIONES.md` - Guía para devs
- `docs/IMPLEMENTACION_NOTIFICACIONES_SOLICITUDES.md` - Plan técnico
- `docs/ia/ARQUITECTURA_IA.md` - Sistema IA

---

**BREAKING CHANGES**: Ninguno (backward compatible)

**DEPENDENCIES**: 
- @tanstack/react-query: ^5.x (ya instalada)
- sonner: ^1.x (ya instalada)

**MIGRATIONS**: 
- Requiere ejecutar: `npx prisma migrate deploy`

