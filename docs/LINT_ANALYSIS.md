# Análisis de Deuda de Linting - Fase 0

**Fecha**: 2025-01-27  
**Estado Inicial**: 578 problemas (351 errores, 227 warnings)  
**Estado después de `--fix`**: 578 problemas (correcciones automáticas aplicadas para `prefer-const`)

## Resumen por Tipo de Error

### Errores Críticos (351 total)

| Regla | Cantidad | Prioridad | Auto-fix |
|-------|----------|-----------|----------|
| `@typescript-eslint/no-explicit-any` | 314 | Alta | No |
| `react/no-unescaped-entities` | 24 | Media | No |
| `@typescript-eslint/ban-ts-comment` | 4 | Alta | No |
| `@typescript-eslint/no-require-imports` | 4 | Media | Parcial |
| `react-hooks/purity` | 1 | Alta | No |
| `react-hooks/set-state-in-effect` | 1 | Alta | No |
| Otros (prefer-const ya corregidos) | 3 | Baja | Sí ✅ |

### Warnings (227 total)

| Regla | Cantidad | Prioridad | Auto-fix |
|-------|----------|-----------|----------|
| `@typescript-eslint/no-unused-vars` | ~150 | Baja | Parcial |
| `react-hooks/exhaustive-deps` | 21 | Media | No |
| `@next/next/no-img-element` | 10 | Media | No |

## Distribución por Directorio

### Archivos con Más Errores

| Directorio | Archivos | Errores Aprox | Prioridad |
|------------|----------|---------------|-----------|
| `app/(dashboard)/**` | 52 | ~120 | Alta |
| `app/api/**` | 48 | ~100 | **Crítica** |
| `lib/ia/**` | 15 | ~80 | Alta |
| `lib/**` (otros) | 12 | ~50 | **Crítica** |
| `components/hr/**` | 5 | ~30 | Media |
| `components/shared/**` | 7 | ~20 | Alta |
| `components/empleado/**` | 3 | ~15 | Media |
| `components/organizacion/**` | 5 | ~15 | Media |
| `app/(auth)/**` | 8 | ~15 | Baja |
| `components/analytics/**` | 3 | ~6 | Baja |
| `scripts/**` | 2 | ~10 | Baja |

## Archivos Específicos Críticos

### lib/** (núcleo del sistema)

**Alta Prioridad** - Afecta toda la aplicación:

- `lib/api-handler.ts` - 4 errores any (usado en todos los APIs)
- `lib/crypto.ts` - 4 errores any (seguridad crítica)
- `lib/empleado-crypto.ts` - 5 errores any (seguridad crítica)
- `lib/env.ts` - 1 error any (configuración)
- `lib/auditoria.ts` - 2 errores any
- `lib/prisma.ts` - 1 error any
- `lib/utils.ts` - 2 errores any
- `lib/documentos.ts` - 1 error any
- `lib/notificaciones.ts` - 1 error any

### lib/calculos/** (lógica de negocio)

- `lib/calculos/balance-horas.ts` - 2 errores any
- `lib/calculos/dias-laborables.ts` - 1 error any

### lib/hooks/** (compartidos por toda la UI)

- `lib/hooks/useNotificaciones.ts` - 1 error any
- `lib/hooks/useSolicitudes.ts` - 3 errores any
- `lib/hooks/use-api.ts` - 1 error any
- `lib/hooks/use-crear-empleado.ts` - 2 errores any
- `lib/hooks/use-mutation.ts` - 2 errores any

### lib/ia/** (integración con IA)

- `lib/ia/core/client.ts` - 7 errores any
- `lib/ia/core/types.ts` - 5 errores any
- `lib/ia/core/providers/openai.ts` - 9 errores any + 1 ban-ts-comment
- `lib/ia/core/providers/anthropic.ts` - 5 errores any
- `lib/ia/core/providers/google.ts` - 5 errores any
- `lib/ia/patterns/classification.ts` - 11 errores any
- `lib/ia/patterns/extraction.ts` - 2 errores any
- `lib/ia/patterns/vision.ts` - 7 errores any
- `lib/ia/cuadrar-vacaciones.ts` - 5 errores any
- `lib/ia/procesar-excel-empleados.ts` - 4 errores any + 3 ban-ts-comment
- `lib/ia/clasificador-nominas.ts` - 1 error any
- `lib/ia/clasificador-solicitudes.ts` - 3 errores any
- `lib/ia/models.ts` - 2 errores any

### app/api/** (endpoints críticos)

Archivos con más impacto:
- `app/api/ausencias/[id]/route.ts` - múltiples any
- `app/api/empleados/*/route.ts` - múltiples any
- `app/api/fichajes/*/route.ts` - múltiples any
- `app/api/solicitudes/[id]/route.ts` - 4 errores any
- `app/api/solicitudes/autoaprobar/route.ts` - 2 errores any
- `app/api/solicitudes/procesar-fichajes/route.ts` - 1 error any
- `app/api/solicitudes/route.ts` - 1 error any

### components/shared/** (componentes reutilizables)

- `components/shared/data-table.tsx` - 1 error any
- `components/shared/document-uploader.tsx` - 1 error any
- `components/shared/loading-button.tsx` - 1 error any
- `components/shared/auto-completado-widget.tsx` - 1 error any

