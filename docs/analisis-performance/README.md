# Análisis de Modelos de Datos - Clousadmin

Este directorio contiene un análisis exhaustivo de cómo se usan los modelos de datos en las APIs y componentes del proyecto, con enfoque en performance y optimización.

## Documentos

### 📋 [00 - Resumen Ejecutivo](./00-resumen-ejecutivo.txt)
- Visión general de hallazgos
- 4 problemas N+1 críticos identificados
- Tablas de índices faltantes y campos JSONB
- Plan de acción priorizado
- Estimación de impacto

**Lectura recomendada: 5-10 min**

### 📖 [01 - Análisis Exhaustivo](./01-analisis-exhaustivo.md)
- Análisis detallado de cada API (fichajes, ausencias, nóminas, empleados)
- Patrones de queries más comunes
- Descripción técnica de 4 queries N+1
- Análisis de campos JSONB
- Estudio completo de índices existentes y faltantes
- Análisis de relaciones del modelo Empleado (28+ relaciones)
- Campos calculados sin cacheo
- Recomendaciones por severidad

**Lectura recomendada: 20-30 min**

### 💻 [02 - Soluciones de Código](./02-soluciones-codigo.md)
- Ejemplos implementables para cada problema
- Solución N+1: Bolsa de Horas (batch processing)
- Solución N+1: Revisión de Fichajes (precarga)
- Solución N+1: Eventos de Nómina (query agregada)
- Scripts de migración (agregar índices)
- Implementación de cacheo (balance de horas)
- Optimización de JSONB
- Tabla de esfuerzo vs impacto

**Lectura recomendada: 30-40 min (para implementación)**

## Hallazgos Clave

### Problemas N+1 (CRÍTICO)
| Problema | Ubicación | Impacto | Mejora |
|----------|-----------|---------|--------|
| Bolsa de Horas | app/api/fichajes/bolsa-horas/route.ts | ~16,500 queries | 99.7% ↓ |
| Revisión Fichajes | app/api/fichajes/revision/route.ts | ~100 queries | 95% ↓ |
| Eventos Nómina | app/api/nominas/eventos/route.ts | ~12 queries | 85% ↓ |
| Balance Horas | lib/calculos/balance-horas.ts | 30+ queries | 50% ↓ |

### Índices Faltantes (ALTO)
- `CompensacionHoraExtra`: `@@index([createdAt, estado])` 🔴 CRÍTICO
- `Empleado`: `@@index([empresaId, activo])`
- `Nomina`: `@@index([empresaId, estado])`
- `FichajeEvento`: `@@index([fichajeId, tipo])` y `@@index([tipo, hora])`
- `EventoNomina`: `@@index([estado])`
- `AutoCompletado`: `@@index([createdAt])`

### Campos JSONB sin Índice (MEDIO)
- `Jornada.config` (ALTA frecuencia) - usado en CADA fichaje
- `Empresa.config` (MEDIA frecuencia)
- `Integracion.config` (MEDIA frecuencia)
- `Ausencia.revisionIA` (MEDIA frecuencia)

### Campos Calculados sin Cacheo (MEDIO)
- Balance de Horas (30+ queries por empleado/período)
- Resumen Mensual Nómina (ya existe tabla, ¿se usa?)
- Saldo de Ausencias (✅ ya cacheado)

## Plan de Implementación

### SEMANA 1 - CRÍTICO (6.5h)
```
[3h]   Implementar calcularBalanceMensualBatch()
[2h]   Optimizar revisión de fichajes (precarga)
[1.5h] Resolver eventos de nómina (query agregada)
```
**Impacto esperado: 95% reducción en queries críticas**

### SEMANA 2 - ÍNDICES Y CACHEO (6.5h)
```
[0.5h] Agregar índices faltantes
[4h]   Implementar cache balance horas
[2h]   Optimizar jornada.config (Redis/índice)
```
**Impacto esperado: 15-50% mejora adicional**

### SEMANA 3 - ARQUITECTURA (variable)
```
[ ]    Considerar split Empleado en múltiples modelos
[ ]    Implementar lazy loading
[ ]    Performance testing y validación
```

## Impacto Estimado

| Escenario | Estado | Queries |
|-----------|--------|---------|
| Actual (peor caso) | ❌ | ~20,000 |
| Después CRÍTICO | ⚠️ | ~4,000 (80% ↓) |
| Después COMPLETO | ✅ | ~500-1,000 (95% ↓) |

## Archivos a Modificar

1. ✅ `app/api/fichajes/bolsa-horas/route.ts` - Usar batch
2. ✅ `app/api/fichajes/revision/route.ts` - Precarguar fichajes
3. ✅ `app/api/nominas/eventos/route.ts` - Query agregada
4. ✅ `lib/calculos/balance-horas.ts` - Agregar cache layer
5. ✅ `prisma/schema.prisma` - Agregar índices
6. ✅ `lib/calculos/balance-horas-cached.ts` - Crear archivo nuevo

## Próximos Pasos

1. Leer documentos en orden: Resumen → Análisis → Soluciones
2. Elegir problema a resolver (recomendado: Bolsa de Horas primero)
3. Implementar solución usando ejemplos del documento 02
4. Crear migration de Prisma para índices
5. Testing y validación de performance

## Notas Técnicas

- **Base de datos**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis (usar para Jornada.config si es necesario)
- **Total documentación**: ~15,000 palabras
- **Ejemplos de código**: 6 soluciones completas

---

**Generado:** 2024
**Nivel de exploración:** Very Thorough
**Status:** Análisis Completo - Listo para Implementación
