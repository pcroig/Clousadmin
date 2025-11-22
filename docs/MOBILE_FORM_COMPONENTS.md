# Componentes de Formulario Mobile

Guía completa de componentes de formulario optimizados para mobile con mejores targets táctiles y UX nativa.

## Filosofía de Diseño

### Mobile vs Desktop

- **Mobile**: Usa `Sheet` (bottom sheet) para selectores y calendarios
  - Mejor aprovechamiento del espacio vertical
  - UX más nativa (similar a iOS/Android)
  - Drag handle para cerrar deslizando
  - Ocupa 60-80% de la altura de la pantalla

- **Desktop**: Usa `Popover` estándar
  - Mantiene la UX tradicional de dropdown
  - Posicionamiento contextual
  - Más compacto y eficiente en espacio

### Touch Targets

Todos los elementos interactivos en mobile cumplen con:
- **Mínimo 44x44px** para targets táctiles (recomendación Apple/Google)
- Espaciado generoso entre elementos (evitar clicks accidentales)
- Texto legible: mínimo 16px (evita zoom automático en iOS)

---

## Componentes Disponibles

### 1. SearchableSelect

Selector con búsqueda, optimizado para listas largas.

#### Uso Básico

```tsx
import { SearchableSelect } from '@/components/shared';

function MiFormulario() {
  const [equipoId, setEquipoId] = useState('');

  const equipos = [
    { value: '1', label: 'Equipo Marketing' },
    { value: '2', label: 'Equipo Ventas' },
    { value: '3', label: 'Equipo Desarrollo' },
  ];

  return (
    <div>
      <Label>Seleccionar equipo</Label>
      <SearchableSelect
        items={equipos}
        value={equipoId}
        onChange={setEquipoId}
        placeholder="Buscar equipo..."
        label="Seleccionar equipo" // Label para el sheet en mobile
      />
    </div>
  );
}
```

#### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `items` | `Item[]` | - | Array de opciones `{ value, label }` |
| `value` | `string` | - | Valor seleccionado |
| `onChange` | `(value: string) => void` | - | Callback al cambiar |
| `placeholder` | `string` | 'Seleccionar...' | Texto cuando no hay selección |
| `emptyMessage` | `string` | 'No se encontraron resultados' | Mensaje cuando la búsqueda no encuentra nada |
| `disabled` | `boolean` | `false` | Si está deshabilitado |
| `label` | `string` | 'Seleccionar opción' | Label del sheet en mobile |
| `className` | `string` | - | Clases adicionales |

#### Comportamiento

- **Mobile**: Bottom sheet con search bar en la parte superior
- **Desktop**: Popover con command palette
- Búsqueda en tiempo real por label
- Icono de check en el item seleccionado

---

### 2. SearchableMultiSelect

Selector múltiple con búsqueda, permite seleccionar varios items.

#### Uso Básico

```tsx
import { SearchableMultiSelect } from '@/components/shared';

function MiFormulario() {
  const [empleadoIds, setEmpleadoIds] = useState<string[]>([]);

  const empleados = [
    { value: '1', label: 'Juan Pérez' },
    { value: '2', label: 'María García' },
    { value: '3', label: 'Carlos López' },
  ];

  return (
    <div>
      <Label>Seleccionar empleados</Label>
      <SearchableMultiSelect
        items={empleados}
        values={empleadoIds}
        onChange={setEmpleadoIds}
        placeholder="Buscar empleados..."
        label="Seleccionar empleados"
        maxSelections={5} // Opcional: limitar selecciones
      />
    </div>
  );
}
```

#### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `items` | `MultiSelectItem[]` | - | Array de opciones |
| `values` | `string[]` | - | Array de valores seleccionados |
| `onChange` | `(values: string[]) => void` | - | Callback al cambiar |
| `placeholder` | `string` | 'Seleccionar...' | Texto cuando no hay selección |
| `emptyMessage` | `string` | 'No se encontraron resultados' | Mensaje de búsqueda vacía |
| `disabled` | `boolean` | `false` | Si está deshabilitado |
| `label` | `string` | 'Seleccionar opciones' | Label del sheet en mobile |
| `maxSelections` | `number` | - | Límite máximo de selecciones |
| `className` | `string` | - | Clases adicionales |

