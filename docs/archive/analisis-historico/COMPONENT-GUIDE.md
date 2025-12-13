# Guía de Componentes Unificados

Esta guía describe los componentes estandarizados para crear páginas consistentes y escalables en la aplicación.

## 📐 Arquitectura de Componentes

### 1. PageLayout - Layout Estándar

**Ubicación:** `components/layout/page-layout.tsx`

Wrapper estándar que proporciona el padding consistente para todas las páginas.

**Características:**
- Padding: `px-1 py-1` en mobile, `sm:px-8 sm:py-6` en desktop
- Max-width: `1800px` centrado en desktop (configurable)
- Flexbox column layout con `h-full`

**Uso básico:**
```tsx
import { PageLayout } from '@/components/layout/page-layout';

export function MiPagina() {
  return (
    <PageLayout>
      {/* Tu contenido aquí */}
    </PageLayout>
  );
}
```

**Props:**
- `children`: ReactNode - Contenido de la página
- `className?`: string - Clases adicionales
- `constrained?`: boolean - Si false, no aplica max-width (default: true)

---

### 2. PageMobileHeader - Header Unificado

**Ubicación:** `components/layout/page-mobile-header.tsx`

Header estandarizado que combina todas las funcionalidades necesarias.

**Características:**
- Título + subtítulo opcional
- Botón de volver (opcional)
- Acciones primarias y secundarias
- Modo sticky (opcional)
- Solo visible en mobile (`sm:hidden`)

**Ejemplos de uso:**

#### Header simple
```tsx
<PageMobileHeader title="Equipos" />
```

#### Header con subtítulo
```tsx
<PageMobileHeader
  title="Documentos"
  subtitle="5 carpetas"
/>
```

#### Header con acciones (array)
```tsx
<PageMobileHeader
  title="Personas"
  actions={[
    {
      icon: Plus,
      label: 'Añadir persona',
      onClick: () => setDialogOpen(true),
      isPrimary: true,
    },
    {
      icon: Settings,
      label: 'Configuración',
      onClick: () => navigate('/settings'),
    },
  ]}
/>
```

#### Header con acciones (ReactNode - máxima flexibilidad)
```tsx
<PageMobileHeader
  title="Documentos"
  actionsNode={
    <div className="flex gap-2">
      <Button size="sm" onClick={() => {}}>Crear</Button>
      <Button size="sm" onClick={() => {}}>Subir</Button>
    </div>
  }
/>
```

#### Header con botón back
```tsx
<PageMobileHeader
  title="Editar Empleado"
  showBack
  onBack={() => router.back()}
/>
```

**Props completas:**
```typescript
interface PageMobileHeaderProps {
  title: string;                    // Título (requerido)
  subtitle?: string;                // Subtítulo opcional
  actions?: ActionButton[];         // Array de acciones
  actionsNode?: ReactNode;          // O ReactNode para máxima flexibilidad
  showBack?: boolean;               // Mostrar botón volver
  backHref?: string;                // URL para volver
  onBack?: () => void;              // Callback al volver
  sticky?: boolean;                 // Header sticky
  className?: string;               // Clases adicionales
}

interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'outline' | 'ghost';
  isPrimary?: boolean;              // Acción principal (destacada)
  isSpecialAction?: boolean;        // Botón completo (Fichar, Solicitar, etc.)
}
```

---

### 3. DashboardMobileHeader - Header del Dashboard

**Ubicación:** `components/layout/dashboard-mobile-header.tsx`

Header específico para la página de dashboard con avatar y bandeja de entrada.

**Uso:**
```tsx
<DashboardMobileHeader
  usuario={usuario}
  rol={rol}
  notificacionesCount={5}
/>
```

---

## 🏗️ Patrones de Uso

### Patrón Estándar: Página con Lista/Tabla

```tsx
'use client';

import { PageLayout } from '@/components/layout/page-layout';
import { PageMobileHeader } from '@/components/layout/page-mobile-header';
import { Plus } from 'lucide-react';

export function EquiposClient({ equipos }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <PageLayout>
      {/* Header Mobile */}
      <PageMobileHeader
        title="Equipos"
        actions={[
          {
            icon: Plus,
            label: 'Crear equipo',
            onClick: () => setShowModal(true),
            isPrimary: true,
          },
        ]}
      />

      {/* Desktop Header */}
      <div className="hidden sm:block mb-6">
        <TableHeader
          title="Equipos"
          actionButton={{
            label: '+ Crear Equipo',
            onClick: () => setShowModal(true),
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <DataTable data={equipos} />
      </div>

      {/* Modals */}
      <EquipoFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </PageLayout>
  );
}
```

