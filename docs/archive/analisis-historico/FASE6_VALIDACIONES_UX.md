# FASE 6: Validaciones y UX - Documentación Técnica

## 📋 Resumen

Se han implementado validaciones adicionales y mejoras de UX en el sistema de cuadrar fichajes para detectar casos especiales y advertir a RH sobre situaciones que requieren revisión manual.

---

## 🆕 Validaciones Implementadas

### 1. ✅ FASE 6.1: Validación Mejorada de Ausencias Medio Día

**Archivo**: [app/api/fichajes/cuadrar/route.ts](app/api/fichajes/cuadrar/route.ts:307-321)

#### Problema Anterior
La query de ausencias medio día usaba solo `medioDia: true`, pero no validaba correctamente el campo `periodo`.

#### Solución Implementada
```typescript
const ausenciasMedioDia = await prisma.ausencias.findMany({
  where: {
    empresaId: session.user.empresaId,
    empleadoId: { in: empleadoIds },
    medioDia: true,                      // ✅ Flag de medio día
    periodo: { in: ['manana', 'tarde'] }, // ✅ Periodo específico (no null = día completo)
    estado: { in: ['confirmada', 'completada'] }, // ✅ Solo ausencias aprobadas
    fechaInicio: { lte: maxFecha },
    fechaFin: { gte: minFecha },
  },
});
```

#### Advertencia Añadida
```typescript
if (ausenciaMedioDiaInfo.tieneAusencia) {
  console.warn(
    `[API Cuadrar] Fichaje ${fichajeId} tiene ausencia medio día (${ausenciaMedioDiaInfo.medioDia}) - ` +
    `requiere revisión manual de horarios`
  );
}
```

**Comportamiento**:
- Logs claros cuando se detecta ausencia medio día
- RH es informado que necesita revisar horarios manualmente
- Sistema ajusta eventos requeridos según periodo (mañana/tarde)

---

### 2. ⚠️ FASE 6.2: Detección de Salida Sin Descanso

**Archivo**: [app/api/fichajes/cuadrar/route.ts](app/api/fichajes/cuadrar/route.ts:733-744)

#### Problema
Empleados que salen sin tomar descanso obligatorio pasaban desapercibidos, lo cual puede ser:
- Violación de normativa laboral (Estatuto de los Trabajadores)
- Indicador de problemas de carga de trabajo
- Fichajes incorrectos que necesitan revisión

#### Solución Implementada
```typescript
// Detectar si la jornada requiere descanso
const descansoConfig = config.descanso as { duracion?: number } | undefined;
const requiereDescanso =
  (descansoConfig?.duracion || 0) > 0 ||
  (typeof config.descansoMinimo === 'string' && config.descansoMinimo !== '00:00');

// Detectar si el fichaje tiene pausas
const tienePausas =
  eventosActualizados.some(e => e.tipo === 'pausa_inicio') &&
  eventosActualizados.some(e => e.tipo === 'pausa_fin');

// Advertir si falta descanso obligatorio
if (requiereDescanso && !tienePausas && !ausenciaMedioDiaInfo.tieneAusencia) {
  console.warn(
    `[API Cuadrar] ⚠️ ADVERTENCIA: Fichaje ${fichajeId} finalizado SIN descanso cuando la jornada lo requiere. ` +
    `Horas trabajadas: ${horasTrabajadas}h. Esto puede indicar que el empleado no tomó descanso.`
  );
}
```

**Casos Detectados**:
1. Jornada con `descanso.duracion > 0` pero sin eventos de pausa
2. Jornada con `descansoMinimo` (flexible) pero sin eventos de pausa
3. Se excluyen ausencias medio día (no aplica descanso completo)

**Acción**: Log de advertencia visible en servidor para que RH revise manualmente

---

## 🎯 Casos Edge Manejados

### Caso 1: Ausencia Medio Día con Fichajes Parciales

**Escenario**:
```
Empleado: María García
Fecha: 2025-12-09
Ausencia: Medio día (tarde) - CONFIRMADA
Eventos fichados: entrada 08:45
```

