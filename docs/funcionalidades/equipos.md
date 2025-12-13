# Gestión de Equipos

**Última actualización:** 10 de diciembre de 2025
**Estado:** Documentación de funcionalidad completa

---

## Visión General

El sistema de equipos permite organizar a los empleados en grupos de trabajo con managers asignados, configurar políticas de ausencias específicas por equipo, y gestionar la estructura organizativa de la empresa.

---

## Tipos de Equipos

### 1. Proyecto
- Equipos creados para proyectos específicos
- Pueden tener duración limitada
- Ejemplo: "Proyecto App Mobile"

### 2. Squad
- Equipos permanentes por funcionalidad
- Estructura ágil
- Ejemplo: "Squad Backend", "Squad Frontend"

### 3. Temporal
- Equipos de corta duración
- Para iniciativas específicas
- Ejemplo: "Hackathon 2025", "Migración Cloud"

---

## Relación Empleado-Equipo

**Modelo N:N (Múltiples equipos por empleado):**

Desde diciembre 2025, la relación es N:N:
- Un empleado puede pertenecer a **múltiples equipos**
- Un equipo puede tener **múltiples empleados**
- Se usa la tabla intermedia `EmpleadoEquipo` con campo `fechaIncorporacion`

**Campos de la relación:**
```prisma
model EmpleadoEquipo {
  empleadoId         String
  equipoId           String
  fechaIncorporacion DateTime @default(now())

  @@id([empleadoId, equipoId])
}
```

---

## Gestión de Equipos

### Crear Equipo

**Acceso:** `/hr/organizacion/equipos` → "Crear equipo"

**Campos requeridos:**
- Nombre (único en la empresa)
- Tipo (proyecto, squad, temporal)

**Campos opcionales:**
- Descripción
- Sede asociada

**Validaciones:**
✅ Nombre único en la empresa
✅ Tipo debe ser válido (proyecto, squad, temporal)

---

### Editar Equipo

**Acceso:** `/hr/organizacion/equipos/[id]` → "Editar"

**Campos editables:**
- Nombre
- Descripción
- Tipo
- Sede
- Estado (activo/inactivo)

**Restricciones:**
- No se puede cambiar `empresaId`
- No se puede editar si tiene solicitudes pendientes críticas

---

### Eliminar Equipo

**Validaciones:**
✅ El equipo debe estar vacío (sin miembros)
✅ No debe tener políticas de ausencias activas
✅ No debe tener solicitudes pendientes

**Efectos:**
- El equipo se marca como `activo: false`
- NO se eliminan datos históricos
- Las ausencias aprobadas vinculadas al equipo se mantienen

---

## Gestión de Miembros

### Añadir Miembro

**Acceso:** `/hr/organizacion/equipos/[id]` → "Añadir miembro"

**Proceso:**
1. Seleccionar empleado de la lista de disponibles
2. Se crea registro en `EmpleadoEquipo` con fecha de incorporación actual
3. El empleado puede pertenecer a múltiples equipos

**Validaciones:**
✅ El empleado debe estar activo
✅ El empleado no debe estar ya en el equipo
✅ El equipo debe estar activo

---

### Eliminar Miembro

**Acceso:** `/hr/organizacion/equipos/[id]` → Click en miembro → "Eliminar"

**Efectos:**
- Se elimina el registro de `EmpleadoEquipo`
- El empleado puede seguir en otros equipos
- NO se eliminan datos históricos (ausencias, fichajes del periodo)

**Validaciones:**
✅ No se puede eliminar si el empleado es manager del equipo (primero cambiar manager)

---

## Gestión de Manager

### Asignar Manager

**Acceso:** `/hr/organizacion/equipos/[id]` → "Cambiar responsable"

**Proceso:**
1. Seleccionar empleado del equipo
2. Se actualiza campo `managerId` del equipo
3. El manager obtiene permisos sobre su equipo

**Validaciones:**
✅ El manager debe ser miembro del equipo
✅ Un empleado puede ser manager de múltiples equipos

**Permisos del Manager:**
- Ver fichajes de su equipo
- Aprobar ausencias de su equipo
- Ver nóminas de su equipo (solo visualización)
- Editar fichajes de su equipo

---

## Política de Ausencias por Equipo

**Ubicación:** `/hr/organizacion/equipos/[id]` → Tab "Política de Ausencias"

### Configuración

**Campos:**
- Días de vacaciones anuales (override del valor empresa)
- Días de asuntos propios
- Carry-over permitido (arrastrar saldo al año siguiente)
- Límite de carry-over (número de días máximo)

**Prioridad:**
1. **Política individual del empleado** (si existe)
2. **Política del equipo** (si existe)
3. **Política de empresa** (por defecto)

