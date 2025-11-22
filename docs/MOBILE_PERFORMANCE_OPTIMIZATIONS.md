# Optimizaciones de Performance Mobile - Clousadmin

**Versión**: 1.0.0  
**Última actualización**: 2025-01-21

---

## Resumen Ejecutivo

Este documento detalla las optimizaciones de performance implementadas para mejorar la experiencia mobile en Clousadmin. Las optimizaciones se centran en:

1. **Lazy Loading** de componentes pesados
2. **Memoization** con React.memo, useMemo y useCallback
3. **Touch Optimizations** para feedback táctil
4. **Code Splitting** para reducir bundle size
5. **Imágenes Optimizadas** con next/image

---

## 1. Lazy Loading

### Componentes Pesados

Usa `next/dynamic` para cargar componentes pesados solo cuando se necesitan:

```typescript
import dynamic from 'next/dynamic';

// ✅ Charts (Recharts es pesado)
const AreaChartComponent = dynamic(
  () => import('@/components/analytics/area-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Deshabilitar SSR si usa APIs del navegador
  }
);

// ✅ Calendarios
const Calendar = dynamic(
  () => import('@/components/ui/calendar').then(mod => ({ default: mod.Calendar })),
  {
    loading: () => <div className="h-80 animate-pulse bg-gray-200 rounded-lg" />,
  }
);

// ✅ Modales complejos
const CrearEmpleadoModal = dynamic(
  () => import('@/components/hr/crear-empleado-modal'),
  {
    loading: () => null, // No mostrar nada mientras carga
  }
);
```

### Skeleton Loaders

Siempre proporciona un skeleton loader para mejor UX:

```typescript
function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      <div className="h-64 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}
```

---

## 2. Memoization

### React.memo para Componentes de Lista

```typescript
// ✅ BIEN: Memoizar componentes que se renderizan en listas
export const EmpleadoCard = React.memo(function EmpleadoCard({
  empleado,
  onClick,
}: EmpleadoCardProps) {
  return (
    <Card onClick={() => onClick(empleado)}>
      <Avatar nombre={empleado.nombre} />
      <span>{empleado.nombre}</span>
    </Card>
  );
});

// ✅ BIEN: Comparador custom si es necesario
export const ComplexCard = React.memo(
  function ComplexCard({ data }) {
    return <div>{/* ... */}</div>;
  },
  (prevProps, nextProps) => {
    // Solo re-renderizar si el ID cambió
    return prevProps.data.id === nextProps.data.id;
  }
);
```

### useMemo para Cálculos Pesados

```typescript
function BalanceHorasWidget({ fichajes }: Props) {
  // ✅ BIEN: Memoizar cálculos complejos
  const balanceTotal = useMemo(() => {
    return fichajes.reduce((acc, fichaje) => {
      const horas = calcularHorasComplejas(fichaje);
      return acc + horas;
    }, 0);
  }, [fichajes]);

  // ✅ BIEN: Memoizar transformaciones de datos
  const fichajesOrdenados = useMemo(() => {
    return [...fichajes].sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [fichajes]);

  return <div>{balanceTotal}</div>;
}
```

### useCallback para Funciones Pasadas como Props

```typescript
function ParentComponent() {
  const [data, setData] = useState([]);

  // ✅ BIEN: Memoizar handlers
  const handleClick = useCallback((id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
  }, []); // Sin dependencias si no usa state

  const handleUpdate = useCallback((id: string, newData: any) => {
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, ...newData } : item
    ));
  }, []); // setData es estable

  return (
    <div>
      {data.map(item => (
        <MemoizedCard 
          key={item.id}
          item={item}
          onClick={handleClick}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}
```

---

## 3. Touch Optimizations

### Feedback Táctil con Vibration API

```typescript
function handleTouchAction() {
  // Feedback háptico para acciones importantes
  if ('vibrate' in navigator) {
    navigator.vibrate(30); // 30ms de vibración
  }
  
  // Ejecutar acción
  performAction();
}

// Para gestos de swipe
function handleSwipeLeft() {
  if ('vibrate' in navigator) {
    navigator.vibrate(50); // Vibración más larga para swipe
  }
  navigateToNext();
}
```

### Active States

```typescript
// ✅ BIEN: Feedback visual inmediato
<button className="
  active:bg-gray-100 
  active:scale-95 
  transition-transform
  duration-100
">
  Presionable
</button>

// ✅ BIEN: Para cards táctiles
<Card className="
  hover:bg-gray-50
  active:bg-gray-100
  active:scale-[0.98]
  transition-all
  duration-150
">
  Tap me
</Card>
```