**Comportamiento del Sistema**:
```
1. CRON (00:01):
   ✅ Detecta ausencia medio día (tarde)
   ✅ Crea fichaje pendiente (empleado trabajó por la mañana)
   ✅ NO encola para cálculo automático (ausencia medio día → manual)

2. Worker:
   ⏭️ Omitido (fichaje con ausencia medio día se cuadra manualmente)

3. POST /api/fichajes/cuadrar:
   ⚠️ Log: "Fichaje tiene ausencia medio día (tarde) - requiere revisión manual"
   ✅ Determina eventos requeridos: [entrada, pausa_inicio, pausa_fin]
   ✅ NO requiere salida (ausencia de tarde)
   ✅ RH debe validar horarios trabajados por la mañana
```

### Caso 2: Jornada Intensiva Sin Descanso (Legal)

**Escenario**:
```
Empleado: Pedro López
Jornada: Viernes intensivo (09:00-15:00, sin descanso)
Config: { tipo: 'fija', viernes: { entrada: '09:00', salida: '15:00' } }
```

**Comportamiento del Sistema**:
```
1. Detección:
   ❌ requiereDescanso = false (no hay config.descanso ni descansoMinimo)

2. Validación:
   ✅ No genera advertencia (jornada no requiere descanso)

3. Resultado:
   ✅ Fichaje cuadrado sin advertencias
```

### Caso 3: Empleado Trabaja 10h Sin Descanso (Ilegal)

**Escenario**:
```
Empleado: Ana Martínez
Jornada: Lunes-Viernes 09:00-18:00 (requiere descanso 30 min)
Eventos fichados: entrada 08:00, salida 18:30 (10.5h sin pausas)
```

**Comportamiento del Sistema**:
```
1. Detección:
   ✅ requiereDescanso = true (config.descanso.duracion = 30)
   ✅ tienePausas = false (no hay pausa_inicio ni pausa_fin)

2. Validación:
   ⚠️ Log: "ADVERTENCIA: Fichaje finalizado SIN descanso cuando la jornada lo requiere. Horas trabajadas: 10.5h"

3. Acción Requerida:
   🔍 RH debe investigar:
      - ¿Realmente no tomó descanso? → Hablar con empleado
      - ¿Olvidó fichar pausas? → Corregir fichaje
      - ¿Carga de trabajo excesiva? → Revisar planificación
```

### Caso 4: Ausencia Día Completo (No Crea Fichaje)

**Escenario**:
```
Empleado: Luis Hernández
Fecha: 2025-12-09
Ausencia: Día completo (periodo = null) - CONFIRMADA
```

**Comportamiento del Sistema**:
```
1. CRON (00:01):
   ✅ Detecta ausencia día completo (periodo = null)
   ✅ NO crea fichaje

2. GET /api/fichajes/cuadrar:
   ✅ Empleado NO aparece en lista (sin fichaje)

3. Resultado:
   ✅ Sin intervención de RH necesaria
```

### Caso 5: Fichaje con Eventos Propuestos + Descanso

**Escenario**:
```
Empleado: Carmen Ruiz
Jornada: 09:00-18:00 (descanso obligatorio 14:00-15:00)
Eventos fichados: entrada 09:05
Eventos propuestos: pausa_inicio 14:02, pausa_fin 15:01, salida 18:10
```

**Comportamiento del Sistema**:
```
1. Worker (00:02):
   ✅ Calcula eventos propuestos con descanso (método: histórico)

2. POST /api/fichajes/cuadrar:
   ✅ Aplica eventos propuestos
   ✅ Detecta tienePausas = true (pausa_inicio + pausa_fin)
   ✅ NO genera advertencia (descanso presente)

3. Resultado:
   ✅ Fichaje cuadrado sin advertencias
```

---

## 📊 Matriz de Validaciones

