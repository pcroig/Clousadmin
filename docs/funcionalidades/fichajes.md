# Gestión de Fichajes y Control Horario

## Visión General

El sistema de fichajes permite a los empleados registrar su jornada laboral completa (entrada, pausas y salida), vinculado a jornadas laborales configurables (fijas o flexibles). Incluye auto-completado inteligente con IA para fichajes incompletos.

## Estados del Fichaje

Cada fichaje (día completo) tiene un único estado que refleja su ciclo de vida:

**Solo existen 4 estados únicos:**

- **`en_curso`** - Estado por defecto. Fichaje creado automáticamente o fichaje manual iniciado (sin completar)
- **`finalizado`** - Fichaje completo y aprobado (manual o tras aprobación HR)
- **`revisado`** - Auto-completado por clasificador, listo para aprobación rápida HR
- **`pendiente`** - Requiere revisión manual detallada de HR (fichajes sin eventos o problemáticos)

**Nota importante**: El fichaje representa el día completo, mientras que los eventos (entrada, pausa_inicio, pausa_fin, salida) son acciones individuales dentro de ese día.

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

### Gestión desde HR

#### Crear Jornada
- Nombre descriptivo
- Tipo (fija/flexible)
- Horas semanales
- Horarios por día (si es fija)
- Límites opcionales (no fichar antes/después de X hora)

#### Asignar Jornada
- **Toda la empresa**: Aplica a todos los empleados activos
- **Por equipos**: Aplica a todos los miembros de equipos seleccionados
- **Individual**: Aplica a empleados específicos

---

## 3. Balance de Horas

### Cálculo

```
Balance = Σ(Horas trabajadas reales) - Σ(Horas esperadas según jornada)
```

Se calcula para:
- **Diario**: Horas del día vs esperadas ese día
- **Semanal**: Acumulado de la semana vs esperado semanal
- **Mensual**: Acumulado del mes vs esperado mensual

### Visualización

- Widget muestra horas trabajadas vs esperadas
- Balance acumulado (+ horas extras o - horas pendientes)
- Actualización en tiempo real

---

## 4. Auto-completado de Marcajes (Fase 3)

### Detección de Incompletos

Para cada día laborable del mes:
- ¿Tiene entrada? → Si no, marcar como incompleto
- ¿Tiene salida? → Si no, marcar como incompleto
- ¿Pausas coherentes? → Si inicio sin fin o viceversa, marcar como incompleto

### Reglas de Auto-completado

```javascript
// Falta salida
if (tiene_entrada && !tiene_salida) {
  salida_autocompletada = jornada.hora_fin
}

// Falta entrada
if (!tiene_entrada && tiene_salida) {
  entrada_autocompletada = jornada.hora_inicio
}

// Falta pausa obligatoria
if (jornada.pausa_obligatoria && !tiene_pausa_completa) {
  pausa_inicio = jornada.pausa_inicio
  pausa_fin = jornada.pausa_fin
}

// Sin fichajes en todo el día
if (no_tiene_fichajes) {
  // Crear jornada completa teórica
  entrada = jornada.hora_inicio
  pausa_inicio = jornada.pausa_inicio
  pausa_fin = jornada.pausa_fin
  salida = jornada.hora_fin
}
```

### Clasificación con IA

Sistema evalúa cada fichaje auto-completado con OpenAI:

**Factores evaluados:**
- Sin fichajes en día laborable sin ausencia
- Desviación de horas vs jornada teórica
- Patrón inusual vs histórico (últimos 30 días)
- Días consecutivos con problemas
- Conflictos con ausencias/festivos

**Resultado:**
```json
{
  "alerta": true/false,
  "motivo": "Sin fichajes en día laborable",
  "score": 0-100
}
```

- **score < 70**: Auto-completado normal
- **score ≥ 70**: Requiere revisión manual (alerta)

### Proceso de Aprobación

#### Workflow Automático (CRON Nocturno)
1. **23:30 cada noche**: CRON ejecuta clasificador
2. Sistema crea fichajes automáticos para empleados disponibles sin fichaje (estado `en_curso`)
3. Clasificador analiza fichajes incompletos y decide:
   - **Auto-completar** → estado `revisado` (confianza alta, listo para aprobación rápida)
   - **Revisión manual** → estado `pendiente` (patrones irregulares, sin eventos, pausas sin cerrar)

