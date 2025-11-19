# SOLUCIONES TÉCNICAS: EJEMPLOS DE CÓDIGO

## 1. SOLUCIÓN N+1: Bolsa de Horas

### PROBLEMA ACTUAL
```typescript
// app/api/fichajes/bolsa-horas/route.ts (líneas 68-77)
for (const empleado of empleados) {
  const balanceMensual = await calcularBalanceMensual(empleado.id, mes, anio);
  // Cada empleado = 30+ queries
  // 500 empleados = 16,500 queries ❌
}
```

### SOLUCIÓN 1: Batch de Empleados
```typescript
// lib/calculos/balance-horas.ts - NUEVA FUNCIÓN
export async function calcularBalanceMensualBatch(
  empleadoIds: string[],
  mes: number,
  anio: number
): Promise<Map<string, BalancePeriodo>> {
  const fechaInicio = new Date(anio, mes - 1, 1);
  const fechaFin = new Date(anio, mes, 0);

  // 1. Query ÚNICO para todos los fichajes
  const fichajes = await prismaClient.fichaje.findMany({
    where: {
      empleadoId: { in: empleadoIds },
      fecha: { gte: fechaInicio, lte: fechaFin },
    },
    include: { eventos: { orderBy: { hora: 'asc' } } },
  });

  // 2. Query ÚNICA para empresas (agrupar por empleado)
  const empleados = await prismaClient.empleado.findMany({
    where: { id: { in: empleadoIds } },
    select: { id: true, empresaId: true },
  });

  // 3. Agrupar por empresa y hacer 1 query por empresa
  const empresaIds = [...new Set(empleados.map(e => e.empresaId))];
  
  const [festivos, diasLaborablesMap] = await Promise.all([
    // Query ÚNICA para todos los festivos
    prismaClient.festivo.findMany({
      where: {
        empresaId: { in: empresaIds },
        fecha: { gte: fechaInicio, lte: fechaFin },
        activo: true,
      },
    }),
    // Query ÚNICA para configuración laboral de todas las empresas
    Promise.all(
      empresaIds.map(eid =>
        getDiasLaborablesEmpresa(eid).then(cfg => [eid, cfg] as const)
      )
    ).then(arr => new Map(arr)),
  ]);

  // 4. Procesar resultados sin queries adicionales
  const resultadosMap = new Map<string, BalancePeriodo>();

  for (const empleadoId of empleadoIds) {
    const empleado = empleados.find(e => e.id === empleadoId)!;
    const fichajesPorEmpleado = fichajes.filter(f => f.empleadoId === empleadoId);
    const diasLaborablesConfig = diasLaborablesMap.get(empleado.empresaId)!;
    const festivosSet = crearSetFestivos(festivos.filter(f => f.empresaId === empleado.empresaId));

    // Ya tenemos todo cachado, solo calcular
    const balance = procesarBalanceEmpleado(
      empleadoId,
      fichajesPorEmpleado,
      fechaInicio,
      fechaFin,
      diasLaborablesConfig,
      festivosSet
    );

    resultadosMap.set(empleadoId, balance);
  }

  return resultadosMap;
}

// app/api/fichajes/bolsa-horas/route.ts - USAR LA NUEVA FUNCIÓN
export async function GET(request: NextRequest) {
  const authResult = await requireAuthAsHR(request);
  const { session } = authResult;

  const empleados = await prisma.empleado.findMany({
    where: { empresaId: session.user.empresaId, estadoEmpleado: 'activo' },
    select: { id: true, nombre: true, apellidos: true, email: true, equipos: {...} },
  });

  const empleadoIds = empleados.map(e => e.id);
  const balancesMap = await calcularBalanceMensualBatch(empleadoIds, mes, anio);

  const balances = empleados
    .map(empleado => ({
      empleado,
      balance: balancesMap.get(empleado.id)!,
    }))
    .filter(b => b.balance.balanceTotal > 0);

  return successResponse({ mes, anio, balances });
}
```

**Mejora:**
- Antes: ~16,500 queries
- Después: ~50 queries
- Reducción: 99.7% ✅

---

## 2. SOLUCIÓN N+1: Revisión de Fichajes

### PROBLEMA ACTUAL
```typescript
// app/api/fichajes/revision/route.ts (línea 69-130)
const fichajes = await Promise.all(autoCompletados.map(async (ac) => {
  const fichaje = await prisma.fichaje.findUnique({  // ⚠️ N+1
    where: { id: fichajeId },
    include: { empleado: { include: { jornada: true } } },
  });
}));
```

