# Fix: Cuadrar Fichajes - Problemas de Fechas y Cálculo de Horas

**Fecha:** 3 de diciembre de 2025  
**Tipo:** Bug Fix  
**Prioridad:** Alta  
**Estado:** ✅ Completado

## Problema Reportado

Usuario reporta que al cuadrar fichajes:
1. Los fichajes no aparecen en la tabla después del cuadraje (aunque no da error)
2. No está claro si el fichaje se crea bien y sale actualizado en la tabla
3. Posibles problemas con las fechas y la creación de fichajes

## Análisis Realizado

### 1. Problema de Zonas Horarias

**Síntoma:** 
- Eventos de fichaje podrían crearse en fechas incorrectas
- Desfase de horas por conversión UTC ↔ Local inconsistente

**Causa Raíz:**
```typescript
// ❌ ANTES - Múltiples formas de normalizar fechas
const fechaBase = new Date(
  fichaje.fecha.getFullYear(), 
  fichaje.fecha.getMonth(), 
  fichaje.fecha.getDate(),
  0, 0, 0, 0
);
```

Si `fichaje.fecha` viene como UTC del 3 dic a las 00:00, en Madrid sería 3 dic a la 1:00.
Al usar `getFullYear()` etc sobre el objeto Date, se usan métodos locales que pueden desfasar.

**Impacto:**
- Eventos creados en fecha incorrecta (día anterior o siguiente)
- Horas desfasadas por conversión

### 2. Race Condition en Cálculo de Horas

**Síntoma:**
- Fichajes cuadrados podrían aparecer temporalmente con 0 horas trabajadas

**Causa Raíz:**
```typescript
// ❌ ANTES
await prisma.$transaction(async (tx) => {
  // ... crear eventos ...
  await tx.fichajes.update({
    data: { estado: 'finalizado' }  // Sin horas calculadas
  });
});

// FUERA de transacción (race condition posible)
for (const fichaje of fichajes) {
  await actualizarCalculosFichaje(fichaje.id);
}
```

**Impacto:**
- Frontend puede refrescar antes de que se calculen las horas
- Muestra fichajes con 0 horas temporalmente
- Inconsistencia entre estado y datos calculados

### 3. Visualización en Tabla de Revisión

**Hallazgo:** ✅ **No es un bug**

La tabla de revisión (`/hr/horario/fichajes/cuadrar`) filtra por `estado: 'pendiente'`.
Cuando se cuadran fichajes, pasan a `estado: 'finalizado'`.

**Comportamiento esperado:**
- ✅ Los fichajes cuadrados desaparecen de revisión
- ✅ Los fichajes cuadrados aparecen en `/hr/horario/fichajes` con estado "Finalizado"

## Soluciones Implementadas

### Solución 1: Funciones de Utilidad para Fechas

**Archivo:** `lib/utils/fechas.ts`

```typescript
/**
 * Normaliza una fecha a las 00:00:00.000 del mismo día
 * Usa toMadridDate internamente para evitar desfases de zona horaria
 */
export function normalizarFechaSinHora(fecha: Date | string): Date {
  const fechaMadrid = toMadridDate(fecha);
  return fechaMadrid;
}

/**
 * Crea una fecha con una hora específica del día
 * Garantiza que la fecha base esté normalizada antes de añadir la hora
 */
export function crearFechaConHora(
  fechaBase: Date | string, 
  horas: number, 
  minutos: number
): Date {
  const fechaNormalizada = normalizarFechaSinHora(fechaBase);
  fechaNormalizada.setHours(horas, minutos, 0, 0);
  return fechaNormalizada;
}
```

### Solución 2: Cálculo de Horas Dentro de Transacción

**Archivo:** `app/api/fichajes/cuadrar/route.ts`

