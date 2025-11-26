# Guía de Migración de Modales a ResponsiveDialog

Esta guía documenta el proceso de migración de modales `Dialog` existentes a `ResponsiveDialog` para proporcionar una mejor experiencia mobile.

## 🎯 Resumen

Hemos migrado los siguientes modales clave a `ResponsiveDialog`:

✅ **SolicitarAusenciaModal** - Formulario complejo con 7+ campos  
✅ **FichajeModal** - Modal unificado para crear/editar fichajes con múltiples eventos (reemplaza FichajeManualModal y EditarFichajeModal)  
✅ **CrearCampanaModal** - Formulario complejo con date pickers  

## 📦 Componentes Responsivos Disponibles

- `ResponsiveDialog` - Modal adaptativo según complejidad
- `ResponsiveDatePicker` - Date picker con bottom sheet en mobile
- `ResponsiveDateRangePicker` - Date range picker responsive
- `SearchableSelect` - Select con búsqueda (ya responsive)
- `SearchableMultiSelect` - Multi-select con búsqueda (ya responsive)

---

## 🔄 Proceso de Migración

### Paso 1: Identificar Complejidad del Modal

Determina la complejidad según el número de campos y la extensión del formulario:

| Complejidad | Campos | Comportamiento Mobile | Ejemplo |
|-------------|--------|----------------------|---------|
| **simple** | 1-2 campos | Bottom sheet | Confirmaciones, selección simple |
| **medium** | 3-5 campos | Dialog centrado | Fichaje manual, crear equipo |
| **complex** | 6+ campos | Full screen | Solicitar ausencia, editar empleado |

### Paso 2: Actualizar Imports

**Antes:**
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
```

**Después:**
```tsx
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { ResponsiveDatePicker } from '@/components/shared/responsive-date-picker';
```

### Paso 3: Actualizar Estructura del Modal

#### Para Modales Simples (1-2 campos)

**Antes:**
```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Confirmar Acción</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      {/* Contenido */}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancelar</Button>
      <Button onClick={handleSubmit}>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Después:**
```tsx
<ResponsiveDialog
  open={open}
  onOpenChange={(isOpen) => !isOpen && onClose()}
  title="Confirmar Acción"
  complexity="simple"
  footer={
    <div className="flex gap-2 w-full">
      <Button variant="outline" onClick={onClose} className="flex-1">
        Cancelar
      </Button>
      <Button onClick={handleSubmit} className="flex-1">
        Confirmar
      </Button>
    </div>
  }
>
  {/* Contenido */}
</ResponsiveDialog>
```

#### Para Modales Medianos (3-5 campos)

**Antes:**
```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Editar Datos</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      {/* Campos del formulario */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <LoadingButton type="submit" loading={loading}>
          Guardar
        </LoadingButton>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

**Después:**
```tsx
<ResponsiveDialog
  open={open}
  onOpenChange={(isOpen) => !isOpen && onClose()}
  title="Editar Datos"
  complexity="medium"
  footer={
    <div className="flex gap-2 w-full">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={loading}
        className="flex-1"
      >
        Cancelar
      </Button>
      <LoadingButton
        type="submit"
        form="edit-form"
        loading={loading}
        className="flex-1"
      >
        Guardar
      </LoadingButton>
    </div>
  }
>
  <form id="edit-form" onSubmit={handleSubmit}>
    {/* Campos del formulario */}
  </form>
</ResponsiveDialog>
```

#### Para Modales Complejos (6+ campos)

**Antes:**
```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Formulario Complejo</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Muchos campos */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <LoadingButton type="submit" loading={loading}>
          Enviar
        </LoadingButton>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

**Después:**
```tsx
<ResponsiveDialog
  open={open}
  onOpenChange={(isOpen) => !isOpen && onClose()}
  title="Formulario Complejo"
  complexity="complex" // Full-screen en mobile
  footer={
    <div className="flex gap-2 w-full">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={loading}
        className="flex-1"
      >
        Cancelar
      </Button>
      <LoadingButton
        type="submit"
        form="complex-form"
        loading={loading}
        className="flex-1"
      >
        Enviar
      </LoadingButton>
    </div>
  }
>
  <form id="complex-form" onSubmit={handleSubmit} className="space-y-4">
    {/* Muchos campos */}
  </form>
</ResponsiveDialog>
```

### Paso 4: Migrar Date Pickers

#### Date Picker Simple

**Antes:**
```tsx
const [fecha, setFecha] = useState(''); // String

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full">
      <CalendarIcon className="mr-2" />
      {fecha ? format(new Date(fecha), 'PPP', { locale: es }) : 'Seleccionar'}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Calendar
      mode="single"
      selected={fecha ? new Date(fecha) : undefined}
      onSelect={(date) => setFecha(date?.toISOString().split('T')[0] || '')}
      disabled={(date) => date < new Date()}
    />
  </PopoverContent>
</Popover>
```