### SOLUCIÓN: Precarga y Select
```typescript
// Obtener auto_completados
const autoCompletados = await prisma.autoCompletado.findMany({
  where: {
    empresaId: session.user.empresaId,
    estado: 'pendiente',
    tipo: 'fichaje_revision',
  },
  select: {
    id: true,
    empleadoId: true,
    datosOriginales: true,
    sugerencias: true,
  },
});

// PRECARGUAR todos los fichajes necesarios
const fichajeIds = autoCompletados
  .map(ac => (ac.datosOriginales as any)?.fichajeId)
  .filter(Boolean);

const fichajesMap = new Map(
  (await prisma.fichaje.findMany({
    where: { id: { in: fichajeIds } },
    include: {
      empleado: {
        select: { nombre: true, apellidos: true, jornadaId: true },
      },
      jornada: {
        select: { config: true },  // Solo config, no todo
      },
    },
  })).map(f => [f.id, f])
);

// PROCESAR sin queries adicionales
const fichajes = autoCompletados.map(ac => {
  const datosOriginales = ac.datosOriginales as any;
  const fichajeId = datosOriginales?.fichajeId;
  const fichaje = fichajeId ? fichajesMap.get(fichajeId) : null;
  
  // ... resto del procesamiento
  return {
    id: ac.id,
    fichajeId,
    empleadoNombre: fichaje?.empleado?.nombre,
    // ...
  };
});
```

**Mejora:**
- Antes: 1 + N queries (1 listado + N findUnique)
- Después: 2 queries (1 listado + 1 findMany precargado)
- Reducción: 95%+ ✅

---

## 3. SOLUCIÓN N+1: Eventos de Nómina

### PROBLEMA ACTUAL
```typescript
// app/api/nominas/eventos/route.ts (línea 69-128)
const eventosConAlertas = await Promise.all(
  eventos.map(async (evento) => {
    // Dentro del map...
    const compensaciones = await prisma.compensacionHoraExtra.findMany({
      where: { empresaId, createdAt: { gte, lt } },  // ⚠️ N+1
    });
  })
);
```

### SOLUCIÓN: Query Agregada Única
```typescript
// Obtener TODOS los eventos primero
const eventos = await prisma.eventoNomina.findMany({
  where: { empresaId: session.user.empresaId, ...(anio ? { anio } : {}) },
  select: { id: true, mes: true, anio: true },
});

// Una SOLA query para TODAS las compensaciones, agrupadas
const compensacionesPorMes = await prisma.compensacionHoraExtra.findMany({
  where: {
    empresaId: session.user.empresaId,
    createdAt: {
      gte: new Date(eventos[0].anio, 0, 1),
      lt: new Date(eventos[eventos.length - 1].anio + 1, 0, 1),
    },
  },
  select: {
    estado: true,
    horasBalance: true,
    createdAt: true,
  },
});

// Mapear compensaciones por mes/año (en memoria)
const compensacionesMap = new Map<string, typeof compensacionesPorMes>();
compensacionesPorMes.forEach(comp => {
  const key = `${comp.createdAt.getFullYear()}-${comp.createdAt.getMonth() + 1}`;
  if (!compensacionesMap.has(key)) {
    compensacionesMap.set(key, []);
  }
  compensacionesMap.get(key)!.push(comp);
});

// Procesar eventos SIN queries adicionales
const eventosConAlertas = eventos.map(evento => {
  const key = `${evento.anio}-${evento.mes}`;
  const compensaciones = compensacionesMap.get(key) || [];
  
  const horasExtra = compensaciones.reduce(
    (acc, item) => {
      const horas = Number(item.horasBalance);
      if (item.estado === 'pendiente') {
        acc.pendientes += 1;
        acc.horasPendientes += horas;
      } else if (item.estado === 'aprobada') {
        acc.aprobadas += 1;
      }
      acc.total += 1;
      return acc;
    },
    { pendientes: 0, aprobadas: 0, total: 0, horasPendientes: 0 }
  );

  return { ...evento, horasExtra };
});
```

**Mejora:**
- Antes: 1 + 12 queries (1 listado + 12 compensaciones)
- Después: 2 queries
- Reducción: 85% ✅

---

## 4. SOLUCIÓN: Agregar Índices Faltantes

### Archivo: prisma/schema.prisma

