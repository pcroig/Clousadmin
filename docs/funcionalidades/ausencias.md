# 🏖️ DOCUMENTACIÓN: GESTIÓN DE AUSENCIAS - ESTADO ACTUAL

**Versión**: 3.6.0
**Fecha**: 10 Diciembre 2025
**Última actualización**: 10 Diciembre 2025
**Estado**: Sistema refactorizado con validaciones robustas, transacciones atómicas, prevención de race conditions **Y normalización UTC para fechas**. ⚠️ **Campañas de vacaciones deprecadas temporalmente** para el primer lanzamiento.

---

## 🔄 CAMBIOS RECIENTES

### v3.6.0 - Fix Completo de Timezone (10 Dic 2025) 🔥

**Problema resuelto**: Ausencias creadas desde "Mi Espacio" (empleado) con rango 17-22 se persistían como 16-21 debido a conversión incorrecta de timezone local a UTC.

**Cambios principales**:
- **Helper centralizado**: Nuevo módulo `lib/utils/dates.ts` con funciones timezone-safe:
  - `normalizeToUTCDate()`: Normaliza cualquier fecha a medianoche UTC
  - `getDaysBetween()`: Calcula días entre fechas normalizadas
  - `isSameDayUTC()`: Compara fechas ignorando hora
  - `toDateInputValue()`: Formato YYYY-MM-DD para inputs HTML
- **Backend normalizado**: Todos los endpoints de ausencias (`POST`, `PATCH`, `GET`) normalizan fechas a UTC antes de persistir o comparar
- **calcularDias() robusto**: Normaliza internamente + usa `getUTCDay()` y `setUTCDate()` para evitar problemas con DST
- **Frontend normalizado**: Componentes `solicitar-ausencia-modal.tsx` y `editar-ausencia-modal.tsx` normalizan antes de enviar
- **Tests de regresión**: 30 tests (18 unitarios + 12 integración) que validan el fix y previenen regresión
- **Defensa en profundidad**: Frontend normaliza (1ª barrera) + Backend normaliza (2ª barrera) + calcularDias normaliza (3ª barrera)

**Extensión a otros módulos**:
- ✅ **Festivos**: `app/api/festivos/nacionales/route.ts` normaliza fechas de festivos nacionales
- ✅ **Contratos**: `app/api/contratos/[id]/finalizar/route.ts` normaliza fechaFin antes de comparar
- ✅ **Empleados**: `app/api/empleados/route.ts` normaliza fechaNacimiento y fechaAlta en `parseDateString()`

**Archivos afectados**:
- `lib/utils/dates.ts` (nuevo)
- `tests/unit/utils/dates.test.ts` (nuevo)
- `tests/integration/ausencias-timezone.test.ts` (nuevo)
- `app/api/ausencias/route.ts`
- `app/api/ausencias/[id]/route.ts`
- `lib/calculos/ausencias.ts`
- `components/empleado/solicitar-ausencia-modal.tsx`
- `components/ausencias/editar-ausencia-modal.tsx`
- `app/api/festivos/nacionales/route.ts`
- `app/api/contratos/[id]/finalizar/route.ts`
- `app/api/empleados/route.ts`

**Commits**:
- `cc3a2d5`: Fix ausencias + helper + tests + docs
- `841a5d8`: Extensión a festivos, contratos y empleados

---

### v3.5.0 - Unificación de Tablas y Mejoras de UI (Enero 2025)

**Cambios**:
- **Tabla unificada**: Migración a `DataTable` compartido con estilo consistente (header grisaceo, filas completas, EmptyState de shadcn)
- **Avatar en tabla**: Columna de empleado muestra avatar + nombre + puesto usando `AvatarCell`
- **Justificante como columna**: Columna separada para justificantes con icono de archivo
- **Botones inline para pendientes**: Botones "Aprobar" y "Rechazar" aparecen directamente en la tabla sin fila expandible
- **Fecha condensada**: La columna de fechas muestra el rango `dd MMM` y, si existe `createdAt`, añade el texto "Solicitada 5 ene" en gris
- **InputGroup en reglas**: Inputs de "Gestionar Ausencias" muestran unidades (días, %) dentro del campo usando `InputGroup`
- **Notificaciones mejoradas**: Títulos y descripciones más descriptivos con rango de fechas y tipo de ausencia
- **Corrección de filtros**: Unificación de estado 'todos' en frontend y backend
- **Política de carry-over UI**: El toggle ahora se presenta como una sola línea con tooltip "i" y switch, reutilizando el nuevo patrón `SwitchWithTooltip` sin bordes para ofrecer contexto inmediato
- **Fix upload S3**: Corrección del header `ContentLength` para evitar errores al subir justificantes
- **Mi Espacio actualizado**: Las cards siguen siendo botones que abren el modal de edición y muestran el icono de justificante (`Paperclip`) junto al estado cuando hay archivo

**Archivos afectados**:
- `app/(dashboard)/hr/horario/ausencias/ausencias-client.tsx`
- `components/shared/mi-espacio/ausencias-tab.tsx`
- `components/empleado/solicitar-ausencia-modal.tsx`
- `app/(dashboard)/hr/horario/ausencias/gestionar-ausencias-modal.tsx`
- `lib/notificaciones.ts`
- `lib/s3.ts`
- `app/api/upload/route.ts`
- `app/api/ausencias/route.ts`

### v3.4.0 - Política de Carry-Over y Mejoras de UX (27 Ene 2025)

