# Investigación Exhaustiva: Problemas de Build con Next.js 16

**Fecha:** 2025-12-11
**Duración:** ~6 horas
**Estado:** PROBLEMA NO RESUELTO - Bloqueante para deployment

---

## 📋 Resumen Ejecutivo

### Objetivo
Desplegar código actualizado a producción (Hetzner) que incluye:
- Sistema completo de eventos propuestos para fichajes
- Fix estructural CRON timezone (usar `normalizarFecha()`)
- Correcciones TypeScript y mejoras varias

### Blocker
Build local falla consistentemente en fase `Generating static pages` con error de prerendering en páginas especiales internas de Next.js (`/_global-error`, `/_not-found`).

### Impacto
- ❌ Imposible desplegar código actualizado
- ✅ Producción funcionando en commit antiguo `ba004c4` con fix manual del CRON
- ⚠️ Sistema de eventos propuestos NO disponible en producción

---

## 🔴 El Problema

### Error Principal

**Con Turbopack (default):**
```bash
Error occurred prerendering page "/_global-error"
TypeError: Cannot read properties of null (reading 'useContext')
Export encountered an error on /_global-error/page: /_global-error
⨯ Next.js build worker exited with code: 1
```

**Con Webpack:**
```bash
Error occurred prerendering page "/_not-found"
TypeError: Cannot read properties of null (reading 'useState')
Export encountered an error on /_not-found/page: /_not-found
⨯ Next.js build worker exited with code: 1
```

### Fase donde Ocurre
```
✓ Compiled successfully in 10-12s
  Running TypeScript ...
  Collecting page data ...
  Generating static pages (81/108) ← FALLA AQUÍ
```

### Causa Raíz Identificada

**Next.js 16 intenta prerenderizar TODAS las páginas**, incluyendo páginas especiales internas:
- `/_global-error` - Página de error global (generada automáticamente)
- `/_not-found` - Página 404 (generada automáticamente)

Estas páginas:
1. Heredan el `app/layout.tsx` root
2. El layout usa `<Providers>` que contiene React Query Context
3. Durante prerendering estático, React Context NO está disponible (es null)
4. Al intentar acceder a `useState`/`useContext` → TypeError

---

## 🧪 TODO Lo Que Probamos

### Categoría 1: Configuración next.config.ts

#### ❌ Prueba 1.1: Agregar `serverExternalPackages`
**Cambio:**
```typescript
serverExternalPackages: ['bullmq', 'ioredis']
```

**Objetivo:** Resolver error "Package ioredis can't be external"
**Resultado:** ✅ Resolvió ese error específico, pero NO resolvió el error de prerendering
**Aprendizaje:** Necesario para bullmq/ioredis, pero no relacionado con el problema principal

---

#### ❌ Prueba 1.2: Agregar `output: 'standalone'`
**Cambio:**
```typescript
output: 'standalone'
```

**Objetivo:** Intentar deshabilitar generación estática
**Resultado:** ❌ EMPEORÓ el problema - forzó prerendering de TODO
**Aprendizaje:** `standalone` es para deployments containerizados, NO deshabilita prerendering

---

#### ❌ Prueba 1.3: Agregar `turbopack: {}`
**Cambio:**
```typescript
turbopack: {}
```

**Objetivo:** Silenciar warning "using Turbopack with webpack config"
**Resultado:** ✅ Silenció warning, NO afectó el error de prerendering
**Aprendizaje:** Cosmético, no resuelve el problema

---

#### ❌ Prueba 1.4: Modificar Sentry config
**Cambio:**
```typescript
const sentryBuildOptions = {
  autoInstrumentServerFunctions: false,
  hideSourceMaps: true,
  widenClientFileUpload: false,
}
```

**Objetivo:** Evitar que Sentry inyecte código en global-error
**Resultado:** ❌ Error persiste
**Aprendizaje:** Sentry NO es la causa del problema

---

#### ❌ Prueba 1.5: Condicionar Sentry/PWA
**Cambio:**
```typescript
const finalConfig = process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(withPWA(nextConfig), sentryBuildOptions)
  : process.env.DISABLE_PWA === 'true'
    ? nextConfig
    : withPWA(nextConfig);
```

**Objetivo:** Deshabilitar temporalmente Sentry y PWA
**Resultado:** ❌ Error persiste incluso sin Sentry/PWA
**Aprendizaje:** PWA y Sentry NO causan el problema

---

### Categoría 2: Dynamic Rendering en Páginas

#### ❌ Prueba 2.1: Agregar `dynamic = 'force-dynamic'` a páginas problemáticas
**Cambio:** Agregado a `app/page.tsx`, `app/offline/page.tsx`
```typescript
export const dynamic = 'force-dynamic';
```

