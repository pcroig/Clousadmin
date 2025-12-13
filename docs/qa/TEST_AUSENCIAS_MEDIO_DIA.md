# Test de Validación - Ausencias Medio Día

**Fecha:** 10 Dic 2024
**Corrección aplicada:** Issue #2 - Lógica inconsistente en `validarFichajeCompleto()`

---

## 🎯 Objetivo

Validar que la lógica de ausencias medio día es **consistente** en:
1. `validarFichajeCompleto()` - Define qué eventos son requeridos
2. `cuadrar/route.ts` - Decide qué eventos crear
3. `validarDescansoAntesDeSalida()` - Valida si requiere pausas

---

## ✅ Corrección Aplicada

### Antes (Incorrecto)

```typescript
// lib/calculos/fichajes.ts - ANTES
if (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'tarde') {
  eventosRequeridos.push('entrada'); // ❌ Requiere entrada incluso con ausencia mañana
}
```

### Después (Correcto)

```typescript
// lib/calculos/fichajes.ts - DESPUÉS
if (!ausenciaMedioDia.tieneAusencia) {
  eventosRequeridos.push('entrada', 'salida'); // ✅ Día completo
} else if (ausenciaMedioDia.medioDia === 'manana') {
  eventosRequeridos.push('salida'); // ✅ Solo tarde
} else if (ausenciaMedioDia.medioDia === 'tarde') {
  eventosRequeridos.push('entrada'); // ✅ Solo mañana
}
```

---

## 🧪 Casos de Prueba

### Caso A: Ausencia Medio Día Mañana

**Setup:**
1. Empleado con ausencia medio día mañana
2. Fichaje con solo salida registrada (14:00)

**Expectativas:**

| Componente | Comportamiento Esperado | ✅/❌ |
|------------|------------------------|------|
| `validarFichajeCompleto()` | NO requiere entrada, SÍ requiere salida | ✅ |
| `cuadrar/route.ts` | NO crea entrada, puede usar salida existente | ✅ |
| `validarDescansoAntesDeSalida()` | NO requiere pausas (ausencia medio día) | ✅ |
| Estado final | `completo: true` si tiene salida | ✅ |
| Horas trabajadas | ~4h (medio día) | ✅ |

**SQL de Validación:**

```sql
-- Verificar fichaje con ausencia mañana
SELECT
  f.id,
  f.fecha,
  f.estado,
  f.horasTrabajadas,
  COUNT(CASE WHEN fe.tipo = 'entrada' THEN 1 END) as entradas,
  COUNT(CASE WHEN fe.tipo = 'salida' THEN 1 END) as salidas,
  a.periodo as ausencia_periodo
FROM fichajes f
LEFT JOIN fichaje_eventos fe ON f.id = fe.fichajeId
LEFT JOIN ausencias a ON a.empleadoId = f.empleadoId
  AND a.medioDia = true
  AND f.fecha BETWEEN a.fechaInicio AND a.fechaFin
WHERE f.empleadoId = 'EMPLEADO_ID'
  AND f.fecha = 'FECHA_AUSENCIA'
GROUP BY f.id, a.periodo;

-- Resultado esperado:
-- estado: 'finalizado'
-- horasTrabajadas: ~4
-- entradas: 0
-- salidas: 1
-- ausencia_periodo: 'manana'
```

---

### Caso B: Ausencia Medio Día Tarde

**Setup:**
1. Empleado con ausencia medio día tarde
2. Fichaje con solo entrada registrada (09:00)

**Expectativas:**

| Componente | Comportamiento Esperado | ✅/❌ |
|------------|------------------------|------|
| `validarFichajeCompleto()` | SÍ requiere entrada, NO requiere salida | ✅ |
| `cuadrar/route.ts` | Puede usar entrada existente, NO crea salida | ✅ |
| `validarDescansoAntesDeSalida()` | NO requiere pausas (ausencia medio día) | ✅ |
| Estado final | `completo: true` si tiene entrada | ✅ |
| Horas trabajadas | ~4h (medio día) | ✅ |

**SQL de Validación:**

