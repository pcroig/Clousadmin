# 📅 FUNCIONALIDAD: GESTIÓN DE JORNADAS

---

## 🎯 Estado: FUNCIONALIDAD COMPLETA

**Fecha**: 8 de diciembre 2025  
**Fase**: Funcionalidad completa (UI y backend alineados con validaciones y transacciones)  
**Nota reciente**: Los cambios de jornada (crear/editar/eliminar) solo se aplican al pulsar **Guardar cambios** en el modal; cancelar descarta todo.

---

## 📋 RESUMEN

Sistema de gestión de jornadas laborales que permite a HR definir horarios de trabajo y asignarlos a empleados, equipos o toda la empresa. Incluye:
- ✅ Componente reutilizable para crear/editar jornadas (accordion en modal y onboarding)
- ✅ Configuración de descansos en minutos → se persiste como `descansoMinimo` en formato `HH:MM`
- ✅ Asignación flexible (empresa/equipo/individual) con metadata en `jornada_asignaciones`
- ✅ Validación completa: sin solapamientos entre niveles y con cobertura 100% de empleados activos
- ✅ Jornada predefinida configurable desde onboarding (paso 3: "Calendario y Jornada") y reutilizada en panel HR
- ✅ Cambios atómicos en el modal: eliminar/editar/crear se mantienen en memoria hasta guardar (cancelar revierte)

---

## ✅ COMPLETADO

### 1. Modelo de Datos
- ✅ Tabla `jornadas` en Prisma Schema
- ✅ Tabla `jornada_asignaciones` (metadata de nivel de asignación y `equipoIds`) con FK a `jornadas` y `empresas`
- ✅ Relación con `empleados` (cada empleado tiene una `jornadaId`; constraint lógico: una jornada por empleado)
- ✅ Tipos de jornada: **Fija** (horario específico) y **Flexible** (horas semanales)
- ✅ Configuración por día de la semana
- ✅ Campos: `horasSemanales`, `config` (JSON), `activa`
- ✅ **Configuración desde onboarding**: En el paso 3 del onboarding inicial (`/signup`), se configura la jornada predefinida con valores por defecto (40h flexible, L-V) que son editables
- ✅ **Asignación automática**: Al guardar el paso de calendario/jornada, se asigna automáticamente a todos los empleados sin jornada
- ✅ **Importante**: La jornada **no se crea automáticamente** al crear la cuenta. Se configura en el onboarding.

### 2. API Routes
**GET /api/jornadas**
- Lista todas las jornadas activas de la empresa
- Incluye metadata de `asignacion` (nivel y `equipoIds`) para reconstruir contexto sin heurísticas
- Solo accesible por HR Admin

**POST /api/jornadas**
- Crea nueva jornada (validación con Zod)
- Configuración por defecto (L-V 9:00-18:00)

**GET /api/jornadas/[id]**
- Obtiene jornada específica
- Incluye lista de empleados activos asignados y `asignacion`

**PATCH /api/jornadas/[id]**
- Actualiza jornada existente
- Todas las jornadas normales son editables

**DELETE /api/jornadas/[id]**
- Desasigna empleados en transacción y marca jornada como inactiva
- Elimina registros asociados en `jornada_asignaciones`

**POST /api/jornadas/asignar**
- Asigna jornada a empresa/equipos/individuales
- Transacción: actualiza `empleados.jornadaId` y upsert en `jornada_asignaciones`

### 3. UI para HR Admin

**Página: /hr/horario/jornadas**

Componentes:
- ✅ `PageHeader` con botón "Nueva Jornada"
- ✅ Listado con accordions (alineado con onboarding) para editar varias jornadas
- ✅ Badge de tipo (Fija / Flexible) y nivel de asignación (empresa/equipo/individual)
- ✅ Botones de acción:
  - **Editar** dentro del accordion
  - **Eliminar** (desasigna y marca inactiva)
  - **Asignar** integrado en el mismo flujo