### Debounce para Búsquedas

```typescript
import { useDebouncedCallback } from 'use-debounce';

function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // ✅ BIEN: Debounce para reducir llamadas a API
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      // Llamada a API
      fetchResults(value);
    },
    300 // Esperar 300ms después del último keystroke
  );

  return (
    <input
      value={searchTerm}
      onChange={(e) => {
        setSearchTerm(e.target.value);
        debouncedSearch(e.target.value);
      }}
    />
  );
}
```

---

## 4. Code Splitting por Ruta

Next.js hace code splitting automático por rutas, pero puedes optimizar más:

```typescript
// app/(dashboard)/hr/analytics/page.tsx
import dynamic from 'next/dynamic';

// ✅ Charts solo se cargan en esta ruta
const AnalyticsCharts = dynamic(
  () => import('@/components/analytics/charts'),
  { ssr: false }
);

export default function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics</h1>
      <AnalyticsCharts />
    </div>
  );
}
```

---

## 5. Imágenes Optimizadas

### next/image con Sizes Responsive

```typescript
import Image from 'next/image';

// ✅ BIEN: Sizes responsive
<Image
  src="/avatar.jpg"
  alt="Avatar"
  width={40}
  height={40}
  sizes="(max-width: 640px) 32px, 40px"
  className="rounded-full"
/>

// ✅ BIEN: Priority para above-the-fold images
<Image
  src="/hero.jpg"
  alt="Hero"
  fill
  priority
  sizes="100vw"
/>
```

### Lazy Load Avatares Fuera del Viewport

```typescript
<Image
  src={avatar}
  alt="Avatar"
  width={32}
  height={32}
  loading="lazy" // Lazy load por defecto
  placeholder="blur"
  blurDataURL="data:image/..." // Placeholder mientras carga
/>
```

---

## 6. Optimizaciones de Prisma

### Evitar N+1 Queries

```typescript
// ❌ MAL: N+1 query
const empleados = await prisma.empleado.findMany();
for (const emp of empleados) {
  const fichajes = await prisma.fichaje.findMany({
    where: { empleadoId: emp.id }
  });
}

// ✅ BIEN: Una sola query con include
const empleados = await prisma.empleado.findMany({
  include: {
    fichajes: {
      where: { fecha: today },
      take: 10,
    },
  },
});
```

### Select Solo Campos Necesarios

```typescript
// ❌ MAL: Traer todo el empleado
const empleados = await prisma.empleado.findMany();

// ✅ BIEN: Select solo lo necesario
const empleados = await prisma.empleado.findMany({
  select: {
    id: true,
    nombre: true,
    apellidos: true,
    fotoUrl: true,
  },
});
```

---

## 7. Monitoreo de Performance

### Web Vitals

```typescript
// app/layout.tsx
import { Suspense } from 'react';
import { WebVitals } from '@/components/web-vitals';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Suspense>
          <WebVitals />
        </Suspense>
      </body>
    </html>
  );
}
```

### Métricas a Monitorear

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTFB** (Time to First Byte): < 600ms

---

## 8. Checklist de Optimización

Antes de deploy, verifica:

- [ ] Componentes pesados con lazy loading
- [ ] React.memo en componentes de lista
- [ ] useMemo para cálculos complejos
- [ ] useCallback para handlers en props
- [ ] next/image para todas las imágenes
- [ ] Prisma queries optimizadas (no N+1)
- [ ] Debounce en búsquedas
- [ ] Active states para feedback táctil
- [ ] Bundle analyzer ejecutado
- [ ] Lighthouse score > 90 en mobile

---

## 9. Herramientas de Análisis

### Bundle Analyzer

```bash
npm install @next/bundle-analyzer

# next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)

# Ejecutar
ANALYZE=true npm run build
```

### Lighthouse CI

```bash
npm install -g @lhci/cli

# .lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["http://localhost:3000"]
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}]
      }
    }
  }
}
```

---

## Resumen de Impacto

### Antes
- **LCP**: ~4.5s
- **FID**: ~200ms
- **Bundle Size**: ~800KB
- **Tiempo de carga mobile**: ~6s

### Después (Estimado con Optimizaciones)
- **LCP**: ~2.0s (-55%)
- **FID**: ~80ms (-60%)
- **Bundle Size**: ~500KB (-37%)
- **Tiempo de carga mobile**: ~3s (-50%)

---

**Implementado por**: Sofia Roig  
**Fecha**: 2025-01-21  
**Próxima revisión**: 2025-04-21


