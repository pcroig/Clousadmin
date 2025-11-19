# ANÁLISIS EXHAUSTIVO: USO DE MODELOS DE DATOS EN APIs Y COMPONENTES

## RESUMEN EJECUTIVO

He analizado las APIs de fichajes, ausencias, nóminas y empleados del proyecto Clousadmin, identificando problemas críticos de performance relacionados con:

1. **Queries N+1** (4 instancias críticas encontradas)
2. **Relaciones cargadas innecesariamente** (múltiples casos)
3. **Campos JSONB sin índices optimizados** (7 campos identificados)
4. **Índices faltantes** (recomendaciones específicas)
5. **Campos calculados sin cacheo** (balance de horas, resúmenes de nómina)
6. **Modelos con demasiadas relaciones** (Empleado con 28+ relaciones)

---

## 1. PATRONES DE QUERIES MÁS COMUNES

### 1.1 API de Fichajes (/api/fichajes)

**Query Principal (route.ts línea 151-172)**
```typescript
const fichajes = await prisma.fichaje.findMany({
  where: { empresaId, empleadoId?, fecha?, estado? },
  include: {
    empleado: {
      select: { id, nombre, apellidos, puesto }  // ✅ Optimizado con select
    },
    eventos: { orderBy: { hora: 'asc' } }
  },
  take: 500  // Límite importante
});
```

**Relaciones cargadas:**
- `empleado` → usuario (opcional)
- `eventos` (FichajeEvento) siempre incluidos

**Frecuencia:** Muy alta (dashboard, widgets, listados)
**Estado:** ✅ Bien optimizado con select

---

### 1.2 API de Ausencias (/api/ausencias)

**Query Principal (route.ts línea 94-109)**
```typescript
const ausencias = await prisma.ausencia.findMany({
  where: { empresaId, estado?, empleadoId? },
  include: {
    empleado: {
      select: { nombre, apellidos, puesto, fotoUrl }  // ✅ Con select
    }
  },
  orderBy: { createdAt: 'desc' }
});
```

**Relaciones cargadas:**
- `empleado` (con select parcial)
- Opcionalmente: `documento`, `equipo`

**Frecuencia:** Alta (aprobaciones, solicitudes)
**Estado:** ✅ Bien optimizado

---

### 1.3 API de Nóminas - Evento (/api/nominas/eventos)

**Query Principal (route.ts línea 88-100) ⚠️ N+1 CRÍTICO**
```typescript
const compensaciones = await prisma.compensacionHoraExtra.findMany({
  where: { empresaId, createdAt: { gte, lt } },
  select: { estado, horasBalance }
});
// Llamado DENTRO de Promise.all(eventos.map()) - O(n) queries
```

**Problema:** Se ejecuta 1 query por evento (si hay 12 eventos = 12 queries)

**Frecuencia:** Mensual por evento, pero es operación larga

**Estado:** ❌ CRÍTICO N+1

---

### 1.4 API de Empleados (/api/empleados)

**Query Principal (route.ts línea 31-73)**
```typescript
const empleados = await prisma.empleado.findMany({
  where: { empresaId, activo: true },
  include: {
    usuario: { select: { id, email, rol, nombre, apellidos } },
    manager: { select: { id, nombre, apellidos } },
    puestoRelacion: { select: { id, nombre } },
    equipos: {
      include: {
        equipo: { select: { id, nombre } }
      }
    }
  }
});
```

**Relaciones cargadas:**
- usuario (con select)
- manager (1:1)
- puestoRelacion (1:1)
- equipos → equipo (N:N junction)

**Frecuencia:** Media (inicialización, listados)
**Estado:** ✅ Aceptable pero carga relaciones que podrían ser lazy

---

## 2. QUERIES N+1 DETECTADAS

### 2.1 CRÍTICO: Revisión de Fichajes (app/api/fichajes/revision/route.ts)

**Ubicación:** Líneas 69-130

```typescript
const fichajes = await Promise.all(autoCompletados.map(async (ac) => {
  // PARA CADA autoCompletado...
  const fichaje = await prisma.fichaje.findUnique({
    where: { id: fichajeId },
    include: { empleado: { include: { jornada: true } } }  // ⚠️ N+1
  });
  // ... más queries dentro del map
}));
```

**Impacto:** Si hay 100 auto_completados, hace 100 queries adicionales
**Solución:** Usar batch query o precarguar fichajeIds

