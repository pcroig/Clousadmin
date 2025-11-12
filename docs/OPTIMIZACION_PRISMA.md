# 🔍 Optimización de Queries Prisma - Guía

## 📋 ¿Qué es el problema N+1?

El problema **N+1** ocurre cuando:
1. Haces **1 query** para obtener una lista de registros
2. Luego haces **N queries adicionales** (una por cada registro) para obtener datos relacionados

### ❌ Ejemplo MALO (N+1):

```typescript
// 1 query: Obtener 10 empleados
const empleados = await prisma.empleado.findMany({
  where: { empresaId: '123' },
  take: 10
});

// 10 queries adicionales (una por cada empleado)
for (const emp of empleados) {
  const ausencias = await prisma.ausencia.findMany({
    where: { empleadoId: emp.id }
  });
  // Total: 1 + 10 = 11 queries
}
```

**Problema**: Si tienes 100 empleados, haces **101 queries** (1 + 100)

---

### ✅ Ejemplo BUENO (con include):

```typescript
// Solo 1 query con JOIN automático
const empleados = await prisma.empleado.findMany({
  where: { empresaId: '123' },
  include: {
    ausencias: {
      where: { estado: 'pendiente' },
      take: 5
    }
  },
  take: 10
});
// Total: 1 query (con JOIN interno)
```

---

## 🎯 Riesgos de NO Optimizar

### 1. **Performance Degradada**
- **Con 10 empleados**: 11 queries (~200ms)
- **Con 100 empleados**: 101 queries (~2 segundos)
- **Con 1000 empleados**: 1001 queries (~20 segundos)

### 2. **Carga en Base de Datos**
- Más conexiones simultáneas
- Mayor uso de CPU/RAM
- Posible timeout en producción

### 3. **Experiencia de Usuario**
- Páginas lentas
- Timeouts
- Errores 500

---

## 💰 Retornos de Optimizar

### 1. **Performance Mejorada**
- **Antes**: 101 queries (1 + 100 empleados)
- **Después**: 1 query con JOIN
- **Mejora**: 10-100x más rápido

### 2. **Escalabilidad**
- Funciona igual de bien con 10 o 1000 empleados
- No se degrada con el crecimiento

### 3. **Menor Costo**
- Menos carga en DB = menor costo de infraestructura
- Menos tiempo de respuesta = mejor SEO

---

## 🔍 Análisis de Tu Código Actual

### ✅ **BUENO** - Ya Optimizado:

```typescript
// app/(dashboard)/hr/organizacion/personas/page.tsx
const empleados = await prisma.empleado.findMany({
  include: {
    equipos: {
      select: {
        equipo: {
          select: { nombre: true }
        }
      }
    }
  }
});
```
**✅ Usa `include` correctamente**

---

### ✅ **BUENO** - Usa `select` para optimizar:

```typescript
// app/(dashboard)/hr/bandeja-entrada/page.tsx
const ausenciasPendientes = await prisma.ausencia.findMany({
  include: {
    empleado: {
      select: {
        nombre: true,
        apellidos: true,
        fotoUrl: true
      }
    }
  }
});
```
**✅ Solo selecciona campos necesarios**

---

### ⚠️ **POTENCIAL MEJORA** - Queries Separadas:

```typescript
// app/(dashboard)/empleado/dashboard/page.tsx
const empleado = await prisma.empleado.findUnique({...});
const ausenciasNotificaciones = await prisma.ausencia.findMany({...});
const preferenciaPendiente = await prisma.preferenciaVacaciones.findFirst({...});
```

**Análisis**: 
- ✅ No es N+1 (no hay loops)
- ⚠️ Podría combinarse en 1 query si se necesita siempre
- ✅ Está bien así si son datos opcionales

---

## 🛠️ Estrategias de Optimización

### 1. **Usar `include` para relaciones**

```typescript
// ❌ MALO
const empleados = await prisma.empleado.findMany();
for (const emp of empleados) {
  const ausencias = await prisma.ausencia.findMany({...});
}

// ✅ BUENO
const empleados = await prisma.empleado.findMany({
  include: {
    ausencias: true
  }
});
```

### 2. **Usar `select` para limitar campos**

```typescript
// ❌ MALO - Trae todos los campos
const empleados = await prisma.empleado.findMany({
  include: { ausencias: true }
});

// ✅ BUENO - Solo campos necesarios
const empleados = await prisma.empleado.findMany({
  select: {
    id: true,
    nombre: true,
    ausencias: {
      select: {
        id: true,
        fechaInicio: true
      }
    }
  }
});
```

### 3. **Paginación para grandes listas**

```typescript
// ✅ BUENO - Limitar resultados
const empleados = await prisma.empleado.findMany({
  take: 20,
  skip: 0,
  include: { ausencias: true }
});
```

---

## 📊 Ejemplo Real: Impacto

### Escenario: Listar 100 empleados con sus ausencias

#### ❌ Sin Optimización:
```
1 query: SELECT * FROM empleados WHERE empresaId = '123'
100 queries: SELECT * FROM ausencias WHERE empleadoId = 'emp1'
100 queries: SELECT * FROM ausencias WHERE empleadoId = 'emp2'
...
Total: 101 queries
Tiempo: ~2 segundos
```

#### ✅ Con Optimización:
```
1 query: SELECT e.*, a.* 
         FROM empleados e 
         LEFT JOIN ausencias a ON e.id = a.empleadoId 
         WHERE e.empresaId = '123'
Total: 1 query
Tiempo: ~50ms
```

**Mejora: 40x más rápido**

---

## ⚠️ Riesgos de Optimizar (Mínimos)

### 1. **Over-fetching** (Traer datos de más)
- **Riesgo**: Incluir relaciones que no se usan
- **Solución**: Usar `select` específico

### 2. **Queries muy complejas**
- **Riesgo**: JOINs muy grandes pueden ser lentos
- **Solución**: Paginación y límites

### 3. **Cambios en código existente**
- **Riesgo**: Necesitas ajustar código que espera estructura diferente
- **Solución**: Cambios pequeños y testeados

---

## 🎯 Recomendación

**Tu código actual está bastante bien optimizado.** 

Las optimizaciones que podrías hacer son:
1. ⚠️ **Prioridad BAJA**: Revisar queries que hacen múltiples llamadas separadas (no crítico)
2. ✅ **Prioridad MEDIA**: Asegurar que todas las listas usan `include` cuando necesitan relaciones
3. ✅ **Prioridad ALTA**: Ninguna - tu código ya está bien

**Riesgo de optimizar**: ⚠️ **BAJO** (si se hace cuidadosamente)
**Retorno de optimizar**: 💰 **MEDIO** (mejoras de performance, pero no crítico)

---

## 📝 Checklist de Optimización

- [ ] Revisar queries en Server Components
- [ ] Verificar que no hay loops con queries internas
- [ ] Asegurar uso de `include`/`select` apropiado
- [ ] Implementar paginación donde sea necesario
- [ ] Probar con datos reales (muchos registros)

---

**Conclusión**: Tu código está bien. Las optimizaciones son mejoras incrementales, no críticas.