## Plan de Ataque por Fases

### Fase 1: Núcleo del Sistema (Prioridad Crítica)

**Objetivo**: Tipar correctamente las funciones y utilidades compartidas

1. **lib/api-handler.ts** - Crear tipos genéricos para respuestas API
2. **lib/crypto.ts** y **lib/empleado-crypto.ts** - Tipar funciones de encriptación
3. **lib/env.ts** - Tipar variables de entorno con Zod
4. **lib/utils.ts** - Tipar utilidades comunes
5. **lib/prisma.ts** - Tipar middleware de Prisma
6. **lib/notificaciones.ts** - Tipar payloads de notificaciones
7. **lib/hooks/*** - Tipar todos los hooks compartidos (9 archivos)
8. **lib/calculos/*** - Tipar funciones de cálculo (2 archivos principales)
9. **app/api/*** - Tipar entradas/salidas de endpoints (priorizar más usados)

**Estimación**: 40-50 archivos, ~150 errores any

### Fase 2: Componentes de Dominio

**Objetivo**: Limpiar componentes de UI y páginas

1. **components/shared/** - 7 archivos
2. **components/hr/** - 5 archivos principales
3. **components/empleado/** - 3 archivos
4. **components/organizacion/** - 5 archivos
5. **app/(dashboard)/*** - Páginas de dashboard (priorizar managers, hr, empleado)

**Estimación**: 60-70 archivos, ~100 errores any

### Fase 3: Integración IA (Opcional - Complejidad Alta)

**Objetivo**: Tipar correctamente las integraciones con servicios de IA

- **lib/ia/core/** - Sistema de cliente genérico
- **lib/ia/patterns/** - Patrones de clasificación, extracción, visión
- **lib/ia/** - Procesadores específicos

**Estimación**: 15 archivos, ~60 errores any  
**Nota**: Estos archivos son complejos porque manejan respuestas dinámicas de IA

### Fase 4: Limpieza de Warnings y Reglas Específicas

**Objetivo**: Resolver warnings y errores menores

1. **Imports no usados** - Eliminar imports que no se usan (~150 casos)
2. **Dependencias de hooks** - Añadir deps faltantes o useCallback (~21 casos)
3. **Imágenes Next.js** - Convertir `<img>` a `<Image>` (~10 casos)
4. **Comillas escapadas** - Escapar comillas en JSX (~24 casos)
5. **require() imports** - Convertir a import ESM (4 casos en lib/imports/nominas-upload.ts)
6. **@ts-ignore → @ts-expect-error** - Documentar supr esiones (4 casos)

**Estimación**: ~200 warnings

## Estrategia de Tipos Compartidos

Crear archivo `/types/common.ts` con tipos reutilizables:

```typescript
// Respuestas API genéricas
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

// Payloads de eventos
export type EventPayload = Record<string, unknown>;

// Metadatos genéricos
export type Metadata = Record<string, unknown>;

// Funciones de transformación
export type Transformer<TInput, TOutput> = (input: TInput) => TOutput;

// Opciones de configuración
export type ConfigOptions = Record<string, unknown>;
```

## Métricas de Progreso

### Estado Inicial
- ✅ Errores: 351
- ✅ Warnings: 227
- ✅ **Total: 578**

### Meta Fase 1
- Errores: ~200 (-150)
- Warnings: 227
- Total: ~427

### Meta Fase 2
- Errores: ~100 (-100)
- Warnings: 227
- Total: ~327

### Meta Fase 3 (Opcional)
- Errores: ~40 (-60)
- Warnings: 227
- Total: ~267

### Meta Fase 4 (Final)
- Errores: 0
- Warnings: 0
- **Total: 0** ✅

## Notas Importantes

1. **No relajar reglas**: Mantener configuración estricta actual
2. **Tests manuales**: Probar funcionalidad crítica después de cada fase
3. **Commits frecuentes**: Un commit por directorio/módulo limpio
4. **Documentar patrones**: Crear guía de tipado para el equipo
5. **Revisar PRs**: Validar que nuevos PRs no añaden `any`

## Archivos que Pueden Requerir Atención Especial

### Errores React Hooks Críticos

1. **app/(dashboard)/empleado/mi-espacio/mi-espacio-client.tsx:35**
   - `setState` síncrono en `useEffect` - Debe refactorizarse
   
2. **app/(dashboard)/hr/bandeja-entrada/page.tsx:224**
   - `Date.now()` en render - Mover fuera del componente

### Archivos de Migración/Scripts (Baja Prioridad)

- `scripts/diagnostico-prisma.ts` - 4 errores any
- `scripts/migrate-fichajes-to-new-model.ts` - 5 warnings unused-vars

Estos pueden limpiarse al final o añadir `// eslint-disable-next-line` si son temporales.

## Conclusión

La mayor parte de la deuda (89%) viene de uso de `any` explícito. El trabajo principal está en:

1. **Fase 1** (Crítica): lib/** y app/api/** - Fundamentos del sistema
2. **Fase 2** (Importante): Componentes y páginas - Experiencia de usuario
3. **Fase 3** (Opcional): lib/ia/** - Integraciones avanzadas  
4. **Fase 4** (Limpieza): Warnings y reglas menores

Estimación total: **~100-150 archivos a modificar** en 3-4 semanas de trabajo dedicado.

