# Plan de Corrección: Sistema de Nóminas - Flujo Correcto

**Fecha**: 2025-12-11
**Prioridad**: CRÍTICA
**Complejidad**: ALTA

---

## 📋 RESUMEN EJECUTIVO

### Problema Identificado
El flujo actual está **invertido**: eliminamos la creación automática de nóminas al crear el evento, cuando en realidad las nóminas individuales DEBEN crearse automáticamente y el botón "Generar Pre-nóminas" debe solo ejecutar los cálculos sobre nóminas existentes.

### Flujo INCORRECTO (actual)
```
Crear Evento → NO crea nóminas
↓
Botón "Generar Pre-nóminas" → CREA nóminas + ejecuta cálculos
↓
Exportar / Importar / Publicar
```

### Flujo CORRECTO (objetivo)
```
Crear Evento → CREA nóminas individuales vacías automáticamente
↓
Revisar pendientes (alertas, complementos, horas extra)
↓
Botón "Generar Pre-nóminas" → EJECUTA CÁLCULOS sobre nóminas existentes
↓
Exportar Excel para gestoría
↓
Importar PDFs de gestoría
↓
Publicar a empleados
```

---

## 🎯 OBJETIVOS

1. **Crear nóminas individuales automáticamente** al crear el evento
2. **"Generar Pre-nóminas" solo ejecuta cálculos**, no crea registros
3. **Estados correctos**:
   - `pendiente`: Nóminas creadas sin cálculos finales (puede tener alertas/complementos pendientes)
   - `completada`: Cálculos ejecutados, Excel listo para exportar
   - `publicada`: PDFs importados y publicados a empleados
4. **Campo `prenominasGeneradas`**: Contar total de nóminas individuales (= empleados activos)
5. **Código limpio, eficiente y escalable**

---

## 📁 ARCHIVOS AFECTADOS

### Backend - Endpoints
1. ✅ `/app/api/nominas/eventos/route.ts` (POST)
2. ✅ `/app/api/nominas/eventos/[id]/generar-prenominas/route.ts`
3. ⚠️ `/app/api/nominas/eventos/[id]/exportar/route.ts` (verificar estados)
4. ⚠️ `/app/api/nominas/eventos/[id]/importar/route.ts` (verificar validaciones)
5. ⚠️ `/app/api/nominas/eventos/[id]/publicar/route.ts` (verificar transición estados)

### Backend - Lógica de Negocio
6. ✅ `/lib/calculos/generar-prenominas.ts` (función principal)
7. ⚠️ `/lib/imports/nominas-upload.ts` (validación de nóminas existentes)

### Frontend
8. ✅ `/app/(dashboard)/hr/payroll/payroll-client.tsx`
9. ⚠️ Componentes relacionados (modales, diálogos)

### Migraciones
10. ⚠️ Posible migración de datos para eventos existentes

---

## 📊 FASE 1: ANÁLISIS Y DEFINICIÓN

### 1.1 Estados del Evento (eventos_nomina.estado)

| Estado | Descripción | Nóminas Creadas | Cálculos Ejecutados | Puede Exportar | Puede Importar PDFs |
|--------|-------------|-----------------|---------------------|----------------|---------------------|
| `pendiente` | Evento creado, nóminas vacías | ✅ SÍ | ❌ NO | ❌ NO | ❌ NO |
| `completada` | Cálculos ejecutados | ✅ SÍ | ✅ SÍ | ✅ SÍ | ✅ SÍ |
| `publicada` | PDFs importados y publicados | ✅ SÍ | ✅ SÍ | ✅ SÍ | ✅ SÍ (actualizar) |

### 1.2 Campos del Evento

