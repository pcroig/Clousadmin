# Corrección Issue #2 - Lógica Inconsistente Ausencias Medio Día

**Fecha:** 10 Dic 2024
**Prioridad:** 🔴 CRÍTICA
**Estado:** ✅ CORREGIDO

---

## 🎯 Problema Identificado

### Inconsistencia entre Componentes

Había **lógica contradictoria** en dos lugares del código:

#### ✅ Componente A: `cuadrar/route.ts` (Correcto)

```typescript
// app/api/fichajes/cuadrar/route.ts:705-743
if (ausenciaMedioDia.tieneAusencia && ausenciaMedioDia.medioDia === 'manana') {
  console.warn('Ausencia mañana - NO se crea entrada');
  // NO crea entrada ✅
}

if (ausenciaMedioDia.tieneAusencia && ausenciaMedioDia.medioDia === 'tarde') {
  console.warn('Ausencia tarde - NO se crea salida');
  // NO crea salida ✅
}
```

**Lógica:** Ausencia mañana → NO crear entrada, Ausencia tarde → NO crear salida

#### ❌ Componente B: `validarFichajeCompleto()` (Incorrecto)

```typescript
// lib/calculos/fichajes.ts:1345-1350 - ANTES (INCORRECTO)
if (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'tarde') {
  eventosRequeridos.push('entrada'); // ❌ Requiere entrada incluso con ausencia mañana
}

if (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'manana') {
  eventosRequeridos.push('salida'); // ❌ Requiere salida incluso con ausencia tarde
}
```

**Lógica:** Ausencia mañana → SÍ requiere entrada (CONTRADICTORIO)

### Consecuencia

Un fichaje con ausencia medio día mañana:
1. `cuadrar/route.ts` NO crea entrada (correcto)
2. `validarFichajeCompleto()` dice que SÍ requiere entrada (incorrecto)
3. **Resultado:** Fichaje NUNCA se marca como completo ❌

---

## ✅ Solución Aplicada

### Corrección en `validarFichajeCompleto()`

**Archivo:** [lib/calculos/fichajes.ts](../../lib/calculos/fichajes.ts)

**Líneas afectadas:**
- Jornada Fija: 1344-1358
- Jornada Flexible: 1378-1390

### Código Corregido

```typescript
// DESPUÉS (CORRECTO)
if (!ausenciaMedioDia.tieneAusencia) {
  // Día completo trabajado: requiere entrada y salida
  eventosRequeridos.push('entrada');
  eventosRequeridos.push('salida');
} else if (ausenciaMedioDia.medioDia === 'manana') {
  // Ausencia mañana: solo requiere salida (trabaja solo la tarde)
  eventosRequeridos.push('salida');
} else if (ausenciaMedioDia.medioDia === 'tarde') {
  // Ausencia tarde: solo requiere entrada (trabaja solo la mañana)
  eventosRequeridos.push('entrada');
}
```

### Lógica Unificada

| Escenario | Eventos Requeridos | Eventos Creados | Estado Final |
|-----------|-------------------|-----------------|--------------|
| Sin ausencia | entrada + salida + pausas | Todos los requeridos | ✅ `completo: true` |
| Ausencia mañana | **solo salida** | **solo salida** | ✅ `completo: true` |
| Ausencia tarde | **solo entrada** | **solo entrada** | ✅ `completo: true` |

---

## 📊 Cambios Realizados

### Archivos Modificados

