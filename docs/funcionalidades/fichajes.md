# Gestión de Fichajes y Control Horario

## Visión General

El sistema de fichajes permite a los empleados registrar su jornada laboral completa (entrada, pausas y salida), vinculado a jornadas laborales configurables (fijas o flexibles). Incluye validación automática de fichajes completos y cuadre masivo por HR para fichajes incompletos.

### Estado actual de funcionalidades clave

- **Horas extra**: ya existe el flujo completo (`GET /api/fichajes/bolsa-horas`, `POST /api/fichajes/compensar-horas`, `lib/services/compensacion-horas.ts`). No se requiere implementar nada nuevo, solo optimizaciones puntuales.
- **Widget de plantilla**: ✅ Implementado con 5 estados (Trabajando, En pausa, Ausentes, Sin fichar, Fuera de horario). Muestra todos los empleados activos en tiempo real en dashboards de HR (desktop y mobile), Manager (solo desktop) y Empleado (solo desktop). Garantiza cobertura completa - todos los empleados aparecen en alguna categoría. Ver sección "1.1 Widget de Plantilla" para más detalles.
- **Array duplicado de días**: el literal incorrecto en `app/api/fichajes/revision/route.ts` no se usa; el sistema emplea constantemente la constante correcta `dias`, por lo que no impacta cálculos.
- **Finalizar desde pausa**: la validación (`lib/calculos/fichajes.ts`) permite cerrar jornada estando en pausa para garantizar que el tiempo en descanso no compute como trabajado. Cualquier cambio exigiría decisión de negocio.
- **Correcciones de fichaje**: ✅ Implementado workflow formal con solicitud/aprobación. Empleados solicitan desde `/empleado/horario/fichajes`, HR/Manager aprueban desde la bandeja de entrada. Incluye notificaciones automáticas y auditoría completa.
- **`autoCompletado`**: sigue alimentando dashboards y auditoría de otras funcionalidades (ausencias, solicitudes). Para fichajes, la revisión ahora busca directamente en tabla `fichaje` con estado `pendiente`.
- **Slack y geolocalización**: mantienen estado "roadmap" (documentadas en esta guía), no hay código en producción que debamos retirar o activar.
- **Entrada/salida múltiples**: `validarEvento` impide reabrir entradas mientras el estado no vuelva a `sin_fichar`, por lo que no se generan múltiples ciclos el mismo día.
- **Discrepancias**: las solicitudes de corrección rechazadas permanecen visibles en el historial del fichaje para garantizar transparencia legal. No se permite su eliminación.
- **Exportación Excel**: los empleados pueden descargar su historial completo de fichajes desde `Ajustes > General > Exportar Fichajes`. Incluye fechas, eventos, horas trabajadas/pausas y discrepancias.
- **Sincronización en tiempo real**: el widget de fichaje y la tabla de registros se actualizan automáticamente cuando se ficha o se edita un evento gracias al evento global `fichaje-updated`.
- **Auditoría de ediciones y notificaciones**: cada vez que HR/Manager crea, edita o elimina un evento en nombre de un empleado:
  - ✅ Se envía notificación `fichaje_modificado` al empleado afectado
  - ✅ Notificación incluye: quién realizó el cambio, qué acción (creado/editado/eliminado), fecha del fichaje y detalles/motivo
  - ✅ Se registra el cambio con `motivoEdicion` en el modelo `fichaje_eventos`
  - ✅ Empleado puede revocar el cambio generando una discrepancia (según proceso formal de correcciones)

## Estados del Fichaje

Cada fichaje (día completo) tiene un único estado que refleja su ciclo de vida:

**Solo existen 3 estados únicos:**

- **`en_curso`** - Estado por defecto. Fichaje creado automáticamente o fichaje manual iniciado (sin completar)
- **`pendiente`** - Requiere revisión manual de HR (fichaje incompleto al cierre del día)
- **`finalizado`** - Fichaje completo y aprobado (manual o tras aprobación HR)

**Nota importante**: El fichaje representa el día completo, mientras que los eventos (entrada, pausa_inicio, pausa_fin, salida) son acciones individuales dentro de ese día.

### Workflow de Estados

1. **Inicio del día**: El empleado ficha entrada → `en_curso`
2. **Durante el día**: El empleado registra eventos → permanece `en_curso`
3. **Fin del día (CRON 23:30)**:
   - Si el fichaje tiene todos los eventos requeridos según jornada → `finalizado`
   - Si le faltan eventos o no hay fichaje para ese día laboral → `pendiente`
4. **Cuadre HR**: HR revisa fichajes `pendiente`, crea eventos faltantes → `finalizado`

**Ver sección completa "Estados del Fichaje (Día Completo)" más abajo para detalles del workflow.**

---

## Notas de implementación

- **IDs automáticos**: Prisma maneja los identificadores de `fichajes`, `fichaje_eventos` y tablas relacionadas mediante `@default(cuid())` en el esquema (`prisma/schema.prisma`). Las rutas y servicios no deben generar `id` manualmente: basta con enviar los campos de negocio a `prisma.<modelo>.create()`.
- **Flujo consistente**: Cualquier cambio que afecte la creación de fichajes debe validar que las funciones reutilizan las mismas funciones de cálculo (`lib/calculos/fichajes.ts`) para evitar lógica duplicada y mantener los estados sincronizados.
- **Normalización horaria**: Para eliminar desfases entre la zona UTC de los eventos y la vista del navegador se introdujo el helper `extraerHoraDeISO()` en `lib/utils/formatters.ts`. Todas las vistas (tablas, listas y modal) usan esta función en lugar de instanciar `Date` directamente, y hay tests de Vitest que cubren sus casos válidos/inválidos (`lib/utils/__tests__/formatters.test.ts`).


## 1. Flujo Básico de Fichaje

### Estados del Empleado (Widget de Plantilla)

El widget de plantilla en los dashboards (HR y Manager, y ahora también en el de Empleado) muestra el estado actual de todos los empleados activos en **5 categorías**:

1. **Trabajando**: Empleados que han fichado entrada, están dentro de su horario laboral, NO están en pausa, y NO han fichado salida.
   - Último evento: `entrada` o `pausa_fin`
   - Se excluyen empleados con ausencia de día completo

2. **En pausa**: Empleados que han fichado entrada y están actualmente en pausa.
   - Último evento: `pausa_inicio`
   - Se muestra como categoría separada (no incluida en "Trabajando")

3. **Ausentes**: Empleados con ausencia activa (confirmada o pendiente de aprobación) que cubre el día actual.
   - Incluye ausencias de día completo y medio día
   - Tiene prioridad sobre otros estados

4. **Sin fichar**: Empleados cuyo horario de entrada **ya ha pasado**, deberían estar trabajando según su jornada, pero aún no han fichado.
   - Requiere que sea día laboral para el empleado
   - La hora actual debe estar dentro de su horario laboral configurado

5. **Fuera de horario**: Empleados que no están en su horario laboral actual y no han fichado.
   - Incluye empleados que aún no ha llegado su hora de entrada
   - Incluye empleados cuyo horario ya pasó y no ficharon
   - También incluye empleados sin jornada configurada o con día inactivo

**Nota importante**: 
- **Todos los empleados activos** siempre aparecen en alguna de estas categorías, incluso si no tienen jornada configurada o es un día no laboral
- El sistema itera sobre **todos los empleados activos** de la empresa (o equipo en el caso de Managers), no solo sobre los "disponibles"
- La lógica garantiza cobertura completa: si un empleado no está trabajando, ausente, ni en pausa, aparecerá como "Sin fichar" o "Fuera de horario" según corresponda

### Estados del Fichaje (desde la perspectiva del empleado)

- **Sin fichar**: Estado inicial, puede iniciar jornada
- **Trabajando**: Ha fichado entrada, puede pausar o finalizar
- **En pausa**: Está en descanso, puede reanudar trabajo
- **Finalizado**: Jornada completa, solo puede fichar de nuevo al día siguiente

### Acciones Disponibles

1. **Iniciar Jornada** (entrada)
   - Registra timestamp de inicio
   - Inicia contador de tiempo trabajado
   - Métodos: Manual (widget), Slack (futuro)

2. **Pausar** (pausa_inicio)
   - Disponible solo cuando está trabajando
   - Detiene contador de tiempo trabajado
   - Inicia contador de tiempo en pausa

3. **Reanudar** (pausa_fin)
   - Disponible solo cuando está en pausa
   - Reanuda contador de tiempo trabajado
   - Detiene contador de pausa