**Modal/Accordion: Crear/Editar Jornada** (Unificado)
- ✅ Componente reutilizable: `JornadaFormFields` (`components/shared/jornada-form-fields.tsx`)
- ✅ Campos: Nombre, tipo, horas semanales, días laborables
- ✅ Descanso en minutos (UI) → se guarda como `descansoMinimo` en `config` (`HH:MM`)
- ✅ Horarios por día (para jornada fija)
- ✅ Límites de fichaje (inferior/superior)
- ✅ Asignación integrada (empresa/equipo/individual) con precarga de `asignacion`

### 4. Validaciones
**Schemas en `lib/validaciones/schemas.ts`:**
- ✅ `jornadaCreateSchema` (crear)
- ✅ `jornadaUpdateSchema` (actualizar)
- ✅ `jornadaAsignarSchema` (asignar)

**Reglas de negocio y checks de solapamiento/cobertura:**
- ✅ Solo HR Admin puede gestionar jornadas
- ✅ Exactamente una jornada por empleado (sin solapamientos entre empresa/equipo/individual)
- ✅ Jornada de empresa es excluyente
- ✅ Equipos se expanden a empleados para detectar solapamientos
- ✅ Cobertura completa: no debe quedar ningún empleado activo sin jornada al guardar
- ✅ `empresaId` se valida automáticamente desde la sesión

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
   - Al guardar valida solapamientos/cobertura y elimina jornadas obsoletas antes de crear/actualizar

3. **Editar jornada**
   - Click en "Editar" en cualquier jornada
   - Mismo modal que crear, con datos precargados
   - Todos los campos editables
   - Puede reasignar durante la edición

4. **Eliminar jornada**
   - Click en "Eliminar" dentro del modal (no dispara API inmediata)
   - La eliminación queda en borrador y se procesa junto a altas/ediciones al pulsar **Guardar cambios**
   - Cancelar o cerrar con "X" descarta la eliminación

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
- `pausa_inicio` / `pausa_fin`: Horas de inicio y fin de pausa (formato HH:MM) - **OPCIONAL**
- `descansoMinimo`: Tiempo mínimo de descanso para jornada flexible (formato HH:MM) - **OPCIONAL**
- El tiempo de descanso se configura en **minutos** en la UI y se convierte a formato hora
- El descanso es **opcional** mediante un toggle/switch. Por defecto está habilitado.
- Si no se habilita el descanso, no se incluyen `pausa_inicio`/`pausa_fin` en jornadas fijas ni `descansoMinimo` en flexibles

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
- Modal/accordion unificado para crear/editar
- Usa `JornadaFormFields` internamente
- Maneja validación de solapamientos/cobertura y eliminación de jornadas obsoletas antes de guardar
- Integración con APIs de asignación masiva (transacciones + metadata)

**Flujo de Asignación:**
1. Usuario configura jornada en el modal
2. Selecciona nivel de asignación (empresa/equipo/individual)
3. Al guardar, expande equipos a empleados y valida solapamientos + cobertura 100%
4. Si detecta jornada de empresa + otra, o empleados sin jornada, bloquea con mensaje específico
5. Usa `/api/jornadas/asignar` para asignación masiva (upsert en `jornada_asignaciones`)

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
7. ✅ Eliminar jornada con empleados desde el modal → Guardar debe desasignar y marcar inactiva; cancelar debe mantenerla intacta
8. ✅ Flujo combinado: eliminar jornadas obsoletas y crear nueva jornada empresa → sin conflictos
9. ✅ Asignar jornada a empresa/equipo/empleados → valida solapamientos y cobertura

---

## 📝 NOTAS TÉCNICAS