**Objetivo:** Forzar renderizado dinámico
**Resultado:** ❌ Error persiste en `/_global-error` / `/_not-found`
**Aprendizaje:** Las páginas especiales internas NO respetan este flag

---

#### ❌ Prueba 2.2: Agregar `dynamic` a TODAS las páginas (73 archivos)
**Cambio:** Task agent agregó `export const dynamic = 'force-dynamic';` a:
- Todas las páginas en `app/(dashboard)/**`
- Todas las páginas en `app/(auth)/**`
- Todas las páginas en `app/firma/**`
- `app/api-docs/page.tsx`

**Objetivo:** Asegurar que NINGUNA página se prerenderiza
**Resultado:** ❌ Error persiste en páginas especiales internas
**Aprendizaje:** Incluso forzando dynamic en todas las páginas USER, Next.js sigue intentando prerenderizar sus páginas INTERNAS

---

### Categoría 3: Archivos Especiales Customizados

#### ❌ Prueba 3.1: Crear `app/global-error.tsx` con `'use client'`
**Cambio:**
```typescript
'use client';

export default function GlobalError({ error, reset }: { ... }) {
  return (
    <html>
      <body>
        {/* Error UI sin contextos */}
      </body>
    </html>
  );
}
```

**Objetivo:** Proveer un global-error que NO use Context
**Resultado:** ❌ Next.js SIGUE intentando prerenderizar `/_global-error` (su versión interna)
**Aprendizaje:** Crear el archivo custom NO previene que Next.js genere su versión interna

---

#### ❌ Prueba 3.2: Eliminar `app/global-error.tsx` custom
**Cambio:** Borrar el archivo customizado

**Objetivo:** Dejar que Next.js use su default
**Resultado:** ❌ Error persiste con el default de Next.js
**Aprendizaje:** El problema NO es nuestro código custom, es el comportamiento de Next.js

---

### Categoría 4: Build Tooling

#### ❌ Prueba 4.1: Usar Webpack en lugar de Turbopack
**Cambio:**
```bash
npm run build -- --webpack
```

**Objetivo:** Evitar bug potencial de Turbopack
**Resultado:** ⚠️ Error CAMBIA de `/_global-error` a `/_not-found`, pero persiste
**Aprendizaje:** El problema NO es específico de Turbopack, ambos tools fallan

---

### Categoría 5: TypeScript y Tipos

#### ✅ Prueba 5.1: Corregir conflictos de naming `dynamic`
**Cambio:**
```typescript
// Antes
import dynamic from 'next/dynamic';
export const dynamic = 'force-dynamic';

// Después
import dynamicImport from 'next/dynamic';
export const dynamic = 'force-dynamic';
```

**Archivos:** `app/(dashboard)/hr/analytics/page.tsx`, `app/(dashboard)/hr/informes/page.tsx`
**Objetivo:** Resolver conflicto de nombre
**Resultado:** ✅ Resuelto este error específico
**Aprendizaje:** Importante para TypeScript, pero no relacionado con prerendering

---

#### ✅ Prueba 5.2: Actualizar tipos PageProps para Next.js 16
**Cambio:**
```typescript
// Antes
interface PageProps {
  params: { id: string };
}

// Después
interface PageProps {
  params: Promise<{ id: string }>;
}
```

**Archivos:** Todos los page.tsx con rutas dinámicas [param]
**Objetivo:** Cumplir con nueva API de Next.js 16
**Resultado:** ✅ Resuelto error TypeScript
**Aprendizaje:** Cambio necesario para Next.js 16, pero no relacionado con prerendering

---

## 📊 Comparación: Producción vs Local

### Producción (Hetzner) - FUNCIONA ✅

```bash
Commit: ba004c4 (antiguo)
Next.js: 16.0.0
Build tool: Turbopack
Status: Build exitoso, app funcionando
```

**Archivos clave en producción:**
- NO tiene `lib/queue.ts`
- NO tiene `app/api/workers/calcular-eventos-propuestos/route.ts`
- NO tiene sistema completo de eventos propuestos
- NO tiene `serverExternalPackages` en next.config.ts
- NO tiene `output: 'standalone'`
- NO tiene `turbopack: {}` explícito
- Tiene fix manual del CRON con `normalizarFecha()`

**¿Por qué funciona producción?**
El código antiguo NO tiene las dependencias que requieren bullmq/ioredis, evitando complejidades adicionales.

### Local (Repositorio) - FALLA ❌

```bash
Commits: Incluye queue system, eventos propuestos, fixes
Next.js: 16.0.0
Build tool: Turbopack (o Webpack con flag)
Status: Build falla en Generating static pages
```

