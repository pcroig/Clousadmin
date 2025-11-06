# 🏖️ DOCUMENTACIÓN: GESTIÓN DE AUSENCIAS - ESTADO ACTUAL

**Versión**: 3.1  
**Fecha**: 27 Enero 2025  
**Estado**: Sistema completo y operativo con Festivos, Calendario Laboral, Justificantes y Campañas para Empleados

---

## 📋 RESUMEN EJECUTIVO

### ✅ COMPLETADO

1. **Base de Datos**: Todos los modelos implementados (Ausencia, EmpleadoSaldoAusencias, Festivo, EquipoPoliticaAusencias)
2. **API Routes Core**: CRUD completo de ausencias, aprobar/rechazar individual, actualizar masivo
3. **Lógica de Negocio**: Todos los cálculos de días, saldo, festivos, días laborables implementados
4. **Páginas HR**: Vista completa con filtros, búsqueda, modales de edición
5. **Páginas Empleado**: Vista en Mi Espacio con diseño visual (FechaCalendar, tabs Próximas/Pasadas)
6. **Modal Gestionar Ausencias**: Implementado con tabs (Saldo, Calendario Laboral, Gestionar Vacaciones)
7. **Estados Unificados**: Sistema de estados claro (pendiente/aprobada/rechazada/auto_aprobada)
8. **Sistema de Festivos**: CRUD completo, importación automática de festivos nacionales
9. **Calendario Laboral**: Configuración de días laborables por empresa, integrado en cálculos
10. **Campañas de Vacaciones**: Sistema de cuadrado inteligente con IA
11. **Justificantes**: Sistema de subida de documentos para ausencias (S3)
12. **Selector de Tipos Mejorado**: Información visual sobre aprobación y descuento de saldo
13. **Campañas para Empleados**: Widget y panel de campañas activas en vista de empleados
14. **Vista de Personas Mejorada**: Tabla de ausencias en lugar de cards

---

## 📊 ESTADO DETALLADO POR COMPONENTE

### 1. BASE DE DATOS

#### ✅ Modelo `Ausencia`
```prisma
// Estados actuales (unificados):
- 'pendiente_aprobacion' (default) - Estado inicial al crear, esperando aprobación
- 'en_curso' - Aprobada y aún no disfrutada (fechaFin >= hoy)
- 'completada' - Aprobada y ya disfrutada (fechaFin < hoy)
- 'auto_aprobada' - Auto-aprobada por IA (enfermedad/maternidad < 2 días)
- 'rechazada' - Rechazada por HR/Manager
- 'cancelada' - Cancelada por empleado
```

**✅ Estados unificados**: Todos los componentes usan estos estados.

#### ✅ Modelo `EmpleadoSaldoAusencias`
- ✅ Implementado
- ✅ Soporte para múltiples saldos por equipo (campo `equipoId` opcional en schema)
- Campo `equipoId`: `null` = saldo general del empleado, UUID = saldo específico de equipo

#### ✅ Modelo `Festivo`
- ✅ Implementado con CRUD completo
- ✅ Tipos: `nacional` (importado automáticamente) y `empresa` (personalizado)
- ✅ Campos: `fecha`, `nombre`, `tipo`, `origen`, `activo`
- ✅ Constraint único por empresa y fecha (`@@unique([empresaId, fecha])`)
- ✅ Integrado en cálculos de días laborables

---

### 2. API ROUTES

#### ✅ IMPLEMENTADOS

| Endpoint | Método | Estado | Notas |
|----------|--------|--------|-------|
| `/api/ausencias` | GET | ✅ | Filtros: estado, empleadoId |
| `/api/ausencias` | POST | ✅ | Crear solicitud con validación |
| `/api/ausencias/[id]` | PATCH | ✅ | Aprobar/rechazar individual, también editar campos |
| `/api/ausencias/[id]` | DELETE | ✅ | Cancelar (solo empleado) |
| `/api/ausencias/actualizar-masivo` | POST | ✅ | Aprobar/rechazar múltiples |
| `/api/ausencias/saldo` | POST | ✅ | Asignar saldo anual (empresa/equipos) |
| `/api/festivos` | GET, POST | ✅ **NUEVO** | Listar y crear festivos personalizados |
| `/api/festivos/[id]` | GET, PATCH, DELETE | ✅ **NUEVO** | CRUD individual de festivos |
| `/api/festivos/importar-nacionales` | POST | ✅ **NUEVO** | Importar festivos nacionales automáticamente |
| `/api/empresa/calendario-laboral` | GET, PATCH | ✅ **NUEVO** | Configurar días laborables de empresa |
| `/api/upload` | POST | ✅ **NUEVO** | Subir archivos a S3 (justificantes, documentos) |

