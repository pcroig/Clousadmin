# Migración de Firmas a Patrón Sheet/Panel

**Fecha**: 2025-12-02
**Autor**: Equipo de Desarrollo
**Contexto**: Optimización Mobile UX

---

## Resumen

Se migró el componente de visualización de firmas de un patrón de **banner/card expandible** a un patrón de **botón en header + sheet lateral**, siguiendo el mismo patrón establecido previamente para el canal de denuncias.

---

## Cambios Realizados

### 1. Componente Nuevo: `FirmasDetails`

**Archivo**: `components/firma/firmas-details.tsx`

Componente reutilizable que muestra las firmas en un panel lateral (DetailsPanel).

**Props**:
```typescript
interface FirmasDetailsProps {
  /**
   * Si es true, muestra todas las firmas de la empresa (para HR admins)
   * Si es false, muestra solo las firmas pendientes del empleado actual
   */
  isHRView?: boolean;
  onClose: () => void;
}
```

**Características**:
- Header con icono Signature + título "Firmas" + badge de count
- Botón "Refrescar" para recargar datos
- Stats inline: "X pendientes | Y completadas (7d)"
- Lista con divide-y (sin cards individuales con border)
- Hover muy sutil: `bg-gray-50/50`
- Layout inline: Nombre documento | Empleado (solo HR) | Badge orden
- Botones: "Ver" (outline) para firmadas, "Firmar" para pendientes
- Filtra firmas: pendientes + completadas últimos 7 días

**Endpoints consumidos**:
- HR View: `GET /api/firma/solicitudes`
- Employee View: `GET /api/firma/pendientes`

**Navegación**:
- Firmar: `/firma/firmar/[firmaId]`
- Ver firmada: `/firma/solicitud/[solicitudId]`

### 2. Vista Empleado - Documentos

**Archivo**: `app/(dashboard)/empleado/mi-espacio/documentos/documentos-client.tsx`

**Cambios**:
- **Mobile**: Icono `FileSignature` en header (PageMobileHeader actions)
- **Desktop**: Botón "Firmas" con icono en header
- Ambos abren `DetailsPanel` con `FirmasDetails` (isHRView=false)

**Código**:
```tsx
const [firmasDetailsOpen, setFirmasDetailsOpen] = useState(false);

// Mobile Header
<PageMobileHeader
  title="Documentos"
  actions={[
    {
      icon: FileSignature,
      label: 'Firmas',
      onClick: () => setFirmasDetailsOpen(true),
      isPrimary: true,
    },
  ]}
/>

// Desktop Header
<Button onClick={() => setFirmasDetailsOpen(true)}>
  <FileSignature className="h-4 w-4" />
  <span>Firmas</span>
</Button>

// Panel lateral
<DetailsPanel
  isOpen={firmasDetailsOpen}
  onClose={() => setFirmasDetailsOpen(false)}
  title="Firmas"
>
  <FirmasDetails
    isHRView={false}
    onClose={() => setFirmasDetailsOpen(false)}
  />
</DetailsPanel>
```

### 3. Vista HR - Documentos

**Archivo**: `app/(dashboard)/hr/documentos/documentos-client.tsx`

**Cambios**:
- **Mobile**: Icono `FileSignature` en header actionsNode
- **Desktop**: Botón "Firmas" outline en header
- Ambos abren `DetailsPanel` con `FirmasDetails` (isHRView=true)