4. **Finalizar Jornada** (salida)
   - Disponible cuando está trabajando (no en pausa)
   - Marca el final de la jornada
   - Calcula horas totales trabajadas (restando pausas)

### Cálculo de Horas Trabajadas

```
Tiempo trabajado = Σ(entrada → pausa_inicio) + Σ(pausa_fin → salida)
Tiempo en pausa = Σ(pausa_inicio → pausa_fin)
```

El sistema actualiza en tiempo real:
- Horas trabajadas hoy
- Horas por hacer según jornada
- Balance acumulado (si aplica)

---

## 1.1 Widget de Plantilla (Dashboard)

El widget de plantilla proporciona una vista en tiempo real del estado de todos los empleados activos. Está disponible en los dashboards de HR, Manager (solo desktop) y Empleado (solo desktop).

### Ubicación
- **HR Dashboard**: `/hr/dashboard`
- **Manager Dashboard**: `/manager/dashboard` (renderizado solo en desktop)
- **Empleado Dashboard**: `/empleado/dashboard` (renderizado solo en desktop)

### Funcionalidad

**Implementación**: `lib/calculos/plantilla.ts`
- `obtenerResumenPlantilla()`: Para HR, muestra todos los empleados de la empresa
- `obtenerResumenPlantillaEquipo()`: Para Managers, muestra solo empleados de su equipo

**Componente**: `components/dashboard/plantilla-widget.tsx`
- Variante `card`: Desktop con WidgetCard
- Variante `compact`: Mobile sin card, más compacto (actualmente solo se usa en HR)

### Lógica de Clasificación

El sistema clasifica **todos los empleados activos** en exactamente una de las 5 categorías:

1. **Prioridad 1 - Ausentes**: Si tienen ausencia activa (confirmada o pendiente) → Categoría "Ausentes"
2. **Prioridad 2 - Fichados**: Si han fichado entrada → Se evalúa estado actual:
   - Si último evento es `pausa_inicio` → "En pausa"
   - Si último evento es `entrada` o `pausa_fin` y no han fichado salida → "Trabajando"
3. **Prioridad 3 - No fichados**: Empleados que no han fichado → Se evalúa horario:
   - Si están programados para trabajar hoy Y su hora de entrada ya pasó Y están en horario → "Sin fichar"
   - En cualquier otro caso (fuera de horario, sin jornada, día inactivo) → "Fuera de horario"

### Cálculo de Horario Laboral

La función `estaEnHorarioLaboral()` determina si un empleado está dentro de su horario:

- **Jornada fija**: Compara hora actual con `entrada` y `salida` del día
- **Jornada flexible**: Usa rango amplio por defecto (7:00 - 22:00)
- **Sin jornada configurada**: Asume horario estándar (9:00 - 18:00)

### Garantías del Sistema

✅ **Cobertura completa**: Todos los empleados activos aparecen en alguna categoría
✅ **Sin empleados perdidos**: Incluso si no tienen jornada configurada o es día no laboral
✅ **Tiempo real**: Los estados se calculan en cada carga del dashboard
✅ **Precisión**: Considera ausencias, fichajes, y horarios configurados

### Interacción

Al hacer clic en cualquier categoría se abre un diálogo contextual dentro del propio widget con la lista completa de empleados en ese estado. Desde ahí HR/Manager consultan nombre, rol y equipo sin abandonar el dashboard. Si necesitan acciones adicionales (editar fichajes, crear ausencias, etc.) navegan manualmente a las secciones correspondientes (`/hr/horario/fichajes`, `/hr/horario/ausencias`, `/hr/organizacion/personas`, etc.).

---

## 2. Jornadas Laborales

### Tipos de Jornada

#### Jornada Flexible
- Total horas semanales (ej: 40h)
- Sin horario obligatorio
- Empleado distribuye horas libremente
- Sistema verifica cumplimiento de horas

#### Jornada Fija
- Horario específico por día
- Entrada y salida definidas (ej: 9:00-18:00)
- Puede incluir pausa obligatoria
- Sistema verifica cumplimiento de horario

### Configuración de Jornada

Cada jornada puede tener:

```json
{
  "nombre": "Jornada Completa 40h",
  "horasSemanales": 40,
  "config": {
    "lunes": { "activo": true, "entrada": "09:00", "salida": "18:00" },
    "martes": { "activo": true, "entrada": "09:00", "salida": "18:00" },
    ...
    "sabado": { "activo": false },
    "domingo": { "activo": false },
    "limiteInferior": "08:00",  // No puede fichar antes
    "limiteSuperior": "20:00"    // No puede fichar después
  }
}
```

### Jerarquía de Asignación

La jornada del empleado se determina por prioridad:

1. **Jornada individual** (asignada a empleado específico)
2. **Jornada de equipo** (asignada a todo el equipo)
3. **Jornada empresa** (default para todos)

### Jornada por Defecto

**✅ Todos los empleados activos tienen jornada asignada automáticamente:**
- Al crear un empleado, si no se especifica `jornadaId`, se asigna la jornada predefinida de la empresa (`esPredefinida: true`)
- Si un empleado activo no tiene jornada, el sistema asigna automáticamente la jornada por defecto
- Endpoint: `POST /api/jornadas/asegurar-empleados` (HR Admin) para asignar jornadas a empleados existentes sin jornada
- Función: `lib/jornadas/asegurar-jornada-empleados.ts` - `asegurarJornadaEmpleados(empresaId)`

### Gestión desde HR

#### Crear Jornada
- Nombre descriptivo
- Tipo (fija/flexible)
- Horas semanales
- Horarios por día (si es fija)
- Límites opcionales (no fichar antes/después de X hora)
- Marcar como predefinida (`esPredefinida: true`) para que sea la jornada por defecto

#### Asignar Jornada
- **Toda la empresa**: Aplica a todos los empleados activos
- **Por equipos**: Aplica a todos los miembros de equipos seleccionados
- **Individual**: Aplica a empleados específicos

---

## 3. Balance de Horas (Saldo de Horas)

### Cálculo

```
Balance = Σ(Horas trabajadas reales) - Σ(Horas esperadas según jornada)
```

**⚠️ IMPORTANTE**: Las horas trabajadas **descuentan automáticamente el tiempo en pausa**. El cálculo suma solo el tiempo entre `entrada`/`pausa_fin` y `pausa_inicio`/`salida`, excluyendo períodos de descanso.

Se calcula para:
- **Diario**: Horas del día vs esperadas ese día
- **Semanal**: Acumulado de la semana vs esperado semanal
- **Mensual**: Acumulado del mes vs esperado mensual

### Visualización

- Tablas de fichajes muestran columnas: **Horas Trabajadas**, **Horas Esperadas**, **Balance**
- Widget muestra horas trabajadas vs esperadas
- Balance acumulado (+ horas extras o - horas pendientes)
- **Actualización automática**: El balance se recalcula automáticamente al:
  - Editar eventos de fichaje
  - Cuadrar fichajes pendientes
  - Crear nuevos eventos
  - Modificar fichajes desde cualquier flujo
  - Aprobar/rechazar fichajes (✅ Actualizado 2025-12-02)
- **Actualización en tiempo real**: ✅ La tabla se actualiza automáticamente mediante eventos `fichaje-updated`
  - Los cambios se reflejan instantáneamente sin necesidad de refrescar manualmente
  - El sistema escucha eventos del widget de fichaje y otros componentes
  - Garantiza que los datos mostrados siempre reflejen el estado actual de la base de datos

### Renovar Saldo de Horas

**Funcionalidad disponible para HR Admin** en el espacio individual del empleado (`/hr/organizacion/personas/[id]` → Tab Fichajes):

- **Campo `saldoRenovadoDesde`**: Fecha desde la cual se calcula el saldo (almacenado en `Empleado.saldoRenovadoDesde`)
- **Botón "Renovar saldo"**: Resetea el contador de horas trabajadas, esperadas y saldo para que empiecen a contar desde hoy
- **Confirmación**: Muestra diálogo de confirmación antes de renovar
- **No destructivo**: No elimina fichajes históricos, solo cambia la fecha base de cálculo
- **Endpoint**: `POST /api/empleados/[id]/renovar-saldo` (HR Admin)
- **Consulta**: `GET /api/empleados/[id]/renovar-saldo` para obtener fecha de última renovación
- **Renovación automática**: Cron `POST /api/cron/renovar-saldo-horas` se ejecuta cada 1 de enero (00:10 UTC) y actualiza `saldoRenovadoDesde` de todos los empleados activos. Puede forzarse con `?force=1`.

