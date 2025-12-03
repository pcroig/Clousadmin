# Correcciones Críticas: Cuadraje de Fichajes y Actualización en Tiempo Real

**Fecha**: 2 de diciembre de 2025  
**Tipo**: Bug Fixes y Mejoras  
**Estado**: ⚠️ PARCIALMENTE REVERTIDO (ver corrección del 3 de diciembre de 2025)

---

## ⚠️ NOTA IMPORTANTE - CORRECCIÓN POSTERIOR

**Fecha de corrección**: 3 de diciembre de 2025

El **Problema 1** descrito en este documento contenía una **premisa incorrecta**: 
- ❌ **INCORRECTO**: "Fichajes del día actual no aparecían en cuadrar"
- ✅ **CORRECTO**: El cuadrar fichajes es **SOLO para días vencidos** (ya finalizados)

**Solución correcta aplicada el 3 de diciembre**:
- Revertido `offset = 0` → `offset = 1` (excluir HOY)
- Revertido `lte: hoy` → `lt: hoy` (excluir HOY)
- Los fichajes del día actual NO deben aparecer hasta después del CRON nocturno (23:30)

**Los problemas 2 y 3 de este documento siguen siendo válidos y las soluciones correctas.**

---

## 📋 RESUMEN EJECUTIVO

Se han corregido **3 problemas críticos** que afectaban la funcionalidad de cuadraje de fichajes y la visualización de datos en tiempo real:

1. ⚠️ ~~Fichajes del día actual no aparecían en cuadrar~~ (PREMISA INCORRECTA - REVERTIDO)
2. ✅ La tabla de fichajes no se actualizaba en tiempo real
3. ✅ Horas/Balance no reflejaban valores reales al aprobar/rechazar

---

## 🐛 PROBLEMA 1: Fichajes de HOY no aparecían en cuadrar

### **Causa Raíz**

El endpoint `GET /api/fichajes/revision` tenía dos bugs que excluían los fichajes del día actual:

1. **Lazy recovery no procesaba hoy**: El loop empezaba en `offset = 1`, saltándose `hoy`
2. **Filtro de fecha excluía hoy**: Usaba `fecha < hoy` en lugar de `fecha <= hoy`

### **Impacto**

- ❌ Los fichajes creados hoy **nunca aparecían** en la pantalla de cuadrar
- ❌ Los empleados que no fichaban hoy **no se detectaban** hasta el día siguiente
- ❌ El sistema dependía 100% del CRON nocturno (sin fallback para el día actual)

### **Solución Implementada**

**Archivo**: `app/api/fichajes/revision/route.ts`

```typescript
// ANTES (línea 97)
for (let offset = 1; offset <= diasARecuperar; offset++) {
  // Solo procesaba ayer, anteayer, etc.
}

// DESPUÉS
for (let offset = 0; offset <= diasARecuperar; offset++) {
  // ✅ Ahora incluye HOY (offset = 0)
}

// ANTES (línea 120)
const fechaWhere: Prisma.DateTimeFilter = { lt: hoy };

// DESPUÉS
const fechaWhere: Prisma.DateTimeFilter = { lte: hoy };
// ✅ Ahora incluye fichajes de hoy
```

### **Resultado**

- ✅ Los fichajes del día actual **aparecen inmediatamente** en cuadrar
- ✅ El sistema detecta empleados sin fichar **el mismo día**
- ✅ Fallback robusto si el CRON falla

---

## 🐛 PROBLEMA 2: Tabla no se actualizaba en tiempo real

### **Causa Raíz**

El `useEffect` que escucha eventos `fichaje-updated` tenía un **bug de dependencias**:

```typescript
// ANTES
useEffect(() => {
  function handleRealtimeUpdate() {
    fetchFichajes(); // Esta función NO estaba en las dependencias
  }
  window.addEventListener('fichaje-updated', handleRealtimeUpdate);
  return () => window.removeEventListener('fichaje-updated', handleRealtimeUpdate);
}, []); // ❌ Array vacío - el listener usa una referencia obsoleta de fetchFichajes
```

### **Impacto**

- ❌ Los eventos del widget de fichaje se disparaban, pero la tabla **no se refrescaba**
- ❌ El listener usaba una referencia **obsoleta** de `fetchFichajes`
- ❌ La tabla solo se actualizaba al cambiar filtros/fechas manualmente

### **Solución Implementada**

**Archivo**: `app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx`

```typescript
// DESPUÉS
useEffect(() => {
  function handleRealtimeUpdate() {
    fetchFichajes();
  }
  window.addEventListener('fichaje-updated', handleRealtimeUpdate);
  return () => window.removeEventListener('fichaje-updated', handleRealtimeUpdate);
}, [fetchFichajes]); // ✅ Ahora incluye la dependencia correcta
```

### **Resultado**

- ✅ La tabla se actualiza **automáticamente** cuando un empleado ficha
- ✅ Los cambios son **instantáneos** sin necesidad de refrescar
- ✅ El listener siempre usa la versión **actualizada** de `fetchFichajes`

---

## 🐛 PROBLEMA 3: Horas/Balance no reflejaban valores reales

### **Causa Raíz**

El endpoint `PATCH /api/fichajes/[id]` (aprobar/rechazar) **NO recalculaba** las horas trabajadas ni el balance:

```typescript
// ANTES - Al aprobar
const actualizado = await prisma.fichajes.update({
  where: { id },
  data: {
    estado: EstadoFichaje.finalizado,
    // ❌ NO se actualizaban horasTrabajadas ni horasEnPausa
  },
});
```

### **Impacto**

- ❌ Las horas mostradas podían estar **desactualizadas**
- ❌ El balance no reflejaba la **realidad**
- ❌ Solo se recalculaban al editar eventos individuales, no al cambiar estado