```prisma
// ===== FICHAJE EVENTO =====
model FichajeEvento {
  // ... existing fields
  
  @@index([fichajeId])
  @@index([tipo])
  @@index([hora])
  @@index([fichajeId, hora])
  
  // AGREGAR:
  @@index([fichajeId, tipo])     // Análisis de patrones
  @@index([tipo, hora])           // Estadísticas por tipo de evento
  @@index([fichajeId, createdAt]) // Análisis temporal
  @@map("fichaje_eventos")
}

// ===== EMPLEADO =====
model Empleado {
  // ... existing fields
  
  @@index([empresaId])
  @@index([usuarioId])
  @@index([managerId])
  @@index([jornadaId])
  @@index([puestoId])
  @@index([nif])
  @@index([email])
  @@index([estadoEmpleado])
  
  // AGREGAR:
  @@index([empresaId, activo])      // Búsqueda muy frecuente (línea 34 de /api/empleados)
  @@index([empresaId, estadoEmpleado]) // Análisis por estado
  @@map("empleados")
}

// ===== NOMINA =====
model Nomina {
  // ... existing fields
  
  @@unique([empleadoId, mes, anio])
  @@index([empleadoId])
  @@index([contratoId])
  @@index([eventoNominaId])
  @@index([documentoId])
  @@index([mes, anio])
  @@index([estado])
  @@index([empleadoId, estado])
  @@index([eventoNominaId, estado])
  
  // AGREGAR:
  @@index([empresaId, estado])      // Filtros por empresa + estado (falta en query)
  @@index([mes, anio, estado])      // Reportes por período
  @@index([estado, createdAt])      // Order by reciente con estado
  @@map("nominas")
}

// ===== EVENTO NOMINA =====
model EventoNomina {
  // ... existing fields
  
  @@unique([empresaId, mes, anio])
  @@index([empresaId, estado])
  @@index([empresaId, mes, anio])
  
  // AGREGAR:
  @@index([estado])                 // Simple query por estado (línea 40 de eventos/route.ts)
  @@index([empresaId, createdAt])   // Ordenamiento reciente
  @@map("eventos_nomina")
}

// ===== AUTO COMPLETADO =====
model AutoCompletado {
  // ... existing fields
  
  @@index([empresaId])
  @@index([empleadoId])
  @@index([tipo])
  @@index([estado])
  @@index([expiraEn])
  @@index([empresaId, tipo, estado])
  @@index([empresaId, estado, expiraEn])
  
  // AGREGAR:
  @@index([createdAt])              // Order by frecuente
  @@index([estado, createdAt])      // Pendientes ordenados por antigüedad
  @@map("auto_completados")
}

// ===== COMPENSACION HORA EXTRA =====
model CompensacionHoraExtra {
  // ... existing fields
  
  @@index([empresaId])
  @@index([empleadoId])
  @@index([estado])
  
  // AGREGAR (CRÍTICO para eventos/route.ts línea 88-100):
  @@index([createdAt, estado])      // Query: createdAt range + filter by estado
  @@index([empresaId, estado])      // Filter combo frecuente
  @@index([empleadoId, estado])     // Per-employee status
  @@map("compensaciones_horas_extra")
}

// ===== AUSENCIA =====
model Ausencia {
  // Índices actuales están OK
  // Solo add para completitud:
  @@index([empleadoId, estado])     // Redundante pero útil para algunos queries
}
```

**Comando para aplicar:**
```bash
npx prisma migrate dev --name "add_missing_indexes"
```

---

## 5. SOLUCIÓN: Cachear Balance de Horas

### Crear Nueva Tabla en Schema

```prisma
// prisma/schema.prisma

/// ResumenBalanceMensualFichaje - Cache de balance de horas
/// Evita recalcular 30+ queries por empleado
model ResumenBalanceMensualFichaje {
  id         String @id @default(uuid())
  empleadoId String
  mes        Int    @db.SmallInt
  anio       Int    @db.SmallInt

  // Balance calculado
  totalHorasTrabajadas Decimal @db.Decimal(10, 2)
  totalHorasEsperadas  Decimal @db.Decimal(10, 2)
  balanceTotal         Decimal @db.Decimal(10, 2)

  // Control
  calculadoEn DateTime @default(now())

  // Relations
  empleado Empleado @relation(fields: [empleadoId], references: [id], onDelete: Cascade)

  @@unique([empleadoId, mes, anio])
  @@index([empleadoId, anio, mes])
  @@index([createdAt])  // Para invalidación
  @@map("resumenes_balance_mensuales_fichaje")
}

model Empleado {
  // ... existing fields
  
  // Add relation:
  resumenesBalanceMensual ResumenBalanceMensualFichaje[]
}
```

### Crear Función de Cacheo