**Ver más:** [Ausencias - Política por Equipo](./ausencias.md#política-por-equipo)

---

## Widget de Plantilla (Dashboard)

**Ubicación:**
- `/hr/dashboard` (todos los empleados)
- `/manager/dashboard` (solo su equipo, desktop)
- `/empleado/dashboard` (todos los empleados de la empresa, desktop)

**Estados mostrados:**
1. **Trabajando**: Empleados con fichaje activo
2. **En pausa**: Empleados en descanso
3. **Ausentes**: Empleados con ausencia activa
4. **Sin fichar**: Empleados que deberían estar trabajando pero no han fichado
5. **Fuera de horario**: Empleados fuera de su jornada laboral

**Filtro por Equipo (Manager):**
- Los managers solo ven empleados de su(s) equipo(s)
- HR Admin ve todos los empleados

**Ver más:** [Fichajes - Widget de Plantilla](./fichajes.md#widget-de-plantilla)

---

## Permisos por Rol

| Acción | Empleado | Manager | HR Admin |
|--------|----------|---------|----------|
| Ver equipos | ❌ | ✅ (su equipo) | ✅ (todos) |
| Crear equipos | ❌ | ❌ | ✅ |
| Editar equipos | ❌ | ❌ | ✅ |
| Eliminar equipos | ❌ | ❌ | ✅ |
| Añadir miembros | ❌ | ❌ | ✅ |
| Eliminar miembros | ❌ | ❌ | ✅ |
| Asignar manager | ❌ | ❌ | ✅ |
| Configurar política ausencias | ❌ | ❌ | ✅ |
| Ver fichajes del equipo | ❌ | ✅ | ✅ |
| Aprobar ausencias del equipo | ❌ | ✅ | ✅ |

---

## Validaciones

### Al Crear Equipo
✅ Nombre único en la empresa
✅ Tipo válido (proyecto, squad, temporal)
✅ Si se asigna sede, debe existir y pertenecer a la empresa

### Al Asignar Manager
✅ El manager debe ser miembro del equipo
✅ El empleado debe estar activo

### Al Añadir Miembro
✅ El empleado no debe estar ya en el equipo
✅ El empleado debe estar activo
✅ El equipo debe estar activo

### Al Eliminar Equipo
✅ El equipo debe estar vacío
✅ No debe tener políticas de ausencias activas

---

## Casos de Uso

### 1. Crear Squad de Desarrollo

```
1. HR Admin accede a /hr/organizacion/equipos
2. Click "Crear equipo"
3. Nombre: "Squad Backend"
4. Tipo: "squad"
5. Descripción: "Equipo de desarrollo backend"
6. Guardar
7. Añadir miembros (5 desarrolladores)
8. Asignar manager (Tech Lead)
```

### 2. Asignar Política de Ausencias Específica

```
1. HR Admin accede a /hr/organizacion/equipos/[id]
2. Tab "Política de Ausencias"
3. Configurar: 25 días vacaciones (en lugar de 22 empresa)
4. Configurar: Carry-over permitido hasta 5 días
5. Guardar
6. Todos los miembros del equipo heredan esta política
```

### 3. Cambiar Manager de Equipo

```
1. HR Admin accede a /hr/organizacion/equipos/[id]
2. Click "Cambiar responsable"
3. Seleccionar nuevo manager de la lista de miembros
4. Confirmar
5. El anterior manager pierde permisos sobre el equipo
6. El nuevo manager obtiene permisos
```

---

## Integraciones

### Con Ausencias
- Política de ausencias específica por equipo
- Los managers aprueban ausencias de su equipo
- Validación de solapamientos dentro del equipo

### Con Fichajes
- Widget de plantilla filtrado por equipo (managers)
- Revisión de fichajes por equipo
- Balance de horas del equipo

### Con Nóminas
- Los managers pueden ver (solo lectura) nóminas de su equipo
- Alertas de nóminas del equipo

---

## Recursos Relacionados

**API:**
- [Referencia API Equipos](../api/reference/equipos.md)

**Funcionalidades:**
- [Empleados](./empleados.md)
- [Ausencias](./ausencias.md)
- [Fichajes](./fichajes.md)

**Backend:**
- `app/api/equipos/route.ts`
- `app/api/equipos/[id]/route.ts`
- `app/api/equipos/[id]/members/route.ts`
- `app/api/equipos/[id]/manager/route.ts`
- `lib/equipos/`

**Frontend:**
- `app/(dashboard)/hr/organizacion/equipos/`
- `components/organizacion/equipos/`
- `components/dashboard/plantilla-widget.tsx`