```sql
-- Verificar fichaje con ausencia tarde
SELECT
  f.id,
  f.estado,
  f.horasTrabajadas,
  COUNT(CASE WHEN fe.tipo = 'entrada' THEN 1 END) as entradas,
  COUNT(CASE WHEN fe.tipo = 'salida' THEN 1 END) as salidas
FROM fichajes f
LEFT JOIN fichaje_eventos fe ON f.id = fe.fichajeId
WHERE f.id = 'FICHAJE_ID'
GROUP BY f.id;

-- Resultado esperado:
-- estado: 'finalizado'
-- horasTrabajadas: ~4
-- entradas: 1
-- salidas: 0
```

---

### Caso C: Sin Ausencia (Día Completo)

**Setup:**
1. Empleado sin ausencia
2. Fichaje con entrada y salida

**Expectativas:**

| Componente | Comportamiento Esperado | ✅/❌ |
|------------|------------------------|------|
| `validarFichajeCompleto()` | Requiere entrada, salida, pausas | ✅ |
| `cuadrar/route.ts` | Crea eventos según jornada | ✅ |
| `validarDescansoAntesDeSalida()` | SÍ requiere pausas | ✅ |
| Estado final | `completo: true` solo con todos los eventos | ✅ |
| Horas trabajadas | ~8h (día completo) | ✅ |

---

## 🔍 Test de Regresión

### Flujo Completo: Ausencia Mañana

```typescript
// 1. Crear ausencia medio día mañana
const ausencia = await prisma.ausencias.create({
  data: {
    empresaId,
    empleadoId,
    tipoAusenciaId,
    fechaInicio: fecha,
    fechaFin: fecha,
    medioDia: true,
    periodo: 'manana',
    estado: 'confirmada',
    diasTotales: 0.5,
  }
});

// 2. Crear fichaje con solo salida
const fichaje = await prisma.fichajes.create({
  data: {
    empresaId,
    empleadoId,
    jornadaId,
    fecha,
    estado: 'en_curso',
    tipoFichaje: 'ordinario',
  }
});

await prisma.fichaje_eventos.create({
  data: {
    fichajeId: fichaje.id,
    tipo: 'salida',
    hora: new Date(`${fecha}T14:00:00`),
    editado: false,
  }
});

// 3. Validar fichaje completo
const validacion = await validarFichajeCompleto(fichaje.id);

// EXPECTATIVA:
expect(validacion.completo).toBe(true); // ✅
expect(validacion.eventosRequeridos).toEqual(['salida']); // ✅
expect(validacion.eventosFaltantes).toEqual([]); // ✅

// 4. Cuadrar fichaje
const response = await fetch('/api/fichajes/cuadrar', {
  method: 'POST',
  body: JSON.stringify({ fichajeIds: [fichaje.id] })
});

// EXPECTATIVA:
expect(response.ok).toBe(true);
const result = await response.json();
expect(result.cuadrados).toBe(1); // ✅
expect(result.errores).toEqual([]); // ✅

// 5. Verificar estado final
const fichajeActualizado = await prisma.fichajes.findUnique({
  where: { id: fichaje.id },
  include: { eventos: true }
});

expect(fichajeActualizado.estado).toBe('finalizado'); // ✅
expect(fichajeActualizado.eventos.length).toBe(1); // ✅ Solo salida
expect(fichajeActualizado.eventos[0].tipo).toBe('salida'); // ✅
expect(fichajeActualizado.horasTrabajadas).toBeCloseTo(4, 1); // ✅ ~4h
```

---

## 📊 Checklist de Validación Manual

### Pre-requisitos
- [ ] Ejecutar script de seed: `npx tsx scripts/seed-fichajes-qa.ts`
- [ ] Verificar que Caso 7 tiene ausencia medio día mañana

### Validaciones

#### 1. Ausencia Mañana (Caso 7)

- [ ] **Worker NO propone entrada**
  ```sql
  SELECT tipo FROM fichaje_eventos_propuestos
  WHERE fichajeId = 'CASO_7_ID';
  -- Esperado: solo 'salida', NO 'entrada'
  ```