**Después:**
```tsx
const [fecha, setFecha] = useState<Date | undefined>(); // Date object

<ResponsiveDatePicker
  date={fecha}
  onSelect={setFecha}
  placeholder="Seleccionar fecha"
  label="Seleccionar fecha"
  disabled={(date) => date < new Date()}
  fromDate={new Date()}
/>
```

#### Date Range Picker

**Antes:**
```tsx
const [fechaInicio, setFechaInicio] = useState('');
const [fechaFin, setFechaFin] = useState('');

// Dos inputs separados con calendarios
```

**Después:**
```tsx
const [dateRange, setDateRange] = useState<{
  from: Date | undefined;
  to: Date | undefined;
}>({ from: undefined, to: undefined });

<ResponsiveDateRangePicker
  dateRange={dateRange}
  onSelect={setDateRange}
  placeholder="Seleccionar rango"
  label="Período"
  fromDate={new Date()}
/>
```

### Paso 5: Actualizar Validaciones y Envío

**Antes (con strings):**
```tsx
if (!fecha) {
  toast.error('Fecha requerida');
  return;
}

const payload = {
  fecha: fecha,
};
```

**Después (con Date objects):**
```tsx
if (!fecha) {
  toast.error('Fecha requerida');
  return;
}

const payload = {
  fecha: fecha.toISOString().split('T')[0],
};
```

---

## 📋 Checklist de Migración

Para cada modal:

- [ ] **Analizar complejidad** (simple/medium/complex)
- [ ] **Actualizar imports** (ResponsiveDialog, ResponsiveDatePicker, etc.)
- [ ] **Cambiar estructura** del modal
- [ ] **Mover footer** a prop `footer`
- [ ] **Añadir form id** si el modal tiene formulario
- [ ] **Migrar date inputs** a ResponsiveDatePicker
- [ ] **Actualizar tipos** de fechas (string → Date)
- [ ] **Ajustar validaciones** y serialización
- [ ] **Verificar lint** (`npx eslint archivo.tsx`)
- [ ] **Probar en mobile** (DevTools responsive mode)

---

## 🔍 Modales Pendientes de Migración

### Alta Prioridad (Uso frecuente)

- [ ] `components/hr/DarDeBajaModal.tsx` - simple
- [ ] `components/organizacion/equipo-form-modal.tsx` - medium
- [ ] `components/organizacion/puesto-form-modal.tsx` - medium
- [ ] `components/empleado/responder-propuesta-modal.tsx` - medium
- [ ] `components/empleado/resultado-vacaciones-modal.tsx` - medium
- [x] ~~`app/(dashboard)/hr/horario/fichajes/editar-fichaje-modal.tsx`~~ - ✅ Unificado en `FichajeModal`
- [ ] `components/vacaciones/preferencias-vacaciones-modal.tsx` - complex

### Media Prioridad

- [ ] `components/organizacion/manage-members-modal.tsx` - medium
- [ ] `components/organizacion/change-manager-modal.tsx` - simple
- [ ] `components/hr/compensacion-modal.tsx` - medium
- [ ] `components/hr/editar-festivo-modal.tsx` - simple
- [ ] `app/(dashboard)/hr/horario/ausencias/gestionar-ausencias-modal.tsx` - complex

### Baja Prioridad (Admin/Configuración)

- [ ] `components/hr/gestionar-onboarding-modal.tsx` - complex
- [ ] `components/hr/generar-desde-plantilla-modal.tsx` - medium
- [ ] `components/hr/crear-carpeta-con-documentos-modal.tsx` - medium
- [ ] `components/hr/subir-plantilla-modal.tsx` - medium
- [ ] `components/hr/plantilla-mapear-campos-modal.tsx` - complex
- [ ] `components/hr/modal-complementos-nomina.tsx` - medium
- [ ] `components/payroll/upload-nominas-modal.tsx` - medium
- [ ] `app/(dashboard)/hr/horario/fichajes/jornadas-modal.tsx` - complex
- [ ] `app/(dashboard)/hr/horario/fichajes/editar-jornada-modal.tsx` - complex
- [ ] `app/(dashboard)/hr/horario/fichajes/revision-modal.tsx` - medium

---

## 💡 Tips y Buenas Prácticas

### 1. Determinar Complejidad

