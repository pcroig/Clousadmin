# 📁 Sistema de Carpetas Compartidas

**Fecha**: 4 de Diciembre 2025
**Estado**: 🔧 En Desarrollo (Debug)
**Versión**: 1.0.0-beta

---

## 🎯 Resumen Ejecutivo

El sistema de carpetas compartidas permite a HR Admin crear carpetas de documentos y asignarlas a empleados específicos, equipos completos, o todos los empleados de la empresa. Las carpetas asignadas aparecen automáticamente en la sección "Mi Espacio > Documentos" de cada empleado que tiene acceso.

**Tipos de Carpetas**:
- **Master** (`esSistema: true`): Carpetas especiales del sistema (Contratos, Nóminas, Justificantes, Otros). Se crean automáticamente para cada empleado.
- **Compartidos** (`compartida: true && !esSistema`): Carpetas creadas por HR y asignadas a empleados/equipos.
- **Personal** (`!compartida && !esSistema`): Carpetas privadas del empleado.

---

## 📊 Arquitectura

### Modelo de Datos: Carpeta

```prisma
model carpetas {
  id          String   @id @default(uuid())
  empresaId   String
  empleadoId  String?  // NULL = carpeta compartida (no pertenece a un empleado específico)
  nombre      String
  esSistema   Boolean  @default(false)
  compartida  Boolean  @default(false)
  asignadoA   String?  // Formato especial, ver abajo

  empresa     empresas  @relation(fields: [empresaId], references: [id])
  empleado    empleados? @relation(fields: [empleadoId], references: [id])
  documentos  documentos[]

  @@index([empresaId])
  @@index([empleadoId])
  @@index([compartida])
}
```

### Campo `asignadoA` - Formatos de Asignación

El campo `asignadoA` define quién puede ver la carpeta compartida:

#### 1. Todos los empleados
```typescript
asignadoA = "todos"
```
- La carpeta aparece en el espacio de TODOS los empleados activos de la empresa
- Útil para políticas de empresa, comunicados generales, etc.

#### 2. Equipo específico
```typescript
asignadoA = "equipo:abc123"
```
- La carpeta aparece solo para empleados que pertenecen al equipo con ID `abc123`
- Se verifica contra la tabla `empleado_equipos`

#### 3. Empleados individuales
```typescript
asignadoA = "empleado:id1,empleado:id2,empleado:id3"
```
- La carpeta aparece solo para los empleados con IDs especificados
- Formato CSV separado por comas
- Útil para documentos específicos de un grupo pequeño

---

## 🚀 Flujo de Uso

### Para HR Admin: Crear Carpeta Compartida

```
1. HR → /hr/documentos
2. Click "Crear Carpeta"
3. Modal se abre:
   ├─ Nombre de carpeta
   ├─ Compartir con:
   │  ├─ Todos los empleados
   │  ├─ Equipo específico → Selector de equipos
   │  └─ Empleados seleccionados → Multi-select de empleados
   └─ [Opcional] Subir documentos iniciales
4. Click "Crear"
5. Sistema:
   ├─ Guarda carpeta con compartida=true, asignadoA="..."
   └─ Carpeta debe aparecer automáticamente en espacios de empleados asignados
```

### Para Empleados: Ver Carpetas Compartidas

```
1. Empleado → /empleado/mi-espacio/documentos
2. Sistema ejecuta query:
   ├─ Obtiene carpetas personales (empleadoId = empleado.id)
   └─ Obtiene carpetas compartidas donde:
      ├─ asignadoA = "todos" OR
      ├─ asignadoA CONTAINS "empleado:{empleado.id}" OR
      └─ asignadoA = "equipo:{equipoId}" (para cada equipo del empleado)
3. Muestra ambas listas combinadas con badges:
   ├─ Master (gris) - Carpetas del sistema
   ├─ Compartidos (azul) - Carpetas asignadas por HR
   └─ Personal (verde) - Carpetas privadas del empleado
```

---

## 🔧 Estado Actual - Debug en Progreso

### Problema

**Las carpetas compartidas NO aparecen en el espacio individual de los empleados después de ser creadas.**

### Hipótesis