- [ ] **`validarFichajeCompleto()` NO requiere entrada**
  - Abrir DevTools → Network
  - Llamar a `/api/fichajes/[id]` con el ID del Caso 7
  - Verificar response: `eventosRequeridos: ['salida']`

- [ ] **Cuadrar NO crea entrada**
  ```sql
  SELECT tipo, motivoEdicion FROM fichaje_eventos
  WHERE fichajeId = 'CASO_7_ID'
  ORDER BY hora ASC;
  -- Esperado: solo evento 'salida'
  ```

- [ ] **Estado finalizado correctamente**
  ```sql
  SELECT estado, horasTrabajadas FROM fichajes
  WHERE id = 'CASO_7_ID';
  -- Esperado: estado='finalizado', horasTrabajadas ~4
  ```

#### 2. Ausencia Tarde (Crear manualmente)

- [ ] Crear ausencia medio día tarde para un empleado
- [ ] Crear fichaje con solo entrada (09:00)
- [ ] Ejecutar worker → Verificar que NO propone salida
- [ ] Cuadrar fichaje → Verificar que NO crea salida
- [ ] Estado finalizado con solo entrada
- [ ] Horas trabajadas ~4h

#### 3. Sin Ausencia (Caso 1-6, 8-10)

- [ ] Verificar que fichajes sin ausencia SÍ requieren entrada + salida
- [ ] Worker propone ambos eventos si faltan
- [ ] Cuadrar crea ambos eventos

---

## ✅ Criterios de Aceptación

### PASS si:

1. ✅ Fichaje con ausencia mañana + salida → `completo: true`
2. ✅ Fichaje con ausencia tarde + entrada → `completo: true`
3. ✅ Fichaje con ausencia NO requiere pausas
4. ✅ Cuadrar NO crea eventos durante horario de ausencia
5. ✅ Horas trabajadas ~4h para ausencias medio día
6. ✅ Sin ausencia requiere entrada + salida (comportamiento normal)

### FAIL si:

- ❌ Fichaje con ausencia mañana requiere entrada
- ❌ Fichaje con ausencia tarde requiere salida
- ❌ `validarFichajeCompleto()` devuelve `completo: false` cuando solo falta evento de ausencia
- ❌ Worker propone eventos durante horario de ausencia
- ❌ Cuadrar crea eventos durante horario de ausencia

---

## 🐛 Si el Test Falla

### Debug: Verificar Consistencia

```typescript
// Función helper para verificar consistencia
async function verificarConsistenciaAusencias(fichajeId: string) {
  const fichaje = await prisma.fichajes.findUnique({
    where: { id: fichajeId },
    include: { eventos: true, empleado: true }
  });

  const ausencia = await obtenerAusenciaMedioDia(
    fichaje.empleadoId,
    fichaje.fecha
  );

  const validacion = await validarFichajeCompleto(fichajeId);

  console.log({
    ausenciaMedioDia: ausencia.medioDia,
    eventosRequeridos: validacion.eventosRequeridos,
    eventosExistentes: fichaje.eventos.map(e => e.tipo),
    eventosFaltantes: validacion.eventosFaltantes,
    completo: validacion.completo,
  });
}
```

### Puntos de Breakpoint

1. [lib/calculos/fichajes.ts:1348-1358](../../lib/calculos/fichajes.ts#L1348-L1358) - `validarFichajeCompleto()`
2. [app/api/fichajes/cuadrar/route.ts:705-743](../../app/api/fichajes/cuadrar/route.ts#L705-L743) - Lógica de creación
3. [lib/calculos/fichajes.ts:1488-1504](../../lib/calculos/fichajes.ts#L1488-L1504) - `validarDescansoAntesDeSalida()`

---

## 📝 Resultado del Test

**Fecha de ejecución:** __________

**Tester:** __________

**Estado:** ⬜ PASS / ⬜ FAIL

**Notas:**

```
[Espacio para notas del tester]
```

**Issues encontrados:**

```
[Lista de issues si FAIL]
```

---

**Última actualización:** 10 Dic 2024
**Corrección aplicada:** Commit [SHA]