**Cambios**:
- **Política de carry-over**: Toggle en "Gestionar Ausencias" para elegir entre limpiar saldo al acabar el año (por defecto) o extender saldo pendiente 4 meses
- **Saldo extendido**: Con la opción de extender, empleados tienen saldo del año actual + saldo del año anterior (temporal) durante 4 meses, luego solo se limpia la parte temporal
- **Campo `diasDesdeCarryOver`**: Nuevo campo en `Ausencia` para rastrear días cubiertos con saldo extendido
- **Sincronización con compensación**: La compensación de horas extra ahora sincroniza correctamente con el saldo de ausencias, considerando carry-over
- **HR/Empleado pueden crear ausencias**: HR puede abrir ausencias directamente desde espacio de empleados, empleados solicitan desde su espacio
- **Card de saldo mejorada**: Fecha de rango visible en esquina superior derecha (no debajo)

**Archivos afectados**:
- `app/(dashboard)/hr/horario/ausencias/gestionar-ausencias-modal.tsx`
- `app/api/empresa/politica-ausencias/route.ts`
- `lib/calculos/ausencias.ts`
- `app/api/ausencias/route.ts`
- `app/api/ausencias/[id]/route.ts`
- `components/shared/mi-espacio/ausencias-tab.tsx`
- `components/empleado/solicitar-ausencia-modal.tsx`
- `prisma/schema.prisma`

---

### v3.3.0 - Interfaz Unificada de Campañas de Vacaciones (27 Ene 2025)

**Cambios**:
- **Vista unificada**: Eliminación de tabs "Solicitado" vs "Propuesto". Ahora se visualiza todo en una única tabla con comparación directa
- **Interacción directa**: Click en fechas para asignar/desasignar días sin necesidad de desplegables
- **Botones contextuales**: "Cancelar propuesta" y "Reintentar IA" solo aparecen cuando hay propuesta generada
- **Navegación mejorada**: Botón "Volver a ausencias" para acceso rápido al listado
- **Validaciones mejoradas**: Validación de rangos de campaña en frontend antes de enviar a API
- **Correcciones**: Fix de error `getAvatarStyle` usando componente `EmployeeAvatar` reutilizable

**Archivos afectados**: 
- `app/(dashboard)/hr/horario/ausencias/campana/campana-client.tsx`
- `components/vacaciones/tabla-cuadraje-campana.tsx`

---

### v3.2.2 - Campo Único de Motivo/Detalle (18 Nov 2025)

**Cambios**:
- Se elimina `descripcion` del modelo `Ausencia`; `motivo` es el único campo semántico (obligatorio solo para tipo `otro`)
- Migración automática que fusiona datos existentes (si solo había descripción se conserva en motivo)
- Formularios de empleado y HR muestran un único campo "Motivo o detalles"
- API, validaciones, integraciones (calendario) y documentación actualizados

**Archivos afectados**: `prisma/schema.prisma`, `lib/validaciones/schemas.ts`, `app/api/ausencias/**`, `components/**/solicitar-ausencia-modal.tsx`, `app/(dashboard)/hr/horario/ausencias/ausencias-client.tsx`, `lib/integrations/types.ts`

---

### v3.2.1 - Bugfixes Críticos (18 Nov 2025)

**Correcciones**:
1. **Race Condition Real**: `calcularSaldoDisponible()` ahora usa valores de tabla cuando se ejecuta en transacción, evitando recalcular desde ausencias (causa de race condition)
2. **Tests**: Corregidos imports inexistentes (`validarSaldoSuficienteConTransaccion` → `validarSaldoSuficiente`)
3. **Documentación**: Alineada con código real (eliminadas referencias a funciones que no existen)
4. **Cleanup Justificantes**: Limpieza de documentos huérfanos ahora ocurre en TODOS los paths de error, no solo en `SaldoInsuficienteError`
5. **Código Muerto**: Eliminado schema duplicado (`ausenciaEditarSchema`) y función helper redundante (`failWithCleanup`)

**Archivos afectados**: `lib/calculos/ausencias.ts`, `app/api/ausencias/route.ts`, `app/api/ausencias/[id]/route.ts`, `lib/calculos/__tests__/ausencias.test.ts`

---

### v3.2 - Refactoring Mayor (18 Nov 2025)

### Mejoras Críticas de Seguridad y Robustez

1. **Validaciones Reforzadas**:
   - Medio día restringido a ausencias de un solo día
   - Campo `periodo` obligatorio cuando `medioDia=true`
   - Campo `motivo` obligatorio para tipo 'otro'
   - Validación de solapamiento incluye estados completados y auto-aprobados

2. **Transacciones Atómicas para Saldos**:
   - `calcularSaldoDisponible()` usa valores de tabla cuando se ejecuta en transacción
   - Validación + actualización en una única transacción previene race conditions
   - Protección contra saldos negativos en solicitudes concurrentes

3. **Saldos Multi-Año**:
   - `calcularSaldoDisponible()` recalcula ausencias por año fuera de transacción
   - Cálculo correcto considerando ausencias que cruzan límites de año
   - Cada año mantiene su propio registro independiente en `EmpleadoSaldoAusencias`

4. **Sincronización Completa**:
   - Ausencias auto-aprobadas ahora se sincronizan con Google Calendar
   - Notificaciones con manejo de errores mejorado (logs + eventual consistency)
   - Documentos huérfanos se limpian automáticamente tras 7 días

