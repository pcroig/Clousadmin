# 📅 FUNCIONALIDAD: GESTIÓN DE JORNADAS

---

## 🎯 Estado: FUNCIONALIDAD BÁSICA COMPLETA

**Fecha**: 25 de octubre 2025  
**Fase**: MVP - Funcionalidad Básica  

---

## 📋 RESUMEN

Sistema de gestión de jornadas laborales que permite a HR definir horarios de trabajo y asignarlos a empleados, equipos o toda la empresa. Sirve como base para el sistema de **auto-completado de fichajes**.

---

## ✅ COMPLETADO

### 1. Modelo de Datos
- ✅ Tabla `jornadas` en Prisma Schema
- ✅ Relación con `empleados` (cada empleado tiene una `jornadaId`)
- ✅ Tipos de jornada: **Fija** (horario específico) y **Flexible** (horas semanales)
- ✅ Configuración por día de la semana
- ✅ Campos: `horasSemanales`, `config` (JSON), `esPredefinida`, `activa`

### 2. API Routes
**GET /api/jornadas**
- Lista todas las jornadas activas de la empresa
- Solo accesible por HR Admin

**POST /api/jornadas**
- Crea nueva jornada
- Validación con Zod
- Configuración por defecto (L-V 9:00-18:00)

**GET /api/jornadas/[id]**
- Obtiene jornada específica
- Incluye lista de empleados asignados

**PATCH /api/jornadas/[id]**
- Actualiza jornada existente
- No permite editar jornadas predefinidas

**DELETE /api/jornadas/[id]**
- Marca jornada como inactiva
- Valida que no haya empleados asignados

**POST /api/jornadas/[id]/asignar**
- Asigna jornada a empleados específicos, equipo completo, o toda la empresa
- Actualiza `jornadaId` en tabla `empleados`

### 3. UI para HR Admin

**Página: /hr/horario/jornadas**

Componentes:
- ✅ `PageHeader` con botón "Nueva Jornada"
- ✅ Tabla con listado de jornadas
- ✅ Badge de tipo (Predefinida / Fija / Flexible)
- ✅ Botones de acción:
  - **Editar** (solo jornadas no predefinidas)
  - **Eliminar** (solo jornadas no predefinidas)
  - **Asignar** (para todas)

**Modal: Crear Jornada**
- ✅ Campo: Nombre
- ✅ Selector: Tipo (Fija / Flexible)
- ✅ Campo: Horas semanales
- ✅ Nota informativa: Se crea con configuración por defecto

**Modal: Editar Jornada** (placeholder)
- ⚠️ Actualmente solo muestra información
- 🔜 Fase 2: Edición detallada de horarios

### 4. Validaciones
**Schemas en `lib/validaciones/schemas.ts`:**
- ✅ `jornadaCreateSchema` (crear)
- ✅ `jornadaUpdateSchema` (actualizar)
- ✅ `jornadaAsignarSchema` (asignar)

**Reglas de negocio:**
- ✅ Solo HR Admin puede gestionar jornadas
- ✅ No se pueden eliminar jornadas predefinidas
- ✅ No se puede eliminar una jornada si tiene empleados asignados (se marca como inactiva)
- ✅ `empresaId` se valida automáticamente desde la sesión

### 5. Datos de Prueba (Seed)
**Jornadas predefinidas:**
1. **Jornada Completa 40h**
   - L-V 9:00-18:00 (1h pausa implícita)
   - Asignada a todos los empleados por defecto

2. **Jornada Intensiva 35h**
   - L-V 9:00-16:00 (sin pausa)
   - Disponible para asignación

✅ Todos los empleados del seed tienen `jornadaId` asignado

### 6. Navegación
- ✅ Item "Jornadas" añadido al sidebar de HR bajo "Horario"
- ✅ Estructura: Horario > Ausencias, Fichajes, **Jornadas**

---

## 🔄 FLUJO DE USUARIO

### Para HR Admin:

1. **Ver jornadas**
   - Ir a Horario > Jornadas
   - Ver listado de jornadas con tipo, horas semanales y horario

2. **Crear jornada**
   - Click en "Nueva Jornada"
   - Rellenar nombre, tipo y horas semanales
   - Se crea con configuración por defecto

3. **Asignar jornada**
   - Click en "Asignar" en cualquier jornada
   - (Próximamente) Seleccionar empleados, equipo o toda la empresa

4. **Editar/Eliminar**
   - Solo para jornadas no predefinidas
   - Eliminar solo si no hay empleados asignados

---

## 📊 ESTRUCTURA DE DATOS

### Configuración de Jornada (campo `config`)