#### Workflow HR (Manual)
1. **Widget HR (Auto-completed)**: Muestra contadores de auto-completados por tipo.
   - Botón "Check" en Fichajes: cambia masivamente `revisado` → `finalizado` y archiva las entradas auto-completadas (contador vuelve a 0).
   - Ausencias y Solicitudes siguen el mismo patrón (cuando se implementen sus auto-completados).

2. **HR ejecuta "Cuadrar fichajes"** (antes "Actualizar marcajes"): 
   - Clasificador analiza fichajes del rango seleccionado (manual).
   - La tabla muestra la vista previa del fichaje propuesto basada en la jornada del empleado (entrada, pausa opcional, salida).
   - Acciones: "Seleccionar todos" y "Actualizar". Se pueden abrir ediciones puntuales por fila.
   - Al actualizar, se crean los eventos faltantes según jornada, se recalculan horas y el fichaje pasa a `finalizado` (balance diario 0 si aplica jornada fija con descanso).

### Estados del Fichaje (Día Completo)

Los fichajes tienen UN SOLO estado que representa el ciclo completo del día. **Solo existen 4 estados:**

1. **`en_curso`**: Inicio del día o fichaje incompleto (sin eventos o sin cerrar). Estado por defecto cuando se crea el fichaje automáticamente para un día laboral.

2. **`finalizado`**: Fichaje completo y aprobado. Puede ser:
   - Fichaje manual completo (empleado fichó entrada y salida correctamente)
   - Fichaje auto-completado y aprobado por HR (desde estado `revisado` o `pendiente`)

3. **`revisado`**: Auto-completado por el clasificador nocturno, listo para aprobación rápida por HR. Al hacer check en el widget o aprobar, pasa a `finalizado`.

4. **`pendiente`**: Requiere revisión manual detallada de HR. Se usa para:
   - Fichajes incompletos o sin eventos (creados automáticamente)
   - Fichajes con patrones irregulares
   - Fichajes rechazados por HR (quedan en `pendiente` con `motivoRechazo`)

**Workflow de estados:**
- `en_curso` → Si empleado completa manualmente → `finalizado`
- `en_curso` → Si clasificador auto-completa (confianza alta) → `revisado`
- `en_curso` → Si clasificador requiere revisión → `pendiente`
- `revisado` → Si HR aprueba (check del widget o "Cuadrar fichajes") → `finalizado`
- `pendiente` → Si HR aprueba en "Actualizar marcajes" → `finalizado`
- `pendiente` → Si HR rechaza → `pendiente` (con `motivoRechazo`)

**Nota importante**: Los EVENTOS de fichaje (`FichajeEvento`) NO tienen estado. Solo el fichaje completo (`Fichaje`) tiene estado. `aprobado` y `rechazado` NO son estados, son resultados del workflow que se registran en campos de aprobación (`aprobadoPor`, `fechaAprobacion`, `motivoRechazo`).

---

## 5. Edición de fichajes (HR)

### Modal de edición (estilo "editar ausencia")
- Cabecera con empleado y fecha única del día.
- Lista de eventos del día editable en línea: para cada evento se puede cambiar `tipo` y `hora`, y eliminarlo.
- Botón "Añadir evento" para crear nuevos registros del día.
- Al guardar, se recalculan `horasTrabajadas` y `horasEnPausa` del fichaje.

---

## 6. Validaciones

### Al Fichar

✅ Empleado debe tener jornada asignada
✅ Timestamp dentro de límites superior/inferior (si están configurados)
✅ No puede fichar entrada si ya tiene entrada activa sin salida
✅ No puede pausar si no está trabajando
✅ No puede reanudar si no está en pausa
✅ No puede finalizar si no tiene entrada o está en pausa

### Al Auto-completar

✅ Solo días laborables (excluir festivos y fines de semana)
✅ Solo días sin ausencia aprobada
✅ Respetar jornada teórica del empleado en ese día
✅ Si jornada cambió mid-mes, usar jornada vigente en ese día

### Al Aprobar

✅ Manager solo aprueba su equipo
✅ HR aprueba cualquier empleado
✅ No se pueden aprobar marcajes con alerta sin revisar
✅ Marcajes rechazados requieren corrección de empleado

---

## 7. Permisos por Rol

| Acción | Empleado | Manager | HR Admin |
|--------|----------|---------|----------|
| Fichar (entrada/pausa/salida) | ✅ | ✅ | ✅ |
| Ver propios fichajes | ✅ | ✅ | ✅ |
| Ver fichajes de equipo | ❌ | ✅ | ✅ |
| Ver todos los fichajes | ❌ | ❌ | ✅ |
| Solicitar corrección de fichaje | ✅ | ✅ | ❌ |
| Aprobar fichajes | ❌ | ✅ (su equipo) | ✅ (todos) |
| Ejecutar auto-completado | ❌ | ❌ | ✅ |
| Configurar jornadas | ❌ | ❌ | ✅ |
| Asignar jornadas | ❌ | ❌ | ✅ |