**Diferencias clave:**
- ✅ Tiene sistema completo de queue (`lib/queue.ts`)
- ✅ Tiene worker endpoint para eventos propuestos
- ✅ Tiene dependencias bullmq + ioredis
- ⚠️ Mismo Next.js 16.0.0 que producción
- ⚠️ Mismo layout.tsx con Providers
- ⚠️ Mismos archivos especiales (global-error, not-found generados)

**¿Por qué falla local?**
Hipótesis: El código actualizado introduce alguna diferencia sutil que hace que Next.js 16 se comporte diferente en la fase de prerendering.

---

## 🤔 Preguntas Sin Responder

### Pregunta Crítica 1
**¿Por qué producción (commit `ba004c4`) buildea exitosamente con Next.js 16.0.0, pero el código actualizado NO?**

Ambos:
- Usan Next.js 16.0.0
- Tienen app/layout.tsx con Providers
- Deberían generar /_global-error y /_not-found

**Posibles respuestas:**
1. Diferencia en dependencias (bullmq/ioredis nuevos)
2. Cambio en algún archivo que afecta el build process
3. Diferencia en caché de build (.next/)
4. Diferencia en node_modules

---

### Pregunta Crítica 2
**¿Es este un bug de Next.js 16.0.0 o un cambio intencional?**

**Evidencia de bug:**
- Páginas con `'use client'` NO deberían prerenderizarse
- `export const dynamic = 'force-dynamic'` debería prevenir prerendering
- Error ocurre en páginas especiales que NUNCA deberían prerenderizarse

**Posible solución externa:**
- Actualizar a Next.js 16.0.1+ si existe un fix
- Reportar bug a Next.js team
- Buscar issues similares en Next.js GitHub

---

### Pregunta Crítica 3
**¿Qué archivo/cambio específico introduce el problema?**

**Para investigar:**
```bash
# Comparar archivos entre ba004c4 (funciona) y HEAD (falla)
git diff ba004c4..HEAD --name-only

# Probar build con commits intermedios
git bisect start
git bisect bad HEAD
git bisect good ba004c4
```

---

## 🎯 Conclusiones Clave

### Lo Que NO Funciona

❌ **Agregar `export const dynamic = 'force-dynamic'` a páginas**
- Probado en 1 página, 3 páginas, 73 páginas
- Las páginas especiales internas NO respetan este flag

❌ **Modificar next.config.ts con opciones de build**
- `output: 'standalone'` empeora el problema
- `serverExternalPackages` necesario pero no resuelve
- Desactivar Sentry/PWA no ayuda

❌ **Crear archivos especiales customizados**
- `app/global-error.tsx` con `'use client'` no previene el error
- Eliminar el custom tampoco ayuda

❌ **Cambiar build tool**
- Webpack vs Turbopack: ambos fallan (en páginas diferentes)

### Lo Que SÍ Funciona (parcialmente)

✅ **Correcciones TypeScript**
- Imports faltantes resueltos
- Tipos PageProps actualizados
- Conflictos de naming resueltos
- Build compila TypeScript correctamente

✅ **Configuración parcial**
- `serverExternalPackages: ['bullmq', 'ioredis']` necesario y funcional
- Conflictos de naming resueltos

### El Verdadero Problema

**Next.js 16 intenta prerenderizar páginas especiales internas (`/_global-error`, `/_not-found`) que heredan el layout root con React Context.**

Durante prerendering:
1. No hay runtime de React disponible
2. Context es `null`
3. Acceso a `useState`/`useContext` → TypeError

**Este comportamiento:**
- NO ocurría en Next.js 15
- NO debería ocurrir (páginas especiales deberían ser siempre dinámicas)
- ES consistente (falla 100% del tiempo)
- CAMBIA según build tool (error en diferente página)

---

## 🔬 Próximas Opciones a Explorar

### Opción 1: Git Bisect para Identificar Commit Problemático

```bash
git bisect start
git bisect bad HEAD
git bisect good ba004c4
# Probar build en cada commit intermedio
```

**Objetivo:** Encontrar el commit exacto que introduce el problema
**Esfuerzo:** Medio (requiere múltiples builds)
**Probabilidad éxito:** Alta (identificará la causa)

---

### Opción 2: Modificar app/layout.tsx

**Cambios a probar:**
1. Hacer layout.tsx `'use client'` completo
2. Mover `<Providers>` a nivel de page en lugar de layout
3. Usar conditional rendering para Providers

