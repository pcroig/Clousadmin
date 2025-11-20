# Recomendaciones de Código para Reparar

Basado en el análisis exhaustivo de `lib/utils/fechas.ts`

## 1. CRÍTICO: Reparar array duplicado en revision/route.ts

**Archivo:** `/home/user/Clousadmin/app/api/fichajes/revision/route.ts`

**Línea actual 221:**
```typescript
const diasSemana = ['domingo', 'lunes', 'miercoles','miercoles','jueves','viernes','sabado'];
```

**Cambiar a:**
```typescript
const diasSemana = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
```

**O mejor aún, usar el helper:**
```typescript
import { obtenerNombreDia } from '@/lib/utils/fechas';

// En lugar de:
// const nombreDia = diasSemana[fechaBase.getDay()];

// Usar:
const nombreDia = obtenerNombreDia(fechaBase);
```

---

## 2. IMPORTANTE: Mejorar calcularDiasEntre()

**Archivo:** `lib/utils/fechas.ts`

**Código actual (líneas 158-166):**
```typescript
export function calcularDiasEntre(
  inicio: Date,
  fin: Date,
  incluirAmbos: boolean = true
): number {
  const ms = Math.abs(fin.getTime() - inicio.getTime());
  const dias = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return incluirAmbos ? dias + 1 : dias;
}
```

**Reemplazar por:**
```typescript
export function calcularDiasEntre(
  inicio: Date,
  fin: Date,
  incluirAmbos: boolean = true
): number {
  // Normalizar ambas fechas a inicio de día para evitar problemas con horas
  const inicioNormalizado = normalizarFecha(inicio);
  const finNormalizado = normalizarFecha(fin);
  
  const ms = Math.abs(finNormalizado.getTime() - inicioNormalizado.getTime());
  // Usar floor para contar solo días completos
  const dias = Math.floor(ms / (1000 * 60 * 60 * 24));
  
  return incluirAmbos ? dias + 1 : dias;
}
```

---

## 3. IMPORTANTE: Añadir validación a funciones de comparación

**Archivo:** `lib/utils/fechas.ts`

### 3.1 esFechaPasada()

**Código actual (líneas 300-302):**
```typescript
export function esFechaPasada(fecha: Date): boolean {
  return fecha < new Date();
}
```

**Reemplazar por:**
```typescript
export function esFechaPasada(fecha: Date | null | undefined): boolean {
  if (!fecha || !(fecha instanceof Date) || isNaN(fecha.getTime())) {
    return false;
  }
  return fecha < new Date();
}
```

### 3.2 esFechaFutura()

**Código actual (líneas 312-314):**
```typescript
export function esFechaFutura(fecha: Date): boolean {
  return fecha > new Date();
}
```

**Reemplazar por:**
```typescript
export function esFechaFutura(fecha: Date | null | undefined): boolean {
  if (!fecha || !(fecha instanceof Date) || isNaN(fecha.getTime())) {
    return false;
  }
  return fecha > new Date();
}
```

### 3.3 esMismoDia()

**Código actual (líneas 325-331):**
```typescript
export function esMismoDia(fecha1: Date, fecha2: Date): boolean {
  return (
    fecha1.getFullYear() === fecha2.getFullYear() &&
    fecha1.getMonth() === fecha2.getMonth() &&
    fecha1.getDate() === fecha2.getDate()
  );
}
```

**Reemplazar por:**
```typescript
export function esMismoDia(
  fecha1: Date | null | undefined,
  fecha2: Date | null | undefined
): boolean {
  if (!fecha1 || !fecha2 || !(fecha1 instanceof Date) || !(fecha2 instanceof Date)) {
    return false;
  }
  if (isNaN(fecha1.getTime()) || isNaN(fecha2.getTime())) {
    return false;
  }
  return (
    fecha1.getFullYear() === fecha2.getFullYear() &&
    fecha1.getMonth() === fecha2.getMonth() &&
    fecha1.getDate() === fecha2.getDate()
  );
}
```

---

## 4. IMPORTANTE: Documentar comportamiento de timezone

**Archivo:** `lib/utils/fechas.ts`

**Añadir al JSDoc de normalizarFecha (antes de la función, línea 84):**
```typescript
/**
 * Normaliza una fecha a medianoche (00:00:00.000)
 * Crea una nueva instancia sin modificar la original
 * 
 * ⚠️ IMPORTANTE: Opera en timezone LOCAL del cliente/servidor
 * 
 * Si el servidor está en UTC y la BD espera fechas en UTC,
 * considerar usar UTC explícitamente con setUTCHours:
 * 
 * @example
 * // Local (recomendado en cliente)
 * const fecha = normalizarFecha(new Date('2025-01-20T15:30:00'));
 * // 2025-01-20T00:00:00 (hora local)
 * 
 * // UTC (si es necesario)
 * const fecha = new Date(fecha);
 * fecha.setUTCHours(0, 0, 0, 0);
 * 
 * @param fecha - Fecha a normalizar
 * @returns Nueva fecha con horas, minutos, segundos y milisegundos en 0
 */
```

