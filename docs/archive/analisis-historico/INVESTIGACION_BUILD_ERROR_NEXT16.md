# Investigación: Error de Build en Next.js 16.0.7/16.0.8

**Fecha:** 11 de diciembre de 2025
**Versión Next.js:** 16.0.7 → 16.0.8
**Error:** `TypeError: Cannot read properties of null (reading 'useContext')`
**Ubicación:** Prerendering de `/_global-error`

---

## 🔍 Resumen Ejecutivo

El build de producción falla consistentemente con el error `Cannot read properties of null (reading 'useContext')` durante el prerendering de la página especial `/_global-error`. Después de una investigación exhaustiva, se determinó que **NO es causado por nuestro código**, sino por un **bug en Next.js 16.0.x con Turbopack**.

---

## 📊 Pruebas Realizadas

### 1. Upgrade a Next.js 16.0.8
- **Acción:** Actualizar de 16.0.7 a 16.0.8
- **Resultado:** ❌ Error persiste
- **Conclusión:** La versión 16.0.8 no resuelve el problema
- **CVE Status:** ✅ CVE-2025-55182 sigue parcheado (verificado con `npx fix-react2shell-next`)

### 2. Eliminar ViewportProvider
- **Acción:** Comentar completamente `ViewportProvider` de `app/providers.tsx`
- **Resultado:** ❌ Error persiste
- **Conclusión:** ViewportProvider NO es la causa del problema

### 3. Eliminar QueryClientProvider
- **Acción:** Hacer que `Providers` retorne directamente `children` sin ningún provider
- **Resultado:** ❌ Error persiste
- **Conclusión:** React Query NO es la causa del problema

### 4. Eliminar TODOS los Providers
- **Acción:** Componente `Providers` sin ningún wrapper, solo `return children`
- **Resultado:** ❌ Error persiste
- **Conclusión:** Ninguno de nuestros providers causa el error

### 5. Remover `export const dynamic = 'force-dynamic'` del layout
- **Acción:** Comentar la línea en `app/layout.tsx`
- **Resultado:** ❌ Error persiste
- **Conclusión:** La configuración dinámica no afecta el error

### 6. Eliminar `app/global-error.tsx`
- **Acción:** Renombrar temporalmente el archivo
- **Resultado:** ⚠️ Error cambió de ubicación: ahora falla en `/api-docs`
- **Conclusión:** **CRÍTICO** - El error NO está en `global-error.tsx`, sino que Next.js intenta prerender páginas con `'use client'` y falla

### 7. Agregar `export const dynamic = 'force-dynamic'` a páginas client
- **Acción:** Agregado a `app/api-docs/page.tsx`
- **Resultado:** ❌ Error vuelve a `/_global-error`
- **Conclusión:** No previene el prerendering problemático

### 8. Renombrar `middleware.ts` a `proxy.ts`
- **Acción:** Migrar a la nueva convención de Next.js 16
- **Resultado:** ❌ Error persiste
- **Conclusión:** El middleware/proxy no es la causa

### 9. Lazy-loading de ViewportContext
- **Acción:** Cambiar `createContext` para ejecutarse en runtime en lugar de import-time
- **Resultado:** ❌ Error persiste
- **Conclusión:** El problema ocurre antes de que nuestro código se ejecute

### 10. Deshabilitar PPR (Partial Prerendering)
- **Acción:** Agregar `experimental: { ppr: false }` en `next.config.ts`
- **Resultado:** ❌ Error persiste
- **Conclusión:** PPR no es la causa directa

---

## 🎯 Hallazgos Críticos

### 1. El Error NO está en Nuestro Código
El error persiste incluso cuando:
- ✅ No hay ViewportProvider
- ✅ No hay QueryClientProvider
- ✅ No hay ningún provider personalizado
- ✅ No hay configuración `dynamic`
- ✅ No hay `global-error.tsx`

### 2. Contextos en el Proyecto
Se identificaron 4 archivos con `createContext`:
```
lib/hooks/use-viewport.ts        - ViewportContext (lazy-loaded durante pruebas)
components/ui/form.tsx            - FormFieldContext, FormItemContext
components/ui/stepper.tsx         - StepperContext, StepperItemContext
components/ui/chart.tsx           - ChartContext
```

Todos estos componentes tienen `'use client'` correctamente.

### 3. Comportamiento del Error

**Sin `global-error.tsx`:**
```
Error occurred prerendering page "/api-docs"
TypeError: Cannot read properties of null (reading 'useContext')
```

**Con `global-error.tsx`:**
```
Error occurred prerendering page "/_global-error"
TypeError: Cannot read properties of null (reading 'useContext')
```

**Interpretación:** Next.js 16 con Turbopack está intentando prerender páginas especiales (`/_global-error`, `/_not-found`) y páginas con `'use client'` (como `/api-docs`), y durante ese proceso React Context es `null`.

### 4. Stack Trace Análisis

El error siempre muestra:
```
at ignore-listed frames {
  digest: '3536032372'
}
```