---

### 2.2 CRÍTICO: Bolsa de Horas (app/api/fichajes/bolsa-horas/route.ts)

**Ubicación:** Líneas 68-77

```typescript
for (const empleado of empleados) {
  // Loop sobre TODOS los empleados activos
  const balanceMensual = await calcularBalanceMensual(empleado.id, mes, anio);
  // Cada calcularBalanceMensual → 1+ queries
}
```

**Impacto:** Si hay 500 empleados, hace ~500+ queries
**Queries por iteración:**
- `fichaje.findMany()` (1)
- `empleado.findUnique()` (1)
- `getFestivosActivosEnRango()` (1)
- Loop `esDiaLaborable()` × 30 días = 30 queries potenciales

**TOTAL:** ~500 empleados × 33 queries = 16,500 queries ⚠️⚠️⚠️

---

### 2.3 ALTO: Balance de Horas (lib/calculos/balance-horas.ts)

**Ubicación:** Líneas 200-208

```typescript
for (const dia of diasDelPeriodo) {  // 30 iteraciones para un mes
  const esLaborable = await esDiaLaborable(
    dia.fecha,
    empleado.empresaId,
    diasLaborablesConfig,
    festivosSet
  );
  calendarioLaboralMap.set(dia.key, esLaborable);
}
```

**Impacto:** 30 queries por empleado por período
**Solución:** Las funciones helper ya tienen batch, pero se usan en loop individual

---

### 2.4 ALTO: Eventos de Nómina (app/api/nominas/eventos/route.ts)

**Ubicación:** Líneas 69-128

```typescript
const eventosConAlertas = await Promise.all(
  eventos.map(async (evento) => {
    // PARA CADA evento...
    const compensaciones = await prisma.compensacionHoraExtra.findMany({
      where: { empresaId, createdAt: { gte, lt } }
    });  // N+1 Query
  })
);
```

**Impacto:** 1 query por evento (típicamente 12 eventos/año)
**Solución:** Una sola query con GROUP BY mes/año

---

## 3. USO DE CAMPOS JSONB Y FRECUENCIA

### 3.1 Campos JSONB Identificados

| Campo | Modelo | Frecuencia | Indexado | Problema |
|-------|--------|-----------|----------|----------|
| `config` | Jornada | Alta (login, fichaje) | ❌ No | Sin índice JSONB |
| `config` | Empresa | Media (startup) | ❌ No | Sin índice JSONB |
| `config` | Integracion | Media | ❌ No | Contiene credentials |
| `datosExtraidos` | Documento | Baja | ❌ No | IA extraction |
| `revisionIA` | Ausencia | Media | ❌ No | Análisis IA |
| `datosTemporales` | OnboardingEmpleado | Baja | ❌ No | Datos temporales |
| `camposCompletados` | DocumentoGenerado | Baja | ❌ No | Tracking |

### 3.2 Problemas Detectados

**Problema 1: config de Jornada sin índice**
- Se carga en CADA fichaje (entrada, pausa, salida)
- `fichaje/revision/route.ts` línea 92: `include: { jornada: true }`
- Frecuencia: Altísima (cientos/día)
- **Solución:** Agregar índice JSONB o precachear configuración

**Problema 2: JSONB con estructura compleja**
```jsonb
// Jornada.config puede ser muy grande
{
  "tipo": "fija",
  "lunes": { "activo": true, "entrada": "09:00", ... },
  "martes": { ... },
  ...
  "domingo": { ... }
}
```

**Problema 3: No se usan selects sobre JSONB**
```typescript
// Mal: carga TODA la Jornada.config
include: { jornada: true }

// Bien: solo cargar select de campos simples
include: { jornada: { select: { id: true, horasSemanales: true, config: true } } }
```

---

## 4. ÍNDICES QUE SE USAN Y CUÁLES FALTAN

### 4.1 Índices Existentes (Bien)

```prisma
// Fichaje - Excelentes índices
@@unique([empleadoId, fecha])  // CRÍTICO para findUnique
@@index([empresaId])
@@index([empleadoId])
@@index([fecha])
@@index([estado])
@@index([empresaId, estado])  // Composite
@@index([empresaId, fecha])   // Composite
@@index([empresaId, empleadoId, fecha])  // Muy específico

// Ausencia - Buenos índices
@@index([empresaId])
@@index([empleadoId])
@@index([estado])
@@index([tipo, estado])  // Composite para filtros comunes

// Nomina - Completos
@@unique([empleadoId, mes, anio])  // CRÍTICO
@@index([empleadoId, estado])
@@index([eventoNominaId, estado])
```

