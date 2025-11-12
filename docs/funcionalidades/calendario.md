# 📅 DOCUMENTACIÓN: SISTEMA DE CALENDARIOS

**Versión**: 1.0  
**Fecha**: 12 Noviembre 2025  
**Estado**: Documentación completa y actualizada

---

## 📋 RESUMEN EJECUTIVO

El sistema de calendarios de Clousadmin está basado en `react-day-picker` (shadcn/ui) y sigue el design system de la plataforma. Incluye:

- **Componente base**: `Calendar` con diseño unificado
- **Calendario interactivo**: Mi Espacio (ausencias)
- **Selector de fechas**: Modal Solicitar Ausencia
- **Calendario de festivos**: Gestión HR
- **Integración externa**: Google Calendar

---

## 🎨 COMPONENTE BASE: `Calendar`

### Ubicación
```
components/ui/calendar.tsx
```

### Características

#### Diseño según Design System
- **Color de acento**: `#d97757` (selección)
- **Color hover**: `#c6613f`
- **Bordes**: `border-gray-200`
- **Fondo**: `bg-white`
- **Tamaño de celda**: `2.5rem`
- **Hoy**: Borde `border-gray-300` + fondo `bg-gray-100`

#### Modos disponibles
1. **`mode="single"`**: Selección de un solo día
2. **`mode="range"`**: Selección de periodo (inicio → fin)

### Ejemplo de uso básico

```tsx
import { Calendar } from '@/components/ui/calendar';
import { es } from 'date-fns/locale';

<Calendar
  mode="single"
  selected={selectedDate}
  onSelect={setSelectedDate}
  locale={es}
  className="rounded-lg border-0" // Sin border adicional si ya está en un contenedor
/>
```

---

## 🗓️ CALENDARIO INTERACTIVO (Mi Espacio)

### Ubicación
```
app/(dashboard)/empleado/mi-espacio/tabs/ausencias-tab.tsx
```

### Funcionalidades

#### 1. Vista Dual
- **Mes actual** + **Mes siguiente** lado a lado
- Navegación sincronizada entre ambos

#### 2. Interactividad

**Click en día vacío:**
- Abre modal "Solicitar Ausencia"
- Fecha preseleccionada automáticamente

**Click en día con ausencia:**
- Muestra modal "Detalles de la Ausencia"
- Información completa (tipo, estado, fechas, días)

#### 3. Modificadores Visuales

Los días se estilizan según su estado usando `modifiers` y `modifiersClassNames`:

```tsx
const modifiers = {
  pendiente: (date: Date) => getDiaEstado(date) === 'pendiente_aprobacion',
  aprobada: (date: Date) => {
    const estado = getDiaEstado(date);
    return estado === 'en_curso' || estado === 'auto_aprobada' || estado === 'completada';
  },
  rechazada: (date: Date) => getDiaEstado(date) === 'rechazada',
  festivo: (date: Date) => esFestivo(date),
  noLaborable: (date: Date) => !esLaborable(date),
};

const modifiersClassNames = {
  pendiente: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-yellow-100 after:border-2 after:border-yellow-400 after:opacity-80 after:rounded-md cursor-pointer',
  aprobada: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-green-100 after:border-2 after:border-green-400 after:opacity-80 after:rounded-md cursor-pointer',
  rechazada: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-red-100 after:border-2 after:border-red-400 after:opacity-80 after:rounded-md cursor-pointer',
  festivo: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-red-50 after:border after:border-red-300 after:opacity-90 after:rounded-md',
  noLaborable: 'bg-gray-50 text-gray-400',
};
```

#### 4. Leyenda de Estados

El calendario incluye una leyenda visual:

| Color | Significado |
|-------|-------------|
| 🟩 Verde (border verde) | Ausencia aprobada |
| 🟨 Amarillo (border amarillo) | Ausencia pendiente |
| 🟥 Rojo (border rojo) | Ausencia rechazada |
| 🟥 Rojo claro | Festivo |
| ⬜ Gris claro | Día no laborable |
| ⬜ Blanco | Día laborable disponible |

#### 5. Handler de Click