```typescript
// ✅ DESPUÉS - Dentro de transacción
await prisma.$transaction(async (tx) => {
  // ... crear eventos ...
  
  // Obtener eventos actualizados (incluyendo recién creados)
  const eventosActualizados = await tx.fichaje_eventos.findMany({
    where: { fichajeId },
    orderBy: { hora: 'asc' },
  });

  // Calcular horas con funciones puras (no hacen queries)
  const horasTrabajadas = calcularHorasTrabajadas(eventosActualizados) ?? 0;
  const horasEnPausa = calcularTiempoEnPausa(eventosActualizados);
  
  // Actualizar fichaje con horas calculadas Y estado finalizado
  await tx.fichajes.update({
    where: { id: fichajeId },
    data: {
      estado: 'finalizado',
      horasTrabajadas,      // ✅ Ya calculadas
      horasEnPausa,         // ✅ Ya calculadas
      fechaAprobacion: new Date(),
      cuadradoMasivamente: true,
    },
  });
});

// Ya no necesita post-procesamiento
```

### Solución 3: Uso Consistente en Toda la App

**Archivos modificados:**

1. **`app/api/fichajes/cuadrar/route.ts`**
   - Usar `crearFechaConHora` para crear eventos (líneas 337, 344, 349, 356, 380, 394, 397, 409)
   - Calcular horas dentro de transacción (líneas 416-432)

2. **`app/api/fichajes/revision/route.ts`**
   - Usar `crearFechaConHora` en eventos propuestos (línea 308)
   - Usar en POST también (línea 542)

3. **`lib/calculos/fichajes.ts`**
   - Función `normalizarFecha` usa `normalizarFechaSinHora` internamente
   - `obtenerFichaje` usa normalización consistente
   - `obtenerAusenciaMedioDia` usa normalización consistente

## Testing Manual Recomendado

### Test 1: Cuadrar Fichajes Vacíos
```
1. Navegar a /hr/horario/fichajes/cuadrar
2. Verificar que hay fichajes pendientes sin eventos
3. Seleccionar varios fichajes
4. Click en "Cuadrar"
5. ✅ Verificar que desaparecen de la tabla
6. Ir a /hr/horario/fichajes
7. ✅ Verificar que aparecen con estado "Finalizado"
8. ✅ Verificar que tienen horas trabajadas correctas (según jornada)
9. Click en un fichaje para ver detalles
10. ✅ Verificar que los eventos tienen fecha y hora correctas
```

### Test 2: Cuadrar Fichajes Parciales
```
1. Crear un fichaje con solo evento de entrada (desde app móvil o panel)
2. Esperar que aparezca en /hr/horario/fichajes/cuadrar
3. Seleccionar el fichaje
4. Click en "Cuadrar"
5. ✅ Verificar que mantiene el evento de entrada original
6. ✅ Verificar que se añaden los eventos faltantes (pausas, salida)
7. ✅ Verificar que las horas trabajadas son correctas
8. ✅ Verificar que las horas de los eventos respetan la jornada
```

### Test 3: Eventos con Ausencia de Medio Día
```
1. Crear ausencia de medio día (mañana) para un empleado
2. Verificar fichaje pendiente de ese día
3. Cuadrar el fichaje
4. ✅ Verificar que NO se crea evento de entrada
5. ✅ Verificar que SÍ se crea evento de salida (tarde)
6. ✅ Verificar horas trabajadas proporcionales
```

### Test 4: Zonas Horarias
```
1. Crear fichaje pendiente para fecha específica (ej: 3 dic 2025)
2. Cuadrar el fichaje
3. Ver detalles del fichaje
4. ✅ Eventos deben tener fecha 3 dic 2025 (no 2 ni 4)
5. ✅ Horas deben ser coherentes con jornada (ej: 9:00, no 8:00 o 10:00)
```

## Métricas de Éxito

- ✅ **0 errores de linter** en archivos modificados
- ✅ **Consistencia** en normalización de fechas (100% usando nuevas funciones)
- ✅ **Atomicidad** en cálculo de horas (dentro de transacción)
- ⏳ **Testing manual** confirma corrección visual (pendiente)