```typescript
eventos_nomina {
  estado: 'pendiente' | 'completada' | 'publicada'
  fechaCreacion: DateTime              // Cuando se creó el evento
  fechaGeneracionPrenominas: DateTime? // Cuando se ejecutaron los cálculos
  fechaPublicacion: DateTime?          // Cuando se publicó
  compensarHoras: Boolean              // Toggle al crear evento
  prenominasGeneradas: Int             // = total nóminas individuales creadas
  totalEmpleados: Int                  // = empleados activos al crear evento
}
```

### 1.3 Flujo Detallado

```
┌─────────────────────────────────────────────────────────────┐
│ PASO 1: CREAR EVENTO                                        │
│ POST /api/nominas/eventos                                   │
├─────────────────────────────────────────────────────────────┤
│ Input:                                                      │
│   - mes, anio                                               │
│   - compensarHoras (toggle)                                 │
│                                                             │
│ Proceso:                                                    │
│   1. Validar que no existe evento para mes/año             │
│   2. Crear evento en estado "pendiente"                    │
│   3. CREAR nóminas individuales para TODOS empleados activos│
│      - Estado inicial: vacías (sin cálculos)               │
│      - Detectar alertas iniciales (contrato, jornada, etc.)│
│   4. Actualizar evento:                                    │
│      - prenominasGeneradas = count(nominas creadas)        │
│      - totalEmpleados = empleados activos                  │
│                                                             │
│ Output:                                                     │
│   - evento { estado: 'pendiente', prenominasGeneradas: N } │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 2: REVISAR PENDIENTES (Opcional)                      │
├─────────────────────────────────────────────────────────────┤
│ - Revisar alertas críticas/advertencias                    │
│ - Compensar horas extra (si compensarHoras=true)           │
│ - Validar complementos                                     │
│                                                             │
│ Las nóminas YA EXISTEN, solo se revisan/actualizan         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 3: GENERAR PRE-NÓMINAS (Ejecutar Cálculos)            │
│ POST /api/nominas/eventos/[id]/generar-prenominas          │
├─────────────────────────────────────────────────────────────┤
│ Input:                                                      │
│   - eventoId (debe estar en estado "pendiente")            │
│                                                             │
│ Proceso:                                                    │
│   1. Validar estado = "pendiente"                          │
│   2. Buscar nóminas existentes del evento                  │
│   3. Para cada nómina:                                     │
│      - Calcular salario base (con tipoPagas)               │
│      - Aplicar complementos                                │
│      - Aplicar deducciones                                 │
│      - Aplicar compensaciones de horas (si corresponde)    │
│      - Calcular días trabajados/ausencias                  │
│      - Actualizar registro con cálculos                    │
│   4. Actualizar evento:                                    │
│      - estado = "completada"                               │
│      - fechaGeneracionPrenominas = now()                   │
│                                                             │
│ Output:                                                     │
│   - evento { estado: 'completada' }                        │
│   - resultado { nominasActualizadas: N }                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 4: EXPORTAR EXCEL                                     │
│ GET /api/nominas/eventos/[id]/exportar                     │
├─────────────────────────────────────────────────────────────┤
│ Validación: estado IN ('completada', 'publicada')          │
│ Genera Excel con todos los cálculos para gestoría          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 5: IMPORTAR PDFs                                      │
│ POST /api/nominas/upload + /api/nominas/upload/confirmar   │
├─────────────────────────────────────────────────────────────┤
│ Validación: Nóminas DEBEN existir (creadas en paso 1)      │
│ Actualiza nóminas con documentoId y datos extraídos IA     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 6: PUBLICAR                                           │
│ POST /api/nominas/eventos/[id]/publicar                    │
├─────────────────────────────────────────────────────────────┤
│ Validación: estado = 'completada'                          │
│ Proceso:                                                    │
│   - Notificar a empleados                                  │
│   - estado = 'publicada'                                   │
│   - fechaPublicacion = now()                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 FASE 2: CAMBIOS EN CÓDIGO

### Cambio 1: POST /api/nominas/eventos (CRÍTICO)

**Archivo**: `/app/api/nominas/eventos/route.ts`

**Estado Actual**: NO crea nóminas, solo crea el evento vacío.

**Cambio Requerido**: DEBE crear nóminas automáticamente.

```typescript
// ANTES (❌ INCORRECTO):
export async function POST(req: NextRequest) {
  // ... validaciones ...

  const evento = await prisma.eventos_nomina.create({
    data: {
      empresaId: session.user.empresaId,
      mes: data.mes,
      anio: data.anio,
      estado: 'pendiente',
      compensarHoras: data.compensarHoras || false,
      fechaLimiteComplementos: fechaLimite,
      totalEmpleados: 0,        // ❌ Vacío
      prenominasGeneradas: 0,   // ❌ Vacío
    },
  });

  return NextResponse.json({ evento });  // ❌ Sin crear nóminas
}

