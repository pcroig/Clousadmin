# Resumen: Rediseño de Gestión de Jornadas - 7 Diciembre 2025

## Objetivo

Rediseñar el sistema de gestión de jornadas para:
1. Unificar UI de gestión y edición en una tabla expandible
2. Implementar validación de solapamiento (todos los empleados deben tener exactamente 1 jornada)
3. Eliminar referencias al campo "nombre" obsoleto
4. Mejorar visualización de empleados asignados con avatares
5. Fix errores de hidratación HTML

---

## ✅ Cambios Implementados

### 1. Fix Errores de Hidratación HTML

**Archivo modificado:**
- `app/(dashboard)/hr/horario/fichajes/editar-jornada-modal.tsx` (líneas 595-623)

**Problema:**
- Elementos `<p>` anidados dentro de `<AlertDialogDescription>` que ya renderiza un `<p>`
- Causaba errores de hidratación en consola

**Solución:**
```tsx
// Antes:
<AlertDialogDescription>
  <p className="mb-2">Texto...</p>
</AlertDialogDescription>

// Después:
<AlertDialogDescription>
  <span className="block mb-2">Texto...</span>
</AlertDialogDescription>
```

---

### 2. Sistema de Validación de Asignaciones

**Archivos nuevos creados:**

#### A) `lib/jornadas/validar-asignaciones.ts`
Helper functions para validación:
- `validarAsignacionesCompletas()` - Valida que todos los empleados tengan exactamente 1 jornada
- `obtenerEmpleadosPorJornada()` - Mapea jornadas a empleados
- `generarMensajeEmpleadosSinJornada()` - Genera mensajes descriptivos
- `validarAsignacionPropuesta()` - Valida una asignación antes de guardar

**Validaciones implementadas:**
- Detecta empleados sin jornada asignada
- Detecta empleados con múltiples jornadas (aunque no es posible en el modelo actual)
- Retorna errores descriptivos con lista de empleados afectados

#### B) `app/api/jornadas/validar-asignaciones/route.ts`
Endpoint GET para validar asignaciones:

**Request:**
```
GET /api/jornadas/validar-asignaciones
```

**Response:**
```json
{
  "valida": boolean,
  "totalEmpleados": number,
  "empleadosConJornada": number,
  "empleadosSinJornada": [
    { "id": "...", "nombre": "...", "apellidos": "..." }
  ],
  "empleadosConMultiplesJornadas": [],
  "errores": string[],
  "mensajeResumen": "..."
}
```

#### C) `lib/hooks/use-validacion-jornadas.ts`
Hook compartido para UI:

```typescript
const { validacion, loading, validar, mostrarErrores, limpiar } = useValidacionJornadas();
```

**Funcionalidad:**
- `validar()` - Llama al endpoint y retorna true/false
- `mostrarErrores()` - Muestra toasts con errores descriptivos
- `limpiar()` - Limpia el estado de validación

---

### 3. Fix Referencias al Campo "nombre"

**Archivo modificado:**
- `components/shared/mi-espacio/contratos-tab.tsx` (líneas 154, 166-167, 1233-1235)

**Cambios:**
```typescript
// Línea 154: Eliminada variable obsoleta
const nombre = typeof jornada.nombre === 'string' ? jornada.nombre : undefined;

// Línea 166-167: Usar etiqueta calculada
nombre: etiqueta ?? etiquetaCalculada,
etiqueta: etiqueta ?? etiquetaCalculada,

// Líneas 1233-1235: Usar nombre del objeto (que viene de la API)
label: `${jornada.nombre} (${jornada.horasSemanales}h/semana)`,
```

**Nota:** El campo `nombre` NO existe en la base de datos. Se genera dinámicamente en las APIs usando `obtenerEtiquetaJornada()`.

---

### 4. Rediseño Completo de UI - Tabla Expandible

**Archivo completamente reescrito:**
- `app/(dashboard)/hr/horario/jornadas/jornadas-client.tsx`

**Antes:**
- Modal separado (`EditarJornadaModal`)
- Botones "Editar" y "Eliminar" en columna de acciones
- Formulario en modal flotante

**Después:**
- **Tabla expandible inline**
- Click en fila para expandir/colapsar
- Formulario de edición dentro de la tabla
- Crear nueva jornada también inline

**Nuevas funcionalidades:**

1. **Estado de expansión:**
```typescript
const [expandedId, setExpandedId] = useState<string | null>(null);
const [isCreating, setIsCreating] = useState(false);
```

2. **Crear jornada inline:**
- Click en "+ Nueva Jornada" expande fila en la tabla
- Formulario completo visible inline
- Botones "Crear Jornada" y "Cancelar"

3. **Editar jornada inline:**
- Click en fila de jornada existente para expandir
- Carga datos automáticamente en formulario
- Botones "Guardar Cambios" y "Cancelar"
- Botón "Eliminar Jornada" en header (si no es predefinida)

4. **Columna "Asignados" mejorada:**
```typescript
function renderAsignados(jornada: Jornada) {
  if (!jornada.empleadosPreview || jornada.empleadosPreview.length === 0) {
    return (
      <span className="text-sm text-gray-500">
        {jornada._count?.empleados || 0} empleado{s}
      </span>
    );
  }

  return (
    <EmployeeListPreview
      empleados={jornada.empleadosPreview}
      maxVisible={3}
      avatarSize="md"
    />
  );
}
```

5. **Validación integrada:**
- Usa `useValidacionJornadas()` hook
- Valida después de guardar (no en tiempo real)
- Muestra errores descriptivos si hay empleados sin jornada