---

## 5. OPCIONAL: Consolidar funciones duplicadas

### 5.1 Eliminar formatearFechaRelativa de formatters.ts

**Archivo:** `lib/utils/formatters.ts`

**Líneas 238-257:** Eliminar esta función (usar la de fechas.ts en su lugar)

**Cambiar imports en archivos que la usen a:**
```typescript
import { formatearFechaRelativa } from '@/lib/utils/fechas';
```

### 5.2 Eliminar normalizarFecha de otros archivos

**Archivo:** `lib/calculos/plantilla.ts`

**Línea 25-27:** Cambiar:
```typescript
function normalizarFecha(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}
```

**Por:**
```typescript
import { normalizarFecha } from '@/lib/utils/fechas';
```

**Archivo:** `lib/utils/fichajesHistorial.ts`

**Línea 117-120:** Cambiar a usar import de fechas.ts para normalizar solo a inicio de día

---

## 6. TESTS RECOMENDADOS

**Crear archivo:** `tests/fecha-helpers.test.ts`

```typescript
import {
  calcularDiasEntre,
  esFechaPasada,
  esFechaFutura,
  esMismoDia,
  normalizarFecha,
  obtenerNombreDia,
} from '@/lib/utils/fechas';

describe('lib/utils/fechas.ts', () => {
  describe('calcularDiasEntre', () => {
    it('should calculate days correctly without hours', () => {
      const inicio = new Date('2025-01-20');
      const fin = new Date('2025-01-25');
      
      expect(calcularDiasEntre(inicio, fin, false)).toBe(5);
      expect(calcularDiasEntre(inicio, fin, true)).toBe(6);
    });

    it('should normalize dates first when calculating with hours', () => {
      const inicio = new Date('2025-01-20T10:00:00');
      const fin = new Date('2025-01-25T14:00:00');
      
      // Debería normalizar a 00:00 antes de contar
      expect(calcularDiasEntre(inicio, fin, false)).toBe(5);
      expect(calcularDiasEntre(inicio, fin, true)).toBe(6);
    });

    it('should handle same day', () => {
      const fecha = new Date('2025-01-20');
      
      expect(calcularDiasEntre(fecha, fecha, false)).toBe(0);
      expect(calcularDiasEntre(fecha, fecha, true)).toBe(1);
    });
  });

  describe('esFechaPasada', () => {
    it('should return true for past dates', () => {
      const pasada = new Date('2024-01-01');
      expect(esFechaPasada(pasada)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(esFechaPasada(null)).toBe(false);
      expect(esFechaPasada(undefined)).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(esFechaPasada(new Date('invalid'))).toBe(false);
    });
  });

  describe('esMismoDia', () => {
    it('should identify same day ignoring time', () => {
      const fecha1 = new Date('2025-01-20T08:00');
      const fecha2 = new Date('2025-01-20T17:00');
      
      expect(esMismoDia(fecha1, fecha2)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      const fecha = new Date('2025-01-20');
      
      expect(esMismoDia(null, fecha)).toBe(false);
      expect(esMismoDia(fecha, undefined)).toBe(false);
      expect(esMismoDia(null, undefined)).toBe(false);
    });
  });

  describe('obtenerNombreDia', () => {
    it('should match getDay() order', () => {
      const sunday = new Date('2025-01-19');
      const monday = new Date('2025-01-20');
      
      expect(obtenerNombreDia(sunday)).toBe('domingo');
      expect(obtenerNombreDia(monday)).toBe('lunes');
    });
  });
});
```

---

## Checklist de Implementación

- [ ] Reparar array 'miercoles' duplicado en revision/route.ts:221
- [ ] Mejorar calcularDiasEntre() con normalización
- [ ] Añadir validación null/undefined a esFechaPasada()
- [ ] Añadir validación null/undefined a esFechaFutura()
- [ ] Añadir validación null/undefined a esMismoDia()
- [ ] Documentar comportamiento de timezone en JSDoc
- [ ] Consolidar normalizarFecha (eliminar duplicados)
- [ ] Consolidar formatearFechaRelativa (eliminar de formatters.ts)
- [ ] Escribir tests en tests/fecha-helpers.test.ts
- [ ] Verificar que todos los tests pasan
- [ ] Actualizar documentación del proyecto

---

## Estimación de Tiempo

- Reparar bug crítico: 5 minutos
- Mejoras importantes: 20 minutos
- Tests: 30 minutos
- Consolidación duplicados: 15 minutos
- **Total: ~1 hora**