#### ✅ IMPLEMENTADOS (Organización)

| Endpoint | Método | Estado | Notas |
|----------|--------|--------|-------|
| `/api/organizacion/equipos` | GET, POST | ✅ | Lista y crea equipos |
| `/api/organizacion/puestos` | GET, POST | ✅ | Lista y crea puestos |

#### ❌ NO IMPLEMENTADOS (Futuro)

| Endpoint | Estado | Prioridad |
|----------|--------|-----------|
| `/api/festivos` (CRUD) | ❌ | Media |
| `/api/festivos/cargar-automatico` | ❌ | Media |
| `/api/calendario/laboral-default` | ❌ | Baja |
| `/api/calendario/importar` | ❌ | Baja |

---

### 3. PÁGINAS Y UI

#### ✅ `/hr/horario/ausencias`

**Implementado**:
- ✅ Tabla con todas las ausencias
- ✅ Filtros por estado (todas, pendientes, aprobadas, rechazadas)
- ✅ Búsqueda por nombre de empleado
- ✅ Modal aprobar individual
- ✅ Modal rechazar individual
- ✅ Modal editar ausencia (tipo, fechas, motivo, descripción, medio día)
- ✅ Botón "Actualizar ausencias" (aprobar todas pendientes)
- ✅ Botón "Gestionar ausencias" (modal con tabs)

**Estados mostrados**:
- ✅ Usa estados unificados: `pendiente_aprobacion`, `en_curso`, `completada`, `auto_aprobada`, `rechazada`, `cancelada`

#### ✅ `/empleado/mi-espacio` (Tab Ausencias)

**Implementado**:
- ✅ Diseño visual con `FechaCalendar`
- ✅ Tabs "Próximas" y "Pasadas"
- ✅ Botón "Nueva Ausencia" en card calendario
- ✅ Saldo de vacaciones (Total, Disponibles, Usados)

**Estados**:
- Soporta estados nuevos: `pendiente_aprobacion`, `en_curso`, `completada`, `auto_aprobada`, `rechazada`

#### ✅ `/empleado/horario/ausencias`

**Implementado**:
- ✅ Vista tabla de ausencias del empleado
- ✅ Modal solicitar nueva ausencia
- ✅ Saldo de vacaciones
- ✅ Panel de campañas de vacaciones activas (expandible/colapsable)
- ✅ Muestra estado de participación en campañas

#### ✅ `/hr/organizacion/personas/[id]` (Tab Ausencias)

**Implementado**:
- ✅ Tabla completa de ausencias (reemplazó cards de Próximas/Pasadas)
- ✅ Columnas: Tipo, Fecha Inicio, Fecha Fin, Días, Estado
- ✅ Ordenadas por fecha más reciente primero
- ✅ Click en fila para ver detalles/editar
- ✅ Usa `Dialog` de shadcn/ui (consistente)

---

### 4. COMPONENTES

#### ✅ `SolicitarAusenciaModal`
- ✅ Implementado y funcional
- ✅ Usa Dialog de shadcn/ui
- ✅ Validación de saldo
- ✅ Selector de tipos con información detallada (aprobación y descuento de saldo)
- ✅ Campo de upload de justificante (opcional, recomendado para tipos sin aprobación)
- ✅ Soporte para archivos PDF, JPG, PNG (máx 5MB)
- ✅ Subida a S3 antes de crear la ausencia

#### ✅ `GestionarAusenciasModal`
- ✅ **RECIÉN CREADO** - Tab Saldo funcional
- ⚠️ Tab Calendario: placeholder (funcionalidad en desarrollo)

#### ✅ `FechaCalendar`
- ✅ Componente reutilizable
- ✅ Usado en ausencias empleado y widgets

#### ✅ `CampanasVacacionesWidget`
- ✅ Widget pequeño para dashboard de empleado
- ✅ Muestra campaña activa si existe
- ✅ Estado de participación del empleado
- ✅ Botón para ver detalles

#### ✅ `AusenciasWidget`
- ✅ Botón actualizado: "Solicitar ausencia" (antes "Abrir ausencia")
- ✅ Botón con bordes (variant="outline")

---