### 4.2 Índices Faltantes (Críticos)

#### Por Modelo:

**Empleado**
```prisma
// FALTA: Índice para búsquedas frecuentes
@@index([empresaId, activo])  // Línea 31 de /api/empleados
@@index([estadoEmpleado])     // Ya existe

// FALTA: Para relaciones N:N
// EmpleadoEquipo.index ya existe en modelo
```

**FichajeEvento**
```prisma
// FALTA: Para queries de análisis
@@index([fichajeId, tipo])  // Análisis de patrones
@@index([hora, fichajeId])  // Range queries por hora
@@index([tipo, hora])       // Para estadísticas
```

**Ausencia**
```prisma
// FALTA: Para queries de compensación
@@index([tipo, estado])     // Ya existe
// ✅ Los índices existentes son suficientes
```

**Nomina**
```prisma
// FALTA: Para búsquedas por estado + empresa
@@index([empresaId, estado])  // NO existe, muy usado

// FALTA: Para reportes
@@index([mes, anio, estado])  // Reportes por período
```

**EventoNomina**
```prisma
// FALTA: Para búsquedas por estado
@@index([estado])           // NO existe pero used en route.ts línea 40
```

**AutoCompletado**
```prisma
// Índices ACTUALES están bien:
@@index([empresaId, tipo, estado])

// PERO FALTA:
@@index([estado])  // Simple queries por estado
@@index([createdAt])  // Order by createdAt frequent
```

**CompensacionHoraExtra**
```prisma
// FALTA: Para queries por mes en eventos/route.ts
@@index([createdAt, estado])  // Muy usado en línea 88-100
@@index([empresaId, estado])  // Filter común
```

---

## 5. RELACIONES CARGADAS INNECESARIAMENTE

### 5.1 Caso: Empleado (El peor caso)

**Modelo tiene 28+ relaciones:**
```prisma
model Empleado {
  // ... 28 relaciones diferentes
  usuario              Usuario
  manager              Empleado  // self-ref
  empleadosACargo      Empleado[]  // self-ref
  jornada              Jornada
  puestoRelacion       Puesto
  ausencias            Ausencia[]
  fichajes             Fichaje[]
  equipos              EmpleadoEquipo[]
  contratos            Contrato[]
  nominas              Nomina[]
  documentos           Documento[]
  // ... muchos más
}
```

### 5.2 Casos Detectados

**Caso 1: Empleado GET (/api/empleados/route.ts)**

```typescript
// Línea 36-68 - Se carga TODO
include: {
  usuario,
  manager,
  puestoRelacion,
  equipos: { include: { equipo } }
  // Pero también implícitamente:
  // ausencias (no cargada pero disponible)
  // fichajes (no cargada pero disponible)
}
```

**Innecesario si solo se usa para listado:**
- `usuario.apellidos`, `usuario.email`, `usuario.rol` - ✅ Necesario
- `manager` - ✅ Necesario (mostra manager name)
- `puestoRelacion` - ✅ Necesario
- `equipos` - ✅ Necesario

**Conclusión:** Bien optimizado con select

---

**Caso 2: Nómina Analytics (/api/nominas/analytics/route.ts)**

```typescript
// Línea 27-66 - SOBRE-cargado
include: {
  empleado: {
    include: {
      equipos: {  // ✅ Necesario
        select: { equipo: { select: { nombre } } }
      },
      puestoRelacion: { select: { nombre } }  // ✅ Necesario
    }
  },
  contrato: {  // ✅ Necesario
    select: { id, tipoContrato, fechaInicio, fechaFin }
  },
  complementosAsignados: {  // ✅ Necesario (es el análisis)
    include: {
      empleadoComplemento: {
        include: {
          tipoComplemento: { select: { nombre } }  // ✅ Necesario
        }
      }
    }
  }
}
```

**Conclusión:** Bien optimizado para analítica

---

**Caso 3: Revisión de Fichajes (/api/fichajes/revision/route.ts)**

```typescript
// Línea 92 - INNECESARIO
include: { empleado: { include: { jornada: true } } }
// Se carga jornada COMPLETA cuando solo se necesita:
// - jornada.config (para preview de horas)

// Mejor:
include: { empleado: { select: { 
  jornada: { select: { config: true } } 
}}}
```

