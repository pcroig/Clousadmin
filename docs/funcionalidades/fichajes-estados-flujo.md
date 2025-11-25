# Flujo de Estados de Fichajes y Lógica del CRON

**Fecha**: 21 de noviembre 2025  
**Estado**: ✅ Documentado y revisado

---

## 📊 Estados de Fichaje

| Estado | Uso | Cuándo se aplica |
|--------|-----|------------------|
| `en_curso` | Fichaje activo durante el día actual | Durante el día de trabajo, mientras el empleado está fichando |
| `pendiente` | Requiere revisión/cuadrar | Fichajes incompletos o sin registrar que necesitan intervención de HR |
| `finalizado` | Completado correctamente | Fichajes con todos los eventos requeridos según jornada |

---

## 🔄 Flujo del CRON `clasificar-fichajes`

**Horario**: Diario a las 23:30 UTC  
**Procesa**: Día anterior (ayer)  
**Endpoint**: `/api/cron/clasificar-fichajes`

### Pasos del CRON

#### 1. Obtener Empleados Disponibles

Usa `obtenerEmpleadosDisponibles(empresaId, fecha)` que:

- Obtiene todos los empleados **activos** de la empresa
- Para cada empleado, verifica con `esDiaLaboral(empleadoId, fecha)` si debería trabajar ese día

**`esDiaLaboral()` verifica:**

```typescript
// lib/calculos/fichajes.ts:532-601
1. Empleado existe y tiene jornada asignada
2. Jornada está activa
3. Es día laborable según calendario de empresa (festivos, etc.)
4. El día está activo en configuración de jornada del empleado
5. NO tiene ausencia de día completo (vacaciones, enfermedad, etc.)
```

**⚠️ IMPORTANTE**: Si un empleado NO tiene `jornadaId`, `esDiaLaboral()` retorna `false` y el empleado NO se considera disponible.

#### 2. Para cada Empleado Disponible

##### Caso A: Empleado SIN fichaje

```typescript
// app/api/cron/clasificar-fichajes/route.ts:79-108
if (!fichaje) {
  // Crear fichaje en estado 'pendiente'
  fichaje = await prisma.fichaje.create({
    data: {
      empresaId,
      empleadoId,
      fecha: ayer,
      estado: 'pendiente',  // ← Estado pendiente
    }
  });
  
  // Crear notificación a HR
  await crearNotificacionFichajeRequiereRevision();
  
  continue;
}
```

**Resultado**: Fichaje creado en estado `pendiente` sin eventos, requiere cuadrar.

##### Caso B: Empleado con fichaje `en_curso`

```typescript
// app/api/cron/clasificar-fichajes/route.ts:110-150
if (fichaje.estado === 'en_curso') {
  // Validar si está completo
  const validacion = await validarFichajeCompleto(fichaje.id);
  
  // Actualizar cálculos (horas trabajadas, en pausa)
  await actualizarCalculosFichaje(fichaje.id);
  
  if (validacion.completo) {
    // Marcar como finalizado
    await prisma.fichaje.update({
      where: { id: fichaje.id },
      data: { estado: 'finalizado' }
    });
  } else {
    // Marcar como pendiente (requiere cuadrar)
    await prisma.fichaje.update({
      where: { id: fichaje.id },
      data: { estado: 'pendiente' }
    });
    
    // Crear notificación a HR
    await crearNotificacionFichajeRequiereRevision();
  }
}
```

**Resultado**:
- **Completo** → `finalizado`
- **Incompleto** → `pendiente` (requiere cuadrar)

##### Caso C: Empleado con fichaje `pendiente` o `finalizado`

```typescript
// El CRON NO procesa fichajes que ya están en estado 'pendiente' o 'finalizado'
// Estos fichajes permanecen sin cambios
```

**Resultado**: Sin cambios, el fichaje permanece en su estado actual.

---

## ✅ Validación de Fichaje Completo

**Función**: `validarFichajeCompleto(fichajeId)`  
**Ubicación**: `lib/calculos/fichajes.ts:757-885`

### Lógica de Validación

#### 1. Verificar Jornada

```typescript
if (!fichaje.empleado.jornada) {
  return {
    completo: false,
    razon: 'Empleado sin jornada asignada'
  };
}
```

#### 2. Determinar Eventos Requeridos

**Jornada Fija** (tiene `tipo: 'fija'` o tiene `entrada`/`salida` en configDia):

```typescript
// Si el día no está activo → completo (día no laborable)
if (!configDia || configDia.activo === false) {
  return { completo: true, razon: 'Día no laborable según jornada' };
}

// Eventos requeridos (considera ausencias de medio día):
eventosRequeridos = ['entrada', 'salida'];

// Si hay pausa configurada:
if (configDia.pausa_inicio && configDia.pausa_fin) {
  eventosRequeridos.push('pausa_inicio', 'pausa_fin');
}
```

**Jornada Flexible** (tiene `tipo: 'flexible'`):

```typescript
// Siempre entrada y salida
eventosRequeridos = ['entrada', 'salida'];

// Pausa obligatoria solo si hay descansoMinimo configurado
if (config.descansoMinimo) {
  eventosRequeridos.push('pausa_inicio', 'pausa_fin');
}
```

#### 3. Validar Coherencia de Pausas

```typescript
// Si tiene pausa_inicio, DEBE tener pausa_fin (y viceversa)
if (tienePausaInicio && !tienePausaFin) {
  eventosFaltantes.push('pausa_fin');
} else if (!tienePausaInicio && tienePausaFin) {
  eventosFaltantes.push('pausa_inicio');
}
```

#### 4. Resultado

