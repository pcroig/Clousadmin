# Solución al Problema de Gestión de Jornadas

## Fecha
2025-12-10

## Problema Reportado
Al abrir el modal de gestión de jornadas, se mostraba:
- Label: "5 empleados seleccionados" ✓
- Lista de empleados: Aparecía vacía (sin checkboxes marcados) ✗

## Causa Raíz Identificada

### 1. Datos Inconsistentes
La asignación individual de jornada tenía 5 empleados en `empleadoIds`:
```json
{
  "id": "cmizil27s00011y8uqoe6ppsu",
  "jornadaId": "cmixwbe8e000f1yvx6wf9aupq",
  "nivelAsignacion": "individual",
  "empleadoIds": [
    "cmixwbeaf000j1yvx926uy0gc",
    "cmiy1i3tq000e1y4sm6u59x99",
    "cmixwlpfp00031yckc6upakjx",
    "cmixws9vx000n1yckq4zq4l6i",
    "cmixxg2x900051y3cvvf4yj3l"
  ]
}
```

**Pero** 4 de esos 5 empleados estaban marcados como inactivos (`activo: false`):
- `cmixwbeaf000j1yvx926uy0gc`: Juan S - INACTIVO
- `cmixwlpfp00031yckc6upakjx`: S S - INACTIVO
- `cmixws9vx000n1yckq4zq4l6i`: Juan Sufi - INACTIVO
- `cmixxg2x900051y3cvvf4yj3l`: Sisi ss - INACTIVO
- `cmiy1i3tq000e1y4sm6u59x99`: Sufit ss - ✓ ACTIVO

### 2. Comportamiento del Modal
El modal:
1. Carga empleados ACTIVOS desde `/api/empleados` (32 empleados)
2. Lee `empleadoIds` de la asignación (5 IDs)
3. Muestra label: "5 empleados seleccionados" (basándose en el array)
4. Renderiza checkboxes solo para los 32 empleados activos
5. Solo 1 de los 5 IDs coincide con empleados activos
6. Resultado: lista "vacía" (o con solo 1 marcado que podría estar fuera de vista)

## Soluciones Implementadas

### 1. Limpieza Inmediata de Datos (✅ Ejecutado)
Script: `scripts/limpiar-empleados-inactivos-jornadas.ts`

Resultado:
```
Asignación cmizil27s00011y8uqoe6ppsu:
  - EmpleadoIds antes: 5
  - EmpleadoIds después: 1 (solo activos)
  - Eliminado jornadaId de 4 empleados inactivos
```

### 2. Prevención Futura - Limpieza al Desactivar Empleados

#### a) En `/api/empleados/[id]/dar-de-baja/route.ts` (línea 135)
```typescript
await tx.empleados.update({
  where: { id: empleadoId },
  data: {
    activo: false,
    fechaBaja: fechaFin,
    estadoEmpleado: 'baja',
    jornadaId: null, // ✅ AÑADIDO - Limpiar jornada al desactivar
  },
});
```

#### b) En `/api/contratos/[id]/finalizar/route.ts` (línea 117)
```typescript
await tx.empleados.update({
  where: { id: contrato.empleadoId },
  data: {
    activo: false,
    fechaBaja: fechaFin,
    estadoEmpleado: 'baja',
    jornadaId: null, // ✅ AÑADIDO - Limpiar jornada al desactivar
  },
});
```

### 3. Validación en Asignación de Jornadas

En `/api/jornadas/asignar/route.ts` (líneas 270-306):

Añadida validación para filtrar empleados inactivos ANTES de guardar:

```typescript
case 'individual':
  // Verificar que todos los empleados existan y estén activos
  const empleadosValidos = await tx.empleados.findMany({
    where: {
      id: { in: validatedData.empleadoIds },
      empresaId: session.user.empresaId,
      activo: true, // ✅ Filtrar solo activos
    },
    select: { id: true },
  });

  const empleadoIdsValidos = empleadosValidos.map(e => e.id);

  if (empleadoIdsValidos.length === 0) {
    throw new Error('Ninguno de los empleados seleccionados está activo');
  }

  if (empleadoIdsValidos.length < validatedData.empleadoIds.length) {
    const inactivos = validatedData.empleadoIds.length - empleadoIdsValidos.length;
    console.warn(`[Asignar Jornada] ${inactivos} empleado(s) inactivo(s) fueron filtrado(s)`);
  }

  // Actualizar validatedData.empleadoIds para guardar solo IDs válidos
  validatedData.empleadoIds = empleadoIdsValidos;
  break;
```

## Verificación Post-Solución

### Estado de Asignaciones
```bash
npx tsx scripts/check-asignaciones.ts
```

Resultado:
```
Asignación cmizil27s00011y8uqoe6ppsu:
  - Nivel: individual
  - EmpleadoIds: ["cmiy1i3tq000e1y4sm6u59x99"]
  - Empleados con jornadaId: 1
    - cmiy1i3tq000e1y4sm6u59x99: Sufit ss
```

✅ Datos consistentes: 1 empleado en `empleadoIds` = 1 empleado activo

### Comportamiento del Modal Ahora
1. Carga 32 empleados activos
2. Lee `empleadoIds`: ["cmiy1i3tq000e1y4sm6u59x99"]
3. Muestra label: "1 empleado seleccionado"
4. Renderiza checkboxes con 1 marcado (Sufit ss)
5. ✅ Lista y label coinciden

## Archivos Modificados

1. **app/api/empleados/[id]/dar-de-baja/route.ts** - Limpia jornadaId al desactivar
2. **app/api/contratos/[id]/finalizar/route.ts** - Limpia jornadaId al finalizar contrato
3. **app/api/jornadas/asignar/route.ts** - Valida y filtra empleados inactivos

## Scripts Creados

1. **scripts/check-asignaciones.ts** - Verificar estado de asignaciones
2. **scripts/check-empleados-faltantes.ts** - Buscar empleados específicos
3. **scripts/test-jornadas-api.ts** - Simular respuesta del endpoint GET /api/jornadas
4. **scripts/test-empleados-api.ts** - Verificar empleados disponibles
5. **scripts/limpiar-empleados-inactivos-jornadas.ts** - Limpieza de datos legacy

## Mantenimiento Futuro

### Recomendación: Tarea Programada de Limpieza

Crear un cron job o tarea programada que ejecute periódicamente:
```typescript
// Limpiar empleadoIds de asignaciones individuales
// eliminando referencias a empleados inactivos
```

Esto aseguraría que incluso si por alguna razón un empleado se desactiva sin limpiar su `jornadaId`,
la limpieza periódica mantendría los datos consistentes.

## Conclusión

✅ **Problema resuelto**
- Datos limpios: Solo empleados activos en `empleadoIds`
- Prevención: Se limpia `jornadaId` al desactivar empleados
- Validación: Se filtran empleados inactivos al asignar jornadas

El modal ahora mostrará correctamente la lista de empleados seleccionados.