1. ❓ **Problema de guardado**: Las carpetas no se guardan correctamente con `compartida: true` y `asignadoA`
2. ❓ **Problema de query**: La query de Prisma no encuentra las carpetas por sintaxis incorrecta
3. ❓ **Problema de equipos**: El empleado no está en el equipo cuando se asigna por equipo
4. ❓ **Problema de permisos**: Hay algún filtro adicional que bloquea el acceso

### Logs de Debug Implementados

**Ubicación**: `app/(dashboard)/empleado/mi-espacio/documentos/page.tsx`

```typescript
// Ver datos del empleado
console.log('[DEBUG Carpetas Compartidas] Empleado ID:', empleado.id);
console.log('[DEBUG Carpetas Compartidas] Equipos del empleado:', equipoIds);

// Ver query construida
console.log('[DEBUG Carpetas Compartidas] Cláusulas OR:', JSON.stringify(clausulasOR, null, 2));

// Ver TODAS las carpetas compartidas en la empresa (sin filtro de empleado)
console.log('[DEBUG Carpetas Compartidas] TODAS en empresa:', todasCarpetasCompartidasEmpresa);

// Ver cuáles se encontraron para este empleado
console.log('[DEBUG Carpetas Compartidas] Encontradas:', carpetasCompartidas.length);
console.log('[DEBUG Carpetas Compartidas] Carpetas:', carpetasCompartidas.map(...));
```

### Pasos para Diagnóstico

**✅ Paso 1**: HR crea una carpeta compartida
- Tipo: "Todos los empleados" (`asignadoA = "todos"`)
- Este es el caso más simple

**✅ Paso 2**: Revisar logs del servidor
- Ver si la carpeta se guardó correctamente
- Verificar valores de `compartida` y `asignadoA`

**✅ Paso 3**: Empleado accede a su espacio
- Revisar logs de debug
- Comparar "TODAS en empresa" vs "Encontradas"

**✅ Paso 4**: Identificar dónde falla
- Si TODAS muestra la carpeta pero Encontradas no → Problema en query
- Si TODAS no muestra la carpeta → Problema en guardado
- Si Encontradas muestra la carpeta pero no se renderiza → Problema en UI

---

## 🐛 Problemas Conocidos y Soluciones

### ✅ Error: SearchableMultiSelect - "Cannot read properties of undefined (reading 'filter')"

**Causa**: Props incorrectas en el componente
- ❌ Usaba: `options`, `value`, `onValueChange`
- ✅ Correcto: `items`, `values`, `onChange`

**Solución**:
```typescript
// CORRECTO
<SearchableMultiSelect
  items={empleadosList.map(emp => ({
    value: emp.id,
    label: `${emp.nombre} ${emp.apellidos}`,
  }))}
  values={empleadosSeleccionados}
  onChange={setEmpleadosSeleccionados}
  placeholder="Buscar empleados..."
  emptyMessage="No se encontraron empleados"
  disabled={actualizandoAsignacion}
/>
```

**Estado**: ✅ Corregido en `app/(dashboard)/hr/documentos/[id]/carpeta-detail-client.tsx:1132-1142`

---

### ✅ Confusión: Título del modal "Crear Carpeta Compartida"

**Problema**: El título era confuso porque TODAS las carpetas aquí son compartidas. El concepto real es "crear y asignar".

**Solución**:
```typescript
// ANTES
<DialogTitle>Crear Carpeta Compartida</DialogTitle>

// DESPUÉS
<DialogTitle>Crear Carpeta</DialogTitle>
<DialogDescription>
  Crea una carpeta y asígnala a empleados o equipos.
</DialogDescription>
```

**Estado**: ✅ Corregido en `components/hr/crear-carpeta-con-documentos-modal.tsx:252-258`

---

### ⏳ Equipos no se verificaban en carpetas compartidas

**Problema**: La query original solo verificaba `asignadoA = "todos"` y `asignadoA CONTAINS "empleado:X"`, pero NO verificaba equipos.

