# Gestión de Fichajes y Control Horario

## Visión General

El sistema de fichajes permite a los empleados registrar su jornada laboral completa (entrada, pausas y salida), vinculado a jornadas laborales configurables (fijas o flexibles). Incluye validación automática de fichajes completos y cuadre masivo por HR para fichajes incompletos.

### Estado actual de funcionalidades clave

- **Horas extra**: ya existe el flujo completo (`GET /api/fichajes/bolsa-horas`, `POST /api/fichajes/compensar-horas`, `lib/services/compensacion-horas.ts`). No se requiere implementar nada nuevo, solo optimizaciones puntuales.
- **Array duplicado de días**: el literal incorrecto en `app/api/fichajes/revision/route.ts` no se usa; el sistema emplea constantemente la constante correcta `dias`, por lo que no impacta cálculos.
- **Finalizar desde pausa**: la validación (`lib/calculos/fichajes.ts`) permite cerrar jornada estando en pausa para garantizar que el tiempo en descanso no compute como trabajado. Cualquier cambio exigiría decisión de negocio.
- **Correcciones de fichaje**: ✅ Implementado workflow formal con solicitud/aprobación. Empleados solicitan desde `/empleado/horario/fichajes`, HR/Manager aprueban desde la bandeja de entrada. Incluye notificaciones automáticas y auditoría completa.
- **`autoCompletado`**: sigue alimentando dashboards y auditoría de otras funcionalidades (ausencias, solicitudes). Para fichajes, la revisión ahora busca directamente en tabla `fichaje` con estado `pendiente`.
- **Slack y geolocalización**: mantienen estado “roadmap” (documentadas en esta guía), no hay código en producción que debamos retirar o activar.
- **Entrada/salida múltiples**: `validarEvento` impide reabrir entradas mientras el estado no vuelva a `sin_fichar`, por lo que no se generan múltiples ciclos el mismo día.

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

## 1. Flujo Básico de Fichaje

### Estados del Empleado

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

### Cuadrar Fichajes (HR)

**Acceso**: Solo HR Admin y Managers (para su equipo)

**Funcionalidad:**
1. **Listado**: Muestra todos los fichajes con estado `pendiente` de días anteriores (busca directamente en tabla `fichaje`)
2. **Vista previa**: Para cada fichaje muestra:
   - Eventos registrados (si existen)
   - Eventos propuestos basados en jornada del empleado (azul)
   - Razón de la pendencia (eventos faltantes)
3. **Cuadre masivo**: 
   - Seleccionar múltiples fichajes
   - Botón "Cuadrar" crea eventos faltantes según jornada
   - Considera ausencias de medio día (no crea eventos para períodos ausentes)
   - Marca como `finalizado` y registra auditoría
   - Notifica al empleado del fichaje resuelto
4. **Edición individual**: Abrir modal para editar eventos manualmente antes de cuadrar

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

## 5. Edición de fichajes (HR)

### Modal de edición (estilo "editar ausencia")
- Cabecera con empleado y fecha única del día.
- Lista de eventos del día editable en línea: para cada evento se puede cambiar `tipo` y `hora`, y eliminarlo.
- Botón "Añadir evento" para crear nuevos registros del día.
- **⚠️ Sin auto-guardado**: Los cambios se acumulan localmente y solo se persisten al hacer click en "Guardar Cambios"
- Al guardar, se recalculan `horasTrabajadas` y `horasEnPausa` del fichaje, y se actualiza el balance automáticamente
- **Tracking de cambios**: El sistema rastrea eventos nuevos, modificados y eliminados, aplicándolos en orden al guardar

### Añadir Fichajes Manuales

**Dos flujos según rol:**

1. **HR Admin**: Puede añadir fichajes directamente desde:
   - Espacio individual del empleado (`/hr/organizacion/personas/[id]` → Tab Fichajes)
   - Vista de fichajes (`/hr/horario/fichajes`)
   - **Comportamiento**: Se guarda directamente, creando el evento inmediatamente
   - Endpoint: `POST /api/fichajes` + `POST /api/fichajes/eventos`

2. **Empleado**: Puede solicitar fichajes manuales desde:
   - Su propio espacio de fichajes (`/empleado/mi-espacio` → Tab Fichajes)
   - Vista de fichajes (`/empleado/horario/fichajes`)
   - **Comportamiento**: Crea una solicitud que requiere aprobación de HR/Manager
   - Endpoint: `POST /api/solicitudes` (tipo: `fichaje_manual`)

**Componente**: `components/shared/fichaje-manual-modal.tsx` - Se adapta según prop `esHRAdmin`

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