**Impacto:** Se carga config de jornada (puede ser >1KB) en CADA fichaje

---

## 6. CAMPOS CALCULADOS QUE PODRÍAN CACHARSE

### 6.1 Balance de Horas

**Ubicación:** `/lib/calculos/balance-horas.ts`
**Cálculo:** Muy costoso (múltiples queries + loops)

```typescript
// Actual: 30+ queries por empleado por período
export async function calcularBalanceMensual(
  empleadoId, mes, año
) {
  // 1. Query fichajes del mes
  // 2. Query empleado
  // 3. Query festivos
  // 4. Query calendario laboral empresa
  // 5. Loop 30 días × esDiaLaborable() = 30 queries
  // 6. Batch obtenerHorasEsperadas
}

// Uso:
for (const empleado of empleados) {  // 500 empleados
  const balance = await calcularBalanceMensual(...)  // 30+ queries × 500
}
```

**Problema:** Se recalcula SIEMPRE, nunca se cachea

**Solución Propuesta:**
```typescript
// Crear tabla ResumenBalanceMensual (ya existe parcialmente)
model ResumenBalanceMensualFichaje {
  id String @id
  empleadoId String
  mes Int
  anio Int
  balanceTotal Decimal
  calculadoEn DateTime
  @@unique([empleadoId, mes, anio])
  @@index([empleadoId, anio, mes])
}

// Invalidar cache cuando:
// 1. Se crea/actualiza un Fichaje
// 2. Se cambia empleado.jornadaId
// 3. Se agrega Festivo
```

---

### 6.2 Resumen Mensual de Nómina

**Modelo:** `ResumenMensualNomina` (ya existe)

```prisma
model ResumenMensualNomina {
  // Cacheado de:
  diasLaborables      Int
  diasTrabajados      Int
  diasVacaciones      Int
  diasBajaIT          Int
  horasTrabajadas     Decimal
  horasExtras         Decimal
  salarioBase         Decimal
  
  calculadoEn DateTime
}
```

**Estado:** ✅ Ya existe, pero ¿se usa?

**Verificar:** ¿Se calcula automáticamente o on-demand?

---

### 6.3 Saldo de Ausencias

**Modelo:** `EmpleadoSaldoAusencias`

```prisma
model EmpleadoSaldoAusencias {
  diasTotales    Int
  diasUsados     Decimal
  diasPendientes Decimal
}
```

**Estado:** ✅ Cacheado

**Problema:** Se actualiza en transacción (línea 306-312 de /api/ausencias)
```typescript
await actualizarSaldo(
  empleadoId, año, 'solicitar', diasSolicitados, tx
)
```

**Bien optimizado** ✅

---

## 7. MODELOS CON MUCHAS RELACIONES

### 7.1 Empleado (28+ relaciones)

```prisma
model Empleado {
  // CORE RELATIONS
  usuario              Usuario              // 1:1
  empresa              Empresa              // N:1
  manager              Empleado?            // 1:1 (self-ref)
  empleadosACargo      Empleado[]           // 1:N (self-ref)
  
  // HR RELATIONS
  jornada              Jornada?             // N:1
  puestoRelacion       Puesto?              // N:1
  equipos              EmpleadoEquipo[]     // N:N
  
  // TIME TRACKING
  ausencias            Ausencia[]           // 1:N
  fichajes             Fichaje[]            // 1:N
  
  // PAYROLL
  contratos            Contrato[]           // 1:N
  nominas              Nomina[]             // 1:N
  complementos         EmpleadoComplemento[] // 1:N
  
  // DOCUMENTS
  documentos           Documento[]          // 1:N
  carpetas             Carpeta[]            // 1:N
  
  // WORKFLOW
  solicitudesCambio    SolicitudCambio[]    // 1:N
  solicitudesCambioAprobadas SolicitudCambio[]  // 1:N (as approver)
  autoCompletados      AutoCompletado[]     // 1:N
  
  // SIGNATURES
  firmas               Firma[]              // 1:N
  
  // ONBOARDING
  invitacion           InvitacionEmpleado?  // 1:1
  onboarding           OnboardingEmpleado?  // 1:1
  
  // PREFERENCES
  preferenciasVacaciones PreferenciaVacaciones[] // 1:N
  
  // COMPENSATION & AUDIT
  alertasNomina        AlertaNomina[]       // 1:N
  resumenesNomina      ResumenMensualNomina[] // 1:N
  compensacionesHoras  CompensacionHoraExtra[] // 1:N
  
  // LEGAL & COMPLIANCE
  consentimientos      Consentimiento[]     // 1:N
  denuncias            Denuncia[]           // 1:N (as denouncer)
  documentosGenerados  DocumentoGenerado[]  // 1:N
  
  // CORRECTIONS
  solicitudesCorreccionFichaje SolicitudCorreccionFichaje[] // 1:N
  solicitudesCorreccionGestionadas SolicitudCorreccionFichaje[] // 1:N (as approver)
}
```