5. **Constantes Centralizadas**:
   - `lib/constants/ausencias.ts`: tipos auto-aprobables y que descuentan saldo
   - Single source of truth para reglas de negocio
   - Reutilización en API y componentes UI

6. **Optimizaciones de Performance**:
   - Eliminado `JSON.parse(JSON.stringify())` innecesario
   - `validarSolapamientoMaximo()` optimizado (sin cálculo doble)
   - Memoización de fecha `today` en modales para evitar re-creación

7. **Restricciones de Edición**:
   - Cambio de tipo solo permitido en estado `pendiente`
   - Validaciones coherentes en POST y PATCH

---

## 📋 RESUMEN EJECUTIVO

### ✅ COMPLETADO

1. **Base de Datos**: Todos los modelos implementados (Ausencia, EmpleadoSaldoAusencias, Festivo, EquipoPoliticaAusencias)
2. **API Routes Core**: CRUD completo de ausencias, aprobar/rechazar individual, actualizar masivo
3. **Lógica de Negocio**: Todos los cálculos de días, saldo, festivos, días laborables implementados
4. **Páginas HR**: Vista completa con filtros, búsqueda, modales de edición
5. **Páginas Empleado**: Vista en Mi Espacio con diseño visual (FechaCalendar, tabs Próximas/Pasadas)
6. **Modal Gestionar Ausencias**: Vista única con secciones para saldo anual y calendario laboral (el bloque de festivos alterna entre calendario/lista mediante tabs)
7. **Estados Unificados**: Sistema de estados claro (`pendiente`, `confirmada`, `completada`, `rechazada`) con auto-aprobaciones registradas mediante eventos pero sin enum dedicado
8. **Sistema de Festivos**: CRUD completo, importación automática de festivos nacionales
9. **Calendario Laboral**: Configuración de días laborables por empresa, integrado en cálculos
10. **Campañas de Vacaciones**: Sistema de cuadrado inteligente con IA
11. **Justificantes**: Sistema de subida de documentos para ausencias (S3)
12. **Selector de Tipos Mejorado**: Información visual sobre aprobación y descuento de saldo
13. **Campañas para Empleados**: Widget y panel de campañas activas en vista de empleados
14. **Vista de Personas Mejorada**: Tabla de ausencias en lugar de cards
15. **✨ NUEVO: Transacciones Atómicas**: Prevención de race conditions en saldos
16. **✨ NUEVO: Saldos Multi-Año**: Gestión correcta de ausencias que cruzan años
17. **✨ NUEVO: Validaciones Robustas**: Medio día, motivo, periodo, solapamiento mejorados
18. **✨ NUEVO: Cleanup Automático**: Documentos huérfanos eliminados tras 7 días

---

## 📊 ESTADO DETALLADO POR COMPONENTE

### 1. BASE DE DATOS

#### ✅ Modelo `Ausencia`
```prisma
// Estados actuales (unificados):
- 'pendiente' (default) - Estado inicial al crear, esperando aprobación manual
- 'confirmada' - Aprobada y aún no finalizada (fechaFin >= hoy)
- 'completada' - Aprobada y ya disfrutada (fechaFin < hoy)
- 'rechazada' - Rechazada por HR/Manager
```

**✅ Estados unificados**: Todos los componentes usan estos estados. Las cancelaciones eliminan la ausencia (DELETE) y disparan `ausencia_cancelada`, pero no existe enum `cancelada`.

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
| `/api/festivos/cargar-automatico` | ❌ | Media |
| `/api/calendario/laboral-default` | ❌ | Baja |
| `/api/calendario/importar` | ❌ | Baja |

---

### 3. PÁGINAS Y UI

#### ✅ `/hr/horario/ausencias`

**Implementado**:
- ✅ **Tabla unificada**: Usa `DataTable` compartido con estilo consistente
- ✅ **Avatar + nombre**: Columna de empleado muestra avatar + nombre + puesto con `AvatarCell`
- ✅ **Justificante como columna**: Columna separada con icono de archivo si hay justificante
- ✅ **Botones inline**: Para ausencias pendientes, botones "Aprobar"/"Rechazar" aparecen directamente en la tabla
- ✅ **Fecha condensada**: El rango se muestra como `dd MMM` y, si existe `createdAt`, aparece el texto "Solicitada 5 ene" en gris
- ✅ **Click en fila**: Abre modal de edición directamente
- ✅ Filtros por estado (todos, pendientes, confirmadas, completadas, rechazadas) - **Corregido**: usa 'todos' en lugar de 'todas'
- ✅ Búsqueda por nombre de empleado
- ✅ Filtro por equipo
- ✅ Controles de fecha (mes por defecto)
- ✅ Modal aprobar individual
- ✅ Modal rechazar individual
- ✅ Modal editar ausencia (tipo, fechas, motivo/detalles, medio día)
- ✅ Botón "Actualizar ausencias" (aprobar todas pendientes)
- ✅ Botón "Gestionar ausencias" (modal con secciones consecutivas y tabs internas solo para festivos calendario/lista)
- ✅ **EmptyState de shadcn**: Estados vacíos usan componente estándar con layout `table`

**Estados mostrados**:
- ✅ Usa estados unificados: `pendiente`, `confirmada`, `completada`, `rechazada`

#### ✅ `/empleado/mi-espacio` (Tab Ausencias)