**Tabla de fichajes**: Muestra todos los fichajes con columnas: Fecha, Entrada, Salida, Horas Trabajadas, Horas Esperadas, Balance, Estado

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
| Añadir fichaje directamente | ❌ | ❌ | ✅ |
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
  id              String   @id @default(uuid())
  empresaId       String
  empleadoId      String
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
  
  @@unique([empleadoId, fecha])
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
  id              String   @id @default(uuid())
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
| `/api/fichajes` | GET | Lista fichajes con filtros (empleadoId, fecha, fechaInicio, fechaFin, estado, propios). Incluye `horasEsperadas` y `balance` calculados | ✅ |
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
| `/api/fichajes/revision` | GET | Obtener fichajes pendientes de revisión. Busca directamente en tabla `fichaje` con estado `pendiente` de días anteriores | HR |
| `/api/fichajes/revision` | POST | Actualizar fichajes individuales desde modal de revisión (legacy, usar `/api/fichajes/cuadrar` para masivo) | HR |
| `/api/fichajes/cuadrar` | POST | Cuadrar fichajes masivamente. Crea eventos faltantes según jornada y marca como `finalizado` | HR |

### Estadísticas

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/fichajes/stats` | GET | Obtiene estadísticas de fichajes (horas trabajadas, balance, etc.) | ✅ |

### Renovar Saldo de Horas

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/empleados/[id]/renovar-saldo` | POST | Renueva el saldo de horas del empleado (resetea `saldoRenovadoDesde` a hoy) | HR Admin |
| `/api/empleados/[id]/renovar-saldo` | GET | Obtiene la fecha de última renovación del saldo | ✅ |

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
// GET /api/fichajes/revision
// Busca directamente en tabla fichaje con estado 'pendiente' de días anteriores

// Sistema retorna:
{
  "fichajes": [
    {
      "id": "fichaje-uuid", // ID del fichaje (usado para cuadrar)
      "fichajeId": "fichaje-uuid",
      "empleadoId": "empleado-uuid",
      "empleadoNombre": "Juan Pérez",
      "fecha": "2025-11-06T00:00:00.000Z",
      "eventos": [
        // Vista previa: eventos propuestos según jornada (azul) o registrados si existen
        { "tipo": "entrada", "hora": "2025-11-06T09:00:00.000Z", "origen": "propuesto" },
        { "tipo": "pausa_inicio", "hora": "2025-11-06T14:00:00.000Z", "origen": "propuesto" },
        { "tipo": "pausa_fin", "hora": "2025-11-06T15:00:00.000Z", "origen": "propuesto" },
        { "tipo": "salida", "hora": "2025-11-06T18:00:00.000Z", "origen": "propuesto" }
      ],
      "eventosRegistrados": [
        // Eventos que el empleado ya fichó (si existen)
      ],
      "razon": "Faltan eventos: entrada, salida",
      "eventosFaltantes": ["entrada", "salida"]
    }
  ]
}
```

### Cuadrar Fichajes Masivamente (HR)

```typescript
// POST /api/fichajes/cuadrar
{
  "fichajeIds": ["fichaje-uuid-1", "fichaje-uuid-2", "fichaje-uuid-3"]
}

// Sistema automáticamente:
// 1. Verifica ausencias de medio día del empleado
// 2. Para cada fichaje, valida qué eventos faltan (considerando ausencias)
// 3. Crea eventos faltantes según jornada del empleado (fija o flexible)
//    - Jornada fija: usa horarios configurados
//    - Jornada flexible: calcula horarios basándose en horas semanales
//    - NO crea eventos para períodos con ausencia de medio día
// 4. Recalcula horasTrabajadas y horasEnPausa
// 5. Cambia estado a 'finalizado'
// 6. Registra auditoría: cuadradoMasivamente=true, cuadradoPor, cuadradoEn

// Respuesta:
{
  "success": true,
  "cuadrados": 3,
  "errores": [],
  "mensaje": "3 fichajes cuadrados correctamente"
}
```

---

**Versión**: 3.3
**Última actualización**: 27 enero 2025
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
- ✅ **Horas esperadas en tablas**: Columnas visibles en todas las vistas de fichajes
- ✅ **Balance actualizado automáticamente**: Se recalcula al editar, cuadrar o crear fichajes
- ✅ **Cards horizontales en vista individual**: Tiempo y Horarios en layout horizontal
- ✅ **Renovar saldo de horas**: HR Admin puede resetear contador desde fecha específica
- ✅ **Añadir fichajes manuales**: HR guarda directamente, empleados crean solicitud