**Código**:
```tsx
const [firmasDetailsOpen, setFirmasDetailsOpen] = useState(false);

// Mobile Header
<PageMobileHeader
  actionsNode={
    <div className="flex items-center gap-1">
      <button
        onClick={() => setFirmasDetailsOpen(true)}
        className="p-2 hover:bg-gray-100 rounded-md transition"
        aria-label="Firmas"
      >
        <FileSignature className="h-5 w-5 text-gray-700" />
      </button>
      {/* Otros botones... */}
    </div>
  }
/>

// Desktop Header
<Button variant="outline" onClick={() => setFirmasDetailsOpen(true)}>
  <FileSignature className="w-4 h-4 mr-2" />
  Firmas
</Button>

// Panel lateral
<DetailsPanel
  isOpen={firmasDetailsOpen}
  onClose={() => setFirmasDetailsOpen(false)}
  title="Firmas"
>
  <FirmasDetails
    isHRView={true}
    onClose={() => setFirmasDetailsOpen(false)}
  />
</DetailsPanel>
```

### 4. Componente Eliminado

**Archivo**: `components/shared/mi-espacio/documentos-tab.tsx`

**Cambio**: Removido `FirmasCardCompact` del contenido principal.

**Antes**:
```tsx
{/* Firmas Card - Solo Desktop */}
<div className="hidden sm:block sm:mt-2">
  <FirmasCardCompact />
</div>
```

**Después**: Eliminado completamente (ahora se accede vía sheet lateral).

---

## Patrón Sheet/Panel para Detalles

Este patrón se ha establecido como estándar para mostrar información auxiliar o acciones secundarias que no requieren estar siempre visibles.

### Componentes del Patrón

1. **Trigger (Botón/Icono)**:
   - Mobile: Icono en header (17.6px)
   - Desktop: Botón con icono + texto

2. **DetailsPanel** (componente reutilizable):
   - Slide-over desde la derecha
   - Ancho: ~1/3 de pantalla en desktop
   - Full screen en mobile
   - Overlay oscuro de fondo

3. **Details Component** (contenido específico):
   - Header con título y acciones
   - Contenido scrollable
   - Botones de acción según contexto

### Ejemplos de Uso

**Canal de Denuncias** (`components/denuncias/denuncias-details.tsx`):
- Lista de denuncias recientes
- Estados y seguimiento
- Navegación a detalles

**Firmas** (`components/firma/firmas-details.tsx`):
- Lista de firmas pendientes y completadas
- Stats de pendientes/completadas
- Acciones: Firmar / Ver

### Ventajas del Patrón

1. **Espacio Optimizado**: No ocupa espacio permanente en el contenido principal
2. **Contexto Preservado**: El usuario no pierde su ubicación
3. **Acceso Rápido**: Siempre disponible desde el header
4. **Consistencia**: Mismo patrón en toda la app
5. **Mobile-Friendly**: Se adapta perfectamente a pantallas pequeñas

---

## Comparativa: Antes vs Después

### Antes (Card Expandible)

**Ubicación**: Dentro del contenido de documentos-tab
**Comportamiento**: Card colapsable con chevron up/down
**Espacio**: Ocupa espacio permanente (aunque colapsado)
**Desktop**: Card visible con border
**Mobile**: Card visible pero reducido

**Código**:
```tsx
<FirmasCardCompact isHRView={false} />
```

### Después (Sheet/Panel)

**Ubicación**: Header (icono/botón) + Panel lateral
**Comportamiento**: Click abre sheet desde la derecha
**Espacio**: 0 espacio hasta que se abre
**Desktop**: Panel lateral 1/3 pantalla
**Mobile**: Full screen panel

**Código**:
```tsx
<Button onClick={() => setFirmasDetailsOpen(true)}>
  <FileSignature /> Firmas
</Button>

<DetailsPanel isOpen={firmasDetailsOpen} ...>
  <FirmasDetails isHRView={false} ... />
</DetailsPanel>
```

---

## Funcionalidad Preservada

✅ Todas las funcionalidades del componente original se mantienen:

- Filtrado de firmas pendientes + completadas últimos 7 días
- Diferenciación entre vista HR (todas las firmas) y empleado (solo sus pendientes)
- Badge de orden cuando requiere firma secuencial
- Botón refrescar para recargar datos
- Estados de loading, error y empty
- Navegación a `/firma/firmar/[id]` para firmar
- Navegación a `/firma/solicitud/[id]` para ver firmadas
- Stats de pendientes y completadas
- Información de empleado (solo en vista HR)