// DESPUÉS (✅ CORRECTO):
export async function POST(req: NextRequest) {
  // ... validaciones ...

  // 1. Crear el evento
  const evento = await prisma.eventos_nomina.create({
    data: {
      empresaId: session.user.empresaId,
      mes: data.mes,
      anio: data.anio,
      estado: 'pendiente',
      compensarHoras: data.compensarHoras || false,
      fechaLimiteComplementos: fechaLimite,
      totalEmpleados: 0,
      prenominasGeneradas: 0,
    },
  });

  // 2. ✅ CREAR NÓMINAS INDIVIDUALES AUTOMÁTICAMENTE
  const resultado = await crearNominasVacias({
    eventoId: evento.id,
    empresaId: session.user.empresaId,
    mes: data.mes,
    anio: data.anio,
  });

  // 3. Actualizar evento con counts
  const eventoActualizado = await prisma.eventos_nomina.update({
    where: { id: evento.id },
    data: {
      totalEmpleados: resultado.empleadosActivos,
      prenominasGeneradas: resultado.nominasCreadas,
    },
  });

  return NextResponse.json({
    evento: eventoActualizado,
    resultado,
    message: `Evento creado con ${resultado.nominasCreadas} nóminas. Revisa pendientes antes de generar pre-nóminas.`
  });
}
```

### Cambio 2: Función `crearNominasVacias()` (NUEVA)

**Archivo**: `/lib/calculos/crear-nominas-vacias.ts` (NUEVO)

**Propósito**: Crear registros de nóminas vacías (sin cálculos finales) para todos los empleados activos.

```typescript
export async function crearNominasVacias({
  eventoId,
  empresaId,
  mes,
  anio,
}: {
  eventoId: string;
  empresaId: string;
  mes: number;
  anio: number;
}): Promise<{
  empleadosActivos: number;
  nominasCreadas: number;
  alertasGeneradas: number;
}> {
  // 1. Obtener empleados activos
  const empleados = await prisma.empleados.findMany({
    where: {
      empresaId,
      activo: true,
    },
    include: {
      contratos: {
        where: {
          fechaInicio: { lte: new Date(anio, mes, 0) },
          OR: [
            { fechaFin: null },
            { fechaFin: { gte: new Date(anio, mes - 1, 1) } },
          ],
        },
      },
      empleado_complementos: {
        where: {
          fechaInicio: { lte: new Date(anio, mes, 0) },
          OR: [
            { fechaFin: null },
            { fechaFin: { gte: new Date(anio, mes - 1, 1) } },
          ],
        },
      },
    },
  });

  let nominasCreadas = 0;
  let alertasGeneradas = 0;

  // 2. Crear nóminas vacías
  for (const empleado of empleados) {
    const contratoActivo = empleado.contratos[0] || null;
    const tieneComplementos = empleado.empleado_complementos.length > 0;

    // Crear nómina vacía (sin cálculos)
    const nomina = await prisma.nominas.create({
      data: {
        empleadoId: empleado.id,
        eventoNominaId: eventoId,
        mes,
        anio,
        estado: 'pendiente',
        contratoId: contratoActivo?.id || null,

        // Valores iniciales vacíos (se calcularán después)
        salarioBase: null,
        totalComplementos: null,
        totalDeducciones: null,
        totalBruto: null,
        totalNeto: null,
        diasTrabajados: 0,
        diasAusencias: 0,

        // Flags
        complementosPendientes: tieneComplementos,
      },
    });

    nominasCreadas++;

    // 3. Generar alertas iniciales (sin bloquear)
    const alertas = await generarAlertasIniciales(nomina.id, empleado, contratoActivo);
    alertasGeneradas += alertas.length;
  }

  return {
    empleadosActivos: empleados.length,
    nominasCreadas,
    alertasGeneradas,
  };
}

