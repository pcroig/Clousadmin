# 🧩 Patrones de Diseño - Clousadmin

**Última actualización:** 10 de diciembre de 2025
**Estado:** Referencia rápida a los patrones documentados durante la evolución del sistema.

---

## Objetivo

Centralizar los principios y patrones aplicados en el desarrollo de Clousadmin.
Este documento sirve como índice rápido y apunta a la guía principal del sistema de diseño.

---

## Patrones UI/UX

1. **Widgets unificados**: Todos los widgets usan `WidgetCard` con soporte para `titleIcon` y `badge`.
2. **Badges consistentes**: Variantes `success`, `warning`, `info` dentro del componente `Badge`.
3. **Botones unificados**: Uso exclusivo del componente `Button` con variantes `default`, `outline`, `destructive`, `ghost`.
4. **Animaciones coherentes**: Hover con `-translate-y-0.5` y `shadow-md` para botones principales.
5. **Cabeceras mobile**: Uso de `MobilePageHeader` y `MobileActionBar`.
6. **Hover Cards para empleados**: `EmpleadoHoverCard` muestra información uniforme (rol, equipo, email, estado) en widgets y tablas de forma consistente.

---

## Patrones de Código

### 🕐 Manejo de Fechas (Actualizado: 10 Dic 2025)

**REGLA CRÍTICA**: Toda fecha que se persista en BD o se compare DEBE normalizarse a medianoche UTC.

#### Helper Centralizado

```typescript
import { normalizeToUTCDate, getDaysBetween } from '@/lib/utils/dates';

// ✅ SIEMPRE hacer esto antes de persistir
const fecha = normalizeToUTCDate(userInput);
await prisma.tabla.create({ data: { fecha } });

// ✅ SIEMPRE hacer esto antes de comparar
const fechaInicio = normalizeToUTCDate(ausencia.fechaInicio);
const fechaFin = normalizeToUTCDate(ausencia.fechaFin);
if (fechaFin < fechaInicio) { /* validación */ }

// ✅ Calcular días entre fechas
const dias = getDaysBetween(fechaInicio, fechaFin);
```

#### Funciones Disponibles

- `normalizeToUTCDate(date)` - Normaliza a medianoche UTC (00:00:00.000Z)
- `getDaysBetween(inicio, fin)` - Calcula días inclusivos normalizados
- `isSameDayUTC(fecha1, fecha2)` - Compara días ignorando hora
- `toDateInputValue(date)` - Formato YYYY-MM-DD para inputs HTML
- `normalizeRangeToUTC(inicio, fin)` - Normaliza rango completo

#### Defensa en Profundidad

1. **Frontend**: Normaliza antes de `toISOString()`
2. **Backend**: Normaliza al recibir del cliente
3. **Funciones de cálculo**: Normalizan internamente

#### Módulos Aplicados

- ✅ Ausencias (`fechaInicio`, `fechaFin`)
- ✅ Festivos (`fecha`)
- ✅ Contratos (`fechaFin`, `fechaInicio`)
- ✅ Empleados (`fechaNacimiento`, `fechaAlta`)

**Referencia**: Ver `docs/funcionalidades/ausencias.md` v3.6.0 para detalles del fix.

---

## Documentación Relacionada

- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) - Guía completa del sistema de diseño.
- [`daily/2025-01-27-unificacion-diseno.md`](daily/2025-01-27-unificacion-diseno.md) - Log detallado de la sesión.

---

## Notas

Esta referencia se mantendrá breve. Para profundizar en tokens, componentes y ejemplos de código, consulta `DESIGN_SYSTEM.md`.