**Implementado**:
- ✅ Diseño visual con `FechaCalendar`
- ✅ Tabs "Próximas" y "Pasadas"
- ✅ Botón "Nueva Ausencia" en card calendario
- ✅ **Card "Saldo de ausencias" mejorada**: Fecha de rango visible en esquina superior derecha (no debajo)
- ✅ Saldo de vacaciones (Total, Disponibles, Usados, Carry-Over si aplica)
- ✅ Muestra saldo extendido y fecha de expiración si hay carry-over activo
- ✅ **Cards simplificadas**: Siguen siendo botones sin recuadros pesados y abren el modal de edición si el rol lo permite
- ✅ **Icono de justificante**: Icono de archivo (`Paperclip`) aparece junto al badge de estado si hay justificante adjunto
- ✅ Fecha condensada (se muestra rango y etiqueta "Solicitada" cuando aplica)

**Estados**:
- Soporta los estados actuales: `pendiente`, `confirmada`, `completada`, `rechazada`

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
- ✅ **Botón "Abrir ausencia"**: HR puede crear ausencias directamente (sin solicitud)

---

### 4. COMPONENTES

#### ✅ `SolicitarAusenciaModal`
- ✅ Implementado y funcional
- ✅ Usa Dialog de shadcn/ui
- ✅ Validación de saldo (considera carry-over si aplica)
- ✅ **Selector de tipos simplificado**: Sin iconos ni colores, tipografía gris neutra, información de aprobación y saldo en línea
- ✅ Campo de upload de justificante (opcional, recomendado para tipos sin aprobación)
- ✅ Soporte para archivos PDF, JPG, PNG (máx 5MB)
- ✅ Subida a S3 antes de crear la ausencia - **Corregido**: Header `ContentLength` siempre válido
- ✅ **Adaptativo según contexto**: 
  - Si `esHRAdmin=true`: Crea ausencia directamente (sin solicitud)
  - Si `esHRAdmin=false`: Crea solicitud que requiere aprobación
- ✅ **Prop `empleadoIdDestino`**: Permite a HR crear ausencias para otros empleados

#### ✅ `GestionarAusenciasModal`
- ✅ Sección **Política de ausencias**: saldo anual y reglas (solapamiento, antelación) para toda la empresa
- ✅ **✨ InputGroup**: Inputs de reglas (días, %) muestran unidades dentro del campo usando `InputGroup` de shadcn
- ✅ **✨ NUEVO: Toggle de Política de Carry-Over**:
  - **Limpiar saldo al acabar el año** (por defecto): Saldo pendiente se limpia al finalizar el año
  - **Extender saldo 4 meses**: Saldo pendiente del año anterior se extiende automáticamente 4 meses al siguiente año
  - Extiende siempre 4 meses (valor fijo)
  - Se guarda en `Empresa.config.carryOver` (campos `modo` y `mesesExtension`)
- ✅ Sección **Calendario Laboral**: días laborables + gestión de festivos (importación y lista simplificada, con tabs internos calendario/lista)

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
- `pendiente` - Solicitud esperando aprobación manual
- `confirmada` - Aprobada y aún no finalizada (fechaFin >= hoy)
- `completada` - Aprobada y ya finalizada (fechaFin < hoy)
- `rechazada` - Rechazada por HR/Manager

**Lógica de transición**:
- Creación:
  - Tipos que requieren aprobación (`vacaciones`, `otro`) comienzan en `pendiente`
  - Tipos auto-aprobables (`enfermedad`, `enfermedad_familiar`, `maternidad_paternidad`) saltan directo a `confirmada` o `completada` según la fecha
- Al aprobar manualmente: `confirmada` (si fechaFin >= hoy) o `completada` (si fechaFin < hoy)
- Al rechazar: `rechazada` (no cambia saldo usado)
- Cancelaciones eliminan la ausencia (DELETE) y envían `ausencia_cancelada`, no existe enum propio

**Implementación en código**:
```typescript
// Al aprobar ausencia
const hoy = new Date();
hoy.setHours(0, 0, 0, 0);
const fechaFin = new Date(ausencia.fechaFin);
fechaFin.setHours(0, 0, 0, 0);

const nuevoEstado = fechaFin < hoy ? 'completada' : 'confirmada';
```

**Cálculo de saldo usando estados**:
```typescript
// Días usados (ausencias aprobadas y disfrutadas)
const diasUsados = ausencias
  .filter((a) => a.estado === 'confirmada' || a.estado === 'completada')
  .reduce((sum, a) => sum + Number(a.diasSolicitados), 0);

// Días pendientes (esperando aprobación)
const diasPendientes = ausencias
  .filter((a) => a.estado === 'pendiente')
  .reduce((sum, a) => sum + Number(a.diasSolicitados), 0);
```

> ℹ️ Las auto-aprobaciones siguen guardándose como `confirmada`/`completada`. La diferencia se registra en `autoCompletado.tipo = 'ausencia_auto_aprobada'` para notificaciones e histórico.

## 📋 FLUJO COMPLETO DE AUSENCIAS

### Flujo Empleado

