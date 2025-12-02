# 📅 FUNCIONALIDAD: GESTIÓN DE JORNADAS

---

## 🎯 Estado: FUNCIONALIDAD COMPLETA

**Fecha**: 25 de noviembre 2025  
**Fase**: MVP - Funcionalidad Completa con UI Unificada

---

## 📋 RESUMEN

Sistema de gestión de jornadas laborales que permite a HR definir horarios de trabajo y asignarlos a empleados, equipos o toda la empresa. Incluye:
- ✅ Componente reutilizable para crear/editar jornadas
- ✅ Configuración de descansos en minutos
- ✅ Asignación flexible (empresa/equipo/individual)
- ✅ Jornada predefinida configurable desde onboarding (paso 3: "Calendario y Jornada")
- ✅ Valores por defecto pre-rellenados pero completamente editables

---

## ✅ COMPLETADO

### 1. Modelo de Datos
- ✅ Tabla `jornadas` en Prisma Schema
- ✅ Relación con `empleados` (cada empleado tiene una `jornadaId`)
- ✅ Tipos de jornada: **Fija** (horario específico) y **Flexible** (horas semanales)
- ✅ Configuración por día de la semana
- ✅ Campos: `horasSemanales`, `config` (JSON), `activa`
- ✅ **Configuración desde onboarding**: En el paso 3 del onboarding inicial (`/signup`), se configura la jornada predefinida con valores por defecto (40h flexible, L-V) que son editables
- ✅ **Asignación automática**: Al guardar el paso de calendario/jornada, se asigna automáticamente a todos los empleados sin jornada
- ✅ **Importante**: La jornada **no se crea automáticamente** al crear la cuenta. Se configura en el onboarding.

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
- Todas las jornadas normales son editables

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
- ✅ Badge de tipo (Fija / Flexible)
- ✅ Botones de acción:
  - **Editar** (todas las jornadas)
  - **Eliminar** (solo si no tiene empleados asignados)
  - **Asignar** (para todas)

**Modal: Crear/Editar Jornada** (Unificado)
- ✅ Componente reutilizable: `JornadaFormFields` (`components/shared/jornada-form-fields.tsx`)
- ✅ Campo: Nombre
- ✅ Selector: Tipo (Fija / Flexible)
- ✅ Campo: Horas semanales
- ✅ Días laborables (selector visual de días de la semana)
- ✅ Tiempo de descanso en **minutos** (input numérico)
- ✅ Horarios por día (para jornada fija)
- ✅ Límites de fichaje (inferior/superior)
- ✅ Asignación integrada (empresa/equipo/individual)

### 4. Validaciones
**Schemas en `lib/validaciones/schemas.ts`:**
- ✅ `jornadaCreateSchema` (crear)
- ✅ `jornadaUpdateSchema` (actualizar)
- ✅ `jornadaAsignarSchema` (asignar)

**Reglas de negocio:**
- ✅ Solo HR Admin puede gestionar jornadas
- ✅ Las jornadas se pueden editar y eliminar si no tienen empleados asignados
- ✅ No se puede eliminar una jornada si tiene empleados asignados
- ✅ `empresaId` se valida automáticamente desde la sesión
- ✅ Asignación masiva con verificación de jornadas previas

### 5. Componente Reutilizable
**`JornadaFormFields`** (`components/shared/jornada-form-fields.tsx`)
- Componente unificado usado en:
  - Modal de crear jornada (`EditarJornadaModal` modo 'crear')
  - Modal de editar jornada (`EditarJornadaModal` modo 'editar')
- Propiedades:
  - `data`: Estado del formulario (`JornadaFormData`)
  - `onChange`: Callback para actualizar datos
  - `showAsignacion`: Mostrar sección de asignación (opcional)
  - `disabled`: Modo solo lectura
- Beneficios:
  - ✅ DRY: Una sola fuente de verdad para el formulario
  - ✅ Consistencia: Misma validación y UI en todos los lugares
  - ✅ Mantenibilidad: Cambios centralizados

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
   - Modal unificado con todos los campos:
     - Nombre, tipo, horas semanales
     - Días laborables (selector visual)
     - Tiempo de descanso (en minutos)
     - Horarios por día (si es fija)
     - Límites de fichaje
     - Opcional: Asignar a empresa/equipo/empleados
   - Al guardar, si hay asignación, verifica jornadas previas

3. **Editar jornada**
   - Click en "Editar" en cualquier jornada
   - Mismo modal que crear, con datos precargados
   - Todos los campos editables
   - Puede reasignar durante la edición

4. **Eliminar jornada**
   - Click en "Eliminar"
   - Solo si no tiene empleados asignados
   - Confirmación requerida

---