```json
{
  "lunes": {
    "activo": true,
    "entrada": "09:00",
    "salida": "18:00",
    "pausa": 1
  },
  "martes": {
    "activo": true,
    "entrada": "09:00",
    "salida": "18:00",
    "pausa": 1
  },
  ...
  "sabado": { "activo": false },
  "domingo": { "activo": false }
}
```

**Para jornada flexible:**
```json
{
  "lunes": { "activo": true },
  "martes": { "activo": true },
  ...
}
```

---

## 🔐 PERMISOS

| Rol | Ver | Crear | Editar | Eliminar | Asignar |
|-----|-----|-------|--------|----------|---------|
| **HR Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Empleado** | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## ⚠️ PRÓXIMAS MEJORAS

### Prioridad MEDIA

1. **Editor Visual de Horarios**
   - Editor por días de la semana
   - Definir pausas obligatorias con horas específicas
   - Configurar límites inferior/superior de fichaje

2. **Validación en Fichaje Widget**
   - Verificar jornada asignada antes de permitir fichar
   - Mostrar mensaje claro si no tiene jornada

### Prioridad BAJA

3. **Vista de Jornada Asignada (Empleado)**
   - Mostrar horario personal en dashboard
   - Indicar horas semanales y días activos

---

## 🧪 TESTING

### Verificar en Localhost:
1. ✅ Login como HR Admin (`admin@clousadmin.com` / `Admin123!`)
2. ✅ Ir a Horario > Jornadas
3. ✅ Ver las 2 jornadas predefinidas
4. ✅ Crear una nueva jornada
5. ✅ Verificar que aparece en la lista
6. ✅ Intentar eliminar una jornada predefinida → Error
7. ✅ Eliminar la jornada creada (sin empleados) → Éxito

---

## 📝 NOTAS TÉCNICAS

- **Jornadas predefinidas** (`esPredefinida: true`): No se pueden editar ni eliminar.
- **Soft delete**: Al eliminar, se marca `activa: false` en lugar de eliminar el registro.
- **Config por defecto**: Si no se proporciona `config`, se usa L-V 9:00-18:00.
- **Validación de empresa**: Todas las operaciones validan `empresaId` desde la sesión.

---

## 📡 API ENDPOINTS COMPLETOS

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/jornadas` | GET | Lista todas las jornadas activas de la empresa | HR |
| `/api/jornadas` | POST | Crea nueva jornada | HR |
| `/api/jornadas/[id]` | GET | Obtiene jornada específica con empleados asignados | HR |
| `/api/jornadas/[id]` | PATCH | Actualiza jornada existente (no predefinidas) | HR |
| `/api/jornadas/[id]` | DELETE | Marca jornada como inactiva | HR |
| `/api/jornadas/[id]/asignar` | POST | Asigna jornada a empleados específicos | HR |
| `/api/jornadas/asignar` | POST | Asigna jornada masivamente (empresa/equipos/individuales) | HR |

---

## 📋 FLUJO COMPLETO

### Crear Jornada (HR)

1. Acceder a `/hr/horario/jornadas`
2. Click "Nueva Jornada"
3. Rellenar:
   - Nombre (ej: "Jornada Completa 40h")
   - Tipo: Fija o Flexible
   - Horas semanales
4. Sistema crea configuración por defecto (L-V 9:00-18:00 si es fija)
5. Jornada disponible para asignación

### Asignar Jornada (HR)

**Modal de asignación** (desde botón "Asignar"):

**Opciones:**
- **Toda la empresa**: Aplica a todos los empleados activos
- **Por equipos**: Seleccionar uno o más equipos (todos sus miembros)
- **Individual**: Seleccionar empleados específicos

**Confirmación:**
- Muestra resumen: X empleados asignados
- Actualiza `jornadaId` en tabla `empleados`

### Ver Jornadas Asignadas

**Desde perfil de empleado** (`/hr/organizacion/personas/[id]`):
- Tab "General" muestra jornada actual
- Indica si es predefinida o personalizada

---

## 🔐 PERMISOS Y VALIDACIONES

### Reglas de Negocio

1. **Solo HR Admin** puede gestionar jornadas
2. **Jornadas predefinidas** (`esPredefinida: true`):
   - No se pueden editar
   - No se pueden eliminar
   - Ejemplos: "Jornada Completa 40h", "Jornada Intensiva 35h"

3. **Eliminación (soft delete)**:
   - Si jornada tiene empleados asignados → Marca `activa: false`
   - Si no tiene empleados → Se puede eliminar realmente

4. **Validación de empresa**:
   - Todas las operaciones validan `empresaId` desde sesión
   - No se puede asignar jornada de otra empresa

5. **Jerarquía de asignación**:
   - Si empleado tiene jornada individual → usa esa
   - Si no, busca jornada de su equipo
   - Si no, usa jornada default de empresa

---

**Versión**: 1.1  
**Última actualización**: 25 de octubre 2025