```tsx
// ✅ BIEN: Formulario complejo → Full-screen mobile
<ResponsiveDialog
  complexity="complex"  // 8 campos
  title="Crear Empleado"
>
  {/* Muchos campos */}
</ResponsiveDialog>

// ❌ MAL: Confirmación simple como complex
<ResponsiveDialog
  complexity="complex"  // Solo 1 campo
  title="¿Estás seguro?"
>
  <p>Esta acción no se puede deshacer</p>
</ResponsiveDialog>
```

### 2. Footer Responsive

```tsx
// ✅ BIEN: Botones ocupan todo el ancho en mobile
footer={
  <div className="flex gap-2 w-full">
    <Button className="flex-1">Cancelar</Button>
    <Button className="flex-1">Confirmar</Button>
  </div>
}

// ❌ MAL: Botones pequeños difíciles de tocar
footer={
  <div className="flex gap-2">
    <Button>Cancelar</Button>
    <Button>Confirmar</Button>
  </div>
}
```

### 3. Form ID para Submit externo

```tsx
// ✅ BIEN: Botón submit en footer funciona
<ResponsiveDialog
  footer={
    <LoadingButton type="submit" form="my-form" loading={loading}>
      Guardar
    </LoadingButton>
  }
>
  <form id="my-form" onSubmit={handleSubmit}>
    {/* Campos */}
  </form>
</ResponsiveDialog>

// ❌ MAL: Submit no funciona desde footer
<ResponsiveDialog footer={<Button type="submit">Guardar</Button>}>
  <form onSubmit={handleSubmit}>
    {/* Campos */}
  </form>
</ResponsiveDialog>
```

### 4. Disabled States

```tsx
// ✅ BIEN: Todos los botones disabled durante loading
footer={
  <div className="flex gap-2 w-full">
    <Button onClick={onClose} disabled={loading}>Cancelar</Button>
    <LoadingButton loading={loading}>Guardar</LoadingButton>
  </div>
}
```

### 5. Date Validation

```tsx
// ✅ BIEN: Validación antes de enviar
if (!fechaInicio || !fechaFin) {
  toast.error('Ambas fechas son requeridas');
  return;
}

if (fechaFin < fechaInicio) {
  toast.error('La fecha de fin debe ser posterior');
  return;
}

// Serialización correcta
const payload = {
  fechaInicio: fechaInicio.toISOString().split('T')[0],
  fechaFin: fechaFin.toISOString().split('T')[0],
};
```

---

## 🧪 Testing Post-Migración

### 1. Lint
```bash
npx eslint components/path/to/modal.tsx
```

### 2. Visual Testing

- [ ] **Desktop**: Modal aparece correctamente
- [ ] **Tablet**: Comportamiento esperado según complejidad
- [ ] **Mobile**: 
  - Simple → Bottom sheet
  - Medium → Dialog centrado
  - Complex → Full screen
- [ ] **Transiciones**: Animaciones suaves
- [ ] **Teclado**: Tab navigation funciona
- [ ] **Touch**: Touch targets mínimo 44px

### 3. Functional Testing

- [ ] **Submit**: Formulario se envía correctamente
- [ ] **Cancel**: Cierra sin enviar
- [ ] **Validation**: Errores se muestran correctamente
- [ ] **Loading**: Estados de carga funcionan
- [ ] **Success**: Callback onSuccess se ejecuta
- [ ] **Error**: Errores se muestran con toast

---

## 📊 Progreso de Migración

**Estado Actual:**

- ✅ Componentes responsive creados: 5/5
- ✅ Modales migrados: 3/25 (12%)
- ✅ **FichajeModal unificado**: Reemplaza FichajeManualModal y EditarFichajeModal (2025-01-27)
- ⏳ Modales pendientes: 22/25 (88%)

**Objetivo:**

- Migrar al menos modales de alta prioridad (10 modales)
- Crear pattern library para el resto
- Documentar cambios breaking para el equipo

---

## 🆘 Troubleshooting

### Error: "Form submission not working"

**Causa**: Botón submit en footer sin `form` attribute  
**Solución**: Añadir `form="form-id"` al botón y `id="form-id"` al form

### Error: "Date validation fails"

**Causa**: Comparando Date con string  
**Solución**: Asegurar que ambas fechas son Date objects

### Error: "Modal doesn't close on mobile"

**Causa**: `onOpenChange` no configurado correctamente  
**Solución**: `onOpenChange={(isOpen) => !isOpen && onClose()}`

### Warning: "className did not match"

**Causa**: Hydration mismatch mobile/desktop  
**Solución**: Usar `useIsMobile()` hook correctamente (ya manejado en ResponsiveDialog)

---

**Versión**: 1.0.0  
**Última actualización**: 2025-01-21  
**Responsable**: Equipo de Desarrollo