// Función auxiliar para alertas iniciales
async function generarAlertasIniciales(
  nominaId: string,
  empleado: any,
  contrato: any
): Promise<string[]> {
  const alertas: Array<{
    nominaId: string;
    tipo: string;
    categoria: string;
    mensaje: string;
  }> = [];

  // Alerta: Sin contrato activo
  if (!contrato) {
    alertas.push({
      nominaId,
      tipo: 'critico',
      categoria: 'contrato_faltante',
      mensaje: 'Empleado sin contrato activo para este periodo',
    });
  }

  // Alerta: Sin salario base definido
  if (!empleado.salarioBaseMensual && !empleado.salarioBaseAnual && !contrato?.salarioBaseAnual) {
    alertas.push({
      nominaId,
      tipo: 'critico',
      categoria: 'salario_faltante',
      mensaje: 'No hay salario base definido',
    });
  }

  // Más alertas según negocio...

  if (alertas.length > 0) {
    await prisma.alertas_nomina.createMany({
      data: alertas,
    });
  }

  return alertas.map(a => a.categoria);
}
```

### Cambio 3: Refactorizar `generarPrenominasEvento()` (CRÍTICO)

**Archivo**: `/lib/calculos/generar-prenominas.ts`

**Estado Actual**: Crea o vincula nóminas + ejecuta cálculos (mezcla responsabilidades)

**Cambio Requerido**: SOLO ejecutar cálculos sobre nóminas existentes

```typescript
// ANTES (❌ INCORRECTO - hace dos cosas):
export async function generarPrenominasEvento(options) {
  // ... código complejo que crea O vincula nóminas ...

  return {
    prenominasCreadas: X,      // ❌ No debería crear
    prenominasVinculadas: Y,   // ❌ No debería vincular
  };
}