```tsx
const handleDayClick = (date: Date | undefined) => {
  if (!date) return;

  // Buscar ausencias en ese día
  const ausenciasEnDia = ausencias.filter((a) => {
    const inicio = new Date(a.fechaInicio);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(a.fechaFin);
    fin.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate >= inicio && checkDate <= fin;
  });

  if (ausenciasEnDia.length > 0) {
    // Mostrar detalles de ausencia
    setSelectedAusencia(ausenciasEnDia[0]);
  } else {
    // Abrir modal nueva ausencia
    const fechaStr = format(date, 'yyyy-MM-dd');
    setNuevaAusencia({
      ...nuevaAusencia,
      fechaInicio: fechaStr,
      fechaFin: fechaStr,
    });
    setShowNuevaAusenciaModal(true);
  }
};

<Calendar
  mode="single"
  month={calendarMonth}
  onSelect={handleDayClick} // ⬅️ Handler de click
  modifiers={modifiers}
  modifiersClassNames={modifiersClassNames}
  className="rounded-md border-0"
  locale={es}
/>
```

---

## 📝 SELECTOR DE FECHAS (Modal Solicitar Ausencia)

### Ubicación
```
components/empleado/solicitar-ausencia-modal.tsx
```

### Patrón de Implementación

Usa `Popover` + `Calendar` para selector de fechas elegante:

```tsx
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

<Popover>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      className="w-full justify-start text-left font-normal"
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {fechaInicio ? format(fechaInicio, 'PPP', { locale: es }) : 'Seleccionar fecha'}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <Calendar
      mode="single"
      selected={fechaInicio}
      onSelect={setFechaInicio}
      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
    />
  </PopoverContent>
</Popover>
```

### Validaciones de Fecha

**Fecha Inicio**: No permitir fechas pasadas
```tsx
disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
```

**Fecha Fin**: No antes de hoy ni antes de fecha inicio
```tsx
disabled={(date) => {
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  return date < today || (fechaInicio ? date < fechaInicio : false);
}}
```

---

## 🎯 CALENDARIO DE FESTIVOS (HR)

### Ubicación
```
components/hr/calendario-festivos.tsx
```

### Funcionalidades

1. **Vista mensual**: Navegación entre meses
2. **Click en día**: Crear/editar festivo
3. **Modificadores**: Días festivos destacados visualmente

```tsx
<Calendar
  mode="single"
  selected={undefined} // Sin selección
  onSelect={handleDiaClick} // Click para crear/editar
  month={mesActual}
  onMonthChange={setMesActual}
  modifiers={{
    festivo: festivosDates, // Array de fechas festivas
  }}
  modifiersClassNames={{
    festivo: 'bg-red-100 text-red-900 font-semibold hover:bg-red-200',
  }}
  className="mx-auto"
/>
```

---

## 🔗 INTEGRACIÓN CON CALENDARIOS EXTERNOS

### Ubicación
```
lib/integrations/calendar/calendar-manager.ts
```

### Funcionalidades

- **Sincronización automática**: Ausencias → Google Calendar
- **Creación de eventos**: Al aprobar ausencia
- **Actualización de eventos**: Al editar ausencia
- **Eliminación de eventos**: Al cancelar/rechazar ausencia

### API

```tsx
import { CalendarManager } from '@/lib/integrations/calendar/calendar-manager';

// Sincronizar ausencia a todos los calendarios conectados
await CalendarManager.syncAusenciaToCalendars(ausencia);

// Eliminar ausencia de calendarios
await CalendarManager.deleteAusenciaFromCalendars(
  ausenciaId,
  empresaId,
  empleadoId
);
```

---

## 🛠️ PATRONES COMUNES

### 1. Calendario Simple (Solo Vista)

```tsx
<Calendar
  mode="single"
  selected={undefined}
  disabled={(date) => true} // Solo vista, sin interacción
  locale={es}
/>
```

### 2. Calendario con Rango

```tsx
<Calendar
  mode="range"
  selected={{ from: fechaInicio, to: fechaFin }}
  onSelect={(range) => {
    setFechaInicio(range?.from);
    setFechaFin(range?.to);
  }}
  locale={es}
/>
```

### 3. Calendario con Estados Personalizados