---

## 4. Validación de Fichajes Completos

### Sistema de Validación

El sistema valida automáticamente si un fichaje está completo basándose en la jornada laboral del empleado. No utiliza IA, sino reglas determinísticas según el tipo de jornada.

### Jornadas Fijas

**Eventos requeridos:**
- `entrada` (hora de entrada configurada)
- `salida` (hora de salida configurada)
- `pausa_inicio` y `pausa_fin` (SOLO si están configuradas en la jornada)

**Ejemplo de configuración:**
```json
{
  "tipo": "fija",
  "lunes": {
    "activo": true,
    "entrada": "09:00",
    "salida": "18:00",
    "pausa_inicio": "14:00",
    "pausa_fin": "15:00"
  }
}
```

### Jornadas Flexibles

**Eventos requeridos:**
- `entrada` (el empleado decide cuándo)
- `salida` (según horas semanales / días activos)
- `pausa_inicio` y `pausa_fin` (SOLO si `descansoMinimo` está configurado)

**Ejemplo de configuración:**
```json
{
  "tipo": "flexible",
  "descansoMinimo": "00:30",
  "lunes": { "activo": true },
  "martes": { "activo": true }
}
```

### Ausencias de Medio Día

El sistema soporta ausencias de medio día con campo `periodo` (`mañana` o `tarde`):

Si un empleado tiene ausencia de medio día:
- **Ausencia de mañana** (`periodo='manana'`): No se requiere `entrada` ni pausas de la mañana
- **Ausencia de tarde** (`periodo='tarde'`): No se requiere `salida` ni pausas de la tarde

Los eventos requeridos se reducen proporcionalmente.

**Modelo de datos:**
```prisma
model Ausencia {
  // ...
  medioDia Boolean @default(false)
  periodo  PeriodoMedioDia? // 'manana' | 'tarde' (solo cuando medioDia=true)
  // ...
}

enum PeriodoMedioDia {
  manana // Ausencia en la mañana (no ficha entrada)
  tarde  // Ausencia en la tarde (no ficha salida)
}
```

### CRON Nocturno (Cierre de Jornadas)

**Ejecución**: Todas las noches a las 23:30 UTC (00:30 España invierno)

**Estado**: ✅ Implementado en servidor Hetzner (crontab)

**Configuración requerida**:
- Variable de entorno `CRON_SECRET` en el servidor
- Variable de entorno `APP_URL` en el servidor (URL de producción)
- Ejecutar `scripts/hetzner/setup-cron.sh` para instalar el cron job

**Proceso:**
1. Para cada empresa activa, procesa el día anterior
2. Para cada empleado con día laboral:
   - Si **NO tiene fichaje**: Crea fichaje con estado `pendiente` y notifica a HR
   - Si **tiene fichaje `en_curso`**:
     - Valida si está completo según su jornada
     - Si completo → estado `finalizado`
     - Si incompleto → estado `pendiente` y notifica a HR

**Notificaciones**: El CRON crea notificaciones automáticas para HR Admin cuando marca fichajes como `pendiente`, alertando de la necesidad de revisión.

**Archivos**:
- Endpoint: `app/api/cron/clasificar-fichajes/route.ts`
- Script de instalación: `scripts/hetzner/setup-cron.sh`
- Logs: `/var/log/clousadmin-cron.log` en el servidor

### Cuadrar Fichajes (HR) ⭐ REFACTORIZADO

**Acceso**: Solo HR Admin (pantalla completa en `/hr/horario/fichajes/cuadrar`)

**Interfaz de Pantalla Completa:**
- **Header limpio**: Enlace "← Volver a fichajes" en lugar de subtítulo
- **Toolbar embebida**: Barra de acciones a la derecha con:
  - Contador de "Pendientes"
  - Botón "Seleccionar todos" (sin bordes, estilo texto)
  - Botón "Descartar días vacíos" (filtra y excluye días sin fichajes)
  - Botón "Cuadrar (X)" con contador de seleccionados
- **Tabla plana optimizada**: Eliminado acordeón, lista ordenada por empleado y fecha
  - Iconos visuales: Círculo punteado (○) para días vacíos, Alerta (⚠) para incompletos
  - Fecha sin año (formato: "dd MMM")
  - Columna de estado con razón de pendencia
  - Acciones: "Editar" y "Ausencia" (abre modal de solicitud de ausencia)
- **Filtros unificados**: Usa componentes `DataFilters` y `DateRangeControls` para búsqueda, estado, equipo y rango de fechas

**Funcionalidad:**
1. **Listado inteligente**: Muestra fichajes `pendiente` con filtros avanzados (equipo, búsqueda, rango de fechas)
   - ✅ **CORRECTO 2025-12-03**: Solo días VENCIDOS (excluye el día actual)
   - ✅ Lazy recovery procesa desde `offset = 1` (excluye hoy)
   - ✅ Los empleados que no fichan aparecen al día siguiente del CRON nocturno (23:30)
   - ✅ Fallback robusto si el CRON nocturno falla (procesa últimos 3 días vencidos)
2. **Vista descriptiva**: Para cada fichaje muestra:
   - **Indicador visual**: Icono diferenciando días vacíos (sin eventos) vs incompletos (con eventos parciales)
   - Eventos registrados (si existen) con hora formateada
   - Eventos faltantes como badges
   - Razón de la pendencia
   - Información del equipo del empleado
3. **Cuadre masivo inteligente**: 
   - Seleccionar múltiples fichajes con checkboxes
   - Botón "Cuadrar" crea eventos faltantes según jornada
   - **Lógica de pausas dinámicas**: Si el empleado fichó inicio de pausa (ej. 14:15), el sistema calcula el fin respetando la duración de la jornada (ej. 1h → 15:15), en lugar de usar horario fijo
   - Considera ausencias de medio día (no crea eventos para períodos ausentes)
   - Marca como `finalizado` y registra auditoría
   - Notifica al empleado del fichaje resuelto
   - **Promedios históricos**: Antes de generar eventos por jornada fija o flexible, el servicio intenta construir los timestamps usando la media de los últimos días con eventos reales del mismo empleado y jornada. Solo se promedian fichajes que ya contienen eventos y se ajusta la salida si supera las horas esperadas. Si no hay suficientes históricos se cae al cálculo tradicional; ayudas a HR a proponer horarios que reflejan la práctica reciente del empleado.
4. **Descartar días vacíos**: Botón para excluir masivamente días sin fichajes (útil cuando no se trabajó)
5. **Edición individual**: Botón "Editar" abre modal para modificar eventos manualmente
6. **Registrar ausencia**: Botón "Ausencia" permite crear ausencia directamente desde la revisión

**Cálculo Inteligente de Pausas:**
- **Antes**: Usaba siempre horarios fijos de la jornada (ej. 14:00-15:00)
- **Ahora**: Si existe un evento `pausa_inicio` real, calcula `pausa_fin` relativo al inicio real + duración configurada
- Aplicado tanto en preview (GET) como en cuadre (POST)
- Ejemplo: Empleado fichó pausa a las 14:15, jornada tiene 1h de descanso → propone fin a las 15:15

**Auditoría de cuadre:**
- `cuadradoMasivamente`: Boolean (true si fue cuadrado desde esta funcionalidad)
- `cuadradoPor`: ID del usuario que cuadró
- `cuadradoEn`: Timestamp del cuadre

**Nota importante**: Los EVENTOS de fichaje (`FichajeEvento`) NO tienen estado. Solo el fichaje completo (`Fichaje`) tiene estado. `aprobado` y `rechazado` NO son estados, son resultados del workflow que se registran en campos de aprobación (`aprobadoPor`, `fechaAprobacion`, `motivoRechazo`).

### Compensación de Horas Extra desde Fichajes ⭐ NUEVO

- **Botón dedicado en `/hr/horario/fichajes`**: desde la vista admin se puede abrir el diálogo "Compensar horas" sin depender de un evento de nómina.
- **Selector de período**: HR selecciona mes/año para consultar la bolsa de horas disponible (por defecto el mes mostrado en la tabla).
- **Fuente de datos**: `GET /api/fichajes/bolsa-horas?mes=X&anio=Y` calcula balances mensuales vía `calcularBalanceMensual` y solo devuelve empleados con saldo positivo.
- **Acción masiva**: `POST /api/fichajes/compensar-horas` replica la lógica de nóminas:
  - `tipoCompensacion = 'ausencia'` → crea ausencia auto-aprobada, incrementa saldo (`EmpleadoSaldoAusencias`) y registra `CompensacionHoraExtra`.
  - `tipoCompensacion = 'nomina'` → crea registro `CompensacionHoraExtra` aprobado para incluirlo en la próxima nómina.