#### Comportamiento

- **Mobile**: 
  - Bottom sheet con badges de seleccionados en la parte superior
  - Contador de selecciones en el título
  - Botón "Confirmar" para cerrar
  - Los items se deshabilitan al alcanzar `maxSelections`
  
- **Desktop**:
  - Popover con badges en el trigger
  - Click en badge para eliminar selección
  - Checkboxes en items

---

### 3. ResponsiveDatePicker

Selector de fecha único, optimizado para touch.

#### Uso Básico

```tsx
import { ResponsiveDatePicker } from '@/components/shared';

function MiFormulario() {
  const [fecha, setFecha] = useState<Date | undefined>();
  const today = new Date();

  return (
    <div>
      <Label>Fecha de inicio</Label>
      <ResponsiveDatePicker
        date={fecha}
        onSelect={setFecha}
        placeholder="Seleccionar fecha"
        label="Fecha de inicio"
        disabled={(date) => date < today} // Deshabilitar fechas pasadas
      />
    </div>
  );
}
```

#### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `date` | `Date \| undefined` | - | Fecha seleccionada |
| `onSelect` | `(date: Date \| undefined) => void` | - | Callback al cambiar |
| `placeholder` | `string` | 'Seleccionar fecha' | Texto sin fecha |
| `disabled` | `boolean \| ((date: Date) => boolean)` | `false` | Deshabilitar o función para deshabilitar fechas |
| `label` | `string` | 'Seleccionar fecha' | Label del sheet en mobile |
| `fromDate` | `Date` | - | Fecha mínima seleccionable |
| `toDate` | `Date` | - | Fecha máxima seleccionable |
| `className` | `string` | - | Clases adicionales |

#### Comportamiento

- **Mobile**:
  - Bottom sheet con calendario táctil (botones de día 44x44px)
  - Botones "Cancelar" y "Limpiar" en la parte inferior
  - Formato de fecha largo (ej: "15 de enero de 2025")
  
- **Desktop**:
  - Popover con calendario estándar
  - Cierra automáticamente al seleccionar

---

### 4. ResponsiveDateRangePicker

Selector de rango de fechas (inicio y fin).

#### Uso Básico

```tsx
import { ResponsiveDateRangePicker } from '@/components/shared';

function MiFormulario() {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  return (
    <div>
      <Label>Período de ausencia</Label>
      <ResponsiveDateRangePicker
        dateRange={dateRange}
        onSelect={setDateRange}
        placeholder="Seleccionar rango"
        label="Período de ausencia"
      />
    </div>
  );
}
```

#### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `dateRange` | `{ from?: Date, to?: Date }` | - | Rango seleccionado |
| `onSelect` | `(range) => void` | - | Callback al cambiar |
| `placeholder` | `string` | 'Seleccionar rango' | Texto sin rango |
| `disabled` | `boolean \| ((date: Date) => boolean)` | `false` | Deshabilitar fechas |
| `label` | `string` | 'Seleccionar rango de fechas' | Label del sheet |
| `fromDate` | `Date` | - | Fecha mínima |
| `toDate` | `Date` | - | Fecha máxima |
| `className` | `string` | - | Clases adicionales |

#### Comportamiento

- **Mobile**:
  - Un solo mes visible (optimizado para pantalla pequeña)
  - Rango visual con días intermedios resaltados
  - Muestra rango completo en el trigger
  
- **Desktop**:
  - Dos meses visibles
  - Selección fluida de rango

---

## Patrones de Uso Comunes

### Formulario de Ausencia

```tsx
function SolicitarAusenciaForm() {
  const [tipo, setTipo] = useState('');
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const today = new Date();

  const tiposAusencia = [
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'enfermedad', label: 'Baja por enfermedad' },
    { value: 'personal', label: 'Asunto personal' },
  ];

  return (
    <form className="space-y-4">
      <div>
        <Label>Tipo de ausencia</Label>
        <SearchableSelect
          items={tiposAusencia}
          value={tipo}
          onChange={setTipo}
          label="Tipo de ausencia"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Fecha de inicio</Label>
          <ResponsiveDatePicker
            date={fechaInicio}
            onSelect={setFechaInicio}
            disabled={(date) => date < today}
            label="Fecha de inicio"
          />
        </div>

        <div>
          <Label>Fecha de fin</Label>
          <ResponsiveDatePicker
            date={fechaFin}
            onSelect={setFechaFin}
            disabled={(date) => !fechaInicio || date < fechaInicio}
            label="Fecha de fin"
          />
        </div>
      </div>
    </form>
  );
}
```