| Situación | medioDia | periodo | requiereDescanso | tienePausas | Acción |
|-----------|----------|---------|------------------|-------------|--------|
| **Día normal sin pausas** | false | null | true | false | ⚠️ Advertencia |
| **Día normal con pausas** | false | null | true | true | ✅ OK |
| **Jornada intensiva** | false | null | false | false | ✅ OK |
| **Ausencia mañana** | true | 'manana' | N/A | N/A | ⚠️ Log + Revisión manual |
| **Ausencia tarde** | true | 'tarde' | N/A | N/A | ⚠️ Log + Revisión manual |
| **Ausencia día completo** | N/A | null | N/A | N/A | ✅ No crea fichaje |
| **Medio día + sin descanso** | true | 'manana'/'tarde' | true | false | ✅ No advertencia (ausencia justifica) |

---

## 🔍 Logs y Debugging

### Logs de Ausencias Medio Día

```bash
# Caso: Ausencia detectada
[API Cuadrar] Fichaje clw8abc tiene ausencia medio día (tarde) - requiere revisión manual de horarios

# Información adicional:
# - ausenciaMedioDiaInfo.tieneAusencia: true
# - ausenciaMedioDiaInfo.medioDia: 'tarde'
# - Eventos requeridos ajustados: NO incluye 'salida'
```

### Logs de Salida Sin Descanso

```bash
# Caso: Descanso obligatorio pero sin pausas
[API Cuadrar] ⚠️ ADVERTENCIA: Fichaje clw9def finalizado SIN descanso cuando la jornada lo requiere.
Horas trabajadas: 8.5h. Esto puede indicar que el empleado no tomó descanso.

# Información de contexto:
# - config.descanso.duracion: 30 (minutos)
# - Eventos: entrada, salida (sin pausas)
# - Resultado: Fichaje finalizado con advertencia
```

### Logs Completos de un Fichaje

```bash
# Fichaje con ausencia medio día y advertencia
[API Cuadrar] Fichaje vacío clw7ghi: Creando 3 eventos según jornada
[API Cuadrar] Fichaje clw7ghi tiene ausencia medio día (manana) - requiere revisión manual de horarios
[API Cuadrar] Usando 2 eventos propuestos para fichaje clw7ghi
[API Cuadrar] Evento pausa_inicio creado desde propuesta (historico)
[API Cuadrar] Evento salida creado desde propuesta (historico)
[API Cuadrar] Todos los eventos completados con propuestas para fichaje clw7ghi
```

---

## 🎨 Mejoras de UX Implementadas

### 1. Logs Estructurados y Claros

**ANTES**:
```
Procesando fichaje clw8abc
Fichaje finalizado
```

**AHORA**:
```
[API Cuadrar] Fichaje parcial clw8abc:
  - Eventos mantenidos (1): entrada
  - Eventos a añadir (3): pausa_inicio, pausa_fin, salida
[API Cuadrar] Fichaje clw8abc tiene ausencia medio día (tarde) - requiere revisión manual de horarios
[API Cuadrar] Usando 2 eventos propuestos para fichaje clw8abc
[API Cuadrar] ⚠️ ADVERTENCIA: Fichaje clw8abc finalizado SIN descanso cuando la jornada lo requiere.
```

### 2. Emojis y Nivel de Severidad

- ✅ OK (verde): Operación normal
- ⚠️ ADVERTENCIA (amarillo): Situación que requiere atención
- 🔍 Información (azul): Logs de depuración

### 3. Mensajes Accionables

**ANTES**:
```
Error procesando fichaje
```

**AHORA**:
```
Fichaje clw8abc tiene ausencia medio día (tarde) - requiere revisión manual de horarios

Acción sugerida:
- Verificar que el empleado solo trabajó por la mañana
- Validar horarios de entrada y pausas
- Confirmar que no hay fichajes de tarde
```

---

## 🧪 Testing Manual

### Test 1: Fichaje con Ausencia Medio Día

```bash
# Setup: Crear ausencia medio día
curl -X POST "http://localhost:3000/api/ausencias" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "empleadoId": "clw7emp...",
    "fechaInicio": "2025-12-09",
    "fechaFin": "2025-12-09",
    "medioDia": true,
    "periodo": "tarde",
    "estado": "confirmada"
  }'

# Cuadrar fichaje
curl -X POST "http://localhost:3000/api/fichajes/cuadrar" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"fichajeIds": ["clw8fic..."]}'

# Verificar logs:
# [API Cuadrar] Fichaje clw8fic... tiene ausencia medio día (tarde) - requiere revisión manual
```