1. **Solicitar Ausencia**
   - Empleado accede a `/empleado/mi-espacio` → Tab Ausencias o widget de ausencias
   - Click "Solicitar ausencia" (botón con bordes)
   - Selecciona tipo de ausencia (con información visual sobre aprobación y descuento)
   - Completa formulario (tipo, fechas, motivo/detalles según tipo)
   - **Opcional**: Sube justificante (recomendado para enfermedad, enfermedad_familiar, maternidad_paternidad)
   - Sistema valida saldo disponible (si es vacaciones), considerando carry-over si aplica
   - Se crea ausencia con estado `pendiente` (o directamente aprobada en `confirmada`/`completada` según tipo auto-aprobable)
   - Saldo pendiente se incrementa automáticamente (si descuenta saldo)
   - Si hay saldo extendido disponible, se usa primero (`diasDesdeCarryOver` se registra en la ausencia)

2. **Ver Ausencias Propias**
   - Tab "Próximas": Ausencias con fechaFin >= hoy y estados `pendiente` o `confirmada`
   - Tab "Pasadas": Ausencias con fechaFin < hoy y estado `completada`
   - Visualización con `FechaCalendar` para fechas

3. **Cancelar Ausencia**
   - Solo si estado es `pendiente`
   - Sistema devuelve días al saldo disponible y envía notificación `ausencia_cancelada`
   - La ausencia se elimina de la tabla (no existe estado persistente `cancelada`)

### Flujo HR/Manager

1. **Ver Todas las Ausencias**
   - Accede a `/hr/horario/ausencias`
   - Filtra por estado: todas, pendientes, confirmadas, completadas, rechazadas
   - Busca por nombre de empleado

2. **Abrir Ausencia Directamente** ⭐ NUEVO
   - HR puede crear ausencias directamente desde:
     - Espacio individual del empleado (`/hr/organizacion/personas/[id]` → Tab Ausencias)
     - Vista de ausencias (`/hr/horario/ausencias`)
   - **Comportamiento**: Se crea la ausencia directamente (sin solicitud), con estado según tipo
   - Endpoint: `POST /api/ausencias` (con validación de permisos HR)

3. **Aprobar/Rechazar Individual**
   - Click en ausencia pendiente
   - Modal muestra detalles completos
   - Opciones: Aprobar, Rechazar, Editar
   - Al aprobar: sistema determina `confirmada` o `completada` según fechaFin
   - Saldo se actualiza automáticamente (días pendientes → días usados), considerando carry-over

3. **Actualización Masiva**
   - Botón "Actualizar ausencias" aprueba todas las pendientes
   - Útil para días de gran volumen

4. **Gestionar Ausencias**
   - Modal con una sola vista: primero el bloque de saldo anual (InputGroup + switch `SwitchWithTooltip` para carry-over) y debajo el bloque de calendario laboral
   - El bloque de festivos alterna entre **Calendario** y **Lista** mediante tabs internos
   - **Carry-over**: Toggle para elegir entre limpiar saldo al acabar el año o extender 4 meses (actualiza `carryOverModo` en la configuración de empresa)
   - **Calendario Laboral**: Define días laborables semanales y permite importar/cargar festivos (incluye botones inline para nuevo festivo e importación desde archivo)

5. **Editar Ausencia**
   - Desde tabla o desde perfil de empleado
   - Permite modificar: tipo, fechas, motivo/detalles, medio día, **justificante**
   - Recalcula días automáticamente
   - Valida saldo si cambia número de días
   - Permite subir/actualizar justificante después de crear la ausencia

> ℹ️ **Integración con bolsa de horas**: Cuando HR compensa horas extra desde `/hr/horario/fichajes` o desde nóminas, las ausencias generadas se crean automáticamente con tipo `otro`, `descuentaSaldo = false` y se actualiza `EmpleadoSaldoAusencias`, manteniendo el saldo sincronizado sin intervención manual. **✅ Sincronización mejorada**: La compensación ahora considera correctamente el carry-over y actualiza los campos `diasDesdeCarryOver` y `carryOverUsado` en el saldo.

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
  "motivo": "Vacaciones de Navidad",
  "medioDia": false,
  "justificanteUrl": "https://bucket.s3.../justificante_xxx.pdf" // opcional
}

// Sistema automáticamente:
// 1. Calcula días naturales y laborables
// 2. ✅ SOLO descuenta días laborables del saldo (excluye fines de semana y festivos)
//    Ejemplo: Si el rango incluye un fin de semana, NO se descuentan esos días
// 3. Valida saldo disponible (si tipo = 'vacaciones')
// 4. Crea ausencia con estado:
//    - 'pendiente' para 'vacaciones' y 'otro'
//    - 'confirmada' (o 'completada' si fechaFin ya pasó) para 'enfermedad', 'enfermedad_familiar', 'maternidad_paternidad'
// 5. Incrementa diasPendientes en saldo (si descuenta saldo) - solo con los días laborables calculados
```

### Tipos de Ausencia y Reglas

| Tipo | Necesita Aprobación | Descuenta Saldo | Auto-aprobación IA |
|------|---------------------|-----------------|---------------------|
| **Vacaciones** | ✅ Sí | ✅ Sí (solo días laborables) | Solo después de 2 días sin aprobar |
| **Enfermedad** | ❌ No | ❌ No | Directo (sin aprobación) |
| **Enfermedad familiar** | ❌ No | ❌ No | Directo (sin aprobación) |
| **Maternidad/Paternidad** | ❌ No | ❌ No | Directo (sin aprobación) |
| **Otro** | ✅ Sí | ❌ No | Solo después de 2 días sin aprobar |

### 📅 Cálculo de Días Laborables

**IMPORTANTE**: El sistema **solo descuenta del saldo los días laborables** según la configuración de la empresa.

#### Ejemplo 1: Ausencia con fin de semana
```
Solicitud: Viernes 1 dic - Lunes 4 dic (4 días naturales)
Configuración empresa: L-V laborables
Cálculo:
  - Viernes 1: ✅ Laborable → Cuenta
  - Sábado 2: ❌ No laborable → NO cuenta
  - Domingo 3: ❌ No laborable → NO cuenta
  - Lunes 4: ✅ Laborable → Cuenta
