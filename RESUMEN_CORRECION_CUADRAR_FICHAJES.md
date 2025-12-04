# Resumen: Corrección de Problemas en Cuadraje de Fichajes

## 🔍 Problemas Identificados y Corregidos

### 1. **Desfase de Zonas Horarias en Creación de Eventos** ✅

**Problema:**
- Los eventos de fichaje se creaban con fechas inconsistentes debido a conversiones incorrectas entre zonas horarias
- Se usaban múltiples métodos de normalización de fechas (algunos con UTC, otros con hora local)
- Esto podía causar que los eventos se creasen en fechas incorrectas o con horas desfasadas

**Solución Implementada:**
- Creadas funciones de utilidad consistentes en `/lib/utils/fechas.ts`:
  - `normalizarFechaSinHora(fecha)`: Normaliza fechas a 00:00:00 usando zona horaria de Madrid
  - `crearFechaConHora(fecha, horas, minutos)`: Crea fechas con hora específica de forma consistente
  - `parseHoraAMinutos(hora)`: Utilidad para convertir HH:mm a minutos

**Archivos Modificados:**
- ✅ `/lib/utils/fechas.ts` - Agregadas funciones de utilidad
- ✅ `/app/api/fichajes/cuadrar/route.ts` - Usar `crearFechaConHora` en lugar de `setHours`
- ✅ `/app/api/fichajes/revision/route.ts` - Usar `crearFechaConHora` para eventos propuestos
- ✅ `/lib/calculos/fichajes.ts` - Usar `normalizarFechaSinHora` consistentemente

### 2. **Race Condition: Cálculo de Horas Fuera de Transacción** ✅

**Problema:**
- El cálculo de `horasTrabajadas` y `horasEnPausa` se hacía DESPUÉS de la transacción
- Había una ventana de tiempo donde el fichaje estaba `finalizado` pero sin horas calculadas
- El frontend podía refrescar antes de que se completara el cálculo y mostrar 0 horas

**Solución Implementada:**
- Movido el cálculo de horas DENTRO de la transacción
- Se importan las funciones `calcularHorasTrabajadas` y `calcularTiempoEnPausa` (son puras, no hacen queries)
- Se obtienen los eventos actualizados dentro de la transacción
- Se calculan las horas y se actualizan en el mismo `UPDATE` que cambia el estado a `finalizado`

**Código Antes:**
```typescript
// Dentro de transacción
await tx.fichajes.update({
  where: { id: fichajeId },
  data: {
    estado: 'finalizado',
    // Sin horas calculadas
  },
});

// FUERA de transacción (después)
for (const fichaje of fichajes) {
  await actualizarCalculosFichaje(fichaje.id); // ⚠️ Race condition
}
```

**Código Después:**
```typescript
// Todo DENTRO de transacción
const eventosActualizados = await tx.fichaje_eventos.findMany({
  where: { fichajeId },
  orderBy: { hora: 'asc' },
});

const horasTrabajadas = calcularHorasTrabajadas(eventosActualizados) ?? 0;
const horasEnPausa = calcularTiempoEnPausa(eventosActualizados);

await tx.fichajes.update({
  where: { id: fichajeId },
  data: {
    estado: 'finalizado',
    horasTrabajadas,  // ✅ Calculado antes de finalizar
    horasEnPausa,     // ✅ Calculado antes de finalizar
    fechaAprobacion: new Date(),
  },
});
```

### 3. **Comportamiento Correcto de Visualización** ✅

**Análisis:**
- La tabla de revisión (`/hr/horario/fichajes/cuadrar`) solo muestra fichajes en estado `pendiente`
- Cuando se cuadran fichajes, pasan a estado `finalizado`
- **Esto es CORRECTO**: los fichajes cuadrados no deben aparecer en revisión
- Los fichajes cuadrados aparecen en la tabla principal (`/hr/horario/fichajes`) con estado "Finalizado"

**No requiere corrección** - es el comportamiento esperado

### 4. **Normalización de Fechas Consistente** ✅