**Código ejemplo:**
```typescript
'use client';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Riesgo:** ⚠️ Cambio estructural importante, puede tener side effects
**Probabilidad éxito:** Media

---

### Opción 3: Crear not-found.tsx sin Layout

**Cambio:**
```typescript
// app/not-found.tsx
export default function NotFound() {
  return (
    <html>
      <body>
        <h1>404 - Not Found</h1>
      </body>
    </html>
  );
}
```

**Objetivo:** Proveer página 404 que NO hereda el layout con Context
**Probabilidad éxito:** Baja (global-error seguiría fallando)

---

### Opción 4: Downgrade Next.js

**Cambio:**
```json
"next": "^15.0.0"
```

**Objetivo:** Volver a versión que funcionaba
**Riesgo:** ⚠️ Perder features de Next.js 16, posibles incompatibilidades
**Probabilidad éxito:** Alta (si es bug de Next.js 16)

---

### Opción 5: Investigar Flags Experimentales

**Cambios a probar:**
```typescript
experimental: {
  ppr: false,  // Partial Prerendering
  dynamicIO: false,
  // Otros flags de prerendering
}
```

**Objetivo:** Deshabilitar prerendering agresivo de Next.js 16
**Probabilidad éxito:** Media

---

### Opción 6: Actualizar Next.js a última versión

**Cambio:**
```bash
npm install next@latest
```

**Estado actual:** Next.js 16.0.0
**Objetivo:** Verificar si hay fix en 16.0.1+
**Probabilidad éxito:** Media (si ya existe fix)

---

## 📁 Archivos de Logs Generados

Durante la investigación se generaron múltiples logs:

```bash
/tmp/build-output.log          # Primer intento de build
/tmp/build-corrected.log       # Después de remover standalone
/tmp/build-webpack-final.log   # Build con webpack
/tmp/build-without-sentry.log  # Build sin Sentry
/tmp/build-success.log         # Intento final (falló)
```

Todos muestran el mismo patrón:
- ✓ Compiled successfully
- Running TypeScript ... (pasa)
- Collecting page data ... (pasa)
- Generating static pages (81/108) → FALLA

---

## 🛡️ Estado del Código

### Cambios que DEBEN Mantenerse

✅ **PageProps con Promise:**
```typescript
interface PageProps {
  params: Promise<{ id: string }>;
}
```
Todos los archivos con rutas dinámicas.

✅ **Import renaming para evitar conflictos:**
```typescript
import dynamicImport from 'next/dynamic';
```
En `app/(dashboard)/hr/analytics/page.tsx` y `app/(dashboard)/hr/informes/page.tsx`

### Cambios que DEBEN Revertirse

❌ **NO agregar a next.config.ts:**
- `output: 'standalone'` (empeora el problema)
- Modificaciones a Sentry config que no ayudan

❌ **NO crear:**
- `app/global-error.tsx` custom (no ayuda)

### Cambios Opcionales

⚠️ **Considerar mantener:**
- `serverExternalPackages: ['bullmq', 'ioredis']` (necesario para dependencias)
- `turbopack: {}` (cosmético pero útil para silenciar warning)

⚠️ **Considerar revertir:**
- `export const dynamic = 'force-dynamic'` en todas las páginas (no resuelve el problema, pero no hace daño)

---

## 📞 Recursos y Referencias

### Issues Potencialmente Relacionados

Buscar en Next.js GitHub:
- "prerendering global-error"
- "Cannot read properties of null useContext"
- "Next.js 16 prerendering special pages"
- "Turbopack prerendering error"

### Documentación Relevante

- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-16)
- [Dynamic Rendering](https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-rendering)
- [Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)

---

## ⚡ Acción Inmediata Recomendada

### Plan A: Git Bisect (MÁS RECOMENDADO)

1. Ejecutar git bisect entre `ba004c4` (funciona) y `HEAD` (falla)
2. Identificar el commit exacto que introduce el problema
3. Analizar los cambios en ese commit
4. Revertir cambios problemáticos o encontrar workaround específico

**Ventaja:** Identificará la causa raíz con certeza
**Tiempo estimado:** 1-2 horas

---

### Plan B: Layout como Client Component

1. Modificar `app/layout.tsx` para ser `'use client'`
2. Probar build
3. Si funciona, verificar que toda la funcionalidad sigue operativa

**Ventaja:** Solución rápida si funciona
**Riesgo:** Puede tener side effects no deseados
**Tiempo estimado:** 30 minutos

---

### Plan C: Downgrade Next.js

1. `npm install next@15.x`
2. Verificar compatibilidad
3. Probar build

**Ventaja:** Probablemente funcionará
**Desventaja:** Perder features de Next.js 16
**Tiempo estimado:** 1 hora

---

## 💾 Backup y Seguridad

**Backup creado:**
```bash
/root/backup-clousadmin-20251211-025736.tar.gz (32MB)
```

**Estado producción:**
- ✅ Funcionando normalmente
- ✅ Sin cambios desde la investigación
- ✅ Fix manual del CRON aplicado y funcionando

**Riesgo de deployment:** ALTO - No desplegar hasta resolver el build

---

**Documentado por:** Claude Code
**Última actualización:** 2025-12-11 05:00 UTC
**Estado:** Investigación completa - Problema NO resuelto - Requiere decisión estratégica