## ✅ ESTADOS UNIFICADOS

### Sistema de Estados

**Estados válidos** (según schema Prisma):
- `pendiente_aprobacion` - Solicitud esperando aprobación
- `en_curso` - Aprobada y aún no finalizada (fechaFin >= hoy)
- `completada` - Aprobada y ya finalizada (fechaFin < hoy)
- `auto_aprobada` - Auto-aprobada por IA
- `rechazada` - Rechazada por HR/Manager
- `cancelada` - Cancelada por empleado

**Lógica de transición**:
- Al crear: `pendiente_aprobacion`
- Al aprobar: `en_curso` (si fechaFin >= hoy) o `completada` (si fechaFin < hoy)
- Auto-aprobación IA: `auto_aprobada`

**Implementación en código**:
```typescript
// Al aprobar ausencia
const hoy = new Date();
hoy.setHours(0, 0, 0, 0);
const fechaFin = new Date(ausencia.fechaFin);
fechaFin.setHours(0, 0, 0, 0);

const nuevoEstado = fechaFin < hoy ? 'completada' : 'en_curso';
```

**Cálculo de saldo usando estados**:
```typescript
// Días usados (ausencias aprobadas y disfrutadas)
const diasUsados = ausencias
  .filter((a) => a.estado === 'en_curso' || a.estado === 'completada' || a.estado === 'auto_aprobada')
  .reduce((sum, a) => sum + Number(a.diasSolicitados), 0);

// Días pendientes (esperando aprobación)
const diasPendientes = ausencias
  .filter((a) => a.estado === 'pendiente_aprobacion')
  .reduce((sum, a) => sum + Number(a.diasSolicitados), 0);
```

## 📋 FLUJO COMPLETO DE AUSENCIAS

### Flujo Empleado

1. **Solicitar Ausencia**
   - Empleado accede a `/empleado/mi-espacio` → Tab Ausencias o widget de ausencias
   - Click "Solicitar ausencia" (botón con bordes)
   - Selecciona tipo de ausencia (con información visual sobre aprobación y descuento)
   - Completa formulario (tipo, fechas, motivo si aplica, descripción)
   - **Opcional**: Sube justificante (recomendado para enfermedad, enfermedad_familiar, maternidad_paternidad)
   - Sistema valida saldo disponible (si es vacaciones)
   - Se crea ausencia con estado `pendiente_aprobacion` (o directamente aprobada según tipo)
   - Saldo pendiente se incrementa automáticamente (si descuenta saldo)

2. **Ver Ausencias Propias**
   - Tab "Próximas": Ausencias con fechaFin >= hoy y estados `pendiente_aprobacion`, `en_curso`, `auto_aprobada`
   - Tab "Pasadas": Ausencias con fechaFin < hoy y estados `completada`, `auto_aprobada`
   - Visualización con `FechaCalendar` para fechas

3. **Cancelar Ausencia**
   - Solo si estado es `pendiente_aprobacion`
   - Sistema devuelve días al saldo disponible
   - Ausencia pasa a estado `cancelada`

### Flujo HR/Manager

1. **Ver Todas las Ausencias**
   - Accede a `/hr/horario/ausencias`
   - Filtra por estado: todas, pendientes, en curso, completadas, rechazadas
   - Busca por nombre de empleado

2. **Aprobar/Rechazar Individual**
   - Click en ausencia pendiente
   - Modal muestra detalles completos
   - Opciones: Aprobar, Rechazar, Editar
   - Al aprobar: sistema determina `en_curso` o `completada` según fechaFin
   - Saldo se actualiza automáticamente (días pendientes → días usados)

3. **Actualización Masiva**
   - Botón "Actualizar ausencias" aprueba todas las pendientes
   - Útil para días de gran volumen

4. **Gestionar Ausencias**
   - Modal con tabs:
     - **Saldo**: Asignar saldo anual por equipo o empresa
     - **Calendario**: (En desarrollo) Configurar calendario laboral

5. **Editar Ausencia**
   - Desde tabla o desde perfil de empleado
   - Permite modificar: tipo, fechas, motivo, descripción, medio día, **justificante**
   - Recalcula días automáticamente
   - Valida saldo si cambia número de días
   - Permite subir/actualizar justificante después de crear la ausencia

---

## 🔍 EJEMPLOS DE USO

### Solicitar Ausencia (Empleado)