## Archivos Modificados

```
📁 lib/utils/
  ✅ fechas.ts                              (+35 líneas)

📁 app/api/fichajes/
  ✅ cuadrar/route.ts                       (~20 cambios)
  ✅ revision/route.ts                      (~5 cambios)

📁 lib/calculos/
  ✅ fichajes.ts                            (~6 cambios)

📁 docs/
  ✅ ANALISIS_CUADRAR_FICHAJES.md          (nuevo)
  ✅ RESUMEN_CORRECION_CUADRAR_FICHAJES.md (nuevo)
  ✅ historial/2025-12-03-fix-cuadrar-fichajes-fechas-horas.md (este archivo)
```

## Notas Técnicas

### Por qué las funciones puras funcionan en transacciones

```typescript
// Estas funciones NO hacen queries, solo calculan
calcularHorasTrabajadas(eventos)  // Itera eventos, calcula diferencias
calcularTiempoEnPausa(eventos)    // Itera eventos, suma pausas
```

Por lo tanto, es **seguro** usarlas dentro de transacciones.

### Por qué toMadridDate es importante

```typescript
// Input: "2025-12-03T00:00:00.000Z" (UTC)
// En Madrid (UTC+1): 3 dic a la 1:00

// ❌ Incorrecto (usa hora local del Date):
date.getFullYear()  // Puede variar según interpretación

// ✅ Correcto (usa formatToParts con timeZone):
toMadridDate(date)  // Siempre 3 dic 00:00 en Madrid
```

### Compatibilidad hacia atrás

- Las funciones antiguas (`normalizarFecha`, `obtenerFechaBase`) siguen funcionando
- Internamente ahora usan las nuevas funciones
- **No hay breaking changes**

## Actualización 4 de diciembre de 2025 – Promedios históricos de eventos

Desde el día 4 se incorpora lógica adicional basada en el promedio de los últimos días con eventos reales del mismo empleado y jornada. La idea principal es proponer eventos de entrada/pausa/salida basados en lo que el empleado hizo en días anteriores, en lugar de caer directamente a horarios fijos:

1. **Módulo nuevo**: `lib/calculos/fichajes-historico.ts` expone funciones para obtener los últimos `N` fichajes finalizados con eventos (filtrando también por `jornadaId`), calcular promedios por tipo de evento y validar/ajustar la secuencia (entrada < pausa < salida).
2. **API de cuadrar** (`app/api/fichajes/cuadrar/route.ts`) invoca ese helper antes de generar eventos y, si hay un promedio válido, crea solo los faltantes con las horas promedio. Si el promedio supera las horas esperadas del día se recalcula la salida usando `calcularHorasEsperadasDelDia`.
3. **Rate limit preventivo**: se agregó un límite de 50 fichajes por solicitud (`MAX_FICHAJES_POR_REQUEST`) para evitar que un lote enorme bloquee la transacción o consuma recursos excesivos.
4. **Migración de datos**: se aplicó la migración `20251204111828_backfill_jornada_id_fichajes` que copia el `jornadaId` de cada empleado en los fichajes históricos sin valor, garantizando que el helper histórico tenga siempre una referencia de jornada.
5. **Documentación asociada**: los detalles completos de la revisión senior se encuentran en `REVISION_SENIOR_CUADRAJE_HISTORICO.md` y están alineados con esta nota.

Con estos cambios la API de revisión también puede mostrar exactamente qué eventos deberían crearse para cuadrar y permite que los HR admins aprovechen el comportamiento histórico sin perder el fallback sólido anterior.

## Referencias

- [Documentación toMadridDate](../fechas-timezone.md)
- [Guía de Fichajes](../funcionalidades/fichajes.md)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)

---

**Revisado por:** Claude (Anthropic)  
**Aprobado para:** Testing Manual por Usuario

