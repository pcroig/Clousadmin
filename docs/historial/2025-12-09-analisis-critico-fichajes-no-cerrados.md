# Análisis Crítico: Fichajes No Cerrados del Día Anterior

**Fecha**: 2025-12-09
**Severidad**: CRÍTICA
**Estado**: Pendiente de implementación

## Problema Identificado

Los fichajes que no se cierran del día anterior presentan **DOS problemas graves**:

### 1. No aparecen en cuadrar fichajes
Los fichajes con estado `en_curso` que quedan abiertos del día anterior NO son detectados por la funcionalidad de cuadrar fichajes.

### 2. Siguen contabilizando horas infinitamente
Los fichajes en estado `en_curso` continúan acumulando horas trabajadas indefinidamente hasta que se cierren manualmente.

## Análisis Técnico Detallado

### Flujo Actual (Con Problemas)

#### 1. CRON Nocturno (`/api/cron/clasificar-fichajes/route.ts`)
**Se ejecuta**: 23:30 cada noche
**Problema**: Solo procesa el **día anterior** (ayer), NO el día actual

```typescript
// Línea 41-43
const ayer = new Date();
ayer.setDate(ayer.getDate() - 1);
ayer.setHours(0, 0, 0, 0);
```

**Escenario problemático**:
- Un empleado ficha entrada a las 09:00 del día X
- NO ficha salida durante todo el día
- A las 23:30 del día X, el CRON NO procesa el día X (solo procesa X-1)
- El fichaje sigue en estado `en_curso` durante toda la noche
- El empleado sigue "trabajando" durante toda la noche y día siguiente

#### 2. Detección de Fichajes para Cuadrar (`/api/fichajes/cuadrar/route.ts`)
**Problema**: Solo acepta fichajes con estado `pendiente` o `en_curso`

```typescript
// Línea 227-232
if (!fichajeActual || (fichajeActual.estado !== 'pendiente' && fichajeActual.estado !== 'en_curso')) {
   console.warn(`[API Cuadrar] Fichaje ${fichajeId} cambió de estado o no existe, saltando.`);
   errores.push(`Fichaje ${fichajeId}: Ya procesado o estado inválido`);
   continue;
}
```

**PERO** el CRON nocturno convierte fichajes `en_curso` a `pendiente` solo si:
- El fichaje es del DÍA ANTERIOR
- El fichaje está incompleto

**Gap crítico**: Los fichajes del día ACTUAL que quedan en `en_curso` NO son procesados por el CRON.

#### 3. Cálculo de Horas en Tiempo Real (`/api/fichajes/route.ts`)
**Problema**: Para fichajes `en_curso`, calcula horas en tiempo real sumando tiempo desde el último evento

```typescript
// Línea 273-281
if (fichaje.estado === 'en_curso') {
  const { horasAcumuladas, horaEnCurso } = calcularProgresoEventos(eventos);
  horasTrabajadas = horasAcumuladas;
  if (horaEnCurso) {
    const ahora = new Date();
    const horasDesdeUltimoEvento = (ahora.getTime() - horaEnCurso.getTime()) / (1000 * 60 * 60);
    horasTrabajadas += horasDesdeUltimoEvento;
  }
}
```

**Consecuencia**: Si un fichaje queda abierto:
- Hoy a las 09:00 → ficha entrada
- Hoy a las 18:00 → NO ficha salida
- Mañana a las 10:00 → El sistema muestra **25 horas trabajadas** (09:00 hoy hasta 10:00 mañana)
- Pasado mañana a las 10:00 → El sistema muestra **49 horas trabajadas**
- Y así sucesivamente...

### Uso de `limiteSuperior` en el Calendario Laboral

El campo `limiteSuperior` en la configuración de jornada define la **hora máxima** hasta la cual se puede fichar.

**Ubicación**: `JornadaConfig.limiteSuperior` (string, formato HH:mm)

**Uso actual**: Solo se valida en `validarLimitesJornada()` (línea 538-576 de `lib/calculos/fichajes.ts`)