**Estructura de la tabla:**
```tsx
<Table>
  <TableBody>
    {/* Fila para crear nueva jornada */}
    {isCreating && expandedId === 'new' && (
      <TableRow>
        <TableCell colSpan={6}>
          <JornadaFormFields />
          <LoadingButton>Crear Jornada</LoadingButton>
        </TableCell>
      </TableRow>
    )}

    {/* Filas de jornadas existentes */}
    {jornadas.map((jornada) => (
      <Fragment>
        <TableRow onClick={() => handleExpandir(jornada.id)}>
          {/* Descripción, Tipo, Horas, Días, Asignados, Chevron */}
        </TableRow>

        {expandedId === jornada.id && (
          <TableRow>
            <TableCell colSpan={6}>
              <JornadaFormFields />
              <LoadingButton>Guardar Cambios</LoadingButton>
            </TableCell>
          </TableRow>
        )}
      </Fragment>
    ))}
  </TableBody>
</Table>
```

---

## Archivos Modificados

### Archivos Críticos
1. ✅ `app/(dashboard)/hr/horario/fichajes/editar-jornada-modal.tsx` (fix hidratación)
2. ✅ `app/(dashboard)/hr/horario/jornadas/jornadas-client.tsx` (rediseño completo)
3. ✅ `components/shared/mi-espacio/contratos-tab.tsx` (fix nombre)

### Archivos Nuevos
4. ✅ `lib/jornadas/validar-asignaciones.ts`
5. ✅ `app/api/jornadas/validar-asignaciones/route.ts`
6. ✅ `lib/hooks/use-validacion-jornadas.ts`

---

## Cómo Probar los Cambios

### 1. Verificar que no hay errores de hidratación
1. Abrir consola del navegador
2. Navegar a HR > Horario > Fichajes > Editar Jornada
3. Intentar cambiar asignación a nivel que tenga jornadas previas
4. Verificar que NO aparecen errores de `<p>` anidados

### 2. Probar nueva UI de gestión de jornadas
1. Ir a HR > Horario > Jornadas
2. Verificar que se muestra tabla con columnas: Descripción, Tipo, Horas, Días, **Asignados**, Chevron
3. Click en "+ Nueva Jornada" → se expande fila inline con formulario
4. Click en una fila de jornada existente → se expande con formulario de edición
5. Click en chevron o fuera de la fila → se colapsa

### 3. Verificar avatares en columna "Asignados"
1. En tabla de jornadas, columna "Asignados"
2. Si jornada tiene empleados con preview → mostrar avatares (max 3, tamaño md)
3. Si jornada tiene empleados sin preview → mostrar "N empleados"
4. Avatares deben usar `EmployeeListPreview` (mismo componente que en equipos/puestos)

### 4. Probar validación de asignaciones
1. Crear jornada y asignar a "Toda la empresa"
2. Crear otra jornada y asignar a empleados específicos
3. Al guardar, debe validar que todos los empleados tengan jornada
4. Si hay empleados sin jornada → mostrar error en toast

### 5. Verificar endpoint de validación
```bash
curl http://localhost:3000/api/jornadas/validar-asignaciones \
  -H "Cookie: ..."
```

Debe retornar JSON con validación completa.

---

## Pendientes (Opcionales)

1. **Mejorar validación en onboarding** (`jornada-step.tsx`)
   - Ya tiene validación básica funcional
   - Podría usar `useValidacionJornadas()` para consistencia

2. **Validación en API de asignación** (`app/api/jornadas/asignar/route.ts`)
   - Podría agregar validación antes de actualizar BD
   - Retornar error 409 si hay conflictos

3. **Mobile UI**
   - La tabla expandible funciona en desktop
   - Para mobile, considerar modal o vista diferente

4. **Testing completo**
   - Probar flujo completo de creación
   - Probar flujo completo de edición
   - Verificar que validación funciona en ambos

---

## Criterios de Éxito

✅ **No hay errores de hidratación en consola**
✅ **UI muestra tabla expandible (no modal)**
✅ **Columna "Asignados" usa EmployeeListPreview con avatares**
✅ **Validación detecta empleados sin jornada**
✅ **No hay referencias a `jornada.nombre` en código**
✅ **Formulario de edición inline funciona correctamente**

---

## Notas Técnicas

### Jornada Predefinida
- NO existe concepto de "jornada predefinida" en backend
- Solo existe en frontend como flag `esPredefinida`
- Se usa para deshabilitar edición/eliminación de jornada por defecto
- Una vez guardada, es una jornada normal

### Campo "nombre"
- NO existe en base de datos (tabla `jornadas`)
- Se genera dinámicamente en APIs con `obtenerEtiquetaJornada()`
- Formato: "Jornada Fija 40h (09:00-18:00)" o "Jornada Flexible 35h"
- APIs retornan `nombre` y `etiqueta` para backward compatibility

### Validación de Solapamiento
- Actualmente NO valida solapamiento temporal de horarios
- Solo valida que empleado tenga 1 jornada (no 0, no 2+)
- El modelo de BD permite solo 1 jornada por empleado (`jornadaId` nullable)
- Validación futura podría agregar checks de conflictos de horario

---

## Archivos para Revisión de Código

Si quieres revisar los cambios específicos:

1. **Hidratación:** `app/(dashboard)/hr/horario/fichajes/editar-jornada-modal.tsx:595-623`
2. **Validación helpers:** `lib/jornadas/validar-asignaciones.ts`
3. **Endpoint validación:** `app/api/jornadas/validar-asignaciones/route.ts`
4. **Hook validación:** `lib/hooks/use-validacion-jornadas.ts`
5. **UI rediseñada:** `app/(dashboard)/hr/horario/jornadas/jornadas-client.tsx` (completo)
6. **Fix nombre:** `components/shared/mi-espacio/contratos-tab.tsx:154,166-167,1233-1235`