---

## UX Mejorada

### Header Icons Equilibrados

- Título: `text-[17.6px]` con `leading-[24px]`
- Iconos: `h-[17.6px] w-[17.6px]` con `strokeWidth={2}`
- Botones: `h-6 w-6` (perfectamente alineados)

### Sin Fondos Pesados

- Eliminados backgrounds `bg-gray-50`
- Lista con `divide-y` en lugar de cards con border
- Hover muy sutil: `bg-gray-50/50`
- Diseño más limpio y ligero

### Layout Compacto

- Header inline: icono + título + badge + botón refrescar
- Stats inline: "3 pendientes | 5 completadas (7d)"
- Cards sin padding excesivo
- Información en una línea cuando es posible

---

## Consideraciones Técnicas

### Estado y Control

El patrón requiere:
1. Estado local para controlar apertura/cierre del panel
2. Callbacks para cerrar desde dentro del componente Details
3. Props `isHRView` para diferenciar contexto

```typescript
const [firmasDetailsOpen, setFirmasDetailsOpen] = useState(false);

// En el trigger
onClick={() => setFirmasDetailsOpen(true)}

// En el panel
onClose={() => setFirmasDetailsOpen(false)}

// En el componente details
onClose={() => setFirmasDetailsOpen(false)}
```

### Responsive

El DetailsPanel maneja internamente la diferencia mobile/desktop:
- Mobile: Full screen con slide-in desde bottom/right
- Desktop: Panel lateral 1/3 con overlay

No requiere lógica adicional en el componente padre.

### Accesibilidad

- Botones con `aria-label` descriptivo
- Focus management al abrir/cerrar
- Escape key para cerrar
- Click en overlay para cerrar

---

## Archivos Afectados

### Nuevos
- `components/firma/firmas-details.tsx` (creado)

### Modificados
- `app/(dashboard)/empleado/mi-espacio/documentos/documentos-client.tsx`
- `app/(dashboard)/hr/documentos/documentos-client.tsx`
- `components/shared/mi-espacio/documentos-tab.tsx` (removido FirmasCardCompact)

### Sin cambios
- `components/firma/firmas-card-compact.tsx` (mantenido para posible uso futuro)
- APIs de firmas
- Páginas de firmar y ver solicitudes

---

## Testing

### Verificaciones Realizadas

- [x] Build sin errores TypeScript
- [x] Mobile: Icono visible en header
- [x] Desktop: Botón visible en header
- [x] Click abre panel correctamente
- [x] Datos se cargan (endpoint correcto)
- [x] Navegación a firmar funciona
- [x] Navegación a ver funciona
- [x] Stats calculadas correctamente
- [x] Refrescar recarga datos
- [x] Cerrar panel restaura vista

### Testing Pendiente

- [ ] Testing en dispositivos reales (iPhone, Android)
- [ ] Verificar performance de carga de firmas
- [ ] Testing de accesibilidad (screen readers)
- [ ] Testing de gestos táctiles (swipe to close)

---

## Próximos Pasos

1. Considerar aplicar este mismo patrón a otros componentes similares
2. Evaluar si FirmasCardCompact puede eliminarse definitivamente
3. Documentar el patrón Sheet/Panel como estándar en guía de componentes
4. Testing exhaustivo en mobile real

---

## Referencias

- Canal de Denuncias: `components/denuncias/denuncias-details.tsx` (patrón similar)
- DetailsPanel: `components/shared/details-panel.tsx`
- PageMobileHeader: `components/layout/page-mobile-header.tsx`
- MOBILE_UX_PATTERNS.md: Patrones generales de UX mobile

---

**Última actualización**: 2025-12-02
**Estado**: ✅ Implementado y verificado
**Versión**: 1.0.0