- **Reutilización**: comparte el mismo servicio `procesarCompensacionHorasExtra` usado por `POST /api/nominas/eventos/[id]/compensar-horas-masivo`, garantizando reglas idénticas (validaciones, auditoría, logs).

---

## 5. Edición y Creación de Fichajes

### Modal Unificado de Fichajes

**Componente**: `components/shared/fichajes/fichaje-modal.tsx`

Un único modal reutilizable para **crear** y **editar** fichajes con múltiples eventos. Se adapta automáticamente según el contexto y modo de uso.

#### Características Principales

- **Múltiples eventos**: Permite añadir tantos eventos como sean necesarios (entrada, pausa inicio/fin, salida) en una sola operación
- **Layout compacto**: Cada evento ocupa una sola línea horizontal con:
  - Selector de tipo de evento
  - Input de hora
  - Botón de eliminar
- **Validación anti-futuro**:
  - ✅ Permite editar fichajes del **día actual (hoy)**
  - ❌ Bloquea edición de fechas futuras (mañana en adelante)
  - ❌ No permite crear eventos con hora futura
  - Normaliza fechas a medianoche para comparación precisa
- **Indicador de edición**: Muestra qué eventos fueron previamente editados
- **Motivo opcional**: Campo de texto para justificar el fichaje/cambio (se elimina banner de discrepancias para empleados)

#### Modos de Operación

**Modo Crear** (`modo="crear"`):
- Permite añadir múltiples eventos desde cero
- Fecha editable solo para HR/Manager (empleados usan fecha actual)
- Empleado: Crea solicitud que requiere aprobación
- HR/Manager: Guarda directamente sin solicitud

**Modo Editar** (`modo="editar"`):
- Carga eventos existentes del fichaje del día
- Permite modificar tipo y hora de eventos existentes
- Permite añadir nuevos eventos al día
- Permite eliminar eventos (marcados para eliminación al guardar)
- Fecha no editable (siempre del fichaje existente)
- **Sin auto-guardado**: Los cambios se acumulan localmente y solo se persisten al hacer click en "Guardar Cambios"
- Al guardar, se recalculan `horasTrabajadas` y `horasEnPausa` del fichaje, y se actualiza el balance automáticamente
- **Tracking de cambios**: El sistema rastrea eventos nuevos, modificados y eliminados, aplicándolos en orden al guardar

#### Contextos y Permisos

| Contexto | Puede crear fichajes | Puede editar fichajes | Fecha editable | Empleado editable |
|----------|---------------------|----------------------|----------------|-------------------|
| `empleado` | ✅ (solicitud) | ✅ (propios) | ❌ | ❌ |
| `manager` | ✅ (directo, su equipo) | ✅ (su equipo) | ✅ (solo crear) | ❌ |
| `hr_admin` | ✅ (directo, todos) | ✅ (todos) | ✅ (solo crear) | ✅ (solo crear) |

#### Lugares de Uso

1. **Widget de Fichaje** (`components/shared/fichaje-widget.tsx`):
   - Empleados pueden crear fichajes manuales (solicitud)
   - Contexto: `empleado`, modo: `crear`

2. **Mi Espacio - Tab Fichajes** (`components/shared/mi-espacio/fichajes-tab.tsx`):
   - Empleados: Crear solicitudes y editar propios fichajes
   - HR/Manager: Crear fichajes directos y editar cualquier fichaje
   - Contexto: `empleado`/`manager`/`hr_admin`, modo: `crear`/`editar`

3. **Vista HR de Fichajes** (`app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx`):
   - HR puede editar cualquier fichaje desde la tabla
   - **Tabla unificada**: Usa `DataTable` compartido con `AvatarCell` para empleados
   - **Filtros avanzados**: Búsqueda por empleado, filtro por estado y por equipo
   - **Controles de fecha unificados**: Navegación por día/semana/mes con diseño compacto
   - **EmptyState de shadcn**: Estados vacíos usan componente estándar con layout `table`
   - Contexto: `hr_admin`, modo: `editar`

4. **Pantalla Cuadrar Fichajes** (`app/(dashboard)/hr/horario/fichajes/cuadrar/cuadrar-fichajes-client.tsx`):
   - Pantalla completa (refactorizada desde modal)
   - HR puede editar fichajes pendientes antes de cuadrar
   - **Tabla plana optimizada**: Sin acordeón, con iconos de estado y acciones mejoradas
   - Contexto: `hr_admin`, modo: `editar`

5. **Espacio Individual de Empleado** (`app/(dashboard)/hr/organizacion/personas/[id]`):
   - HR puede crear y editar fichajes del empleado
   - Contexto: `hr_admin`, modo: `crear`/`editar`

#### Endpoints Utilizados

- **Crear fichaje directo** (HR/Manager): `POST /api/fichajes` + `POST /api/fichajes/eventos`
  - `POST /api/fichajes/eventos`: Si el editor es diferente al empleado dueño, envía notificación `fichaje_modificado` con acción `creado`
- **Crear solicitud** (Empleado): `POST /api/solicitudes` (tipo: `fichaje_manual`)
- **Editar fichaje**:
  - `PATCH /api/fichajes/eventos/[id]`: Actualiza tipo/hora de evento existente. **Notifica** si editor ≠ empleado (acción `editado`)
  - `POST /api/fichajes/eventos`: Crea nuevo evento. **Notifica** si editor ≠ empleado (acción `creado`)
  - `DELETE /api/fichajes/eventos/[id]`: Elimina evento. **Notifica** si editor ≠ empleado (acción `eliminado`)
  - Todos recalculan `horasTrabajadas` y `horasEnPausa` automáticamente
- **Cargar fichaje**: `GET /api/fichajes/[id]`

**Notificaciones automáticas (Dic 2025)**:
- ✅ Todas las operaciones de edición (PATCH/POST/DELETE) verifican si `session.user.empleadoId !== evento.fichaje.empleadoId`
- ✅ Si es diferente, crean notificación `fichaje_modificado` con datos completos del cambio
- ✅ Empleado afectado recibe notificación en bandeja de entrada
- ✅ Sistema de revocación disponible mediante solicitudes de corrección

### Solicitudes de corrección (flujo formal)
- **Empleados**: desde `/empleado/horario/fichajes` envían una solicitud indicando motivo y nuevos valores. Endpoint: `POST /api/fichajes/correcciones`.
- **HR / Manager**: revisan las solicitudes pendientes desde la **bandeja de entrada** y deciden aprobar/rechazar (`PATCH /api/fichajes/correcciones/[id]`).
- **Aplicación automática**: al aprobar se actualiza el evento correspondiente, se recalculan horas y se notifica al empleado (`fichaje_resuelto`). Las solicitudes rechazadas guardan motivo histórico.
- **Auditoría**: el modelo `SolicitudCorreccionFichaje` conserva estado, payload y quién revisó (`revisadaPor`, `revisadaEn`).

---

## 6. Validaciones

### Al Fichar

✅ Empleado debe tener jornada asignada
✅ Timestamp dentro de límites superior/inferior (si están configurados)
✅ No puede fichar entrada si ya tiene entrada activa sin salida
✅ No puede pausar si no está trabajando
✅ No puede reanudar si no está en pausa
✅ No puede finalizar si no tiene entrada o está en pausa

#### Dialog de Descanso Incompleto

**Componente**: `components/shared/fichaje-widget.tsx` (líneas 827-886)

Cuando un empleado intenta finalizar su jornada sin registrar el descanso requerido (o con descanso incompleto), el sistema muestra un `AlertDialog` informativo:

**Comportamiento**:
1. Backend retorna error `DESCANSO_INCOMPLETO` con metadatos:
   - `tienePausaInicio`: boolean
   - `tienePausaFin`: boolean
   - `fichajeId`: string

2. Widget carga eventos del estado (optimizado, sin fetch adicional) y muestra:
   - **Título**: "Descanso incompleto" con icono de alerta naranja
   - **Mensaje contextual**:
     - "no has registrado ninguna pausa" (si no hay pausa_inicio ni pausa_fin)
     - "no has registrado el fin de la pausa" (si hay pausa_inicio pero no pausa_fin)
     - "la pausa está incompleta" (otros casos)
   - **Lista de eventos registrados**: Muestra tipo y hora de cada evento (Entrada, Inicio de pausa, Fin de pausa, Salida)
   - **Botones de acción**:
     - `Confirmar`: Finaliza la jornada sin descanso (llama `handleConfirmarSinDescanso`)
     - `Editar eventos`: Abre el modal de edición para corregir (llama `handleEditarEventos`)