Resultado: Se descuentan 2 días del saldo (no 4)
```

#### Ejemplo 2: Ausencia con festivo
```
Solicitud: Jueves 6 dic - Lunes 10 dic (5 días naturales)
Configuración empresa: L-V laborables
Festivo: 8 dic (Inmaculada Concepción)
Cálculo:
  - Jueves 6: ✅ Laborable → Cuenta
  - Viernes 7: ✅ Laborable → Cuenta
  - Sábado 8: ❌ Festivo → NO cuenta
  - Domingo 9: ❌ No laborable → NO cuenta
  - Lunes 10: ✅ Laborable → Cuenta
Resultado: Se descuentan 3 días del saldo (no 5)
```

#### Días que NO se descuentan del saldo:
- ❌ Sábados y domingos (si la empresa no los tiene como laborables)
- ❌ Festivos nacionales activos (ej: 1 enero, 25 diciembre)
- ❌ Festivos personalizados de la empresa (ej: aniversario)
- ❌ Cualquier día configurado como no laborable en el calendario de la empresa

### Diferencia clave

| Caso | ¿Pasa por `auto_completados`? | Notificación |
|------|-------------------------------|--------------|
| **No requiere aprobación** | ❌ (no hay aprobación, solo registro directo) | `ausencia_aprobada` a HR/Manager con `autoAprobada: true` |
| **Aprobación automática** (IA/batch) | ✅ `autoCompletado.tipo = 'ausencia_auto_aprobada'` | `ausencia_aprobada` al empleado + registro histórico |

- Usa `lib/auto-completado.ts` únicamente cuando una ausencia **estaba pendiente** y el sistema la aprueba automáticamente.
- Las ausencias que nunca necesitaron aprobación solo actualizan saldo y disparan la notificación informativa para HR/Manager.

**Nota sobre auto-aprobación**: Solo aplica a tipos que necesitan aprobación (`vacaciones`, `otro`). Después de 2 días sin aprobar/rechazar, el sistema IA clasifica y puede auto-aprobar según criterios.

### Aprobar Ausencia (HR)

```typescript
// PATCH /api/ausencias/[id]
{
  "accion": "aprobar" // o "rechazar"
}

// Sistema automáticamente:
// 1. Determina estado: 'confirmada' (si fechaFin >= hoy) o 'completada'
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
- **Almacenamiento**: Hetzner Object Storage (S3-compatible)
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

## 🎯 CAMPAÑAS DE VACACIONES

> ⚠️ **NOTA IMPORTANTE:** Esta funcionalidad está **DEPRECADA TEMPORALMENTE** para el primer lanzamiento (Diciembre 2025). Se retomará en futuras versiones. El código se mantiene intacto pero deshabilitado mediante feature flag `NEXT_PUBLIC_CAMPANAS_VACACIONES_ENABLED`.

### Vista HR: Cuadraje de Campaña

**Ruta**: `/hr/horario/ausencias/campana/[id]`

**Características principales**:

1. **Vista Unificada**:
   - Tabla única que muestra simultáneamente días solicitados por empleados y días propuestos (IA o manual)
   - Comparación visual directa sin necesidad de cambiar entre vistas
   - Indicadores visuales:
     - 🟢 Verde con check: Asignado y coincide con solicitud
     - 🔵 Azul: Asignado (propuesta diferente a solicitud)
     - ⚪ Gris: Día solicitado pero no asignado

2. **Interacción Directa**:
   - Click en cualquier celda de fecha para asignar/desasignar días
   - Actualización optimista (cambios inmediatos en UI)
   - Validación automática de rangos de campaña
   - Solo permite reducir rangos desde los extremos (inicio/fin)

3. **Botones de Acción**:
   - **"Cuadrar con IA"**: Genera propuesta automática (solo visible si no hay propuesta)
   - **"Cancelar propuesta"**: Elimina la propuesta actual (solo visible si hay propuesta)
   - **"Reintentar IA"**: Regenera propuesta con IA (solo visible si hay propuesta)
   - **"Enviar propuesta"**: Envía propuesta a empleados para revisión
   - **"Finalizar campaña"**: Crea ausencias definitivas y cierra la campaña
   - **"Volver a ausencias"**: Navegación rápida al listado de ausencias

4. **Flujo de Trabajo**:
   ```
   1. HR crea campaña → Empleados envían preferencias
   2. HR hace click en "Cuadrar con IA" → Sistema genera propuesta
   3. HR revisa y ajusta manualmente (click en fechas)
   4. HR envía propuesta → Empleados revisan y aceptan/cambian
   5. HR finaliza campaña → Se crean ausencias automáticamente
   ```

**Componentes**:
- `app/(dashboard)/hr/horario/ausencias/campana/campana-client.tsx`: Componente principal
- `components/vacaciones/tabla-cuadraje-campana.tsx`: Tabla interactiva de calendario