// DESPUÉS (✅ CORRECTO - solo calcula):
export async function ejecutarCalculosNominas(options: {
  eventoId: string;
  empresaId: string;
  mes: number;
  anio: number;
}): Promise<{
  totalProcesados: number;
  nominasActualizadas: number;
  compensacionesAsignadas: number;
  empleadosConComplementos: number;
  complementosConfigurados: number;
}> {
  const { eventoId, empresaId, mes, anio } = options;

  // 1. Obtener NÓMINAS EXISTENTES (creadas en paso 1)
  const nominas = await prisma.nominas.findMany({
    where: {
      eventoNominaId: eventoId,
      mes,
      anio,
    },
    include: {
      empleado: {
        include: {
          contratos: { /* ... */ },
          empleado_complementos: { /* ... */ },
          ausencias: { /* ... */ },
        },
      },
    },
  });

  if (nominas.length === 0) {
    throw new Error('No hay nóminas para calcular. Crea el evento primero.');
  }

  let nominasActualizadas = 0;
  let compensacionesAsignadas = 0;
  let empleadosConComplementos = 0;
  let complementosConfigurados = 0;

  // 2. EJECUTAR CÁLCULOS para cada nómina
  for (const nomina of nominas) {
    const empleado = nomina.empleado;
    const contratoActivo = empleado.contratos[0] || null;

    // Calcular salario base
    const salarioMensual = calcularSalarioMensual(empleado, contratoActivo);
    const salarioBase = calcularSalarioProporcionado(
      salarioMensual,
      nomina.diasTrabajados,
      nomina.diasAusencias
    );

    // Calcular complementos
    const totalComplementos = calcularComplementos(empleado.empleado_complementos, salarioMensual);
    if (empleado.empleado_complementos.length > 0) {
      empleadosConComplementos++;
      complementosConfigurados += empleado.empleado_complementos.length;
    }

    // Calcular deducciones
    const totalDeducciones = calcularDeducciones(salarioBase, totalComplementos);

    // Calcular totales
    const totalBruto = salarioBase.plus(totalComplementos);
    const totalNeto = totalBruto.minus(totalDeducciones);

    // Buscar compensaciones de horas aprobadas
    const compensacion = await buscarCompensacionPendiente(empleado.id, empresaId);
    if (compensacion) {
      compensacionesAsignadas++;
    }

    // 3. ACTUALIZAR nómina con cálculos
    await prisma.nominas.update({
      where: { id: nomina.id },
      data: {
        salarioBase,
        totalComplementos,
        totalDeducciones,
        totalBruto,
        totalNeto,
        compensacionId: compensacion?.id || null,
      },
    });

    nominasActualizadas++;
  }

  return {
    totalProcesados: nominas.length,
    nominasActualizadas,
    compensacionesAsignadas,
    empleadosConComplementos,
    complementosConfigurados,
  };
}
```

### Cambio 4: Endpoint `generar-prenominas` (MODIFICAR)

**Archivo**: `/app/api/nominas/eventos/[id]/generar-prenominas/route.ts`

```typescript
// CAMBIAR importación:
// ANTES:
import { generarPrenominasEvento } from '@/lib/calculos/generar-prenominas';

// DESPUÉS:
import { ejecutarCalculosNominas } from '@/lib/calculos/generar-prenominas';

// CAMBIAR llamada:
// ANTES:
const resultado = await generarPrenominasEvento({
  eventoId: evento.id,
  empresaId: session.user.empresaId,
  mes: evento.mes,
  anio: evento.anio,
});

// DESPUÉS:
const resultado = await ejecutarCalculosNominas({
  eventoId: evento.id,
  empresaId: session.user.empresaId,
  mes: evento.mes,
  anio: evento.anio,
});

// CAMBIAR actualización de evento:
await prisma.eventos_nomina.update({
  where: { id: evento.id },
  data: {
    estado: 'completada',
    fechaGeneracionPrenominas: new Date(),
    // ❌ NO cambiar prenominasGeneradas (ya está seteado al crear)
  },
});
```

### Cambio 5: Frontend `payroll-client.tsx` (MODIFICAR)

**Archivo**: `/app/(dashboard)/hr/payroll/payroll-client.tsx`

**Cambios en lógica**:

1. **Mensaje al crear evento**: Cambiar de "Evento creado. Revisa pendientes..." a "Evento creado con X nóminas. Revisa pendientes..."

2. **Botón "Generar Pre-nóminas"**: Cambiar texto a "Ejecutar Cálculos" o mantener pero actualizar descripción

3. **Validación estado**: Asegurar que "Generar Pre-nóminas" solo esté disponible en estado `pendiente`

4. **Display de stats**: Mostrar `prenominasGeneradas` (nóminas creadas) vs nóminas con cálculos completados

```typescript
// Ejemplo de display:
<div className="stats">
  <p>Nóminas creadas: {evento.prenominasGeneradas}</p>
  <p>Estado: {evento.estado}</p>
  {evento.estado === 'pendiente' && (
    <Button onClick={() => handleGenerarPrenominas(evento.id)}>
      Ejecutar Cálculos
    </Button>
  )}
  {evento.estado === 'completada' && (
    <>
      <Button onClick={() => handleExportar(evento.id)}>
        Exportar Excel
      </Button>
      <Button onClick={() => handleImportarPDFs(evento.id)}>
        Importar PDFs
      </Button>
    </>
  )}