```typescript
// lib/calculos/balance-horas-cached.ts

import { prisma } from '@/lib/prisma';
import { calcularBalancePeriodo } from './balance-horas';

export async function obtenerBalanceMensualCacheado(
  empleadoId: string,
  mes: number,
  anio: number
): Promise<BalancePeriodo> {
  // 1. Buscar en cache
  let resumen = await prisma.resumenBalanceMensualFichaje.findUnique({
    where: {
      empleadoId_mes_anio: { empleadoId, mes, anio },
    },
  });

  if (resumen) {
    return {
      totalHorasTrabajadas: Number(resumen.totalHorasTrabajadas),
      totalHorasEsperadas: Number(resumen.totalHorasEsperadas),
      balanceTotal: Number(resumen.balanceTotal),
      dias: [], // Si necesitas, cargar aparte
    };
  }

  // 2. Calcular si no está en cache
  const balance = await calcularBalancePeriodo(
    empleadoId,
    new Date(anio, mes - 1, 1),
    new Date(anio, mes, 0)
  );

  // 3. Guardar en cache
  await prisma.resumenBalanceMensualFichaje.create({
    data: {
      empleadoId,
      mes,
      anio,
      totalHorasTrabajadas: balance.totalHorasTrabajadas,
      totalHorasEsperadas: balance.totalHorasEsperadas,
      balanceTotal: balance.balanceTotal,
    },
  });

  return balance;
}

// Invalidar cache cuando cambia un fichaje
export async function invalidarBalanceCache(
  empleadoId: string,
  fecha: Date
) {
  const mes = fecha.getMonth() + 1;
  const anio = fecha.getFullYear();

  await prisma.resumenBalanceMensualFichaje.deleteMany({
    where: { empleadoId, mes, anio },
  });
}
```

### Hooks para Invalidación

```typescript
// app/api/fichajes/route.ts

export async function POST(req: NextRequest) {
  // ... crear fichaje ...

  const fichajeActualizado = await prisma.fichaje.update({
    where: { id: fichaje.id },
    data: { ... },
  });

  // Invalidar cache
  try {
    await invalidarBalanceCache(empleadoId, fechaBase);
  } catch (error) {
    console.warn('Error invalidating balance cache:', error);
  }

  return createdResponse(fichajeActualizado);
}
```

---

## 6. SOLUCIÓN: Optimizar Jornada.config JSONB

### Opción A: Usar Select (Simple)

```typescript
// ANTES (Bad)
include: { jornada: true }

// DESPUÉS (Good)
include: {
  jornada: {
    select: {
      id: true,
      horasSemanales: true,
      config: true,  // Explicitly select config
      activa: true,
    }
  }
}
```

### Opción B: Precachear en Redis (Mejor para alta frecuencia)

```typescript
// lib/cache/jornada-cache.ts

import { redis } from '@/lib/redis';

export async function obtenerJornadaCacheada(jornadaId: string) {
  // Clave de cache
  const cacheKey = `jornada:${jornadaId}`;

  // Intentar obtener de Redis
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Si no está en cache, obtener de BD
  const jornada = await prisma.jornada.findUnique({
    where: { id: jornadaId },
    select: { id: true, nombre: true, config: true, horasSemanales: true },
  });

  if (!jornada) throw new Error('Jornada no encontrada');

  // Guardar en cache con TTL de 1 hora
  await redis.setex(cacheKey, 3600, JSON.stringify(jornada));

  return jornada;
}

// Invalidar cuando se actualiza jornada
export async function invalidarJornadaCache(jornadaId: string) {
  await redis.del(`jornada:${jornadaId}`);
}
```

### Opción C: Índice JSONB en Postgres (Mejor para queries sobre JSONB)

```sql
-- Si quieres buscar dentro de config, agregar índice
CREATE INDEX idx_jornada_config_tipo ON jornadas USING gin(config);

-- O más específico:
CREATE INDEX idx_jornada_config_lunes ON jornadas USING gin((config->'lunes'));
```

---

## RESUMEN DE ESFUERZO

| Solución | Esfuerzo | Impacto | Prioridad |
|----------|----------|--------|-----------|
| Bolsa de Horas Batch | 3h | 99.7% ↓ | CRÍTICA |
| Revisión Fichajes | 2h | 95% ↓ | CRÍTICA |
| Eventos Nómina | 1.5h | 85% ↓ | CRÍTICA |
| Índices | 0.5h | 15% ↓ | ALTA |
| Balance Cache | 4h | 50% ↓ | MEDIA |
| Jornada JSONB | 2h | 20% ↓ | MEDIA |

**Total tiempo estimado: ~13 horas**
**Mejora total en queries: 99%+ en casos extremos, 70-80% promedio**