**APIs relacionadas**:
- `POST /api/campanas-vacaciones/[id]/cuadrar`: Generar propuesta con IA
- `PATCH /api/campanas-vacaciones/[id]/propuestas`: Actualizar asignaciones manuales
- `POST /api/campanas-vacaciones/[id]/propuestas/cancelar`: Cancelar propuesta
- `POST /api/campanas-vacaciones/[id]/enviar-propuesta`: Enviar a empleados
- `POST /api/campanas-vacaciones/[id]/finalizar`: Finalizar y crear ausencias

### Vista Empleado: Participación en Campañas

**Modal de Preferencias**:
- **Apertura automática**: Se muestra una vez al iniciar sesión si hay campaña pendiente (usando `sessionStorage`)
- **Apertura desde notificaciones**: Al hacer clic en notificaciones de campaña, se abre el modal mediante eventos personalizados
- **UI unificada**: Selector de tipo de días (ideales, prioritarios, alternativos) y visualización de días seleccionados en tarjetas interactivas en la parte superior
- **Calendario interactivo**: Selección de fechas con indicadores visuales por tipo (azul=ideales, naranja=prioritarios, gris=alternativos)
- **Validación**: Requiere mínimo 50% de días alternativos respecto a días ideales
- **Endpoint**: `GET /api/campanas-vacaciones/[id]/preferencia` crea automáticamente la preferencia si no existe

**Vista en Dashboard**:
- **Widget pequeño**: `CampanasVacacionesWidget`
- Muestra campaña activa si existe
- Estado de participación del empleado
- Botón para ver detalles

**Vista en Pantalla de Ausencias**:
- **Panel expandible**: Similar al de HR pero adaptado
- Muestra todas las campañas activas
- Información de fechas objetivo
- Estado de participación (Participando/Pendiente/Sin participar)
- Botón "Ver detalles" para cada campaña

**Integración**:
- Las campañas se obtienen automáticamente al cargar la página
- Se filtran por empresa y estado 'activa'
- Se incluye la preferencia del empleado si existe

**Componentes**:
- `components/vacaciones/preferencias-vacaciones-modal.tsx`: Modal de selección de preferencias
- `components/vacaciones/campana-vacaciones-reminder.tsx`: Recordatorio automático con control de apertura única
- `lib/events/vacaciones.ts`: Sistema de eventos para apertura del modal desde notificaciones

**APIs relacionadas**:
- `GET /api/campanas-vacaciones/[id]/preferencia`: Obtener o crear preferencia del empleado
- `PATCH /api/campanas-vacaciones/[id]/preferencia`: Actualizar preferencias y marcar como completada

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

## 🔄 POLÍTICA DE CARRY-OVER (EXTENSIÓN DE SALDO)

### Descripción

El sistema permite configurar cómo se maneja el saldo pendiente de ausencias al finalizar el año:

1. **Limpiar saldo al acabar el año** (por defecto):
   - Al finalizar el año, todo el saldo pendiente se limpia
   - Los empleados empiezan el nuevo año solo con el saldo asignado para ese año

2. **Extender saldo 4 meses**:
   - El saldo pendiente del año anterior se extiende al siguiente año
   - Durante el período de extensión, los empleados tienen:
     - Saldo del año actual
     - Saldo extendido del año anterior (temporal)
   - Al finalizar el período de extensión, solo se limpia la parte temporal (del año anterior)
   - El saldo del año actual se mantiene

### Configuración

**Ubicación**: Modal "Gestionar Ausencias" → Tab "Política de ausencias"

**Campo en base de datos**: `Empresa.config.carryOver` (objeto con `modo` y `mesesExtension`)
- `modo = 'limpiar'`: Limpiar saldo al acabar el año (por defecto)
- `modo = 'extender'` + `mesesExtension = 4`: Extender saldo 4 meses

**Endpoint**: `PATCH /api/empresa/politica-ausencias`

### Funcionamiento Técnico

1. **Al crear ausencia con saldo extendido**:
   - El sistema verifica primero si hay saldo extendido disponible (`carryOverDisponible`)
   - Si hay saldo extendido, se usa primero (se registra en `Ausencia.diasDesdeCarryOver`)
   - Si no hay suficiente saldo extendido, se usa el saldo del año actual

2. **Tracking en `EmpleadoSaldoAusencias`**:
   - `carryOverDisponible`: Saldo extendido disponible del año anterior
   - `carryOverUsado`: Saldo extendido ya utilizado
   - `carryOverExpiraEn`: Fecha de expiración del saldo extendido (año anterior + 4 meses)

3. **Limpieza automática**:
- Al finalizar los 4 meses, se limpia automáticamente `carryOverDisponible` y `carryOverUsado`
   - El saldo del año actual (`diasTotales`, `diasUsados`, `diasPendientes`) no se ve afectado

### Sincronización con Compensación de Horas Extra

Cuando HR compensa horas extra creando ausencias:
- Las ausencias generadas NO descuentan saldo (`descuentaSaldo = false`)
- El saldo de ausencias se actualiza correctamente, considerando carry-over si aplica
- Los campos `diasDesdeCarryOver` y `carryOverUsado` se actualizan si la ausencia usa saldo extendido

---

## 🎯 PRÓXIMOS PASOS SUGERIDOS

### Prioridad ALTA
1. **Tests de Integración** (4-6 horas)
   - Implementar suite completa de tests en `lib/calculos/__tests__/ausencias.test.ts`
   - Tests de race conditions para validación concurrente de saldos
   - Tests de ausencias multi-año
   - Tests de validaciones (medio día, motivo, periodo)