1. **[lib/calculos/fichajes.ts:1344-1358](../../lib/calculos/fichajes.ts#L1344-L1358)**
   - Función: `validarFichajeCompleto()` - Jornada Fija
   - Cambio: Lógica de eventos requeridos para ausencias medio día

2. **[lib/calculos/fichajes.ts:1378-1390](../../lib/calculos/fichajes.ts#L1378-L1390)**
   - Función: `validarFichajeCompleto()` - Jornada Flexible
   - Cambio: Misma lógica para consistencia

### Funciones NO Modificadas (Ya Correctas)

- ✅ `validarDescansoAntesDeSalida()` - Ya tenía lógica correcta (línea 1495, 1501)
- ✅ `cuadrar/route.ts` - Tu corrección #5 ya era correcta

---

## 🧪 Validación de la Corrección

### Test Unitario (Concepto)

```typescript
describe('validarFichajeCompleto - Ausencias Medio Día', () => {
  it('Ausencia mañana: solo requiere salida', async () => {
    // Setup: Fichaje con ausencia mañana y solo salida registrada
    const validacion = await validarFichajeCompleto(fichajeId);

    expect(validacion.eventosRequeridos).toEqual(['salida']); // ✅
    expect(validacion.eventosFaltantes).toEqual([]); // ✅
    expect(validacion.completo).toBe(true); // ✅
  });

  it('Ausencia tarde: solo requiere entrada', async () => {
    // Setup: Fichaje con ausencia tarde y solo entrada registrada
    const validacion = await validarFichajeCompleto(fichajeId);

    expect(validacion.eventosRequeridos).toEqual(['entrada']); // ✅
    expect(validacion.eventosFaltantes).toEqual([]); // ✅
    expect(validacion.completo).toBe(true); // ✅
  });

  it('Sin ausencia: requiere entrada + salida', async () => {
    // Setup: Fichaje sin ausencia
    const validacion = await validarFichajeCompleto(fichajeId);

    expect(validacion.eventosRequeridos).toContain('entrada'); // ✅
    expect(validacion.eventosRequeridos).toContain('salida'); // ✅
  });
});
```

### Test Manual

Ver [TEST_AUSENCIAS_MEDIO_DIA.md](./TEST_AUSENCIAS_MEDIO_DIA.md) para checklist completo.

**Caso crítico:** Caso 7 del seed (ausencia medio día mañana)

```bash
# 1. Ejecutar seed
npx tsx scripts/seed-fichajes-qa.ts

# 2. Verificar Caso 7 en BD
psql -d tu_database -c "
SELECT
  f.id,
  f.fecha,
  COUNT(CASE WHEN fe.tipo = 'entrada' THEN 1 END) as entradas,
  COUNT(CASE WHEN fe.tipo = 'salida' THEN 1 END) as salidas,
  a.periodo
FROM fichajes f
LEFT JOIN fichaje_eventos fe ON f.id = fe.fichajeId
LEFT JOIN ausencias a ON a.empleadoId = f.empleadoId
WHERE f.fecha >= CURRENT_DATE - INTERVAL '10 days'
  AND a.medioDia = true
GROUP BY f.id, a.periodo;
"

# 3. Cuadrar el fichaje vía API o UI

# 4. Verificar estado final
# Esperado: completo=true, solo salida, ~4h trabajadas
```

---

## 📈 Impacto de la Corrección

### Antes (Problema)

```
Fichaje con ausencia mañana + solo salida
  ↓
validarFichajeCompleto() → completo: false ❌
  ↓
Fichaje queda pendiente indefinidamente ❌
```

### Después (Correcto)

```
Fichaje con ausencia mañana + solo salida
  ↓
validarFichajeCompleto() → completo: true ✅
  ↓
Fichaje se marca como finalizado ✅
  ↓
Horas trabajadas: 4h ✅
```

---

## 🎯 Casos de Uso Afectados

### Escenario 1: Empleado con Cita Médica por la Mañana

**Antes:**
1. Empleado solicita ausencia medio día mañana ✅
2. Empleado ficha salida a las 14:00 ✅
3. CRON crea fichaje pendiente ✅
4. Worker NO propone entrada (correcto) ✅
5. RH cuadra fichaje → NO crea entrada (correcto) ✅
6. **`validarFichajeCompleto()` → `completo: false`** ❌
7. Fichaje queda pendiente indefinidamente ❌

**Después:**
1. Empleado solicita ausencia medio día mañana ✅
2. Empleado ficha salida a las 14:00 ✅
3. CRON crea fichaje pendiente ✅
4. Worker NO propone entrada (correcto) ✅
5. RH cuadra fichaje → NO crea entrada (correcto) ✅
6. **`validarFichajeCompleto()` → `completo: true`** ✅
7. Fichaje marcado como finalizado ✅
8. Horas trabajadas: 4h ✅

### Escenario 2: Empleado Sale Temprano por Tarde Libre

**Antes:**
1. Empleado solicita ausencia medio día tarde ✅
2. Empleado ficha entrada a las 09:00 ✅
3. Fichaje queda pendiente ❌ (requiere salida incorrectamente)

**Después:**
1. Empleado solicita ausencia medio día tarde ✅
2. Empleado ficha entrada a las 09:00 ✅
3. **Fichaje marcado como completo** ✅ (solo requiere entrada)
4. Horas trabajadas: 4h ✅

---

## ✅ Checklist de Validación Post-Corrección

### Validación de Código

- [x] Corrección aplicada en `validarFichajeCompleto()` - Jornada Fija
- [x] Corrección aplicada en `validarFichajeCompleto()` - Jornada Flexible
- [x] Verificado que `validarDescansoAntesDeSalida()` ya era correcto
- [x] Verificado que `cuadrar/route.ts` ya era correcto
- [x] Comentarios explicativos añadidos

### Validación Funcional (Pendiente)

- [ ] Ejecutar script de seed
- [ ] Validar Caso 7 (ausencia mañana)
- [ ] Crear caso manual de ausencia tarde
- [ ] Verificar que fichajes sin ausencia siguen funcionando
- [ ] Ejecutar suite de tests (si existe)

### Validación de Integración (Pendiente)

- [ ] Worker calcula eventos correctamente
- [ ] Cuadrar no crea eventos durante ausencia
- [ ] Frontend muestra estado correcto
- [ ] Horas trabajadas calculadas correctamente (~4h)

---

## 🚀 Siguientes Pasos

### Inmediato (Antes de QA)

1. ✅ **Corrección aplicada** - Lógica unificada
2. ⬜ **Ejecutar seed** - Crear datos de prueba
3. ⬜ **Test Caso 7** - Validar ausencia mañana
4. ⬜ **Test manual** - Crear ausencia tarde

### QA Completo (2-3h)

Seguir checklist completo en:
- [VALIDACION_FINAL_QA.md](./VALIDACION_FINAL_QA.md)
- [TEST_AUSENCIAS_MEDIO_DIA.md](./TEST_AUSENCIAS_MEDIO_DIA.md)

### Producción

Una vez validado:
1. ✅ Commit de la corrección
2. 🚀 Deploy a staging
3. ✅ Smoke test en staging
4. 🚀 Deploy a producción

---

## 📝 Notas Técnicas

### Por Qué la Lógica es Correcta

**Ausencia medio día mañana:**
- Empleado NO trabaja de 09:00 a 14:00
- Empleado SÍ trabaja de 14:00 a 18:00
- **Eventos requeridos:** Solo salida (marca fin de jornada trabajada)
- **Eventos NO requeridos:** Entrada (no hay inicio de jornada normal)

**Ausencia medio día tarde:**
- Empleado SÍ trabaja de 09:00 a 14:00
- Empleado NO trabaja de 14:00 a 18:00
- **Eventos requeridos:** Solo entrada (marca inicio de jornada trabajada)
- **Eventos NO requeridos:** Salida (no hay fin de jornada normal)

**Pausas:**
- Ausencias medio día NO requieren pausas (jornada reducida)
- Solo días completos requieren pausas según configuración

---

## 🔗 Referencias

- **Issue original:** [VALIDACION_FINAL_QA.md - Issue #2](./VALIDACION_FINAL_QA.md#2--issue-crítico-inconsistencia-lógica-ausencias-medio-día)
- **Test de validación:** [TEST_AUSENCIAS_MEDIO_DIA.md](./TEST_AUSENCIAS_MEDIO_DIA.md)
- **Plan de corrección:** [PLAN_CORRECCION_COMPLETA.md](../../PLAN_CORRECCION_COMPLETA.md)

---

**Última actualización:** 10 Dic 2024
**Responsable:** Claude (Análisis y corrección)
**Estado:** ✅ CORREGIDO - Pendiente de validación QA