### **Solución Implementada**

**Archivo**: `app/api/fichajes/[id]/route.ts`

```typescript
// DESPUÉS - Al aprobar (líneas 145-171)
// FIX: Recalcular horas trabajadas y en pausa antes de aprobar
const { calcularHorasTrabajadas, calcularTiempoEnPausa } = await import('@/lib/calculos/fichajes');
const horasTrabajadas = calcularHorasTrabajadas(eventos) ?? 0;
const horasEnPausa = calcularTiempoEnPausa(eventos);

const actualizado = await prisma.fichajes.update({
  where: { id },
  data: {
    estado: EstadoFichaje.finalizado,
    horasTrabajadas,      // ✅ Actualizado
    horasEnPausa,         // ✅ Actualizado
  },
});

// ✅ También se aplica al rechazar (líneas 190-216)
```

### **Resultado**

- ✅ Las horas se **recalculan** cada vez que se aprueba/rechaza un fichaje
- ✅ El balance es **siempre preciso** y refleja los valores reales
- ✅ La tabla muestra datos **actualizados** inmediatamente

---

## 📊 ARCHIVOS MODIFICADOS

| Archivo | Líneas | Cambio | Impacto |
|---------|--------|--------|---------|
| `app/api/fichajes/revision/route.ts` | 97 | `offset = 1` → `offset = 0` | ✅ Incluir hoy en lazy recovery |
| `app/api/fichajes/revision/route.ts` | 120 | `lt: hoy` → `lte: hoy` | ✅ Incluir hoy en filtro fecha |
| `app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx` | 283 | `[]` → `[fetchFichajes]` | ✅ Fix dependencias useEffect |
| `app/api/fichajes/[id]/route.ts` | 145-171 | Añadir recálculo al aprobar | ✅ Horas actualizadas |
| `app/api/fichajes/[id]/route.ts` | 190-216 | Añadir recálculo al rechazar | ✅ Horas actualizadas |

---

## 📝 DOCUMENTACIÓN ACTUALIZADA

### Archivos Actualizados

1. ✅ `docs/revisiones/verificacion-cuadraje-fichajes-2025-11-27.md`
   - Añadida sección "🐛 CORRECCIONES CRÍTICAS (2025-12-02)"
   - Actualizado lazy recovery para incluir offset=0
   - Añadido changelog

2. ✅ `docs/api/reference/fichajes.md`
   - Actualizada fecha de última actualización
   - Añadidos endpoints faltantes (`/api/fichajes/revision`, `/api/fichajes/cuadrar`)
   - Añadida sección "📋 Cambios Recientes (2025-12-02)"

3. ✅ `docs/funcionalidades/fichajes.md`
   - Actualizada sección de visualización con actualización en tiempo real
   - Actualizada sección de cuadrar fichajes para mencionar que incluye HOY

4. ✅ `docs/historial/2025-12-02-FIX-CUADRAJE-FICHAJES-TIEMPO-REAL.md` (NUEVO)
   - Documento completo de todas las correcciones

---

## ✅ VERIFICACIÓN

### Checklist de Verificación

- [x] **Build exitoso**: `npm run build` compila sin errores
- [x] **Sin errores de linting**: Todos los archivos sin errores
- [x] **Lógica preservada**: Funcionalidad mantenida
- [x] **Tipos correctos**: TypeScript sin errores de tipo
- [x] **Documentación actualizada**: Todos los docs relevantes actualizados

### Comandos de Verificación

```bash
# Linting
npx eslint app/api/fichajes/revision/route.ts
npx eslint app/api/fichajes/[id]/route.ts
npx eslint app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx

# Build
npm run build

# Prisma
npx prisma generate
npx prisma validate
```

---

## 🎯 IMPACTO ESPERADO

### Mejoras en Experiencia de Usuario

1. **Cuadrar Fichajes**:
   - ✅ Los empleados que no fichan hoy aparecen **inmediatamente**
   - ✅ No hay que esperar al día siguiente para detectar problemas
   - ✅ El sistema funciona correctamente incluso si el CRON falla

2. **Actualización en Tiempo Real**:
   - ✅ Los cambios se reflejan **instantáneamente**
   - ✅ No es necesario refrescar manualmente la página
   - ✅ Mejor experiencia de usuario

3. **Datos Precisos**:
   - ✅ Las horas y el balance siempre reflejan valores **reales**
   - ✅ No hay inconsistencias entre la tabla y la base de datos
   - ✅ Mayor confiabilidad del sistema

---

## 🔮 MEJORAS FUTURAS (No Bloqueantes)

1. **WebSockets para actualizaciones en tiempo real**
   - Notificar a HR cuando aparecen nuevos fichajes pendientes
   - Actualización automática sin necesidad de eventos del DOM

2. **Tests automatizados**
   - Unit tests para los endpoints modificados
   - Integration tests para verificar el flujo completo

3. **Dashboard de métricas**
   - Fichajes pendientes por día (incluyendo hoy)
   - Tiempo promedio de cuadraje
   - Empleados con más incidencias

---

## 📞 SOPORTE

Si encuentras algún problema relacionado con estos cambios:

1. Verificar logs en `/api/fichajes/revision` y `/api/fichajes/[id]`
2. Confirmar que la variable de entorno `FICHAJES_LAZY_DIAS` está configurada (default: 3)
3. Verificar que los fichajes tienen los campos `horasTrabajadas` y `horasEnPausa` actualizados

---

**Firmado**: Claude (Senior Developer)  
**Fecha**: 2 de diciembre de 2025  
**Estado**: ✅ COMPLETADO Y APROBADO PARA PRODUCCIÓN