**Impacto de Performance:**
- Loading full Empleado = potentially loading 28+ relations
- If not careful with `select`, can cause massive query overhead
- Solution: ALWAYS use `select` when querying Empleado

**Recomendación:**
```typescript
// ❌ Evitar
const empleado = await prisma.empleado.findUnique({ where: { id } });

// ✅ Usar
const empleado = await prisma.empleado.findUnique({
  where: { id },
  select: {
    id: true,
    nombre: true,
    email: true,
    // ... solo lo necesario
  }
});
```

---

### 7.2 Fichaje (3 relaciones)

```prisma
model Fichaje {
  empresa      Empresa
  empleado     Empleado
  eventos      FichajeEvento[]  // 1:N (critical)
}
```

**Bien distribuido** ✅

---

### 7.3 Nomina (6 relaciones)

```prisma
model Nomina {
  empleado              Empleado
  contrato              Contrato?
  eventoNomina          EventoNomina?
  documento             Documento?
  alertas               AlertaNomina[]
  complementosAsignados AsignacionComplemento[]
}
```

**Bien distribuido** ✅

---

## RECOMENDACIONES Y PRÓXIMOS PASOS

### CRÍTICO (Implementar inmediatamente)

1. **Corregir Bolsa de Horas N+1**
   - Usar batch query para calcular balance de múltiples empleados
   - Crear endpoint `/api/fichajes/bolsa-horas/batch` para búsquedas masivas
   - Estimated impact: Reducir 16,500 queries a ~50

2. **Optimizar Revisión de Fichajes**
   - Precarguar fichajes/jornadas antes del map
   - Use `findMany` en lugar de `findUnique` por empleado
   - Estimated impact: Reducir ~100 queries a ~5

3. **Resolver EventoNomina N+1**
   - Combinar queries de compensaciones en una sola
   - Usar GROUP BY para agregación
   - Estimated impact: Reducir ~12 queries a 1

### ALTO (Próxima iteración)

4. **Agregar Índices Faltantes**
   - `compensacionHoraExtra`: `@@index([createdAt, estado])`
   - `empleado`: `@@index([empresaId, activo])`
   - `nomina`: `@@index([empresaId, estado])`
   - `fichajeEvento`: `@@index([tipo, hora])`

5. **Cachear Balance de Horas**
   - Implementar tabla `ResumenBalanceMensualFichaje`
   - Invalidar on `fichaje.create/update` y `festivo.create`
   - Estimated improvement: 30+ queries → 1 select

6. **Optimizar Jornada.config JSONB**
   - Evaluar precachear en Redis
   - O crear índice JSONB en Postgres
   - Alternativa: Desnormalizar en tabla separada

### MEDIO (Mejoras de diseño)

7. **Considerar Split Empleado**
   - Crear `EmpleadoProfile` para datos personales
   - Crear `EmpleadoPayroll` para datos de nómina
   - Reduce relaciones de 28 a ~10-15 por modelo

8. **Implementar Lazy Loading**
   - Usar callbacks de Prisma para lazy relations
   - O REST API con relaciones "expandibles"

---

## RESUMEN DE HALLAZGOS

| Categoría | Cantidad | Severidad |
|-----------|----------|-----------|
| Queries N+1 | 4 | CRÍTICA |
| Índices faltantes | 6 | ALTA |
| Relaciones innecesarias | 1 | MEDIA |
| Campos JSONB sin cacheo | 7 | MEDIA |
| Cálculos sin cacheo | 3 | MEDIA |
| Modelos sobre-normalizados | 1 | BAJA |

**Estimated query reduction with all fixes: 95% (worst case from 16,500 to <500 for typical operations)**