2. **Job de Cleanup de Documentos Huérfanos** (2 horas)
   - Implementar cron/job que ejecute `limpiarDocumentosHuerfanos()`
   - Configurar en `/api/cron/cleanup-documentos` (similar a revisar-solicitudes)
   - Ejecutar diariamente a las 3 AM

### Prioridad MEDIA
3. **Widget saldo en dashboard empleado** (1 hora)
4. **Monitoreo de Notificaciones Fallidas** (2 horas)
   - Implementar sistema de logs/alertas para notificaciones que fallan
   - Considerar cola de reintentos con BullMQ

### Prioridad BAJA
5. **Migración de empresas existentes a festivos** (1 hora)
6. **Optimizaciones adicionales** (según necesidad)

---

## 📚 REFERENCIAS

### Core
- Schema: `prisma/schema.prisma` - Modelo Ausencia líneas 572-637
- Constantes: `lib/constants/ausencias.ts` - TIPOS_AUTO_APROBABLES, TIPOS_DESCUENTAN_SALDO
- API Core: `app/api/ausencias/route.ts`
- API Individual: `app/api/ausencias/[id]/route.ts`
- API Masivo: `app/api/ausencias/actualizar-masivo/route.ts`

### Lógica de Negocio
- Cálculos: `lib/calculos/ausencias.ts`
  - `calcularSaldoDisponible()` - Cálculo atómico en transacciones, considera carry-over
  - `validarSaldoSuficiente()` - Validación con soporte transaccional, considera carry-over
  - `calcularDias()`, `validarPoliticasEquipo()`
  - `actualizarSaldo()` - Actualiza saldo considerando carry-over y `diasDesdeCarryOver`
- Días Laborables: `lib/calculos/dias-laborables.ts`
- Validaciones: `lib/validaciones/schemas.ts` (ausenciaCreateSchema, ausenciaUpdateSchema)
- Política Carry-Over: `app/api/empresa/politica-ausencias/route.ts`

### UI
- UI HR: `app/(dashboard)/hr/horario/ausencias/ausencias-client.tsx`
- UI HR Campaña: `app/(dashboard)/hr/horario/ausencias/campana/campana-client.tsx`
- Tabla Cuadraje: `components/vacaciones/tabla-cuadraje-campana.tsx`
- UI Empleado Mi Espacio: `app/(dashboard)/empleado/mi-espacio/tabs/ausencias-tab.tsx`
- UI Empleado Ausencias: `app/(dashboard)/empleado/horario/ausencias/ausencias-empleado-client.tsx`
- Modal Solicitar: `components/empleado/solicitar-ausencia-modal.tsx`
- Modal Gestionar: `app/(dashboard)/hr/horario/ausencias/gestionar-ausencias-modal.tsx`
- Widget Ausencias: `components/shared/ausencias-widget.tsx`
- Widget Campañas: `components/empleado/campanas-vacaciones-widget.tsx`

### Integraciones
- API Upload: `app/api/upload/route.ts`
- Documentos: `lib/documentos.ts` - limpiarDocumentosHuerfanos()
- Calendar Sync: `lib/integrations/calendar/calendar-manager.ts`
- Notificaciones: `lib/notificaciones.ts`

### Tests
- Tests Unitarios: `lib/calculos/__tests__/ausencias.test.ts`

---

## 🔒 NOTAS DE SEGURIDAD

1. **Race Conditions**: Siempre pasar `tx` (transacción) a `validarSaldoSuficiente()` y `calcularSaldoDisponible()` para que usen valores atómicos de la tabla en lugar de recalcular desde ausencias:
   ```typescript
   // ✅ CORRECTO: Pasar tx en transacción
   await prisma.$transaction(async (tx) => {
     const validacion = await validarSaldoSuficiente(empleadoId, año, diasSolicitados, tx);
     // ... actualizar saldo y crear ausencia
   });
   
   // ❌ INCORRECTO: Sin tx recalcula desde ausencias (race condition)
   const validacion = await validarSaldoSuficiente(empleadoId, año, diasSolicitados);
   ```
2. **Validación de Entrada**: Todos los endpoints validan con Zod antes de procesar
3. **Autorización**: HR Admin/Manager required para aprobar/rechazar/editar
4. **Cleanup**: Documentos huérfanos se eliminan en caso de error de validación y tras 7 días sin referencia (cron job)
5. **Campo Motivo**: Obligatorio solo para tipo `otro`, opcional para el resto

---

**Última actualización**: Enero 2025  
**Versión**: 3.5.0  
**Estado**: Sistema refactorizado con validaciones robustas, transacciones atómicas y campo único de motivo/detalles. Interfaz de campañas de vacaciones mejorada con vista unificada e interacción directa. Modal de preferencias optimizado: apertura única automática al iniciar sesión, integración con notificaciones mediante eventos, y UI unificada con selector y visualización de días en la parte superior. **NUEVO**: Política de carry-over configurable (limpiar vs extender saldo), HR/empleado pueden crear ausencias, card de saldo mejorada con fecha arriba, sincronización mejorada con compensación de horas extra. **NUEVO v3.5.0**: Tablas unificadas con `DataTable` y `AvatarCell`, EmptyState de shadcn, botones inline para pendientes, justificante como columna separada, InputGroup para reglas, notificaciones mejoradas, fix de filtros y upload S3.