### Patrón: Página con Tabs

```tsx
'use client';

import { PageLayout } from '@/components/layout/page-layout';
import { PageMobileHeader } from '@/components/layout/page-mobile-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DocumentosClient() {
  const [activeTab, setActiveTab] = useState('documentos');

  return (
    <PageLayout>
      {/* Header con acciones dinámicas según tab */}
      <PageMobileHeader
        title="Documentos"
        subtitle={activeTab === 'documentos' ? '5 carpetas' : 'Plantillas'}
        actionsNode={
          activeTab === 'documentos' ? (
            <div className="flex gap-2">
              <Button size="sm">Crear</Button>
              <Button size="sm">Subir</Button>
            </div>
          ) : (
            <Button size="sm">Subir Plantilla</Button>
          )
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="flex-1 overflow-auto">
          {/* Contenido */}
        </TabsContent>

        <TabsContent value="plantillas" className="flex-1 overflow-auto">
          {/* Contenido */}
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
```

### Patrón: Página con Back Button

```tsx
'use client';

import { PageLayout } from '@/components/layout/page-layout';
import { PageMobileHeader } from '@/components/layout/page-mobile-header';

export function EmpleadoDetailClient({ empleado }: Props) {
  return (
    <PageLayout>
      <PageMobileHeader
        title={`${empleado.nombre} ${empleado.apellidos}`}
        showBack
      />

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Detalles del empleado */}
      </div>
    </PageLayout>
  );
}
```

---

## ✅ Beneficios de la Unificación

### 1. **Consistencia**
- Todos los headers se ven y funcionan igual
- Padding uniforme en todas las páginas
- Experiencia de usuario coherente

### 2. **Mantenibilidad**
- Un solo componente para actualizar
- Cambios globales fáciles
- Menos código duplicado

### 3. **Escalabilidad**
- Nuevas páginas siguen el mismo patrón
- Fácil de extender con nuevas features
- Componentes reutilizables con variantes

### 4. **Developer Experience**
- API clara y documentada
- Ejemplos de uso
- TypeScript types completos

---

## 🔄 Migración de Páginas Antiguas

### Antes (código manual):
```tsx
export function MiPagina() {
  return (
    <div className="h-full w-full flex flex-col px-1 py-1 sm:max-w-[1800px] sm:mx-auto sm:px-8 sm:py-6">
      <div className="sm:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-medium">Mi Página</h1>
          <button>Acción</button>
        </div>
      </div>
      {/* contenido */}
    </div>
  );
}
```

### Después (componentes unificados):
```tsx
import { PageLayout } from '@/components/layout/page-layout';
import { PageMobileHeader } from '@/components/layout/page-mobile-header';

export function MiPagina() {
  return (
    <PageLayout>
      <PageMobileHeader
        title="Mi Página"
        actions={[
          { label: 'Acción', onClick: () => {}, isPrimary: true }
        ]}
      />
      {/* contenido */}
    </PageLayout>
  );
}
```

---

## 📝 Checklist para Nuevas Páginas

- [ ] Usar `PageLayout` como wrapper principal
- [ ] Usar `PageMobileHeader` para el header mobile
- [ ] Usar `TableHeader` o header custom para desktop
- [ ] No añadir padding manual (ya está en PageLayout)
- [ ] Usar `flex-1 overflow-auto` para el contenido scrolleable
- [ ] Seguir los patrones establecidos según el tipo de página

---

## 🚫 Anti-Patrones (Evitar)

### ❌ No hacer:
```tsx
// Padding manual duplicado
<div className="h-full w-full flex flex-col px-1 py-1 sm:px-8 sm:py-6">
  <PageLayout>  {/* Ya tiene padding! */}
    ...
  </PageLayout>
</div>

// Headers duplicados
<PageMobileHeader title="Página" />
<MobilePageHeader title="Página" />  {/* Componente antiguo */}

// Padding en el contenido
<PageLayout>
  <div className="px-4">  {/* No necesario */}
    ...
  </div>
</PageLayout>
```

### ✅ Hacer:
```tsx
<PageLayout>
  <PageMobileHeader title="Página" />
  <div className="flex-1 overflow-auto">
    {/* Sin padding adicional */}
  </div>
</PageLayout>
```

---

## 🎯 Resumen

Los componentes unificados (`PageLayout` + `PageMobileHeader`) proporcionan:
- ✅ Layout consistente
- ✅ Padding estandarizado
- ✅ Headers flexibles
- ✅ Código limpio y mantenible
- ✅ Fácil de escalar

**Usa siempre estos componentes para nuevas páginas y migra páginas antiguas gradualmente.**