## 📊 ESTRUCTURA DE DATOS

### Configuración de Jornada (campo `config`)

**Jornada Fija:**
```json
{
  "tipo": "fija",
  "lunes": {
    "activo": true,
    "entrada": "09:00",
    "salida": "18:00",
    "pausa_inicio": "14:00",
    "pausa_fin": "15:00"
  },
  "martes": {
    "activo": true,
    "entrada": "09:00",
    "salida": "18:00",
    "pausa_inicio": "14:00",
    "pausa_fin": "15:00"
  },
  ...
  "limiteInferior": "08:00",
  "limiteSuperior": "20:00"
}
```

**Jornada Flexible:**
```json
{
  "tipo": "flexible",
  "lunes": { "activo": true },
  "martes": { "activo": true },
  ...
  "descansoMinimo": "01:00",
  "limiteInferior": "07:00",
  "limiteSuperior": "21:00"
}
```

**Notas:**
- `pausa_inicio` / `pausa_fin`: Horas de inicio y fin de pausa (formato HH:MM)
- `descansoMinimo`: Tiempo mínimo de descanso para jornada flexible (formato HH:MM)
- El tiempo de descanso se configura en **minutos** en la UI y se convierte a formato hora

---

## 🔐 PERMISOS

| Rol | Ver | Crear | Editar | Eliminar | Asignar |
|-----|-----|-------|--------|----------|---------|
| **HR Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Empleado** | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🏗️ ARQUITECTURA

### Componentes Clave

**`JornadaFormFields`** (`components/shared/jornada-form-fields.tsx`)
- Componente reutilizable para formulario de jornadas
- Props tipadas con TypeScript
- Manejo de estado unificado (`JornadaFormData`)
- Soporte para asignación integrada

**`EditarJornadaModal`** (`app/(dashboard)/hr/horario/fichajes/editar-jornada-modal.tsx`)
- Modal unificado para crear/editar
- Usa `JornadaFormFields` internamente
- Maneja lógica de asignación y verificación de jornadas previas
- Integración con APIs de asignación masiva

**Flujo de Asignación:**
1. Usuario configura jornada en el modal
2. Selecciona nivel de asignación (empresa/equipo/individual)
3. Al guardar, verifica jornadas previas (`/api/jornadas/verificar-previas`)
4. Si hay jornadas previas, muestra alerta de confirmación
5. Usa `/api/jornadas/asignar` para asignación masiva

## ⚠️ PRÓXIMAS MEJORAS

### Prioridad BAJA

1. **Vista de Jornada Asignada (Empleado)**
   - Mostrar horario personal en dashboard
   - Indicar horas semanales y días activos

2. **Validación en Fichaje Widget**
   - Verificar jornada asignada antes de permitir fichar
   - Mostrar mensaje claro si no tiene jornada

---

## 🧪 TESTING

### Verificar en Localhost:
1. ✅ Login como HR Admin (`admin@clousadmin.com` / `Admin123!`)
2. ✅ Ir a Horario > Jornadas
3. ✅ Ver jornadas existentes (si las hay)
4. ✅ Crear una nueva jornada con todos los campos
5. ✅ Verificar que aparece en la lista
6. ✅ Editar la jornada creada → Cambios guardados
7. ✅ Intentar eliminar jornada con empleados → Error
8. ✅ Eliminar jornada sin empleados asignados → Éxito
9. ✅ Asignar jornada a empresa/equipo/empleados → Verificación previa

---

## 📝 NOTAS TÉCNICAS

- **Jornadas normales**: Las jornadas creadas desde onboarding o manualmente son editables y eliminables
- **Eliminación**: Solo si no tienen empleados asignados (soft delete: `activa: false`)
- **Tiempo de descanso**: Se configura en minutos en la UI, se convierte a formato HH:MM en el config
- **Jornada fija**: El descanso se aplica de 14:00 en adelante según los minutos configurados
- **Jornada flexible**: El descanso mínimo es un requerimiento para cálculos de balance
- **Validación de empresa**: Todas las operaciones validan `empresaId` desde la sesión
- **Reutilización**: El mismo componente se usa para crear y editar (DRY)

---