### Filtro con Multi-Select

```tsx
function FiltroEmpleados() {
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([]);
  const [departamentosSeleccionados, setDepartamentosSeleccionados] = useState<string[]>([]);

  return (
    <div className="space-y-3">
      <SearchableMultiSelect
        items={equipos}
        values={equiposSeleccionados}
        onChange={setEquiposSeleccionados}
        label="Filtrar por equipos"
        placeholder="Todos los equipos"
      />

      <SearchableMultiSelect
        items={departamentos}
        values={departamentosSeleccionados}
        onChange={setDepartamentosSeleccionados}
        label="Filtrar por departamentos"
        placeholder="Todos los departamentos"
      />
    </div>
  );
}
```

---

## Migración desde Componentes Antiguos

### De Popover + Calendar a ResponsiveDatePicker

**Antes:**
```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <CalendarIcon className="mr-2" />
      {fecha ? format(fecha, 'PPP', { locale: es }) : 'Seleccionar'}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Calendar
      mode="single"
      selected={fecha}
      onSelect={setFecha}
    />
  </PopoverContent>
</Popover>
```

**Después:**
```tsx
<ResponsiveDatePicker
  date={fecha}
  onSelect={setFecha}
  placeholder="Seleccionar fecha"
  label="Seleccionar fecha"
/>
```

### De Select estándar a SearchableSelect

**Antes:**
```tsx
<Select value={equipo} onValueChange={setEquipo}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {equipos.map(e => (
      <SelectItem key={e.id} value={e.id}>
        {e.nombre}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Después:**
```tsx
<SearchableSelect
  items={equipos.map(e => ({ value: e.id, label: e.nombre }))}
  value={equipo}
  onChange={setEquipo}
  label="Seleccionar equipo"
/>
```

---

## Accesibilidad

Todos los componentes incluyen:

✅ **ARIA labels**: Roles y etiquetas correctas  
✅ **Keyboard navigation**: Tab, Enter, Escape  
✅ **Screen reader**: Anuncios de cambios  
✅ **Focus management**: Focus automático en búsqueda  
✅ **Touch targets**: Mínimo 44x44px en mobile  

---

## Testing

### Test de Responsive Behavior

```tsx
import { render, screen } from '@testing-library/react';
import { ResponsiveDatePicker } from '@/components/shared';

describe('ResponsiveDatePicker', () => {
  it('muestra Sheet en mobile', () => {
    // Mock useIsMobile para mobile
    jest.mock('@/lib/hooks/use-viewport', () => ({
      useIsMobile: () => true,
    }));

    render(<ResponsiveDatePicker date={undefined} onSelect={() => {}} />);
    
    // Verificar que se usa Sheet
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

---

## Constantes de Diseño

Todos los componentes usan `MOBILE_DESIGN` de `/lib/constants/mobile-design.ts`:

```typescript
MOBILE_DESIGN.components.form = {
  label: 'text-sm font-medium text-gray-700 mb-1.5',
  input: 'h-11 text-base',
  select: 'h-11 text-base',
};

MOBILE_DESIGN.components.select = {
  trigger: 'h-11 text-base',
  item: 'min-h-[44px] px-3 text-base',
};

MOBILE_DESIGN.components.calendar = {
  dayButton: 'h-11 w-11 text-base',
};
```

---

## Siguiente Pasos

- [ ] Migrar todos los formularios existentes a usar estos componentes
- [ ] Crear tests de integración para mobile
- [ ] Añadir animaciones de transición más suaves
- [ ] Soporte para modo oscuro
- [ ] Mejoras de performance con virtualización para listas muy largas (>1000 items)

---

**Versión**: 1.0.0  
**Última actualización**: 2025-01-21