**Solución Implementada**:
```typescript
// Obtener equipos del empleado
const equiposDelEmpleado = await prisma.empleado_equipos.findMany({
  where: { empleadoId: empleado.id },
  select: { equipoId: true },
});

const equipoIds = equiposDelEmpleado.map((eq) => eq.equipoId);

// Construir cláusulas OR dinámicamente
const clausulasOR = [
  { asignadoA: 'todos' },
  { asignadoA: { contains: `empleado:${empleado.id}` } },
];

// Añadir cláusula para cada equipo
if (equipoIds.length > 0) {
  equipoIds.forEach((equipoId) => {
    clausulasOR.push({ asignadoA: `equipo:${equipoId}` });
  });
}

// Query con todas las cláusulas
const carpetasCompartidas = await prisma.carpetas.findMany({
  where: {
    empresaId: session.user.empresaId,
    empleadoId: null,
    compartida: true,
    OR: clausulasOR,
  },
  // ...
});
```

**Estado**: ✅ Implementado en `app/(dashboard)/empleado/mi-espacio/documentos/page.tsx:55-95`
**Verificación**: ⏳ Pendiente de confirmar con logs

---

## 📝 API Endpoints

### POST /api/carpetas
Crea una nueva carpeta compartida.

**Request Body**:
```typescript
{
  nombre: string;              // Nombre de la carpeta
  compartida: true;            // Siempre true para carpetas compartidas
  asignadoA: string;           // "todos" | "equipo:X" | "empleado:X,empleado:Y"
  parentId?: string;           // Opcional, para subcarpetas
  vinculadaAProceso?: string;  // "onboarding" | "offboarding" | null
}
```

**Response**:
```typescript
{
  success: true,
  carpeta: {
    id: string;
    nombre: string;
    compartida: boolean;
    asignadoA: string;
    // ...
  }
}
```

### PATCH /api/carpetas/[id]
Edita la asignación de una carpeta compartida (solo carpetas NO del sistema).

**Request Body**:
```typescript
{
  compartida: true;            // Debe ser true
  asignadoA: string;           // Nuevo valor de asignación
}
```

**Restricciones**:
- Solo HR Admin puede editar
- No se pueden editar carpetas del sistema (`esSistema: true`)
- Solo se puede editar `asignadoA` si la carpeta ya es compartida

---

## 🎨 UI Components

### Badges de Tipo de Carpeta

```typescript
{carpeta.esSistema ? (
  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
    Master
  </span>
) : carpeta.compartida ? (
  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
    Compartidos
  </span>
) : (
  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
    Personal
  </span>
)}
```

### Botón "Editar Asignación"

Visible solo para carpetas compartidas NO del sistema:

```typescript
{carpeta.compartida && !carpeta.esSistema && (
  <Button variant="outline" size="sm" onClick={() => setModalEditarAsignacion(true)}>
    <Settings className="w-4 h-4 mr-2" />
    Editar Asignación
  </Button>
)}
```

---

## 🚦 Testing Checklist

- [ ] Crear carpeta asignada a "todos" → Debe aparecer en todos los empleados
- [ ] Crear carpeta asignada a equipo → Debe aparecer solo en empleados del equipo
- [ ] Crear carpeta asignada a empleados específicos → Debe aparecer solo en esos empleados
- [ ] Editar asignación de carpeta → Cambios deben reflejarse inmediatamente
- [ ] Empleado nuevo se une a equipo → Debe ver carpetas del equipo
- [ ] Empleado sale de equipo → Debe dejar de ver carpetas del equipo
- [ ] Carpetas Master no deben tener botón "Editar Asignación"
- [ ] Carpetas Personal no deben aparecer en otros empleados

---

## 📚 Referencias

- **Modelo Prisma**: `prisma/schema.prisma`
- **API Carpetas**: `app/api/carpetas/`
- **Modal Crear**: `components/hr/crear-carpeta-con-documentos-modal.tsx`
- **Modal Editar**: Modal en `app/(dashboard)/hr/documentos/[id]/carpeta-detail-client.tsx`
- **Query Empleado**: `app/(dashboard)/empleado/mi-espacio/documentos/page.tsx`
- **Documentación Relacionada**: `docs/funcionalidades/documentos-procesos-onboarding-offboarding.md`

---

## ⏭️ Próximos Pasos

1. ✅ Añadir logs de debug
2. ⏳ Ejecutar prueba: crear carpeta compartida
3. ⏳ Revisar logs del servidor
4. ⏳ Identificar causa raíz del problema
5. ⏳ Implementar solución
6. ⏳ Remover logs de debug
7. ⏳ Testing completo de los 3 tipos de asignación
8. ⏳ Documentar solución final
