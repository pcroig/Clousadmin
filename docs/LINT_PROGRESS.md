# Progreso de Limpieza de Linting

**Última Actualización**: 2025-01-27  
**Estado Inicial**: 578 problemas (351 errores, 227 warnings)  
**Estado Actual**: En progreso - Fase 1

## Fase 0: Análisis ✅ COMPLETADA

- ✅ Análisis completo de errores y warnings
- ✅ Catalogación por tipo de error y directorio
- ✅ Plan de ataque detallado creado
- ✅ Documento `LINT_ANALYSIS.md` generado

**Tiempo**: ~30 minutos  
**Archivos**: 1 documento de análisis

## Fase 1: Núcleo del Sistema 🔄 EN PROGRESO

### Archivos Completados (3/50)

#### 1. types/common.ts ✅ NUEVO
- Tipos compartidos creados para usar en toda la app
- `ApiResponse<T>`, `Metadata`, `JsonValue`, etc.
- Base para eliminar `any` en el resto del código

#### 2. lib/api-handler.ts ✅ LIMPIO
**Antes**: 4 errores
- `ApiResponse<T = any>` → `ApiResponse<T = unknown>`
- `details?: any` → `details?: unknown`
- `badRequestResponse(message: string, details?: any)` → `details?: unknown`
- `req: NextRequest` no usado → `_req: NextRequest`

**Después**: 0 errores, 1 warning menor  
**Impacto**: Usado en TODOS los endpoints API

#### 3. lib/services/solicitudes-actions.ts ✅ YA ESTABA LIMPIO
- Archivo creado en task anterior
- Sin errores de linting

### Archivos Pendientes en lib/ (47 archivos)

**Alta Prioridad** (compartidos/críticos):
- [ ] lib/utils.ts (2 errores any)
- [ ] lib/env.ts (1 error any)
- [ ] lib/crypto.ts (4 errores any)
- [ ] lib/empleado-crypto.ts (5 errores any)
- [ ] lib/prisma.ts (1 error any)
- [ ] lib/auditoria.ts (2 errores any)
- [ ] lib/documentos.ts (1 error any)
- [ ] lib/notificaciones.ts (1 error any)
- [ ] lib/onboarding.ts (3 errores any)
- [ ] lib/onboarding-config.ts (2 errores any)

**lib/hooks/** (9 archivos):
- [ ] lib/hooks/useNotificaciones.ts (1 error)
- [ ] lib/hooks/useSolicitudes.ts (3 errores)
- [ ] lib/hooks/use-api.ts (1 error)
- [ ] lib/hooks/use-crear-empleado.ts (2 errores)
- [ ] lib/hooks/use-mutation.ts (2 errores)

**lib/calculos/** (2 archivos):
- [ ] lib/calculos/balance-horas.ts (2 errores)
- [ ] lib/calculos/dias-laborables.ts (1 error)

**lib/validaciones/** (1 archivo):
- [ ] lib/validaciones/nominas.ts (4 errores)

**lib/excel/** y **lib/exports/** (2 archivos):
- [ ] lib/excel/parser.ts (5 errores)
- [ ] lib/exports/excel-gestoria.ts (4 errores)

**lib/integrations/** (2 archivos):
- [ ] lib/integrations/calendar/calendar-manager.ts (2 errores)
- [ ] lib/integrations/calendar/providers/google-calendar.ts (2 errores)

**lib/imports/** (1 archivo):
- [ ] lib/imports/nominas-upload.ts (2 errores require-imports)

**lib/ia/** (15 archivos - Complejidad Alta):
- [ ] lib/ia/core/client.ts (7 errores)
- [ ] lib/ia/core/types.ts (5 errores)
- [ ] lib/ia/core/providers/openai.ts (9 errores + 1 ban-ts-comment)
- [ ] lib/ia/core/providers/anthropic.ts (5 errores)
- [ ] lib/ia/core/providers/google.ts (5 errores)
- [ ] lib/ia/patterns/classification.ts (11 errores)
- [ ] lib/ia/patterns/extraction.ts (2 errores)
- [ ] lib/ia/patterns/vision.ts (7 errores)
- [ ] lib/ia/patterns/generation.ts (1 error)
- [ ] lib/ia/cuadrar-vacaciones.ts (5 errores)
- [ ] lib/ia/procesar-excel-empleados.ts (4 errores + 3 ban-ts-comment)
- [ ] lib/ia/clasificador-nominas.ts (1 error)
- [ ] lib/ia/clasificador-solicitudes.ts (3 errores)
- [ ] lib/ia/models.ts (2 errores)

### Archivos Pendientes en app/api/ (~48 archivos)

Endpoints con errores any que necesitan tipado:
- [ ] app/api/ausencias/**
- [ ] app/api/empleados/**
- [ ] app/api/fichajes/**
- [ ] app/api/solicitudes/**
- [ ] app/api/nominas/**
- [ ] app/api/documentos/**
- [ ] app/api/equipos/**
- [ ] app/api/puestos/**
- [ ] app/api/campanas-vacaciones/**
- [ ] Más...

### Progreso Fase 1

**Archivos Limpiados**: 3 / ~100  
**Errores Eliminados**: 4  
**Errores Restantes en Fase 1**: ~150

## Fase 2: Componentes 📋 PENDIENTE

- components/shared/** (~7 archivos)
- components/hr/** (~5 archivos)
- components/empleado/** (~3 archivos)
- components/organizacion/** (~5 archivos)
- app/(dashboard)/** (~52 archivos)

## Fase 3: Reglas Específicas 📋 PENDIENTE

- Convertir `<img>` a `<Image>` (~10 casos)
- Eliminar imports no usados (~150 casos)
- Arreglar dependencias de hooks (~21 casos)
- Convertir require() a import (~4 casos)
- Escapar comillas en JSX (~24 casos)
- @ts-ignore → @ts-expect-error (~4 casos)

## Fase 4: Verificación Final 📋 PENDIENTE

- npm run lint → 0 errores, 0 warnings
- npm run build → exitoso
- Documentar patrones de tipado
- Configurar lint-staged/Husky (opcional)

## Métricas

### Estado por Fase

| Fase | Estado | Archivos | Errores Eliminados |
|------|--------|----------|-------------------|
| Fase 0 | ✅ Completada | 1 análisis | - |
| Fase 1 | 🔄 3% (3/100) | 3 / ~100 | 4 / ~150 |
| Fase 2 | 📋 Pendiente | 0 / ~70 | 0 / ~100 |
| Fase 3 | 📋 Pendiente | 0 / ~200 | 0 / ~200 |
| Fase 4 | 📋 Pendiente | - | - |

### Tiempo Estimado

- **Fase 0**: 30 min ✅
- **Fase 1**: 8-12 horas (3% completado)
- **Fase 2**: 6-8 horas
- **Fase 3**: 4-6 horas  
- **Fase 4**: 2 horas

**Total Estimado**: 20-30 horas de trabajo dedicado

## Próximos Pasos

1. Continuar con lib/utils.ts, lib/env.ts, lib/crypto.ts
2. Limpiar todos los archivos de lib/hooks/**
3. Limpiar lib/calculos/**
4. Abordar app/api/** endpoints por orden de uso
5. Decidir estrategia para lib/ia/** (complejo, podría ser opcional)

## Notas

- El trabajo es extenso pero sistemático
- Cada archivo limpio reduce la deuda técnica permanentemente
- Los cambios son seguros (solo tipado, sin lógica)
- El código resultante será más mantenible y robusto