### Test 2: Fichaje Sin Descanso Obligatorio

```bash
# Setup: Fichaje con solo entrada y salida (sin pausas)
# Jornada con descanso obligatorio de 30 min

# Cuadrar fichaje
curl -X POST "http://localhost:3000/api/fichajes/cuadrar" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"fichajeIds": ["clw9fic..."]}'

# Verificar logs:
# [API Cuadrar] ⚠️ ADVERTENCIA: Fichaje clw9fic... finalizado SIN descanso cuando la jornada lo requiere.
# Horas trabajadas: 8.5h
```

### Test 3: Jornada Intensiva (Sin Descanso Legal)

```bash
# Setup: Jornada intensiva (ej: Viernes 09:00-15:00 sin descanso)
# Config: { viernes: { entrada: '09:00', salida: '15:00' } } (sin pausa_inicio/pausa_fin)

# Cuadrar fichaje
curl -X POST "http://localhost:3000/api/fichajes/cuadrar" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"fichajeIds": ["clxafic..."]}'

# Verificar logs:
# NO debe aparecer advertencia (jornada no requiere descanso)
```

---

## ✅ Checklist de Validación

### Funcionalidad
- [x] Ausencias medio día filtradas correctamente (`medioDia: true` AND `periodo: in ['manana', 'tarde']`)
- [x] Log de advertencia cuando se detecta ausencia medio día
- [x] Eventos requeridos ajustados según periodo de ausencia
- [x] Detección de salida sin descanso obligatorio
- [x] NO advertencia si ausencia medio día justifica falta de descanso
- [x] NO advertencia si jornada no requiere descanso

### TypeScript
- [x] 0 errores de compilación
- [x] Tipos correctos para `config.descanso`

### Logs
- [x] Log claro para ausencias medio día
- [x] Log de advertencia para salida sin descanso
- [x] Emoji ⚠️ para llamar la atención
- [x] Información de contexto (horas trabajadas, periodo)

### UX
- [x] Mensajes comprensibles para RH no técnico
- [x] Accionables (qué revisar/hacer)
- [x] No bloqueante (fichaje se finaliza igualmente)

---

## 📈 Impacto

### Cumplimiento Normativo
- ✅ **Estatuto de los Trabajadores (Art. 34.4)**: Descanso obligatorio de 15 minutos si jornada >6h
- ✅ Detección temprana de violaciones
- ✅ Registro de advertencias para auditorías

### Calidad de Datos
- ✅ Fichajes con ausencias medio día identificados para revisión manual
- ✅ Salidas sin descanso detectadas y registradas
- ✅ RH puede corregir proactivamente antes de procesar nómina

### Operaciones RH
- ✅ Menos errores en nómina por fichajes incorrectos
- ✅ Detección temprana de problemas de carga de trabajo
- ✅ Evidencia para conversaciones con empleados

---

## 🚀 Próximos Pasos (FASE 7)

La FASE 6 proporciona la base de validaciones. FASE 7 implementará:

### Frontend (Modal Cuadrar Fichajes)
1. **Indicador Visual de Ausencias**:
   - Badge "Ausencia medio día (tarde)" en fichaje
   - Color amarillo para llamar atención

2. **Indicador de Descanso Faltante**:
   - Badge "⚠️ Sin descanso" en fichajes sin pausas
   - Tooltip explicativo: "Este fichaje no tiene descanso registrado"

3. **Vista Previa de Eventos Propuestos**:
   - Tabla mostrando eventos reales vs propuestos
   - Columna "Método" (histórico/default/calculado)
   - Edición inline antes de confirmar

4. **Confirmación Explícita**:
   - Diálogo: "Este fichaje no tiene descanso. ¿Confirmar de todas formas?"
   - Checkbox: "He verificado que el empleado no requería descanso"

---

**Última actualización**: 2025-12-10
**Versión**: FASE 6 - Validaciones y UX
**Estado**: ✅ **COMPLETADA Y LISTA PARA FASE 7**