- **Jornadas normales**: Las jornadas creadas desde onboarding o manualmente son editables y eliminables
- **Eliminación diferida**: El modal ya no hace DELETE inmediato; las eliminaciones se agrupan con creaciones/ediciones y se envían al guardar. Cancelar o cerrar descarta cambios locales.
- **Tiempo de descanso**: Se configura en minutos en la UI, se convierte a formato HH:MM en el config
- **Jornada fija**: El descanso se aplica de 14:00 en adelante según los minutos configurados (si está habilitado)
- **Jornada flexible**: El descanso mínimo es opcional y se usa para cálculos de balance cuando está configurado
- **Descanso opcional**: El toggle del descanso está habilitado por defecto (60 minutos), pero puede deshabilitarse completamente
- **Validación de empresa**: Todas las operaciones validan `empresaId` desde la sesión
- **Reutilización**: El mismo componente se usa para crear y editar (DRY)

---

## 📡 API ENDPOINTS COMPLETOS

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/jornadas` | GET | Lista todas las jornadas activas de la empresa | HR |
| `/api/jornadas` | POST | Crea nueva jornada | HR |
| `/api/jornadas/[id]` | GET | Obtiene jornada específica con empleados asignados y metadata de asignación | HR |
| `/api/jornadas/[id]` | PATCH | Actualiza jornada existente | HR |
| `/api/jornadas/[id]` | DELETE | Desasigna empleados y marca jornada como inactiva | HR |
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
   - Habilitar/deshabilitar descanso con un toggle (por defecto habilitado)
   - Configurar descansos en minutos (si está habilitado)
   - Seleccionar tipo de jornada (Fija o Flexible)

3. Al guardar:
   - Se crea/actualiza la jornada predefinida
   - Valida solapamientos entre empresa/equipo/individual y cobertura 100%
   - Desasigna jornadas obsoletas si es necesario y reasigna con `/api/jornadas/asignar`
   - Se asigna automáticamente a todos los empleados que no tienen jornada (importados en el paso 1)

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
   - Toggle para habilitar descanso (por defecto activado)
   - Tiempo de descanso (en minutos, solo si está habilitado)
   - Horarios por día (si es fija)
   - Límites de fichaje
   - Opcional: Asignar inmediatamente (empresa/equipo/individual)
4. Al guardar valida solapamientos/cobertura y actualiza `jornada_asignaciones`
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

**Validación y confirmación:**
- Detecta solapamientos entre empresa/equipo/individual (expande equipos a empleados)
- Bloquea si existe jornada de empresa y se intenta añadir otra
- Bloquea si algún empleado quedara sin jornada
- Actualiza `jornadaId` en tabla `empleados` y `jornada_asignaciones`

---

## 🔐 PERMISOS Y VALIDACIONES

### Reglas de Negocio

1. **Solo HR Admin** puede gestionar jornadas

2. **Creación y Edición**:
   - Todas las jornadas son editables desde el modal unificado
   - Validación: nombre obligatorio, horas semanales > 0

3. **Eliminación**:
   - Se procesa solo al guardar el modal junto al resto de cambios
   - Bloquea eliminar jornadas con empleados asignados si no se desasignan en la misma operación
   - Soft delete: marca `activa: false` y desasigna empleados en transacción

4. **Asignación**:
   - Niveles: empresa completa / equipo / empleados individuales
   - Sin solapamientos: empresa es excluyente; equipos/individuales se expanden a empleados
   - Bloquea si queda cualquier empleado sin jornada

5. **Validación de empresa**:
   - Todas las operaciones validan `empresaId` desde sesión
   - No se puede asignar jornada de otra empresa

---

**Versión**: 2.3  
**Última actualización**: 8 de diciembre 2025

---

## 📚 REFERENCIAS

- **Componente principal**: `components/shared/jornada-form-fields.tsx`
- **Modal**: `app/(dashboard)/hr/horario/fichajes/editar-jornada-modal.tsx`
- **API Routes**: `app/api/jornadas/`
- **Schema**: `lib/validaciones/schemas.ts` (jornadaCreateSchema, jornadaUpdateSchema)
- **Helpers**: `lib/calculos/fichajes-helpers.ts` (JornadaConfig, DiaConfig)