---

## 8. Integraciones Futuras

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

## 9. Troubleshooting

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

## 10. Modelos de Datos

### Fichaje

```prisma
model Fichaje {
  id              String   @id @default(uuid())
  empresaId       String
  empleadoId      String
  fecha           DateTime @db.Date
  
  // Estado del fichaje completo (UN SOLO ESTADO para todo el día)
  estado          String   @default("en_curso") @db.VarChar(50)
  // Valores (4 estados únicos): 'en_curso', 'finalizado', 'revisado', 'pendiente'
  
  // Cálculos agregados
  horasTrabajadas Decimal?  @db.Decimal(5, 2)
  horasEnPausa    Decimal?  @db.Decimal(5, 2)
  
  // Auto-completion
  autoCompletado  Boolean   @default(false)
  fechaAprobacion DateTime? // Fecha en que fue aprobado/finalizado por HR
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  eventos         FichajeEvento[]
  
  @@unique([empleadoId, fecha])
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
  config          Json     // { lunes: { activo, entrada, pausa_inicio?, pausa_fin?, salida }, ... }
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
| `/api/fichajes` | GET | Lista fichajes con filtros (empleadoId, fecha, fechaInicio, fechaFin, estado, propios) | ✅ |
| `/api/fichajes` | POST | Crea evento en fichaje del día (entrada, pausa_inicio, pausa_fin, salida). Crea fichaje si no existe | ✅ |
| `/api/fichajes/[id]` | GET | Obtiene fichaje específico con todos sus eventos | ✅ |
| `/api/fichajes/[id]` | PATCH | Aprueba/rechaza fichaje (`accion: 'aprobar'|'rechazar'`) | HR/Manager |

### Eventos de Fichaje

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/fichajes/eventos` | POST | Crea nuevo evento en un fichaje existente | ✅ |
| `/api/fichajes/eventos/[id]` | PATCH | Edita evento (tipo, hora, motivoEdicion) | ✅ |
| `/api/fichajes/eventos/[id]` | DELETE | Elimina evento del fichaje | ✅ |

### Auto-completado y Revisión

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/fichajes/clasificar` | POST | Ejecuta clasificador IA manualmente. Analiza fichajes incompletos | HR |
| `/api/fichajes/revision` | POST | Cuadrar fichajes manualmente. Crea eventos según jornada, finaliza fichajes | HR |
| `/api/fichajes/aprobar-revisados` | POST | Aprueba masivamente fichajes en estado `revisado` → `finalizado` | HR |
| `/api/fichajes/limpiar-revisados` | POST | Limpia auto-completados de fichajes. Similar a "check" del widget | HR |

### Estadísticas

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/fichajes/stats` | GET | Obtiene estadísticas de fichajes (horas trabajadas, balance, etc.) | ✅ |

### CRON Jobs

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/cron/clasificar-fichajes` | POST | CRON job nocturno (23:30). Crea fichajes automáticos y clasifica | CRON_SECRET |

**Nota**: Los endpoints de auto-completado requieren `CRON_SECRET` en headers para protección.

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

### Auto-completar Fichajes (HR)

```typescript
// POST /api/fichajes/revision
{
  "fechaInicio": "2025-10-01",
  "fechaFin": "2025-10-31",
  "empleadoId": "uuid" // Opcional, si no se proporciona procesa todos
}

// Sistema automáticamente:
// 1. Encuentra fichajes incompletos en el rango
// 2. Para cada uno, crea eventos según jornada del empleado
// 3. Recalcula horasTrabajadas y horasEnPausa
// 4. Cambia estado a 'finalizado'
```

### Aprobar Fichajes Revisados (HR)

```typescript
// POST /api/fichajes/aprobar-revisados
// Sin body, aprueba todos los fichajes con estado 'revisado'

// Sistema automáticamente:
// 1. Busca todos los fichajes con estado 'revisado'
// 2. Cambia estado a 'finalizado'
// 3. Archiva auto-completados relacionados
// 4. Retorna count de fichajes aprobados
```

---

**Versión**: 2.1
**Última actualización**: 25 octubre 2025
**Estado**: Fase 1 y 2 implementadas, Fase 3 (auto-completado IA) en desarrollo