```typescript
// POST /api/upload (opcional, si hay justificante)
FormData:
  - file: File (PDF, JPG, PNG, máx 5MB)
  - tipo: "justificante"

// Respuesta: { url: "https://bucket.s3.../justificante_xxx.pdf" }

// POST /api/ausencias
{
  "tipo": "vacaciones",
  "fechaInicio": "2025-12-01",
  "fechaFin": "2025-12-05",
  "motivo": "Descanso",
  "descripcion": "Vacaciones de Navidad",
  "medioDia": false,
  "justificanteUrl": "https://bucket.s3.../justificante_xxx.pdf" // opcional
}

// Sistema automáticamente:
// 1. Calcula días naturales y laborables
// 2. Valida saldo disponible (si tipo = 'vacaciones')
// 3. Crea ausencia con estado:
//    - 'pendiente_aprobacion' para 'vacaciones' y 'otro'
//    - Estado directo aprobado para 'enfermedad', 'enfermedad_familiar', 'maternidad_paternidad'
// 4. Incrementa diasPendientes en saldo (si descuenta saldo)
```

### Tipos de Ausencia y Reglas

| Tipo | Necesita Aprobación | Descuenta Saldo | Auto-aprobación IA |
|------|---------------------|-----------------|---------------------|
| **Vacaciones** | ✅ Sí | ✅ Sí | Solo después de 2 días sin aprobar |
| **Enfermedad** | ❌ No | ❌ No | Directo (sin aprobación) |
| **Enfermedad familiar** | ❌ No | ❌ No | Directo (sin aprobación) |
| **Maternidad/Paternidad** | ❌ No | ❌ No | Directo (sin aprobación) |
| **Otro** | ✅ Sí | ❌ No | Solo después de 2 días sin aprobar |

**Nota sobre auto-aprobación**: Solo aplica a tipos que necesitan aprobación (`vacaciones`, `otro`). Después de 2 días sin aprobar/rechazar, el sistema IA clasifica y puede auto-aprobar según criterios.

### Aprobar Ausencia (HR)

```typescript
// PATCH /api/ausencias/[id]
{
  "accion": "aprobar" // o "rechazar"
}

// Sistema automáticamente:
// 1. Determina estado: 'en_curso' (si fechaFin >= hoy) o 'completada'
// 2. Actualiza saldo: diasPendientes → diasUsados
// 3. Crea notificación para empleado
```

### Editar Ausencia (HR)

```typescript
// PATCH /api/ausencias/[id]
{
  "tipo": "vacaciones",
  "fechaInicio": "2025-12-01",
  "fechaFin": "2025-12-03", // Cambio: menos días
  "medioDia": false,
  "justificanteUrl": "https://bucket.s3.../nuevo_justificante.pdf" // opcional, actualizar
}

// Sistema automáticamente:
// 1. Recalcula días solicitados
// 2. Actualiza saldo si cambió número de días
// 3. Valida saldo suficiente
// 4. Actualiza justificante si se proporcionó nueva URL
```

---

## 📄 SISTEMA DE JUSTIFICANTES

### Funcionalidad

El sistema permite subir justificantes (documentos) para ausencias, especialmente útil para tipos que no requieren aprobación.

### Características

- **Tipos de archivo permitidos**: PDF, JPG, PNG
- **Tamaño máximo**: 5MB
- **Almacenamiento**: AWS S3
- **Momento de subida**: 
  - Al crear la ausencia (recomendado para tipos sin aprobación)
  - Al editar una ausencia existente

### Flujo de Upload

1. **Usuario selecciona archivo** en el formulario
2. **Sistema valida** tipo y tamaño
3. **Upload a S3** mediante `/api/upload`
4. **URL almacenada** en campo `justificanteUrl` de la ausencia
5. **Disponible para HR** para revisión

### Endpoint de Upload

**POST /api/upload**
- Body: `FormData` con `file` y `tipo`
- Validaciones: tipo de archivo, tamaño máximo
- Retorna: URL del archivo en S3

### Recomendaciones por Tipo

- **Enfermedad**: Justificante recomendado (médico)
- **Enfermedad familiar**: Justificante recomendado (médico)
- **Maternidad/Paternidad**: Justificante recomendado (documentación oficial)
- **Vacaciones**: Justificante opcional
- **Otro**: Justificante opcional

## 🎯 CAMPAÑAS DE VACACIONES PARA EMPLEADOS

### Vista en Dashboard

- **Widget pequeño**: `CampanasVacacionesWidget`
- Muestra campaña activa si existe
- Estado de participación del empleado
- Botón para ver detalles