</div>
```

---

## 🧪 FASE 3: TESTING

### Test 1: Crear Evento
```bash
POST /api/nominas/eventos
{
  "mes": 12,
  "anio": 2025,
  "compensarHoras": false
}

✅ Esperar:
- evento.estado = "pendiente"
- evento.prenominasGeneradas = N (empleados activos)
- N registros en tabla nominas (uno por empleado)
- Nóminas con salarioBase = null (sin calcular)
```

### Test 2: Generar Pre-nóminas
```bash
POST /api/nominas/eventos/{id}/generar-prenominas

✅ Esperar:
- evento.estado = "completada"
- evento.fechaGeneracionPrenominas = now()
- Nóminas con salarioBase != null (calculado)
- Complementos aplicados
- Compensaciones asignadas (si compensarHoras=true)
```

### Test 3: Exportar Excel
```bash
GET /api/nominas/eventos/{id}/exportar

✅ Esperar:
- Excel con todas las nóminas
- Salarios calculados correctamente
- Complementos incluidos
```

### Test 4: Importar PDFs
```bash
POST /api/nominas/upload
POST /api/nominas/upload/confirmar

✅ Esperar:
- PDFs asignados a nóminas existentes
- Error si nómina no existe
```

### Test 5: Publicar
```bash
POST /api/nominas/eventos/{id}/publicar

✅ Esperar:
- evento.estado = "publicada"
- Notificaciones enviadas
```

---

## ⚠️ RIESGOS Y MITIGACIONES

### Riesgo 1: Datos existentes inconsistentes
**Mitigación**: Script de migración para eventos históricos

### Riesgo 2: Performance al crear muchas nóminas
**Mitigación**: Usar `createMany` y procesamiento batch

### Riesgo 3: Alertas iniciales pueden ser muchas
**Mitigación**: Crear alertas de forma asíncrona (background job)

### Riesgo 4: Rollback complejo si falla creación
**Mitigación**: Usar transacciones de Prisma

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Crear archivo `/lib/calculos/crear-nominas-vacias.ts`
- [ ] Refactorizar `/lib/calculos/generar-prenominas.ts` → `ejecutarCalculosNominas()`
- [ ] Modificar `POST /api/nominas/eventos/route.ts` para llamar a `crearNominasVacias()`
- [ ] Actualizar `/app/api/nominas/eventos/[id]/generar-prenominas/route.ts`
- [ ] Verificar `/app/api/nominas/eventos/[id]/exportar/route.ts` (estados)
- [ ] Verificar `/app/api/nominas/eventos/[id]/importar/route.ts` (validaciones)
- [ ] Verificar `/app/api/nominas/eventos/[id]/publicar/route.ts` (transiciones)
- [ ] Actualizar `/lib/imports/nominas-upload.ts` (mensaje de error más claro)
- [ ] Actualizar `/app/(dashboard)/hr/payroll/payroll-client.tsx` (UI y mensajes)
- [ ] Crear script de migración de datos `/scripts/migrar-eventos-existentes.ts`
- [ ] Testing completo del flujo
- [ ] Documentación actualizada

---

## 🚀 ORDEN DE EJECUCIÓN

1. **FASE 1**: Crear `crear-nominas-vacias.ts` (nueva función)
2. **FASE 2**: Refactorizar `generar-prenominas.ts` (separar responsabilidades)
3. **FASE 3**: Modificar endpoint `POST /api/nominas/eventos` (integrar creación)
4. **FASE 4**: Actualizar endpoint `generar-prenominas` (usar nueva función)
5. **FASE 5**: Actualizar frontend (UI y mensajes)
6. **FASE 6**: Verificar endpoints relacionados (exportar, importar, publicar)
7. **FASE 7**: Testing E2E
8. **FASE 8**: Migración de datos (si necesario)

---

**Fin del plan**