**UX optimizada (Dic 2025)**:
- ✅ Muestra eventos existentes con sus horas formateadas
- ✅ Botón principal dice "Confirmar" (no "Confirmar así")
- ✅ Sin botón "Cancelar" en footer (se cierra con click fuera)
- ✅ Eventos cargados desde estado del widget (performance mejorada)

### Al Validar (CRON o Cuadrar)

✅ Solo días laborables (excluir festivos y fines de semana)
✅ Solo días sin ausencia de día completo (ausencias de medio día SÍ requieren fichaje)
✅ Validar eventos según tipo de jornada (fija/flexible)
✅ Considerar ausencias de medio día al validar eventos requeridos
✅ Pausas obligatorias solo si están configuradas (`pausa_inicio`/`pausa_fin` o `descansoMinimo`)

### Al Aprobar/Cuadrar

✅ Manager solo puede cuadrar fichajes de su equipo
✅ HR Admin puede cuadrar fichajes de cualquier empleado
✅ Solo se pueden cuadrar fichajes con estado `pendiente` o `en_curso`
✅ Al cuadrar, registrar auditoría completa (quién, cuándo, masivo/individual)

---

## 7. Vista Individual de Fichajes

### Espacio del Empleado (`/empleado/mi-espacio` → Tab Fichajes)

**Cards de resumen (horizontal):**
1. **Card "Tiempo"**:
   - Tiempo trabajado (horas acumuladas)
   - Tiempo esperado (horas esperadas según jornada)
   - Saldo de horas (diferencia entre trabajado y esperado)
   - **Rango de fechas**: Muestra "Desde [fecha]" en la esquina superior derecha (basado en `saldoRenovadoDesde` o `fechaAlta`)
   - **Sin botón renovar**: Los empleados no pueden renovar su propio saldo

2. **Card "Horarios"**:
   - Hora media de entrada
   - Hora media de salida
   - Horas medias trabajadas

**Tabla de fichajes**: Muestra todos los fichajes con columnas: Fecha, Entrada, Salida, Horas Trabajadas, Tiempo Pendiente (horas faltantes por trabajar), Balance, Estado

### Espacio HR (`/hr/organizacion/personas/[id]` → Tab Fichajes)

**Misma estructura que empleado, pero con:**
- **Botón "Renovar saldo"**: Visible solo para HR Admin, permite resetear el contador desde hoy
- **Botón "Añadir fichaje"**: HR puede añadir fichajes directamente (se guardan sin solicitud)

---

## 8. Permisos por Rol

| Acción | Empleado | Manager | HR Admin |
|--------|----------|---------|----------|
| Fichar (entrada/pausa/salida) | ✅ | ✅ | ✅ |
| Ver propios fichajes | ✅ | ✅ | ✅ |
| Ver fichajes de equipo | ❌ | ✅ | ✅ |
| Ver todos los fichajes | ❌ | ❌ | ✅ |
| Solicitar corrección de fichaje | ✅ | ✅ | ❌ |
| Solicitar fichaje manual | ✅ | ✅ | ❌ |
| Crear fichaje directamente | ❌ | ✅ (su equipo) | ✅ (todos) |
| Editar fichajes propios | ✅ | ✅ | ✅ |
| Editar fichajes de equipo | ❌ | ✅ | ✅ |
| Editar cualquier fichaje | ❌ | ❌ | ✅ |
| Aprobar fichajes | ❌ | ✅ (su equipo) | ✅ (todos) |
| Cuadrar fichajes masivamente | ❌ | ✅ (su equipo) | ✅ (todos) |
| Renovar saldo de horas | ❌ | ❌ | ✅ |
| Configurar jornadas | ❌ | ❌ | ✅ |
| Asignar jornadas | ❌ | ❌ | ✅ |

---

## 9. Integraciones Futuras

### Slack (Fase 3+)

**Funcionalidad:**
- Detección automática de estado Slack (away → active)
- Bot envía mensaje interactivo cuando empleado se conecta sin haber fichado
- Empleado confirma fichaje con 1 click
- Registro con timestamp exacto del cambio de estado
- Comandos slash: `/fichar`, `/pausa`, `/salir`

**Validación legal:**
- Empleado debe confirmar consciente mente (cumple requisitos legales)
- No es fichaje 100% automático sin intervención

---

## 10. Troubleshooting

### Problema: "Ya tienes una jornada iniciada" cuando no es cierto

**Causa**: Comparación incorrecta de fechas (fecha con hora vs fecha sin hora)

**Solución**: Asegurar que las consultas usan rango de fecha:
```typescript
const hoy = new Date();
hoy.setHours(0, 0, 0, 0);
const mañana = new Date(hoy.getTime() + 24 * 60 * 60 * 1000);

await prisma.fichaje.findMany({
  where: {
    empleadoId,
    fecha: { gte: hoy, lt: mañana },
  },
});
```

### Problema: Horas trabajadas no restan pausas

**Causa**: Cálculo simplificado que no considera pausas

**Solución**: Implementar cálculo correcto:
```typescript
let horasTotales = 0;
for cada fichaje:
  - entrada → inicio trabajo
  - pausa_inicio → sumar tiempo trabajado hasta ahora, detener
  - pausa_fin → reiniciar trabajo
  - salida → sumar tiempo trabajado final
```

### Problema: Empleado sin jornada asignada

**Causa**: Empleado creado sin asignar jornada

**Solución**: Asegurar que todos los empleados tienen jornada default en creación:
```typescript
await prisma.empleado.create({
  data: {
    ...otrosDatos,
    jornadaId: jornadaDefault.id,
  },
});
```

---

## 11. Modelos de Datos

### Fichaje

```prisma
model Fichaje {
  id              String   @id @default(cuid())
  empresaId       String
  empleadoId      String
  jornadaId       String?  // Jornada del empleado al momento del fichaje (para filtrar históricos)
  fecha           DateTime @db.Date
  
  // Estado del fichaje completo (UN SOLO ESTADO para todo el día)
  estado          String   @default("en_curso") @db.VarChar(50)
  // Valores (3 estados únicos): 'en_curso', 'pendiente', 'finalizado'
  
  // Cálculos agregados (se actualizan automáticamente al modificar eventos)
  horasTrabajadas Decimal?  @db.Decimal(5, 2) // Descuenta pausas automáticamente
  horasEnPausa    Decimal?  @db.Decimal(5, 2)
  
  // Auditoría de cuadre masivo
  cuadradoMasivamente Boolean   @default(false)
  cuadradoPor         String?
  cuadradoEn          DateTime?
  
  // Legacy (mantener por compatibilidad aunque deprecated)
  autoCompletado  Boolean   @default(false)
  fechaAprobacion DateTime? // Compatibilidad histórica; no se usa en nuevos flujos

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  eventos         FichajeEvento[]
  jornada         jornadas? @relation(fields: [jornadaId], references: [id])
  
  @@unique([empleadoId, fecha])
  @@index([empleadoId, jornadaId, estado, fecha]) // Índice para queries de históricos
}
```

### Empleado (campos relacionados)

```prisma
model Empleado {
  // ... otros campos
  jornadaId         String? // Jornada asignada (obligatoria para empleados activos)
  saldoRenovadoDesde DateTime? // Fecha desde la cual se calcula el saldo de horas
  // ... otros campos
}

model FichajeEvento {
  id              String   @id @default(cuid())
  fichajeId       String
  tipo            String   @db.VarChar(50) // 'entrada', 'pausa_inicio', 'pausa_fin', 'salida'
  hora            DateTime @db.Timestamptz(6)
  ubicacion       String?  @db.Text
  editado         Boolean  @default(false)
  motivoEdicion   String?  @db.Text
  horaOriginal    DateTime? @db.Timestamptz(6)
  editadoPor      String?
  createdAt       DateTime @default(now())
  
  // Relations
  fichaje         Fichaje  @relation(fields: [fichajeId], references: [id], onDelete: Cascade)
}
```

### Jornada