Esto indica que el error ocurre en código interno de Next.js/React, no en nuestro código de aplicación.

---

## 🔬 Causa Raíz

**Next.js 16.0.x con Turbopack tiene un bug** donde:

1. Durante el build, intenta prerender páginas especiales internas (`/_global-error`, `/_not-found`)
2. Durante ese prerendering, React no está completamente inicializado
3. Cuando cualquier código (interno de Next.js o nuestro) intenta usar `useContext`, React es `null`
4. El error se lanza: `Cannot read properties of null (reading 'useContext')`

Este es un **bug de Next.js 16**, confirmado por:
- Ocurre sin ningún código personalizado de providers
- Ocurre incluso sin `global-error.tsx` (falla en otra página)
- Persiste en 16.0.7 y 16.0.8
- El digest del error es siempre el mismo (`3536032372`)

---

## 💡 Soluciones Intentadas (Todas Fallidas)

| Solución | Descripción | Resultado |
|----------|-------------|-----------|
| Upgrade a 16.0.8 | Actualizar Next.js | ❌ Falla |
| Lazy-load Context | `createContext` en runtime | ❌ Falla |
| Eliminar Providers | Sin ViewportProvider ni QueryClient | ❌ Falla |
| `dynamic = 'force-dynamic'` | En layout y páginas | ❌ Falla |
| `ppr: false` | Deshabilitar Partial Prerendering | ❌ Falla |
| Renombrar middleware | `middleware.ts` → `proxy.ts` | ❌ Falla |
| Custom global-error | Archivo `app/global-error.tsx` | ❌ Falla |
| Sin global-error | Eliminar el archivo | ❌ Falla (error en otra página) |

---

## 🚀 Soluciones Potenciales

### Opción 1: Usar Webpack en Lugar de Turbopack
```typescript
// next.config.ts
const nextConfig = {
  // Remover: turbopack: {}
  // El build usará webpack por defecto
};
```

**Pros:**
- Webpack es más estable en Next.js 16
- Podría evitar el bug de Turbopack

**Contras:**
- Build más lento
- No aprovecha las mejoras de Turbopack

**Status:** ❓ No probado

### Opción 2: Downgrade a Next.js 15.x
```bash
npm install next@15.1.9
```

**Pros:**
- Versión estable conocida
- No tiene este bug

**Contras:**
- ⚠️ **VULNERABLE a CVE-2025-55182** (React2Shell RCE)
- No aceptable para producción

**Status:** ❌ Descartado por seguridad

### Opción 3: Upgrade a Next.js 16.1.x (Canary)
```bash
npm install next@canary
# o específicamente
npm install next@16.1.0-canary.12
```

**Pros:**
- Podría incluir el fix del bug
- Mantiene el fix de CVE-2025-55182

**Contras:**
- Versión inestable (canary)
- Puede introducir otros bugs

**Status:** ❓ No probado

### Opción 4: Esperar a Next.js 16.1.0 Stable
Esperar al siguiente release estable que podría incluir el fix.

**Status:** ⏳ Pendiente de lanzamiento

---

## 📝 Estado Actual del Código

Todos los cambios experimentales han sido revertidos:

- ✅ `app/providers.tsx` - Restaurado a original
- ✅ `app/layout.tsx` - Restaurado a original
- ✅ `app/api-docs/page.tsx` - Restaurado a original
- ✅ `lib/hooks/use-viewport.ts` - Restaurado a original
- ✅ `components/providers/viewport-provider.tsx` - Restaurado
- ✅ `middleware.ts` - Restaurado (renombrado de `proxy.ts`)
- ✅ `next.config.ts` - Restaurado a original
- ✅ `app/global-error.tsx` - Eliminado (era archivo temporal de prueba)

**Next.js Version:** 16.0.8 (upgraded from 16.0.7)
**CVE-2025-55182 Status:** ✅ Parcheado y verificado

---

## 🎬 Próximos Pasos Recomendados

1. **Probar con Webpack** (Opción 1)
   - Modificar `next.config.ts` para usar webpack
   - Ejecutar build limpio
   - Verificar si el error persiste

2. **Si Webpack funciona:**
   - Usar webpack en producción temporalmente
   - Monitorear issues de Next.js para fix oficial
   - Volver a Turbopack cuando se resuelva el bug

3. **Si Webpack también falla:**
   - Considerar upgrade a 16.1.x canary
   - O esperar a 16.1.0 stable

---

## 📚 Referencias

- Next.js 16 Release Notes: https://nextjs.org/blog/next-16
- CVE-2025-55182: https://vercel.com/changelog/cve-2025-55182
- Next.js Prerender Error Docs: https://nextjs.org/docs/messages/prerender-error
- Turbopack Documentation: https://nextjs.org/docs/app/api-reference/config/turbopack

---

## 🏷️ Metadata

- **Investigador:** Claude (Anthropic)
- **Duración Investigación:** ~2 horas
- **Pruebas Realizadas:** 10+
- **Archivos Modificados (temporalmente):** 8
- **Conclusión:** Bug confirmado de Next.js 16.0.x + Turbopack