```typescript
const completo = eventosFaltantes.length === 0;

return {
  completo,
  eventosRequeridos,
  eventosFaltantes,
  razon: completo ? undefined : `Faltan eventos: ${eventosFaltantes.join(', ')}`
};
```

---

## 🔍 Casos de Uso y Comportamiento

### Caso 1: Empleado trabaja normalmente

```
Día 1: 09:00 entrada → 14:00 pausa_inicio → 15:00 pausa_fin → 18:00 salida
       Estado: 'en_curso'
       
Noche (23:30): CRON ejecuta
       - Valida fichaje: ✅ Completo
       - Estado: 'en_curso' → 'finalizado'
```

### Caso 2: Empleado olvidó fichar salida

```
Día 1: 09:00 entrada → 14:00 pausa_inicio → 15:00 pausa_fin
       Estado: 'en_curso'
       
Noche (23:30): CRON ejecuta
       - Valida fichaje: ❌ Incompleto (falta 'salida')
       - Estado: 'en_curso' → 'pendiente'
       - Notificación: HR recibe alerta
```

### Caso 3: Empleado no fichó en todo el día

```
Día 1: (sin fichajes)
       Estado: sin fichaje
       
Noche (23:30): CRON ejecuta
       - Empleado está en 'empleadosDisponibles' (tiene jornada, día laborable, sin ausencias)
       - Crea fichaje: estado 'pendiente', sin eventos
       - Notificación: HR recibe alerta
```

### Caso 4: Empleado con ausencia de día completo

```
Día 1: (sin fichajes, tiene ausencia confirmada)
       Estado: sin fichaje
       
Noche (23:30): CRON ejecuta
       - esDiaLaboral() retorna false (tiene ausencia)
       - Empleado NO está en 'empleadosDisponibles'
       - NO se crea fichaje ✅ (correcto)
```

### Caso 5: Empleado sin jornada asignada

```
Día 1: (sin fichajes, jornadaId = null)
       Estado: sin fichaje
       
Noche (23:30): CRON ejecuta
       - esDiaLaboral() retorna false (sin jornada)
       - Empleado NO está en 'empleadosDisponibles'
       - NO se crea fichaje ⚠️ (problema potencial)
```

---

## ⚠️ Problema Identificado

### Empleados sin Jornada NO generan fichajes pendientes

**Situación**: Un empleado activo sin `jornadaId` asignada.

**Comportamiento actual**:
1. `esDiaLaboral(empleadoId, fecha)` retorna `false` (línea 549-551)
2. Empleado NO aparece en `empleadosDisponibles`
3. CRON NO crea fichaje pendiente
4. HR NO recibe notificación

**Problema**: Si un empleado debería trabajar pero no tiene jornada asignada, el sistema no lo detecta.

**Solución aplicada**: 
- Endpoint `/api/admin/asignar-jornadas` para asignar jornadas automáticamente
- Seed mejorado que actualiza `jornadaId` en updates
- HR debe asignar jornadas a empleados antes de que empiecen a trabajar

---

## 📋 Modal de Cuadrar Fichajes

**Endpoint**: `GET /api/fichajes/revision`  
**Ubicación**: `app/api/fichajes/revision/route.ts`

### Qué Fichajes Muestra

```typescript
const fichajesPendientes = await prisma.fichaje.findMany({
  where: {
    empresaId: session.user.empresaId,
    estado: 'pendiente',
    fecha: {
      lt: hoy  // Solo fichajes de días anteriores
    }
  }
});
```

**Resultado**: Todos los fichajes en estado `pendiente` de días anteriores.

### Qué NO Muestra

- Fichajes en estado `en_curso` (del día actual)
- Fichajes en estado `finalizado` (completos)
- Fichajes del día actual (aunque estén pendientes)

---

## 🔧 Cuadrar Fichajes (POST)

**Endpoint**: `POST /api/fichajes/revision`  
**Acción**: `actualizar`

### Proceso

```typescript
1. Obtiene fichaje con eventos y jornada del empleado
2. Determina eventos faltantes según configuración de jornada
3. Crea eventos que falten basándose en:
   - Horarios de jornada (entrada, salida, pausas)
   - O fallback: entrada existente + 8h para salida
4. Recalcula horas trabajadas y en pausa
5. Marca fichaje como 'finalizado'
6. Crea notificación al empleado
```

---

## ✅ Conclusión: Lógica Correcta

La lógica del CRON está **bien implementada** y sigue el flujo esperado:

1. ✅ Crea fichajes pendientes para empleados que deberían trabajar pero no ficharon
2. ✅ Clasifica fichajes `en_curso` como `finalizado` (completos) o `pendiente` (incompletos)
3. ✅ NO modifica fichajes ya `pendientes` o `finalizados` (estable)
4. ✅ Genera notificaciones a HR para fichajes que requieren revisión
5. ✅ Respeta ausencias, festivos y configuración de jornadas

**Único requisito**: Empleados activos **deben tener jornada asignada** (`jornadaId`) para que el sistema funcione correctamente.

---

## 📚 Referencias

- **CRON**: `app/api/cron/clasificar-fichajes/route.ts`
- **Validación**: `lib/calculos/fichajes.ts:757-885` (`validarFichajeCompleto`)
- **Día laboral**: `lib/calculos/fichajes.ts:532-601` (`esDiaLaboral`)
- **Empleados disponibles**: `lib/calculos/fichajes.ts:607-635` (`obtenerEmpleadosDisponibles`)
- **Modal cuadrar**: `app/api/fichajes/revision/route.ts`
- **Estados**: `lib/constants/enums.ts:70-74`

**Última actualización**: 21 de noviembre 2025