```prisma
model Jornada {
  id              String   @id @default(uuid())
  empresaId       String
  nombre          String   // 'Jornada Completa 40h'
  horasSemanales  Decimal  // 40.00
  config          Json     // Ejemplos: fija { lunes: { activo, entrada, pausa_inicio?, pausa_fin?, salida }, ... } | flexible { tipo: "flexible", descansoMinimo?: "HH:mm", lunes: { activo: true }, ... }
  esPredefinida   Boolean  @default(false)
  activa          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## 📡 API ENDPOINTS

### Fichajes (Día Completo)

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/fichajes` | GET | Lista fichajes con filtros (empleadoId, fecha, fechaInicio, fechaFin, estado, equipoId, propios). Incluye `horasEsperadas` y `balance` calculados. **Filtro por equipo**: Usa la relación `EmpleadoEquipo` (N:N) para filtrar correctamente. La respuesta incluye el primer equipo del empleado en `empleado.equipo` | ✅ |
| `/api/fichajes` | POST | Crea evento en fichaje del día (entrada, pausa_inicio, pausa_fin, salida). Crea fichaje si no existe | ✅ |
| `/api/fichajes/[id]` | GET | Obtiene fichaje específico con todos sus eventos | ✅ |
| `/api/fichajes/[id]` | PATCH | Aprueba/rechaza fichaje (`accion: 'aprobar'|'rechazar'`) | HR/Manager |

### Eventos de Fichaje

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/fichajes/eventos` | POST | Crea nuevo evento en un fichaje existente | ✅ |
| `/api/fichajes/eventos/[id]` | PATCH | Edita evento (tipo, hora, motivoEdicion) | ✅ |
| `/api/fichajes/eventos/[id]` | DELETE | Elimina evento del fichaje | ✅ |

### Cuadrar Fichajes

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/fichajes/revision` | GET | Obtener fichajes pendientes de revisión. Busca directamente en tabla `fichaje` con estado `pendiente` de días anteriores. **Parámetros**: `fechaInicio`, `fechaFin`, `equipoId`, `search` (búsqueda por nombre empleado). **Nuevo**: Cálculo dinámico de pausas (respeta inicio real + duración jornada) | HR |
| `/api/fichajes/revision` | POST | Actualizar fichajes individuales desde pantalla de revisión. Soporta `accion: 'actualizar'` (cuadrar) y `accion: 'descartar'` (marcar días vacíos como finalizados) | HR |
| `/api/fichajes/cuadrar` | POST | Cuadrar fichajes masivamente. **Nuevo (2025-12-04)**: Usa promedios históricos de los últimos 5 días con eventos del empleado para calcular eventos propuestos. **Límite**: Máximo 50 fichajes por request. Crea eventos faltantes según promedio histórico (si disponible) o jornada con **lógica de pausas dinámicas** y marca como `finalizado`. **Body**: `{ fichajeIds: string[] }` o `{ descartarIds: string[] }` para descartar días vacíos | HR |

### Estadísticas

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/fichajes/stats` | GET | Obtiene estadísticas de fichajes (horas trabajadas, balance, etc.) | ✅ |

### Renovar Saldo de Horas

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/empleados/[id]/renovar-saldo` | POST | Renueva el saldo de horas del empleado (resetea `saldoRenovadoDesde` a hoy) | HR Admin |
| `/api/empleados/[id]/renovar-saldo` | GET | Obtiene la fecha de última renovación del saldo | ✅ |

### Exportación de Fichajes

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/empleados/me/fichajes/export` | GET | Exporta historial completo de fichajes del empleado a Excel (.xlsx). Parámetro: `anio` (YYYY). Incluye: fecha, estado, eventos, horas trabajadas, tiempo en pausa, discrepancias | Empleado |

### Jornadas

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/jornadas/asegurar-empleados` | POST | Asigna jornada por defecto a todos los empleados activos sin jornada | HR Admin |

### CRON Jobs

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/cron/clasificar-fichajes` | POST | CRON job nocturno (23:30). Crea fichajes pendientes y valida fichajes en curso | CRON_SECRET |

**Nota**: Los endpoints CRON requieren `CRON_SECRET` en headers para protección.

### ProcesamientoMarcajes

   ```prisma
model ProcesamientoMarcajes {
  id                String   @id @default(uuid())
  empresaId         String
  mes               Int
  año               Int
  ejecutadoPor      String
  ejecutadoEn       DateTime @default(now())
  totalEmpleados    Int
  totalAutocompletados Int
  totalAlertas      Int
  totalAprobados    Int      @default(0)
  totalPendientes   Int      @default(0)
  finalizado        Boolean  @default(false)
  fechaFinalizacion DateTime?
}
```

---

## 🔍 EJEMPLOS DE USO

### Fichar Entrada (Empleado)

```typescript
// POST /api/fichajes
{
  "tipo": "entrada",
  "fecha": "2025-11-01", // Opcional, default hoy
  "hora": "09:00", // Opcional, default ahora
  "ubicacion": "Oficina Madrid"
}

// Sistema automáticamente:
// 1. Busca fichaje del día (o crea uno nuevo con estado 'en_curso')
// 2. Crea evento FichajeEvento tipo 'entrada'
// 3. Valida que no exista entrada previa sin salida
// 4. Valida límites de jornada (si configurados)
// 5. Actualiza horasTrabajadas del fichaje
```

### Obtener Fichajes Pendientes (HR)

```typescript
// GET /api/fichajes/revision?fechaInicio=2025-11-01&fechaFin=2025-11-30&equipoId=equipo-uuid&search=Juan
// Busca directamente en tabla fichaje con estado 'pendiente' de días anteriores
// Parámetros opcionales:
//   - fechaInicio: Fecha de inicio del rango (ISO string)
//   - fechaFin: Fecha de fin del rango (ISO string)
//   - equipoId: Filtrar por equipo del empleado
//   - search: Búsqueda por nombre o apellidos del empleado (case-insensitive)

// Sistema retorna:
{
  "fichajes": [
    {
      "id": "fichaje-uuid", // ID del fichaje (usado para cuadrar)
      "fichajeId": "fichaje-uuid",
      "empleadoId": "empleado-uuid",
      "empleadoNombre": "Juan Pérez",
      "equipoId": "equipo-uuid",
      "equipoNombre": "Desarrollo",
      "tieneEventosRegistrados": true, // true = incompleto, false = vacío
      "fecha": "2025-11-06T00:00:00.000Z",
      "eventos": [
        // Vista previa: eventos propuestos según jornada (azul) o registrados si existen
        // Si existe pausa_inicio real, pausa_fin se calcula dinámicamente
        { "tipo": "entrada", "hora": "2025-11-06T09:00:00.000Z", "origen": "propuesto" },
        { "tipo": "pausa_inicio", "hora": "2025-11-06T14:15:00.000Z", "origen": "registrado" },
        { "tipo": "pausa_fin", "hora": "2025-11-06T15:15:00.000Z", "origen": "propuesto" }, // Calculado: 14:15 + 1h
        { "tipo": "salida", "hora": "2025-11-06T18:00:00.000Z", "origen": "propuesto" }
      ],
      "eventosRegistrados": [
        // Eventos que el empleado ya fichó (si existen)
        { "tipo": "pausa_inicio", "hora": "2025-11-06T14:15:00.000Z" }
      ],
      "razon": "Faltan eventos: entrada, pausa_fin, salida",
      "eventosFaltantes": ["entrada", "pausa_fin", "salida"]
    }
  ]
}
```

### Cuadrar Fichajes Masivamente (HR)

```typescript
// POST /api/fichajes/cuadrar
// Opción 1: Cuadrar fichajes seleccionados
{
  "fichajeIds": ["fichaje-uuid-1", "fichaje-uuid-2", "fichaje-uuid-3"]
}

// Opción 2: Descartar días vacíos (sin eventos)
{
  "descartarIds": ["fichaje-uuid-4", "fichaje-uuid-5"]
}

// Sistema automáticamente:
// 1. Verifica ausencias de medio día del empleado
// 2. Para cada fichaje, valida qué eventos faltan (considerando ausencias)
// 3. **NUEVO (2025-12-04)**: Intenta calcular eventos usando promedios históricos:
//    - Busca los últimos 5 días con eventos registrados del mismo empleado
//    - Filtra por misma jornada (jornadaId) para garantizar consistencia
//    - Calcula promedio de entrada, pausa_inicio, pausa_fin y salida
//    - Ajusta la salida si el promedio supera las horas esperadas del día
//    - Si no hay suficientes históricos, usa fallback de jornada
// 4. Crea eventos faltantes según promedio histórico (si disponible) o jornada:
//    - Jornada fija: usa horarios configurados
//    - Jornada flexible: calcula horarios basándose en horas semanales
//    - NO crea eventos para períodos con ausencia de medio día
// 5. **Lógica de pausas dinámicas**: Si existe `pausa_inicio` real, calcula `pausa_fin` 
//    relativo al inicio real + duración configurada (ej. 14:15 + 1h = 15:15)
// 6. Recalcula horasTrabajadas y horasEnPausa
// 7. Cambia estado a 'finalizado' (incluidos los días vacíos descartados)
// 8. Registra auditoría: cuadradoMasivamente=true, cuadradoPor, cuadradoEn
// 9. Notifica al empleado del fichaje resuelto
// **Límite**: Máximo 50 fichajes por request (rate limiting)