## 📡 API ENDPOINTS COMPLETOS

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/jornadas` | GET | Lista todas las jornadas activas de la empresa | HR |
| `/api/jornadas` | POST | Crea nueva jornada | HR |
| `/api/jornadas/[id]` | GET | Obtiene jornada específica con empleados asignados | HR |
| `/api/jornadas/[id]` | PATCH | Actualiza jornada existente | HR |
| `/api/jornadas/[id]` | DELETE | Marca jornada como inactiva | HR |
| `/api/jornadas/[id]/asignar` | POST | Asigna jornada a empleados específicos | HR |
| `/api/jornadas/asignar` | POST | Asigna jornada masivamente (empresa/equipos/individuales) | HR |

---

## 📋 FLUJO COMPLETO

### Configurar Jornada en Onboarding (Nuevo HR Admin)

Durante el onboarding inicial de la empresa en `/signup`, la jornada y el calendario se configuran en **dos pasos separados**:

#### Paso 3 - Jornada Laboral:

1. El sistema muestra valores por defecto pre-rellenados:
   - **Jornada**: 40 horas semanales, tipo flexible
   - **Horario mínimo diario**: 7:00 - 21:00
   - **Días laborables**: L-V activos

2. El usuario puede:
   - Editar todos los valores (nombre, horas, tipo, horarios, días)
   - Configurar descansos en minutos
   - Seleccionar tipo de jornada (Fija o Flexible)

3. Al guardar:
-   - Se crea/actualiza la jornada predefinida
-   - Verifica si hay empleados con jornadas diferentes (`/api/jornadas/verificar-previas`)
-     y, si las hay, obliga al HR a confirmar el reemplazo antes de continuar
-   - Se asigna automáticamente a todos los empleados que no tienen jornada (importados en el paso 1) una vez se confirma

#### Paso 4 - Calendario Laboral:

1. Configuración de días laborables de la semana (Lunes a Domingo)
2. Gestión de festivos:
   - Importar desde archivo ICS/CSV
   - Crear festivos manualmente
   - Vista de calendario visual y lista de festivos

3. Al guardar:
   - Se actualiza el calendario laboral de la empresa
   - Los festivos se guardan en la base de datos

> **Importante**: 
> - La jornada no se crea automáticamente al crear la cuenta. Debe configurarse en el paso 3.
> - Los empleados importados en el paso 1 quedan sin jornada hasta completar el paso 3.
> - El calendario laboral (días laborables y festivos) se configura en el paso 4.
> - Todos los pasos se completan en `/signup` sin redirección a otras páginas.

### Crear Jornada (HR)

1. Acceder a `/hr/horario/jornadas`
2. Click "Nueva Jornada"
3. Modal unificado permite configurar:
   - Nombre (ej: "Jornada Completa 40h")
   - Tipo: Fija o Flexible
   - Horas semanales
   - Días laborables (selector visual)
   - Tiempo de descanso (en minutos)
   - Horarios por día (si es fija)
   - Límites de fichaje
   - Opcional: Asignar inmediatamente (empresa/equipo/individual)
4. Al guardar, si hay asignación, verifica jornadas previas
5. Jornada creada y disponible

### Editar Jornada (HR)

1. Click en "Editar" en cualquier jornada
2. Mismo modal que crear, con datos precargados
3. Modificar cualquier campo
4. Puede reasignar durante la edición
5. Guardar cambios

### Asignar Jornada (HR)

**Asignación integrada en el modal**:

**Opciones:**
- **Toda la empresa**: Aplica a todos los empleados activos
- **Por equipo**: Seleccionar un equipo (todos sus miembros)
- **Individual**: Seleccionar empleados específicos mediante checkboxes

**Confirmación:**
- Si hay jornadas previas, muestra alerta con lista de jornadas que serán reemplazadas
- Usuario confirma antes de asignar
- Actualiza `jornadaId` en tabla `empleados`

---

## 🔐 PERMISOS Y VALIDACIONES

### Reglas de Negocio

1. **Solo HR Admin** puede gestionar jornadas

2. **Creación y Edición**:
   - Todas las jornadas son editables desde el modal unificado
   - Validación: nombre obligatorio, horas semanales > 0

3. **Eliminación**:
   - Solo si no tiene empleados asignados
   - Soft delete: marca `activa: false`

4. **Asignación**:
   - Niveles: empresa completa / equipo / empleados individuales
   - Verifica jornadas previas antes de asignar
   - Muestra confirmación si hay reemplazo de jornadas existentes

5. **Validación de empresa**:
   - Todas las operaciones validan `empresaId` desde sesión
   - No se puede asignar jornada de otra empresa

---

**Versión**: 2.1  
**Última actualización**: 27 de enero 2025

---

## 📚 REFERENCIAS

- **Componente principal**: `components/shared/jornada-form-fields.tsx`
- **Modal**: `app/(dashboard)/hr/horario/fichajes/editar-jornada-modal.tsx`
- **API Routes**: `app/api/jornadas/`
- **Schema**: `lib/validaciones/schemas.ts` (jornadaCreateSchema, jornadaUpdateSchema)
- **Helpers**: `lib/calculos/fichajes-helpers.ts` (JornadaConfig, DiaConfig)
