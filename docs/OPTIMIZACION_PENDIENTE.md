# 🚀 OPTIMIZACIONES PENDIENTES - CLOUSADMIN

**Fecha**: 27 de enero 2025  
**Estado**: Post-refactorización API routes

---

## 📋 Resumen

Tras completar la refactorización de todas las API routes (36/39 archivos, 92%), se identifican las siguientes oportunidades de optimización.

---

## ✅ Completado Recientemente

### 1. Refactorización de API Routes (100%)
- ✅ 36 archivos refactorizados
- ✅ Helpers centralizados en `lib/api-handler.ts`
- ✅ Eliminación de ~600+ líneas duplicadas
- ✅ Documentación completa en `docs/API_REFACTORING.md`

### 2. Optimización de Componentes
- ✅ Utilidad compartida `getInitials()` creada
- ✅ Componente base `WidgetCard` creado
- ✅ Componentes no utilizados eliminados

---

## 🎯 Próximas Optimizaciones

### 1. **Componentes Frontend** (Prioridad Alta)

#### 1.1. Crear hooks reutilizables ✅ COMPLETADO
- [x] `useApi()` - Hook para llamadas API con loading/error states
- [x] `useMutation()` - Hook para operaciones POST/PATCH/DELETE
- [ ] `useAuth()` - Hook para acceso a sesión desde client components (opcional)
- [ ] `useToast()` - Centralizar notificaciones toast (opcional)

**Ubicación**: `lib/hooks/`  
**Documentación**: `docs/HOOKS_REUTILIZABLES.md`  
**Estado**: ✅ Implementado, ejemplo de migración completado  
**Siguiente paso**: Migrar los 21 archivos restantes

#### 1.2. Extraer lógica de negocio de componentes
- [ ] Revisar componentes con lógica compleja en `components/`
- [ ] Extraer cálculos a `lib/calculos/`
- [ ] Extraer formateo a `lib/utils/`

**Ejemplo**:
```typescript
// ❌ Lógica en componente
const Componente = () => {
  const calcular = () => { /* lógica compleja */ };
  return <div>{calcular()}</div>;
};

// ✅ Lógica extraída
import { calcular } from '@/lib/calculos/';
const Componente = () => {
  return <div>{calcular()}</div>;
};
```

#### 1.3. Optimizar re-renders
- [ ] Usar `React.memo()` en componentes que reciben props estables
- [ ] Usar `useMemo()` para cálculos costosos
- [ ] Usar `useCallback()` para funciones pasadas como props

**Archivos a revisar**:
- `components/shared/fichaje-widget.tsx`
- `components/shared/ausencias-widget.tsx`
- `components/dashboard/plantilla-widget.tsx`

---

### 2. **Optimización de Queries Prisma** (Prioridad Media)

#### 2.1. Identificar N+1 queries
- [ ] Revisar queries en Server Components
- [ ] Asegurar uso de `include`/`select` apropiados
- [ ] Implementar paginación donde sea necesario

**Herramienta**: Usar Prisma query log para identificar:
```typescript
const prisma = new PrismaClient({
  log: ['query'],
});
```

#### 2.2. Implementar cache para queries frecuentes
- [ ] Usar `unstable_cache` de Next.js para datos estáticos
- [ ] Cache de festivos nacionales
- [ ] Cache de configuraciones de empresa

**Ejemplo**:
```typescript
import { unstable_cache } from 'next/cache';

export const getFestivos = unstable_cache(
  async (año: number) => {
    return await prisma.festivo.findMany({ where: { año } });
  },
  ['festivos'],
  { revalidate: 86400 } // 24 horas
);
```

---

### 3. **Testing** (Prioridad Alta)

#### 3.1. Tests unitarios
- [ ] Tests para `lib/api-handler.ts` helpers
- [ ] Tests para `lib/calculos/ausencias.ts`
- [ ] Tests para `lib/calculos/fichajes.ts`
- [ ] Tests para `lib/validaciones/`

**Framework sugerido**: Vitest