### Vista en Pantalla de Ausencias

- **Panel expandible**: Similar al de HR pero adaptado
- Muestra todas las campañas activas
- Información de fechas objetivo
- Estado de participación (Participando/Pendiente/Sin participar)
- Botón "Ver detalles" para cada campaña

### Integración

- Las campañas se obtienen automáticamente al cargar la página
- Se filtran por empresa y estado 'activa'
- Se incluye la preferencia del empleado si existe

## 📝 PRÓXIMAS MEJORAS

### Prioridad MEDIA

1. **Completar Tab Calendario en `GestionarAusenciasModal`**
   - Editar calendario por defecto (L-V)
   - Importar calendario (ICS/CSV)
   - APIs necesarias: `/api/calendario/laboral-default`, `/api/calendario/importar`

2. **Gestión de Festivos**
   - CRUD festivos manuales
   - Cargar automático por comunidad autónoma
   - Endpoint: `/api/festivos` (POST, PATCH, DELETE)

### Prioridad BAJA

3. **Widget saldo en dashboard empleado**
   - Mostrar: Total / Usados / Pendientes / Disponibles
   - Integración en dashboard principal

4. **Notificaciones automáticas**
   - Notificar a HR al crear nueva ausencia
   - Notificar a empleado al aprobar/rechazar
   - Integrar con sistema de notificaciones existente

5. **Visualización de justificantes**
   - Ver justificante desde la vista de ausencia
   - Descargar justificante
   - Preview de imágenes

---

## 📅 SISTEMA DE FESTIVOS Y CALENDARIO LABORAL

### ✅ Funcionalidad Completa

El sistema permite configurar días laborables y festivos por empresa, que se usan automáticamente en todos los cálculos de ausencias.

### Componentes del Sistema

#### 1. Días Laborables Configurables

**Ubicación**: Empresa.config.diasLaborables (JSONB)

**Estructura**:
```json
{
  "lunes": true,
  "martes": true,
  "miercoles": true,
  "jueves": true,
  "viernes": true,
  "sabado": false,
  "domingo": false
}
```

**Funcionalidades**:
- Configuración por empresa desde "Gestionar Ausencias" > "Calendario Laboral"
- Checkboxes para activar/desactivar cada día de la semana
- Al menos un día debe estar activo (validación)
- Se aplica automáticamente en cálculos de días laborables

#### 2. Festivos

**Tipos de Festivos**:
- `nacional`: Festivos nacionales de España (importados automáticamente)
- `empresa`: Festivos personalizados de la empresa

**Gestión de Festivos**:
- CRUD completo desde "Gestionar Ausencias" > "Calendario Laboral"
- Vista de calendario visual (ver festivos por mes, crear al hacer click)
- Vista de lista (tabla con filtros, editar, eliminar, activar/desactivar)
- Importación automática de festivos nacionales (año actual + próximo)

**Festivos Nacionales Incluidos**:
- Año Nuevo (1 enero)
- Reyes Magos (6 enero)
- Viernes Santo (calculado según Semana Santa)
- Día del Trabajador (1 mayo)
- Asunción de la Virgen (15 agosto)
- Fiesta Nacional de España (12 octubre)
- Todos los Santos (1 noviembre)
- Día de la Constitución (6 diciembre)
- Inmaculada Concepción (8 diciembre)
- Navidad (25 diciembre)

#### 3. Integración en Cálculos

Todas las funciones de cálculo de días usan la configuración:

**lib/calculos/dias-laborables.ts**:
- `getDiasLaborablesEmpresa(empresaId)`: Obtiene configuración
- `esDiaLaborable(fecha, empresaId)`: Verifica si un día es laborable
- `contarDiasLaborables(fechaInicio, fechaFin, empresaId)`: Cuenta días laborables

**lib/calculos/ausencias.ts** (actualizado):
- `calcularDias()`: Usa días laborables configurables en lugar de hardcoded L-V
- `calcularDiasSolicitados()`: Excluye días no laborables y festivos
- `getDisponibilidadCalendario()`: Considera configuración para disponibilidad

### APIs Implementadas

#### Festivos

**GET /api/festivos**
- Query params: `año`, `tipo` (nacional/empresa), `activo`
- Retorna array de festivos con metadata

**POST /api/festivos**
- Crear festivo personalizado (tipo empresa)
- Validación de duplicados
- Solo HR Admin