```tsx
<Calendar
  mode="single"
  modifiers={{
    ocupado: (date) => diasOcupados.includes(date),
    disponible: (date) => diasDisponibles.includes(date),
  }}
  modifiersClassNames={{
    ocupado: 'bg-red-100 text-red-900',
    disponible: 'bg-green-100 text-green-900',
  }}
  locale={es}
/>
```

### 4. Calendario en Popover (Selector de Fecha)

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? format(date, 'PPP', { locale: es }) : 'Seleccionar'}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      locale={es}
    />
  </PopoverContent>
</Popover>
```

---

## 🎨 ESTILOS Y CLASES

### Clases Recomendadas

**Calendario en Card:**
```tsx
className="rounded-md border-0"  // Sin border adicional
```

**Calendario en Popover:**
```tsx
<PopoverContent className="w-auto p-0">
  <Calendar ... />  // El calendario tiene su propio padding
</PopoverContent>
```

**Calendario con border:**
```tsx
className="rounded-lg border border-gray-200"
```

### Modificadores CSS

Los modificadores usan pseudo-elementos `::after` para overlays:

```tsx
modifiersClassNames={{
  estado: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-COLOR after:border-COLOR after:opacity-80 after:rounded-md'
}}
```

---

## 📚 COMPONENTES RELACIONADOS

### `FechaCalendar`
Componente visual pequeño para mostrar fechas individuales en listas.

**Ubicación**: `components/shared/fecha-calendar.tsx`

```tsx
<FechaCalendar date={new Date('2025-12-01')} />
```

**Diseño**: Estilo "calendario de pared" (mes arriba rojo + día abajo blanco)

### `EditarFestivoModal`
Modal para crear/editar festivos.

**Ubicación**: `components/hr/editar-festivo-modal.tsx`

---

## ⚠️ NOTAS IMPORTANTES

### Timezone
Siempre normalizar fechas a medianoche para comparaciones:

```tsx
const date = new Date(dateString);
date.setHours(0, 0, 0, 0);
```

### Locale
Siempre usar locale español:

```tsx
import { es } from 'date-fns/locale';

<Calendar locale={es} />
```

### Accesibilidad
- El componente `Calendar` tiene soporte de teclado integrado
- Los modificadores deben tener `cursor-pointer` si son clickeables
- Los días deshabilitados tienen `opacity-50` automáticamente

---

## 🔄 FLUJO DE TRABAJO

### Flujo Empleado: Solicitar Ausencia

1. Click en "Solicitar Ausencia" o click en día vacío del calendario
2. Se abre modal con calendario
3. Selecciona fechas con validación
4. Submit → Crea ausencia → Actualiza calendario automáticamente

### Flujo Empleado: Ver Ausencia

1. Navega al calendario en Mi Espacio
2. Ve días coloreados según estado
3. Click en día con ausencia → Modal con detalles

### Flujo HR: Gestionar Festivos

1. Abre "Gestionar Ausencias" → Tab "Calendario Laboral"
2. Ve calendario de festivos
3. Click en día vacío → Crear festivo
4. Click en día festivo → Editar/eliminar

---

## 📝 PRÓXIMAS MEJORAS SUGERIDAS

### Prioridad ALTA
1. **Indicadores visuales**: Puntitos/badges en días con múltiples ausencias
2. **Notificaciones visuales**: Badge numérico para días con varias ausencias

### Prioridad MEDIA
3. **Selector de rango mejorado**: Usar `mode="range"` en modal de solicitud
4. **Vista de equipo**: Calendario consolidado para HR con ausencias de todos

### Prioridad BAJA
5. **Tooltips avanzados**: Usar Tooltip de shadcn/ui con más información
6. **Animaciones**: Transiciones suaves al cambiar de mes

---

## 📚 REFERENCIAS

- **React DayPicker**: [https://react-day-picker.js.org](https://react-day-picker.js.org)
- **shadcn/ui Calendar**: [https://ui.shadcn.com/docs/components/calendar](https://ui.shadcn.com/docs/components/calendar)
- **date-fns**: [https://date-fns.org](https://date-fns.org)
- **Design System**: `lib/design-system.ts`, `DESIGN_SYSTEM.md`
- **Ausencias Doc**: `docs/funcionalidades/ausencias.md`

---

**Última actualización**: 12 Noviembre 2025  
**Estado**: Sistema completo y funcional con diseño unificado