#### 3.2. Tests de integración
- [ ] Tests E2E para flujos críticos (ausencias, fichajes)
- [ ] Tests de API routes
- [ ] Tests de autenticación/autorización

**Framework sugerido**: Playwright o Cypress

---

### 4. **Documentación API** (Prioridad Media)

#### 4.1. OpenAPI/Swagger
- [ ] Generar schema OpenAPI automático
- [ ] Documentar todos los endpoints
- [ ] Crear Swagger UI para explorar APIs

#### 4.2. Actualizar documentación funcional
- [ ] Revisar `docs/funcionalidades/*.md`
- [ ] Asegurar que reflejan la nueva estructura de APIs
- [ ] Agregar ejemplos de uso con los nuevos helpers

---

### 5. **Logging y Monitoreo** (Prioridad Baja)

#### 5.1. Logging estructurado
- [ ] Implementar logger estructurado (Winston/Pino)
- [ ] Reemplazar `console.error` por logger
- [ ] Agregar niveles de log (info, warn, error)

#### 5.2. Métricas
- [ ] Métricas de performance de APIs
- [ ] Tiempo de respuesta por endpoint
- [ ] Tasa de errores por endpoint

---

### 6. **Seguridad** (Prioridad Alta)

#### 6.1. Rate Limiting
- [ ] Implementar rate limiting en APIs críticas
- [ ] Especialmente en login y fichajes
- [ ] Usar middleware de Next.js

#### 6.2. Validación adicional
- [ ] Sanitización de inputs
- [ ] Validación de tamaño de archivos más estricta
- [ ] CORS configuration

---

### 7. **Performance** (Prioridad Media)

#### 7.1. Optimización de imágenes
- [ ] Usar `next/image` en todos los componentes
- [ ] Lazy loading de imágenes
- [ ] Optimización de avatares

#### 7.2. Bundle size
- [ ] Analizar bundle size con `@next/bundle-analyzer`
- [ ] Identificar dependencias pesadas
- [ ] Code splitting donde sea apropiado

---

## 📊 Priorización

### 🔥 Alta Prioridad (Hacer Pronto)
1. ✅ **Testing** - Asegurar calidad del código
2. ✅ **Hooks reutilizables** - Mejorar experiencia de desarrollo
3. ✅ **Optimización de queries Prisma** - Impacto directo en performance

### ⚡ Media Prioridad (Próximas Semanas)
4. ✅ **Documentación API** - Mejorar onboarding de desarrolladores
5. ✅ **Optimización de componentes** - Mejor UX
6. ✅ **Cache** - Mejorar tiempos de respuesta

### 📝 Baja Prioridad (Backlog)
7. ✅ **Logging estructurado** - Mejorar debugging
8. ✅ **Bundle optimization** - Optimización avanzada

---

## 🔍 Análisis de Código

### Archivos con TODOs

#### APIs
- `app/api/ausencias/[id]/route.ts`: "TODO: Crear notificación para empleado"
- `app/api/ausencias/route.ts`: "TODO: Crear notificación para HR/Manager"
- `app/api/empleados/[id]/avatar/route.ts`: "TODO: Implementar subida a S3"
- `app/api/empleados/invitar/route.ts`: "TODO: Enviar email con la invitación"
- `app/api/fichajes/[id]/route.ts`: "TODO: Implement edit functionality with new FichajeEvento schema"
- `app/api/fichajes/aprobar-revisados/route.ts`: "TODO: Update AutoCompletado records for approved fichajes"

**Acción**: Priorizar estos TODOs según importancia del negocio.

---

## 📝 Notas

1. **Error preexistente**: Hay un error de TypeScript en `sidebar.tsx` (variant 'yellow') que no está relacionado con la refactorización.
2. **Console.error**: Los `console.error` dentro de try/catch son logs de debugging internos, son aceptables.
3. **Build**: Compila correctamente excepto el error preexistente mencionado.

---

**Última actualización**: 27 de enero 2025  
**Próxima revisión**: Después de implementar testing