// Respuesta (cuadrar):
{
  "success": true,
  "cuadrados": 3,
  "errores": [],
  "mensaje": "3 fichajes cuadrados correctamente"
}

// Respuesta (descartar):
{
  "success": true,
  "cuadrados": 2,
  "errores": [],
  "mensaje": "2 días sin fichajes descartados correctamente"
}
```

---

## 6. Discrepancias y Auditoría Legal

- Las **solicitudes de corrección de fichaje** forman parte del cumplimiento legal. Cuando HR/Manager rechaza una solicitud, queda registrada como **discrepancia** y no puede eliminarse.
- Esta discrepancia aparece en la revisión de fichajes y en el historial del empleado, garantizando trazabilidad frente a auditorías.
- Los rechazos generan una notificación automática al empleado con el motivo indicado.
- Las ediciones manuales creadas por HR/Manager disparan notificaciones `fichaje_modificado`, dejando constancia de qué usuario realizó la acción y por qué.

## 7. Exportación del Historial de Fichajes

- Desde `Ajustes > General > Exportar Fichajes`, el empleado puede descargar un Excel con todos sus fichajes del año seleccionado.
- El archivo incluye: fecha, estado, eventos (entrada/pausas/salida), horas trabajadas, tiempo en pausa y discrepancias asociadas.
- Endpoint: `GET /api/empleados/me/fichajes/export?anio=YYYY`. La generación se realiza con la librería `xlsx` y se actualiza al momento de la descarga.
- **Formato**: Columnas con anchos optimizados, incluye fila vacía si no hay registros para el año seleccionado.

## 8. Sincronización en Tiempo Real

- El widget de fichaje (`components/shared/fichaje-widget.tsx`) emite el evento global `fichaje-updated` cuando se ficha o se aprueban solicitudes manuales.
- Las tablas y vistas (`fichajes-client.tsx`, etc.) se suscriben a este evento para refrescar datos inmediatamente, evitando esperar al siguiente render o polling.
- Este mecanismo asegura que el semicírculo, cronómetro y listados representen siempre el estado real sin recargar la página.

## 9. Zona Horaria (Europe/Madrid)

- Todas las fechas mostradas al usuario se normalizan explícitamente a la zona horaria `Europe/Madrid` mediante los helpers `toMadridDate` y `formatFechaMadrid` (`lib/utils/fechas.ts`).
- Esto evita desfases de "día anterior" cuando el navegador del empleado está en otra zona horaria o cuando la consulta ocurre cerca de medianoche UTC.
- Las APIs continúan trabajando en UTC, pero la capa de presentación formatea y envía fechas ya convertidas al huso horario oficial.

## 10. Componentes Unificados de Filtros y Fechas ⭐ NUEVO

### DataFilters (`components/shared/filters/data-filters.tsx`)

Componente reutilizable para búsqueda y filtros que unifica la experiencia en Fichajes, Cuadrar Fichajes y Ausencias.

**Características:**
- **Búsqueda**: Input de texto con icono de búsqueda
- **Filtro de Estado**: Selector desplegable con opciones configurables
- **Filtro de Equipo**: Selector con opción "Todos los equipos" y "Sin equipo asignado"
- **Botón "Limpiar"**: Aparece automáticamente cuando hay filtros activos
- **Slot para contenido extra**: Permite añadir badges, contadores u otros elementos

**Uso:**
```tsx
<DataFilters
  searchQuery={busqueda}
  onSearchChange={setBusqueda}
  estadoValue={filtroEstado}
  onEstadoChange={setFiltroEstado}
  estadoOptions={ESTADO_OPTIONS}
  equipoValue={filtroEquipo}
  onEquipoChange={setFiltroEquipo}
  equipoOptions={equiposOptions}
>
  {/* Contenido extra (badges, contadores) */}
</DataFilters>
```

### DateRangeControls (`components/shared/filters/date-range-controls.tsx`)

Componente unificado para navegación de períodos de tiempo (Día/Semana/Mes).

**Características:**
- **Diseño compacto**: Sin bordes innecesarios, flechas secundarias (ghost)
- **Sin iconos redundantes**: Selector de rango sin icono de calendario
- **Sin botón "Hoy"**: Eliminado para simplificar la interfaz
- **Navegación fluida**: Flechas prev/next con espaciado optimizado
- **Variantes**: Desktop (horizontal) y Mobile (vertical)

**Uso:**
```tsx
<DateRangeControls
  range={rangoFechas}
  label={periodLabel}
  onRangeChange={setRangoFechas}
  onNavigate={(direction) => direction === 'prev' ? goToPrevious() : goToNext()}
  variant={isMobile ? 'mobile' : 'desktop'}
/>
```

**Aplicación:**
- ✅ Fichajes (`/hr/horario/fichajes`)
- ✅ Cuadrar Fichajes (`/hr/horario/fichajes/cuadrar`)
- ✅ Ausencias (`/hr/horario/ausencias`)

---

**Versión**: 3.8
**Última actualización**: 4 de diciembre de 2025
**Estado**: Sistema completo implementado:
- ✅ Validación determinística de fichajes completos
- ✅ Campo `periodo` en ausencias de medio día (mañana/tarde)
- ✅ CRON nocturno configurado con GitHub Actions
- ✅ Cuadre masivo con consideración de periodo de ausencia
- ✅ Formularios actualizados con selector de periodo
- ✅ API de revisión busca directamente en tabla `fichaje` (no `autoCompletado`)
- ✅ Notificaciones automáticas cuando CRON marca fichajes como `pendiente`
- ✅ **Edición sin auto-guardado**: Cambios se acumulan y se guardan solo al hacer click en "Guardar Cambios"
- ✅ **Saldo de horas descuenta pausas**: Cálculo correcto que excluye tiempo en pausa
- ✅ **Jornadas por defecto**: Todos los empleados activos tienen jornada asignada automáticamente
- ✅ **Balance diario en tablas**: La columna "Balance" muestra la diferencia entre horas trabajadas y horas esperadas (horasTrabajadas - horasEsperadas) y reemplaza a la antigua columna de "Horas esperadas"
- ✅ **Fix filtro por equipo**: Corregido filtro por equipo para usar correctamente la relación N:N `EmpleadoEquipo` en lugar de campo inexistente `empleado.equipoId`
- ✅ **Tabla optimizada**: Eliminada columna de acciones redundante; toda la fila es clicable para ver detalles
- ✅ **Balance actualizado automáticamente**: Se recalcula al editar, cuadrar o crear fichajes
- ✅ **Cards horizontales en vista individual**: Tiempo y Horarios en layout horizontal
- ✅ **Renovar saldo de horas**: HR Admin puede resetear contador desde fecha específica
- ✅ **Modal unificado de fichajes**: Un solo componente para crear y editar fichajes con múltiples eventos
- ✅ **Múltiples eventos en una operación**: Permite añadir varios eventos (entrada, pausas, salida) en un solo modal
- ✅ **Layout compacto**: Eventos en una línea horizontal (tipo, hora, eliminar)
- ✅ **Validación anti-futuro**: No permite crear/editar eventos para fechas u horas futuras
- ✅ **Crear/editar fichajes**: HR/Manager guardan directamente, empleados crean solicitud
- ✅ **Cuadrar Fichajes refactorizado**: Pantalla completa con tabla plana, iconos de estado y acciones mejoradas
- ✅ **Componentes unificados de filtros**: `DataFilters` y `DateRangeControls` aplicados en Fichajes, Cuadrar y Ausencias
- ✅ **Filtros avanzados**: Filtro por equipo (end-to-end), estado y búsqueda unificada
- ✅ **Lógica de pausas dinámicas**: Cálculo inteligente de fin de pausa relativo al inicio real + duración jornada
- ✅ **Descartar días vacíos**: Funcionalidad para excluir masivamente días sin fichajes
- ✅ **Botón Ausencia en cuadrar**: Permite crear ausencia directamente desde la revisión de fichajes
- ✅ **Exportación Excel mejorada**: Formato optimizado con anchos de columna y manejo de casos vacíos
- ✅ **Tabla unificada**: Migración a `DataTable` compartido con `AvatarCell` para empleados, estilo consistente (header grisaceo, filas completas, EmptyState de shadcn)
- ✅ **Avatar en tabla**: Columna de empleado muestra avatar + nombre + puesto usando `AvatarCell`
- ✅ **EmptyState de shadcn**: Estados vacíos usan componente estándar con layout `table` en lugar de texto plano
- ✅ **Promedios históricos para cuadraje**: Sistema inteligente que calcula eventos propuestos basándose en el promedio de los últimos 5 días con eventos del mismo empleado, ajustando la salida según horas esperadas (2025-12-04)
- ✅ **Rate limiting en cuadraje masivo**: Límite de 50 fichajes por request para proteger transacciones (2025-12-04)
- ✅ **Campo jornadaId en fichajes**: Permite filtrar históricos por jornada para mayor precisión en promedios (2025-12-04)
- ✅ **Fichajes extraordinarios**: Sistema completo para registrar horas extra en días festivos o no laborables (2025-12-08)

---

## 12. Fichajes Extraordinarios ⚡

**Fecha de implementación**: 8 de diciembre 2025
**Estado**: ✅ Completo y en producción

### 12.1 Visión General

Los fichajes extraordinarios permiten a los empleados registrar horas trabajadas fuera de su horario ordinario, específicamente en:
- Días festivos
- Fines de semana
- Días no laborables según calendario empresa
- Días sin jornada asignada

### 12.2 Arquitectura

**Schema**: Nuevo enum `TipoFichaje` y campo en tabla `fichajes`

```prisma
enum TipoFichaje {
  ordinario       // Fichaje dentro del horario laboral normal
  extraordinario  // Fichaje fuera de horario (festivos, fines de semana)
}