**GET /api/festivos/[id]**
- Obtener festivo específico

**PATCH /api/festivos/[id]**
- Editar festivo empresa (nombre, fecha, activo)
- Festivos nacionales solo se pueden activar/desactivar
- Solo HR Admin

**DELETE /api/festivos/[id]**
- Eliminar festivo empresa
- Festivos nacionales no se pueden eliminar
- Solo HR Admin

**POST /api/festivos/importar-nacionales**
- Importar festivos nacionales automáticamente
- Query params: `añoInicio`, `añoFin` (opcionales)
- Evita duplicados automáticamente
- Solo HR Admin

#### Calendario Laboral

**GET /api/empresa/calendario-laboral**
- Obtener configuración actual de días laborables
- Retorna objeto con días de la semana

**PATCH /api/empresa/calendario-laboral**
- Actualizar configuración de días laborables
- Body: objeto con días (lunes, martes, etc.)
- Validación: al menos un día activo
- Solo HR Admin

### UI Components

**components/hr/calendario-festivos.tsx**
- Calendario visual mensual
- Navegación entre meses
- Click en día para crear/editar festivo
- Colores diferentes para festivos nacionales vs empresa
- Botón "Nuevo Festivo"

**components/hr/lista-festivos.tsx**
- Tabla de festivos
- Columnas: Fecha, Nombre, Tipo, Estado
- Acciones: Editar, Eliminar (solo empresa), Activar/Desactivar
- Filtros por año, tipo, estado

**components/hr/editar-festivo-modal.tsx**
- Modal crear/editar festivo
- Campos: Fecha, Nombre, Activo
- Validación de duplicados
- Solo festivos empresa son completamente editables

**Modal Gestionar Ausencias > Tab Calendario Laboral**:
- Selector de días laborables (checkboxes)
- Botón "Importar Calendario Nacional"
- Toggle entre vista calendario y lista de festivos
- Guardar configuración (días + festivos)

### Flujo de Uso

#### Setup Inicial (automático al crear empresa)
1. Sistema crea días laborables por defecto (L-V)
2. Sistema importa festivos nacionales año actual + próximo

#### Configuración por HR
1. HR abre "Gestionar Ausencias" > "Calendario Laboral"
2. Ajusta días laborables (ej: activar sábado si la empresa trabaja)
3. Importa festivos nacionales si no existen
4. Crea festivos personalizados (ej: aniversario empresa)
5. Activa/desactiva festivos según necesidad
6. Guarda configuración

#### Uso en Cálculos
1. Empleado solicita ausencia
2. Sistema calcula días usando:
   - Configuración de días laborables de empresa
   - Festivos activos de la empresa
3. Excluye días no laborables y festivos del cálculo
4. Muestra días correctos al empleado y HR

---

## 🎯 PRÓXIMOS PASOS SUGERIDOS

1. **Widget saldo en dashboard empleado** (1 hora)
2. **Testing completo de sistema festivos** (2 horas)
3. **Migración de empresas existentes a festivos** (1 hora)

---

## 📚 REFERENCIAS

- Schema: `prisma/schema.prisma` - Modelo Ausencia líneas 354-407
- API Core: `app/api/ausencias/route.ts`
- API Individual: `app/api/ausencias/[id]/route.ts`
- API Masivo: `app/api/ausencias/actualizar-masivo/route.ts`
- UI HR: `app/(dashboard)/hr/horario/ausencias/ausencias-client.tsx`
- UI Empleado: `app/(dashboard)/empleado/mi-espacio/tabs/ausencias-tab.tsx`
- UI Empleado Ausencias: `app/(dashboard)/empleado/horario/ausencias/ausencias-empleado-client.tsx`
- Modal Solicitar: `components/empleado/solicitar-ausencia-modal.tsx`
- Modal Gestionar: `app/(dashboard)/hr/horario/ausencias/gestionar-ausencias-modal.tsx`
- Widget Ausencias: `components/shared/ausencias-widget.tsx`
- Widget Campañas: `components/empleado/campanas-vacaciones-widget.tsx`
- API Upload: `app/api/upload/route.ts`
- Validaciones: `lib/validaciones/schemas.ts` (ausenciaCreateSchema, ausenciaUpdateSchema)

---

**Última actualización**: 27 Enero 2025
**Estado**: Sistema completo y operativo con Estados Unificados, Festivos, Calendario Laboral, Justificantes y Campañas para Empleados