**Problema:**
- Múltiples formas de normalizar fechas en diferentes partes del código:
  - `new Date(year, month, date)`
  - `fecha.setHours(0, 0, 0, 0)`
  - `format(fecha, 'yyyy-MM-dd')`
  - `toMadridDate(fecha)`

**Solución:**
- Todas las normalizaciones ahora usan `normalizarFechaSinHora()`
- Esta función usa internamente `toMadridDate()` que respeta la zona horaria de Madrid
- Consistencia en todo el flujo: creación, búsqueda, y comparación de fichajes

## 📊 Impacto de los Cambios

### Antes:
1. ❌ Eventos podían crearse en fechas incorrectas
2. ❌ Race condition en cálculo de horas
3. ❌ Posible visualización de fichajes con 0 horas tras cuadrar
4. ❌ Inconsistencias de zona horaria

### Después:
1. ✅ Eventos se crean en la fecha y hora correctas
2. ✅ Horas calculadas atómicamente dentro de transacción
3. ✅ Fichajes siempre tienen horas correctas al finalizar
4. ✅ Normalización consistente en todo el sistema

## 🧪 Testing Recomendado

Para verificar que todo funciona correctamente:

1. **Crear fichajes pendientes:**
   - Verificar que aparecen en `/hr/horario/fichajes/cuadrar`

2. **Cuadrar fichajes:**
   - Seleccionar varios fichajes
   - Click en "Cuadrar"
   - Verificar que desaparecen de la tabla de revisión

3. **Verificar en tabla principal:**
   - Ir a `/hr/horario/fichajes`
   - Los fichajes recién cuadrados deben aparecer con:
     - Estado: "Finalizado"
     - Horas trabajadas correctas (no 0)
     - Fecha correcta (sin desfase de día)

4. **Verificar eventos:**
   - Click en un fichaje cuadrado para ver detalles
   - Los eventos deben tener:
     - Fecha correcta
     - Hora correcta (respetando la jornada del empleado)
     - Secuencia válida (entrada → pausa_inicio → pausa_fin → salida)

## 📝 Archivos Modificados

```
✅ lib/utils/fechas.ts
   - Agregadas: normalizarFechaSinHora, crearFechaConHora, parseHoraAMinutos

✅ app/api/fichajes/cuadrar/route.ts
   - Imports actualizados (calcularHorasTrabajadas, calcularTiempoEnPausa)
   - Uso de crearFechaConHora para crear eventos
   - Cálculo de horas dentro de transacción
   - Eliminado post-procesamiento fuera de transacción

✅ app/api/fichajes/revision/route.ts
   - Uso de crearFechaConHora para eventos propuestos
   - Normalización consistente con normalizarFechaSinHora

✅ lib/calculos/fichajes.ts
   - Función normalizarFecha ahora usa normalizarFechaSinHora
   - Actualización en obtenerFichaje y obtenerAusenciaMedioDia
```

## 🎯 Beneficios

1. **Consistencia:** Todas las fechas se normalizan de la misma forma
2. **Fiabilidad:** No más race conditions en cálculo de horas
3. **Precisión:** Eventos se crean en la fecha y hora correctas
4. **Mantenibilidad:** Funciones de utilidad reutilizables y bien documentadas
5. **Performance:** Menos queries (cálculo dentro de transacción)

## ⚠️ Notas Importantes

- **No hay breaking changes**: Las interfaces y comportamientos externos no cambian
- **Compatibilidad:** Las funciones antiguas siguen funcionando (wrappean las nuevas)
- **Sin errores de linter:** ✅ Todos los archivos pasan las validaciones

## 🚀 Próximos Pasos

1. ✅ Análisis completado
2. ✅ Funciones de utilidad creadas
3. ✅ Endpoint de cuadrar actualizado
4. ✅ Endpoint de revisión actualizado
5. ✅ Funciones de cálculo actualizadas
6. ✅ Sin errores de linter
7. ⏳ **Testing manual por el usuario** (verificar que todo funciona como esperado)

---

**Fecha:** 3 de diciembre de 2025  
**Estado:** ✅ Completado - Pendiente testing manual