model fichajes {
  // ... otros campos
  tipoFichaje TipoFichaje @default(ordinario)

  @@index([tipoFichaje])
  @@index([empleadoId, tipoFichaje, fecha(sort: Desc)])
}
```

**Migración**: `20251207225051_add_tipo_fichaje`
- Compatibilidad 100% hacia atrás (todos los fichajes existentes = ordinario)

### 12.3 Flujo de Usuario

#### Paso 1: Intento Inicial (siempre ordinario)

```
Usuario hace clic en "Fichar" → Widget envía como 'ordinario'
```

#### Paso 2: Validación Backend

```typescript
// app/api/fichajes/route.ts:373-465
if (tipoFichaje === 'extraordinario') {
  // Validaciones simplificadas:
  // - Solo entrada/salida (no pausas)
  // - NO requiere jornadaId
  // - NO valida día laborable
  // - Valida límites globales empresa (si existen)
} else {
  // Validaciones ordinarias (código original)
  // - Requiere jornadaId
  // - Valida día laborable
  // - Permite pausas
}
```

#### Paso 3: Error Estructurado

Si el día NO es laborable, backend retorna:

```json
{
  "error": "No puedes fichar en este día. Es festivo o no laborable según tu jornada",
  "code": "DIA_NO_LABORABLE",
  "sugerencia": "Puedes registrar este fichaje como horas extraordinarias si trabajaste excepcionalmente este día"
}
```

#### Paso 4: Confirmación Usuario

```tsx
// components/shared/fichaje-widget.tsx:434-438
if (error?.code === 'DIA_NO_LABORABLE' && !forceExtraordinario) {
  setPendingFichajeTipo(tipo);
  setShowExtraordinarioDialog(true); // Muestra AlertDialog
  return;
}
```

AlertDialog ofrece:
- **Cancelar**: No crea fichaje
- **Confirmar como extraordinario**: Reenvía con `tipoFichaje: 'extraordinario'`

#### Paso 5: Creación Fichaje Extraordinario

Backend crea fichaje con validaciones simplificadas:
- ✅ Permite fichar en festivos
- ✅ Permite fichar sin jornada asignada
- ❌ Solo permite eventos: `entrada` y `salida` (NO pausas)

### 12.4 Cálculo de Balance

```typescript
// app/api/fichajes/route.ts:273-278
const balance = fichaje.tipoFichaje === 'extraordinario'
  ? horasTrabajadas                    // Todo es balance positivo
  : horasTrabajadas - horasEsperadas;  // Balance normal
```

**Diferencia clave**:
- **Ordinario**: Balance = trabajado - esperado (puede ser negativo)
- **Extraordinario**: Balance = trabajado (siempre positivo, son horas extra)

### 12.5 Filtros Automáticos

Los fichajes extraordinarios están **excluidos** automáticamente de:

| Funcionalidad | Endpoint/Archivo | Razón |
|--------------|------------------|-------|
| Cuadrar fichajes | `/api/fichajes/cuadrar` | Requieren revisión manual individual |
| Revisión masiva | `/api/fichajes/revision` | Excepcionales, no batch |
| Promedios históricos | `/api/fichajes/promedios` | Sesgarían patrones ordinarios |
| Histórico patrones | `lib/calculos/fichajes-historico.ts` | No representan comportamiento habitual |
| CRON clasificación | `/api/cron/clasificar-fichajes` | CRON solo procesa ordinarios |
| **Balance de horas** | `lib/calculos/balance-horas.ts` | Solo fichajes ordinarios cuentan para balance |

**Importante**: Los fichajes extraordinarios están **excluidos del balance de horas**. El balance solo considera fichajes ordinarios para calcular la diferencia entre horas trabajadas y esperadas según jornada.

### 12.6 Indicador Visual

**Ubicación**: `/hr/horario/fichajes` (tabla de fichajes)

```tsx
{fichaje.tipoFichaje === 'extraordinario' && (
  <Zap className="h-4 w-4 text-amber-500" /> // Icono rayo
)}
```

Con tooltip "Horas extra" al hacer hover.

### 12.7 Decisiones de Diseño

#### ¿Por qué no detectar festivos en frontend?

Frontend no tiene acceso a:
- Calendario de festivos completo
- Ausencias del empleado
- Configuración dinámica de días laborables

**Solución**: Backend valida y retorna código específico, frontend reacciona.

#### ¿Por qué solo entrada/salida?

Fichajes extraordinarios son excepcionales. Las pausas son propias de jornadas estructuradas normales.

#### ¿Por qué excluir de cuadrado automático?

Por naturaleza excepcional, requieren validación manual de HR que efectivamente se trabajaron esas horas.

#### ¿Por qué jornadaId puede ser null?

Empleados eventuales o situaciones especiales pueden trabajar sin jornada ordinaria asignada.

### 12.8 Archivos Modificados

| Archivo | Cambios | Líneas |
|---------|---------|--------|
| `prisma/schema.prisma` | Enum `TipoFichaje` + campo + índices | 1561-1564 |
| `app/api/fichajes/route.ts` | Fork de validaciones + error estructurado | 373-465 |
| `components/shared/fichaje-widget.tsx` | Interceptor error + AlertDialog | 363-464 |
| `app/api/fichajes/cuadrar/route.ts` | Filtro `tipoFichaje: 'ordinario'` | 131 |
| `app/api/fichajes/revision/route.ts` | Filtro en query | 246 |
| `app/api/fichajes/promedios/route.ts` | Filtro en históricos | 48 |
| `lib/calculos/fichajes-historico.ts` | Filtro en patrones | 114 |
| `app/api/cron/clasificar-fichajes/route.ts` | Tipo explícito en creación | 87 |
| `app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx` | Indicador visual ⚡ | N/A |
| `lib/calculos/balance-horas.ts` | Exclusión de extraordinarios en balance | 118, 206, 344 |

### 12.9 Impacto del Sistema

**Líneas de código**:
- Agregadas: ~150
- Modificadas: ~20
- Eliminadas: ~30

**Compatibilidad**: 100% hacia atrás garantizada (default `ordinario`)

### 12.10 Referencias Técnicas

- **Documentación estados**: [fichajes-estados-flujo.md](fichajes-estados-flujo.md#fichajes-extraordinarios)
- **Implementación completa**: [2025-12-08-fichajes-extraordinarios.md](../historial/2025-12-08-fichajes-extraordinarios.md)
- **Schema Prisma**: [schema.prisma:1561-1564](../../prisma/schema.prisma#L1561-L1564)
- **API validación**: [route.ts:373-465](../../app/api/fichajes/route.ts#L373-L465)
- **Widget frontend**: [fichaje-widget.tsx:363-464](../../components/shared/fichaje-widget.tsx#L363-L464)

---

**Versión**: 3.9
**Última actualización**: 8 de diciembre de 2025
