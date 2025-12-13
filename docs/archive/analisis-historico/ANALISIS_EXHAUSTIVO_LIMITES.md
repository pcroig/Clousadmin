# Análisis Exhaustivo: Límites de Fichaje

## 🔍 Estado Actual del Sistema

### 1. Configuración de Límites
- **Ubicación**: `empresas.config.limiteInferiorFichaje` y `limiteSuperiorFichaje`
- **Scope**: Global para TODA la empresa (no por jornada)
- **Gestión**: Desde "Calendario y Ausencias"
- **Ejemplo ACME**: 07:00 - 21:00

### 2. Validación Actual (POST /api/fichajes)

**Archivo**: `app/api/fichajes/route.ts` líneas 460-469

```typescript
if (empresaConfig?.limiteInferiorFichaje || empresaConfig?.limiteSuperiorFichaje) {
  const horaFichaje = `${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`;

  if (empresaConfig.limiteInferiorFichaje && horaFichaje < empresaConfig.limiteInferiorFichaje) {
    return badRequestResponse(`No puedes fichar antes de ${empresaConfig.limiteInferiorFichaje}`);
  }
  if (empresaConfig.limiteSuperiorFichaje && horaFichaje > empresaConfig.limiteSuperiorFichaje) {
    return badRequestResponse(`No puedes fichar después de ${empresaConfig.limiteSuperiorFichaje}`);
  }
}
```

**⚠️ PROBLEMA**: Solo previene NUEVOS fichajes, pero:
- Si alguien fichó entrada a las 20:00 (válido)
- Puede fichar salida a las 23:00 (inválido, pero no se detecta porque ya hay un fichaje `en_curso`)

### 3. Cálculo de Horas (SIN límites)

**Función crítica**: `calcularHorasTrabajadas()` en `lib/calculos/fichajes.ts:219-280`

```typescript
export function calcularHorasTrabajadas(eventos: FichajeEvento[]): number | null {
  // ... calcula horas sumando todos los segmentos trabajados ...
  // ❌ NO considera límites
  // ❌ NO capa horas fuera de rango
  return Math.round(horasTotales * 100) / 100;
}
```

**Llamada desde**:
1. `actualizarCalculosFichaje` (línea 839) - **función global**
2. `app/api/fichajes/cuadrar/route.ts` (línea 846) - **cuadrar masivo**
3. `app/api/fichajes/editar-batch/route.ts` (línea 359) - **edición HR**
4. GET `/api/fichajes` (línea 286) - **consulta fichajes**

### 4. CRON Clasificar Fichajes

**Archivo**: `app/api/cron/clasificar-fichajes/route.ts`

**Flujo**:
1. Busca fichajes `en_curso` del día anterior
2. Llama `validarFichajeCompleto`
3. Llama `actualizarCalculosFichaje` (que NO usa límites)
4. Cambia estado a `finalizado` o `pendiente`

**⚠️ PROBLEMA**: Si un fichaje tiene eventos hasta las 23:00, se cuentan TODAS esas horas al calcular.

---

## 🚨 Problemas Encontrados en ACME

### Datos Reales del Diagnóstico:

```
2️⃣ Fichajes en estado "en_curso" del día anterior:
   ✅ No hay fichajes antiguos en_curso  <-- El CRON SÍ cerró los del 09/12

3️⃣ Eventos después del límite superior (21:00):
   ⚠️  Juan Periñon
      Evento: entrada a las 23:17
      Fecha: 2025-12-10  <-- AYER
      Estado fichaje: en_curso

   ⚠️  Pablo Roig
      Evento: entrada a las 23:36
      Fecha: 2025-12-10
      Estado fichaje: en_curso

   ⚠️  Pablo Roig
      Evento: pausa_inicio a las 23:43
      Fecha: 2025-12-10
      Estado fichaje: en_curso
```

**Conclusión**:
- Los fichajes de ayer (10/12) **AÚN están en_curso** hoy (11/12)
- Esto significa que **el CRON NO ejecutó anoche**
- Hay eventos DESPUÉS del límite superior (23:17, 23:36, 23:43)

---

## 💡 Soluciones Posibles (Análisis)

### Opción 1: Modificar `calcularHorasTrabajadas` para Capar Horas

**Propuesta**:
```typescript
export function calcularHorasTrabajadas(
  eventos: FichajeEvento[],
  options?: {
    limiteSuperior?: string; // "21:00"
    limiteInferior?: string; // "07:00"
    fechaFichaje?: Date;
  }
): number | null {
  // ... lógica actual ...

  // NUEVO: Capar eventos fuera de límites
  for (const evento of ordenados) {
    const hora = new Date(evento.hora);

    // Si hay límite superior y el evento lo excede, ajustar
    if (options?.limiteSuperior && options?.fechaFichaje) {
      const [hours, mins] = options.limiteSuperior.split(':').map(Number);
      const limiteSup = new Date(options.fechaFichaje);
      limiteSup.setHours(hours, mins, 0, 0);

      if (hora > limiteSup) {
        // Truncar el evento en el límite
        hora = limiteSup;
      }
    }

    // ... resto del cálculo ...
  }
}
```

**✅ VENTAJAS**:
- Respeta límites en el cálculo
- Compatible con código existente (parámetro opcional)
- No requiere modificar estados

**❌ DESVENTAJAS**:
- Complejo de implementar correctamente
- Los eventos en DB siguen mostrando horarios fuera de límite
- Confuso para HR (eventos a las 23:00 pero horas contadas hasta 21:00)
- **RIESGO**: Puede romper lógica de validación de secuencia

---

### Opción 2: Auto-Cierre al Exceder Límite (CRON Horario)

**Propuesta**: Nuevo CRON que ejecuta cada hora y:
```typescript
// Buscar fichajes en_curso con último evento > limiteSuperior
const fichajesExcedidos = await prisma.fichajes.findMany({
  where: {
    estado: 'en_curso',
    // ... última hora de evento > límite
  }
});

for (const fichaje of fichajesExcedidos) {
  await prisma.fichajes.update({
    where: { id: fichaje.id },
    data: { estado: 'pendiente' } // NO crear evento de salida
  });
}
```

**✅ VENTAJAS**:
- Simple
- No modifica eventos existentes
- Compatible con flujo de cuadrar

**❌ DESVENTAJAS**:
- Requiere CRON adicional
- Fichajes quedan `pendiente` (requiere acción HR)
- **RIESGO**: Cambiar `en_curso` → `pendiente` puede romper:
  - GET `/api/fichajes` calcula horas en tiempo real para `en_curso` (línea 273-281)
  - Frontend puede mostrar incorrectamente el estado
  - Widget de fichaje puede no detectar fichaje activo

---

### Opción 3: Validación Estricta en POST + Cierre Manual

**Propuesta**:
1. **Fortalecer validación en POST**: Si ya hay un fichaje `en_curso`, validar que el nuevo evento NO exceda `limiteSuperior`
2. **CRON actual ya cierra fichajes**: El problema es que el CRON no está ejecutando
3. **HR cuadra manualmente** fichajes con eventos fuera de límites

**✅ VENTAJAS**:
- Mínimo cambio en código existente
- No rompe nada
- Previene el problema a futuro

**❌ DESVENTAJAS**:
- No arregla datos históricos
- Requiere que CRON funcione correctamente

---

## 🎯 RECOMENDACIÓN FINAL

### Estrategia de 3 Fases (Conservadora)

#### **FASE 1: URGENTE - Arreglar CRON** ⚡
1. Diagnosticar por qué el CRON no ejecutó anoche
2. Verificar crontab en Hetzner
3. Re-instalar si es necesario
4. Ejecutar manualmente para cerrar fichajes de ayer

**Script para ejecutar en Hetzner**:
```bash
# Verificar crontab
crontab -l | grep clasificar-fichajes

# Ver logs
tail -50 /var/log/clousadmin-cron.log

# Ejecutar manualmente
curl -X POST https://app.clousadmin.com/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer <CRON_SECRET>"
```

#### **FASE 2: Prevenir Fichajes Fuera de Límites** 🛡️

**Modificar POST /api/fichajes** para validar TAMBIÉN cuando ya hay fichaje `en_curso`:

```typescript
// ANTES de crear el evento, verificar límites
if (empresaConfig?.limiteSuperiorFichaje) {
  const horaEvento = `${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`;

  if (horaEvento > empresaConfig.limiteSuperiorFichaje) {
    return badRequestResponse(
      `No puedes fichar después de ${empresaConfig.limiteSuperiorFichaje}`
    );
  }
}
```

**Ubicación**: Línea ~460, ANTES de crear cualquier evento.

**✅ Esto previene**:
- Eventos de salida/pausa después del límite
- Fichajes extraordinarios fuera de horario (si se desea)

#### **FASE 3: Ajustar Cálculo de Horas (Opcional)** 🔧

**SOLO si se requiere** capar horas en fichajes ya existentes:

1. Modificar `calcularHorasTrabajadas` para aceptar límites opcionales
2. Pasar límites desde:
   - `actualizarCalculosFichaje`
   - `/api/fichajes/cuadrar`
   - CRON clasificar-fichajes

**PERO**: Esto es complejo y puede causar confusión.

**ALTERNATIVA MÁS SIMPLE**:
- Dejar que HR vea los eventos reales (incluso fuera de límites)
- Al cuadrar, HR puede ajustar manualmente
- Agregar ADVERTENCIA visual en UI cuando eventos excedan límites

---

## ⚠️ RIESGOS A EVITAR

### 1. NO Cambiar `en_curso` → `pendiente` Automáticamente

**MOTIVO**: GET `/api/fichajes` tiene lógica especial para `en_curso`:

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

Si cambiamos a `pendiente`, **se pierde el cálculo en tiempo real**.

### 2. NO Modificar Eventos Existentes

**MOTIVO**: Los eventos son el registro de verdad. Si alguien fichó a las 23:00, ese dato debe quedar.

Lo que SÍ se puede hacer:
- Marcar como "fuera de límites" (flag)
- Mostrar advertencia en UI
- Al calcular horas para nóminas, aplicar capling

### 3. NO Complicar el Flujo de Cuadrar

**MOTIVO**: El flujo de cuadrar es complejo y crítico. Cualquier cambio puede:
- Romper la generación de eventos propuestos
- Causar errores en validación de secuencia
- Afectar cálculo de balance

---

## 📝 IMPLEMENTACIÓN RECOMENDADA

### Cambio Mínimo y Seguro:

**1. Archivo**: `app/api/fichajes/route.ts`

**Modificación**: Agregar validación de límite ANTES de crear evento (línea ~450)

```typescript
// ANTES de validar el evento con la jornada
// Validar límites globales empresa (si existen)
const empresa = await prisma.empresas.findUnique({
  where: { id: empleado.empresaId },
  select: { config: true },
});

const empresaConfig = empresa?.config as {
  limiteInferiorFichaje?: string;
  limiteSuperiorFichaje?: string;
} | null;

if (empresaConfig?.limiteInferiorFichaje || empresaConfig?.limiteSuperiorFichaje) {
  const horaFichaje = `${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`;

  // VALIDAR LÍMITE INFERIOR
  if (empresaConfig.limiteInferiorFichaje && horaFichaje < empresaConfig.limiteInferiorFichaje) {
    return badRequestResponse(`No puedes fichar antes de ${empresaConfig.limiteInferiorFichaje}`);
  }

  // VALIDAR LÍMITE SUPERIOR
  if (empresaConfig.limiteSuperiorFichaje && horaFichaje > empresaConfig.limiteSuperiorFichaje) {
    return badRequestResponse(`No puedes fichar después de ${empresaConfig.limiteSuperiorFichaje}`);
  }
}
```

**✅ Esto es seguro porque**:
- No modifica lógica existente
- No afecta cálculos
- No cambia estados
- Solo PREVIENE futuros fichajes fuera de límites

**2. Verificar CRONs en Producción**

Ver documento [SOLUCION_LIMITES_FICHAJE.md](SOLUCION_LIMITES_FICHAJE.md) para comandos.

---

## 🧪 Testing Necesario

1. **Test límite inferior**: Intentar fichar a las 06:59 → debe rechazar
2. **Test límite superior**: Intentar fichar salida a las 21:01 → debe rechazar
3. **Test fichaje en_curso**: Con fichaje activo, intentar evento > límite → debe rechazar
4. **Test CRON**: Verificar que cierra fichajes del día anterior
5. **Test cuadrar**: Cuadrar fichaje con eventos normales → debe funcionar igual

---

## ✅ Conclusión

**NO modificar cálculo de horas ni estados automáticamente**.

**SÍ fortalecer validación en POST y asegurar que CRONs funcionen**.

Esto es:
- ✅ Seguro
- ✅ Simple
- ✅ No rompe nada existente
- ✅ Previene problemas futuros