```typescript
// Línea 554-572
const limiteInferior = typeof config.limiteInferior === 'string' ? config.limiteInferior : undefined;
const limiteSuperior = typeof config.limiteSuperior === 'string' ? config.limiteSuperior : undefined;

if (limiteInferior || limiteSuperior) {
  const horaFichaje = `${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`;

  if (limiteInferior && horaFichaje < limiteInferior) {
    return {
      valido: false,
      error: `No puedes fichar antes de ${limiteInferior}`,
    };
  }

  if (limiteSuperior && horaFichaje > limiteSuperior) {
    return {
      valido: false,
      error: `No puedes fichar después de ${limiteSuperior}`,
    };
  }
}
```

**Problema**: Esta validación solo se usa **al fichar**, NO para cerrar fichajes automáticamente.

## Solución Propuesta

### Estrategia de Cierre Automático

Debemos implementar un cierre automático de jornadas que:

1. **Cierre fichajes del día actual** cuando se pase el `limiteSuperior`
2. **Procese fichajes antiguos** que quedaron abiertos (caso extremo)
3. **Mantenga la lógica de detección** para cuadrar fichajes

### Componentes a Modificar

#### 1. CRON Nocturno - Procesar TAMBIÉN el día actual
**Archivo**: `/app/api/cron/clasificar-fichajes/route.ts`

**Cambios necesarios**:
- Procesar tanto el día anterior (ayer) como el día actual (hoy)
- Para el día actual, cerrar solo si ya pasó el `limiteSuperior`
- Para el día anterior, cerrar todos los fichajes `en_curso`

#### 2. Nueva función: `cerrarFichajesAutomáticamente()`
**Archivo**: `/lib/calculos/fichajes.ts`

**Lógica**:
```typescript
async function cerrarFichajesAutomáticamente(
  fichajeId: string,
  jornada: Jornada,
  fecha: Date
): Promise<boolean> {
  const config = jornada.config as JornadaConfig;
  const limiteSuperior = config.limiteSuperior;

  if (!limiteSuperior) {
    // Sin límite superior, usar heurística (ej: 23:59 del mismo día)
    return esFechaPasada(fecha);
  }

  const ahora = new Date();
  const horaLimite = parsearHoraLimite(fecha, limiteSuperior);

  // Solo cerrar si ya pasó el límite superior
  return ahora > horaLimite;
}
```

#### 3. Validación en API de Cuadrar
**Archivo**: `/app/api/fichajes/cuadrar/route.ts`

**Cambios**:
- ANTES de cuadrar, verificar si el fichaje debería cerrarse automáticamente
- Si debe cerrarse, actualizar estado de `en_curso` a `pendiente`
- Luego aplicar la lógica de cuadrado normal

#### 4. Query de Fichajes para Cuadrar
**Consideración**: Al buscar fichajes para cuadrar, incluir:
- Fichajes con estado `pendiente`
- Fichajes con estado `en_curso` que ya deberían estar cerrados (fecha < hoy O hora > limiteSuperior)

## Edge Cases a Considerar

### 1. Jornadas sin `limiteSuperior`
**Solución**: Usar heurística basada en fecha:
- Si el fichaje es de un día anterior a hoy → cerrar automáticamente
- Si el fichaje es de hoy → mantener abierto (flexible)

### 2. Fichajes extraordinarios
**Comportamiento**: NO cerrar automáticamente, requieren revisión manual

### 3. Fichajes con pausas abiertas
**Comportamiento**:
- Cerrar la pausa automáticamente antes de cerrar el fichaje
- Crear evento `pausa_fin` con hora = `limiteSuperior` o última hora lógica

### 4. Múltiples días sin cerrar
**Escenario**: Empleado ficha el lunes y no vuelve hasta el viernes
**Solución**: El CRON debe procesar cada día y cerrar progresivamente

## Impacto de No Solucionar

### Datos Incorrectos
- Horas trabajadas infladas infinitamente
- Balances de horas completamente erróneos
- Informes de productividad inválidos

### Problemas de Negocio
- Nóminas potencialmente incorrectas
- Imposibilidad de identificar ausencias reales
- Pérdida de confianza en el sistema de fichajes

### Problemas de Cuadrado
- Fichajes `en_curso` antiguos no aparecen en la interfaz de cuadrar
- HR no puede cerrar jornadas manualmente si no las ve
- Acumulación de fichajes "fantasma" en la base de datos

## Siguientes Pasos

1. ✅ Análisis completo del problema
2. ⏳ Implementar función `cerrarFichajesAutomáticamente()`
3. ⏳ Modificar CRON para procesar día actual
4. ⏳ Actualizar query de fichajes para cuadrar
5. ⏳ Testing exhaustivo con múltiples escenarios
6. ⏳ Deploy y monitoreo de fichajes antiguos

## Notas Técnicas

### Preservación de Estados
- `pendiente`: Fichaje creado sin eventos (empleado no fichó nada)
- `en_curso`: Fichaje activo, al menos un evento pero no finalizado
- `finalizado`: Fichaje completo y cerrado

### Lógica de Transición Propuesta
```
en_curso + (fecha < hoy || hora > limiteSuperior) → validar → finalizado | pendiente
```

### Compatibilidad con Cuadrado Masivo
La solución debe mantener compatibilidad con:
- Cuadrado manual (selección de fichajes)
- Cuadrado automático (promedio histórico)
- Descarte de días (marcar como finalizado con 0 horas)
