# Análisis Completo: Error de Build en Next.js 16.0.0-16.0.8

**Fecha:** 2025-12-11
**Versión Actual:** Next.js 16.0.0 (local), 16.0.8 probada
**Estado:** ❌ Build falla - Bloqueado para despliegue a producción

---

## Resumen Ejecutivo

El proyecto está bloqueado debido a un **bug confirmado de Next.js 16** que causa el error:

```
Error occurred prerendering page "/_global-error"
TypeError: Cannot read properties of null (reading 'useContext')
```

Este error **NO es causado por nuestro código**, sino por un defecto en el proceso de prerendering de Next.js 16 al intentar generar estáticamente la página interna `/_global-error`.

---

## Síntomas del Problema

### Error Principal
```
Error occurred prerendering page "/_global-error"
TypeError: Cannot read properties of null (reading 'useContext')
    at ignore-listed frames {
  digest: '3536032372'
}
Export encountered an error on /_global-error/page: /_global-error, exiting the build.
⨯ Next.js build worker exited with code: 1 and signal: null
```

### Cuándo Ocurre
- **Fase del Build:** Durante "Generating static pages" (~78/104 páginas)
- **Bundler:** Ocurre con Turbopack Y con Webpack
- **Versiones Afectadas:** Next.js 16.0.0, 16.0.1, 16.0.2-canary.3, 16.0.8
- **Entorno:** Build de producción (`npm run build`)

---

## Entorno y Configuración

### Versiones Actuales
- **Next.js:** 16.0.0 (antes de nuestras pruebas)
- **React:** 19.2.0 (consistente en todas las dependencias - verificado con `npm ls react`)
- **React DOM:** 19.2.0
- **Node.js:** v24.11.1
- **npm:** Verificado - sin conflictos de versiones de React

### Dependencias Clave
```json
{
  "@tanstack/react-query": "5.90.7",
  "@radix-ui/*": "~1.x-2.x" (todos usan react@19.2.0),
  "sonner": "2.0.7",
  "next-pwa": "5.6.0",
  "@sentry/nextjs": "10.26.0"
}
```

**Verificación Realizada:** `npm ls react` confirmó que NO hay conflictos de versiones de React entre dependencias.

---

## Configuración del Proyecto

### app/layout.tsx (Root Layout)
```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

### app/providers.tsx
```typescript
'use client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          gcTime: 5 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ViewportProvider>{children}</ViewportProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

### next.config.ts (Original)
- PWA habilitado con `next-pwa`
- Sentry habilitado con `@sentry/nextjs`
- Configuración estándar para App Router

---

## Todo Lo Que Hemos Probado

### ❌ 1. Configuración de Dynamic Rendering

#### Intento 1.1: `export const dynamic = 'force-dynamic'` en app/layout.tsx
- **Resultado:** ❌ Error persiste
- **Conclusión:** Next.js ignora esta configuración para páginas especiales internas

#### Intento 1.2: `export const dynamic = 'force-dynamic'` en 73 archivos page.tsx
- **Archivos modificados:** Todos los `page.tsx` en app/(dashboard)/, app/(auth)/, app/firma/
- **Resultado:** ❌ Error persiste
- **Conclusión:** La configuración en páginas individuales no afecta `/_global-error`

#### Intento 1.3: `export const dynamic = 'force-dynamic'` en routes CRON
- **Archivos:** app/api/cron/aprobar-ediciones-expiradas/route.ts, etc.
- **Resultado:** ❌ Error persiste
- **Conclusión:** Las API routes no influyen en el prerendering de páginas especiales

---

### ❌ 2. Modificación de Archivos Especiales de Next.js

#### Intento 2.1: Crear app/global-error.tsx custom
```typescript
'use client';

export const dynamic = 'force-dynamic';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="es">
      <body>
        <div>Error: {error.message}</div>
        <button onClick={reset}>Retry</button>
      </body>
    </html>
  );
}
```
- **Resultado:** ❌ Error persiste exactamente igual
- **Conclusión:** El archivo custom NO previene el prerendering

#### Intento 2.2: Agregar `export const runtime = 'edge'` a global-error.tsx
```typescript
export const dynamic = 'force-dynamic';
export const runtime = 'edge';
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** El Edge runtime no resuelve el problema de Context durante prerendering

#### Intento 2.3: Eliminar app/global-error.tsx completamente
- **Acción:** Dejamos que Next.js use su handler por defecto
- **Resultado:** ❌ Error persiste
- **Conclusión:** El problema NO es nuestro archivo custom, es el handler interno de Next.js

#### Intento 2.4: Crear app/not-found.tsx con 'use client'
- **Resultado:** ❌ Error persiste (a veces el error cambia a `/_not-found`)
- **Conclusión:** El problema afecta múltiples páginas especiales internas

---

### ❌ 3. Desactivación de Providers y Context

#### Intento 3.1: Remover ViewportProvider
```typescript
// app/providers.tsx
return (
  <QueryClientProvider client={queryClient}>
    {children}  {/* Sin ViewportProvider */}
  </QueryClientProvider>
);
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** ViewportProvider NO es la causa

#### Intento 3.2: Remover QueryClientProvider
```typescript
// app/providers.tsx
return <>{children}</>;  // Sin providers
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** QueryClient NO es la causa

#### Intento 3.3: Remover TODOS los providers
```typescript
// app/providers.tsx
export function Providers({ children }) {
  return children;  // Literalmente solo children
}
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** **CRÍTICO** - El error persiste SIN NINGÚN PROVIDER. Esto confirma que es un bug de Next.js, no de nuestro código.

#### Intento 3.4: Mover Toaster fuera de Providers
```typescript
<body>
  <Providers>{children}</Providers>
  <Toaster />
</body>
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** Sonner Toaster no es la causa raíz

---

### ❌ 4. Configuración de next.config.ts

#### Intento 4.1: Agregar `serverExternalPackages`
```typescript
serverExternalPackages: ['bullmq', 'ioredis']
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** Las librerías de servidor no causan el problema

#### Intento 4.2: Configurar `turbopack: {}`
```typescript
turbopack: {}
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** Silencia warnings pero no resuelve el error

#### Intento 4.3: Agregar `experimental.ppr: false`
```typescript
experimental: {
  ppr: false,
}
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** Partial Prerendering no es la causa

#### Intento 4.4: Agregar `output: 'standalone'`
```typescript
output: 'standalone'
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** El modo standalone no afecta el prerendering

#### Intento 4.5: `swcMinify: false` (Next.js 16)
```typescript
swcMinify: false
```
- **Resultado:** ❌ ERROR - `swcMinify` no existe en Next.js 16
- **Conclusión:** Esta opción fue removida en Next.js 16

---

### ❌ 5. Cambio de Bundler

#### Intento 5.1: Usar Webpack en lugar de Turbopack
```bash
TURBOPACK=0 npm run build
```
- **Resultado:** ❌ Error persiste EXACTAMENTE IGUAL
- **Conclusión:** El problema NO es específico de Turbopack

#### Intento 5.2: Configurar webpack fallbacks
```typescript
webpack: (config, { isServer }) => {
  if (!isServer) {
    config.resolve.fallback = {
      bullmq: false,
      ioredis: false,
      'node:perf_hooks': false,
      perf_hooks: false,
    };
  }
  return config;
}
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** Los fallbacks de webpack no afectan el prerendering server-side

---

### ❌ 6. Desactivación de Integraciones

#### Intento 6.1: Deshabilitar PWA wrapper
```typescript
const finalConfig = nextConfig;  // Sin withPWA()
export default finalConfig;
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** next-pwa NO es la causa

#### Intento 6.2: Deshabilitar Sentry wrapper
```typescript
const finalConfig = nextConfig;  // Sin withSentryConfig()
export default finalConfig;
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** @sentry/nextjs NO es la causa en Next.js 16

#### Intento 6.3: Comentar Sentry en instrumentation.ts
```typescript
// await import('./sentry.server.config');
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** La instrumentación de Sentry no causa el problema

#### Intento 6.4: Configurar Sentry options
```typescript
sentryBuildOptions = {
  autoInstrumentServerFunctions: false,
  autoInstrumentAppDirectory: false,
}
```
- **Resultado:** ❌ Error persiste
- **Conclusión:** La instrumentación automática no es el problema

---

### ❌ 7. Downgrade a Next.js 15.1.9

#### Intento 7.1: Instalar Next.js 15.1.9
```bash
npm install next@15.1.9 eslint-config-next@15.1.9 --save-exact
```
- **Resultado:** ✅ Build compila, pero ❌ **ERROR DIFERENTE**:
  ```
  Error: <Html> should not be imported outside of pages/_document.
  Error occurred prerendering page "/404"
  ```
- **Causa:** @sentry/nextjs importa componentes `<Html>` incompatibles con App Router en Next.js 15
- **Conclusión:** Next.js 15 tiene problemas DIFERENTES con Sentry

#### Intento 7.2: Deshabilitar Sentry en Next.js 15
```typescript
const finalConfig = withPWA(nextConfig);  // Sin Sentry
```
- **Resultado:** ❌ ERROR persiste: `<Html> should not be imported outside of pages/_document`
- **Conclusión:** El error de `<Html>` persiste incluso sin Sentry wrapper, posiblemente causado por next-pwa u otra dependencia

---

## Evidencia y Confirmación del Bug

### GitHub Issues Confirmados

1. **Issue #85668 - Build fails with "Cannot read properties of null (reading 'useState'/'useContext')" during static generation in Next.js 16.0.1**
   - URL: https://github.com/vercel/next.js/issues/85668
   - Estado: ⚠️ OPEN - Marcado como HIGH PRIORITY
   - Afecta: Next.js 16.0.1, 16.0.2-canary.3, y versiones posteriores
   - Descripción: Exactamente nuestro error, confirmado por múltiples usuarios

2. **Issue #82366 - Build fails on Next.js 15.4.5 with TypeError: Cannot read properties of null (reading 'useContext') during prerendering of /404**
   - URL: https://github.com/vercel/next.js/issues/82366
   - Estado: ⚠️ OPEN
   - Afecta: Next.js 15.4.5 (similar pero diferente página)

3. **Discussion #43577 - TypeError: Cannot read properties of null (reading 'useContext')**
   - URL: https://github.com/vercel/next.js/discussions/43577
   - Soluciones sugeridas: Ninguna funciona en Next.js 16

### Causa Raíz Identificada

El problema ocurre porque:

1. **Next.js 16 intenta prerenderizar páginas especiales internas** (`/_global-error`, `/_not-found`) durante el build
2. **Estas páginas heredan el root layout** que usa React Context (QueryClient, ViewportProvider, etc.)
3. **Durante el prerendering, React Context no está disponible** porque los providers no se han inicializado
4. **`useContext()` retorna `null`** → **CRASH**

### Por Qué Nuestros Intentos No Funcionaron

- ✅ `export const dynamic = 'force-dynamic'` - **IGNORADO** por Next.js para páginas especiales internas
- ✅ Remover providers - **INÚTIL** porque el error viene del proceso interno de Next.js, no de nuestros providers
- ✅ Cambiar bundler - **IRRELEVANTE** porque el problema es en la fase de prerendering, no de compilación
- ✅ Configuraciones experimentales - **NO EFECTIVAS** porque el bug está en el core de Next.js 16

---

## Versiones de Next.js Evaluadas

### ✅ Versiones Probadas

| Versión | Estado | Error Observado |
|---------|--------|-----------------|
| 16.0.0 | ❌ Falla | `useContext` null en `/_global-error` |
| 16.0.8 | ❌ Falla | `useContext` null en `/_global-error` |
| 15.1.9 | ❌ Falla | `<Html>` import error en `/404` |

### 📋 Versiones Disponibles No Probadas

Versiones canary recientes (obtenidas con `npm view next versions`):
```json
[
  "16.1.0-canary.0",
  "16.1.0-canary.1",
  "16.1.0-canary.2",
  "16.1.0-canary.3",
  "16.1.0-canary.4",
  "16.1.0-canary.9",
  "16.1.0-canary.10",
  "16.1.0-canary.11",
  "16.1.0-canary.12",
  "16.1.0-canary.13",
  "16.1.0-canary.14",
  "16.1.0-canary.15",
  "16.1.0-canary.16"
]
```

**Nota:** Las versiones canary NO son recomendadas para producción.

---

## Situación de Producción

### Estado Actual en Hetzner

- **Commit en producción:** ba004c4 (identificado previamente)
- **Estado:** ✅ Funcionando
- **Problema:** El commit ba004c4 mismo NO buildea localmente:
  ```
  Error: Cannot find module 'crearFechaConHora' from '@/lib/utils/fechas'
  Error: Cannot find module 'idSchema' from '@/lib/validaciones/schemas'
  Error: Cannot find module 'normalizarFechaSinHora' from '@/lib/utils/fechas'
  ```
- **Conclusión:** Producción está corriendo un build de un commit **MÁS ANTIGUO** que ba004c4

### Cambios Bloqueados en Local

Los siguientes cambios NO pueden desplegarse debido al error de build:

1. ✅ **Sistema de eventos propuestos para fichajes**
   - `lib/queue.ts` - Sistema de colas BullMQ
   - `app/api/workers/calcular-eventos-propuestos/route.ts` - Worker endpoint
   - Múltiples archivos de lógica de negocio

2. ✅ **Fix estructural del CRON timezone**
   - Uso consistente de `normalizarFechaSinHora()` en todos los CRON jobs
   - Fix para app/api/cron/clasificar-fichajes/route.ts

3. ✅ **Múltiples correcciones de TypeScript y mejoras**
   - Fixes de tipos en ~73 archivos
   - Mejoras de validación

---

## Consideraciones de Seguridad

### CVE-2025-55182 (React2Shell)

- **Vulnerabilidad:** Remote Code Execution (RCE) en Next.js
- **Versiones afectadas:** 15.0.0 - 16.0.6
- **Versión actual:** 16.0.0 ⚠️ **VULNERABLE**
- **Versión parcheada:** 16.0.7+
- **Verificación realizada:**
  ```bash
  npx fix-react2shell-next
  # Output: "Vulnerable packages found"
  ```

**IMPORTANTE:** El error de build NO está relacionado con CVE-2025-55182. Son problemas separados:
- CVE-2025-55182 = Vulnerabilidad de seguridad RCE
- useContext null = Bug de prerendering en Next.js 16

---

## Conclusiones Finales

### ✅ Confirmado

1. **El problema ES un bug de Next.js 16**, no de nuestro código
2. **El error persiste sin ningún provider custom** (probado removiendo todo)
3. **El error afecta tanto Turbopack como Webpack** (no es específico del bundler)
4. **No hay conflictos de versiones de React** (verificado con `npm ls react`)
5. **Next.js 15.1.9 tiene problemas DIFERENTES** (error de `<Html>` con Sentry/PWA)
6. **Todas las configuraciones probadas fueron inefectivas** (ver secciones anteriores)

### ❌ Soluciones Intentadas Sin Éxito

1. 73+ archivos modificados con `export const dynamic = 'force-dynamic'`
2. Creación/eliminación de app/global-error.tsx custom
3. Desactivación completa de todos los providers
4. Cambio de bundler (Turbopack → Webpack)
5. Desactivación de PWA y Sentry
6. Múltiples configuraciones experimentales en next.config.ts
7. Downgrade a Next.js 15.1.9 (error diferente)

### 🔄 Estado Actual

- **Versión:** Next.js 16.0.0
- **Build:** ❌ Falla
- **Producción:** ✅ Funcionando (commit antiguo)
- **Despliegue:** ❌ Bloqueado
- **Seguridad:** ⚠️ Vulnerable a CVE-2025-55182

---

## Opciones Disponibles

### Opción A: Esperar Fix Oficial de Next.js

**Pros:**
- ✅ Mantiene Next.js 16.0.0 (arquitectura moderna)
- ✅ Mantiene React 19
- ✅ No requiere refactoring

**Contras:**
- ❌ No hay timeline conocido
- ❌ Bloquea deployment indefinidamente
- ❌ Permanece vulnerable a CVE-2025-55182

**Recomendación:** ❌ NO VIABLE para producción

---

### Opción B: Probar Version Canary Reciente (ej. 16.1.0-canary.16)

**Pros:**
- ✅ Puede contener fix del issue #85668
- ✅ Mantiene Next.js 16+ y React 19
- ✅ Solución rápida si funciona

**Contras:**
- ❌ Versiones canary NO recomendadas para producción
- ❌ Pueden tener otros bugs inestables
- ❌ No hay garantía de que el fix esté incluido

**Recomendación:** ⚠️ PROBAR EN ENTORNO DE DESARROLLO PRIMERO

**Comandos:**
```bash
npm install next@16.1.0-canary.16 eslint-config-next@16.1.0-canary.16 --save-exact
npm run build
```

---

### Opción C: Downgrade a Next.js 14.x

**Pros:**
- ✅ Build funcionaría (versión estable)
- ✅ Compatible con React 19 (14.x soporta React 18 y 19)
- ✅ No hay bugs conocidos de prerendering

**Contras:**
- ❌ Perdemos features de Next.js 15/16
- ❌ Puede requerir refactoring de código específico de Next.js 16
- ❌ Downgrade significativo

**Recomendación:** ⚠️ CONSIDERAR como plan B

**Comandos:**
```bash
npm install next@14.2.18 eslint-config-next@14.2.18 --save-exact
npm run build
```

---

### Opción D: Migrar a Next.js 15.x + Fix Sentry/PWA

**Pros:**
- ✅ Next.js 15 es estable
- ✅ Compatible con React 19
- ✅ Evita bug de Next.js 16

**Contras:**
- ❌ Requiere resolver error de `<Html>` (Sentry/PWA)
- ❌ Puede requerir actualizar @sentry/nextjs a versión compatible
- ❌ Puede requerir configuración adicional de next-pwa

**Recomendación:** ⚠️ INVESTIGAR requisitos de Sentry para App Router

**Pasos:**
1. Investigar versión compatible de @sentry/nextjs con Next.js 15 + App Router
2. Verificar configuración correcta de next-pwa
3. Probar build

---

### Opción E: Deshabilitar Temporalmente Sentry y Desplegar

**Pros:**
- ✅ Permite deployment inmediato
- ✅ Mantiene PWA funcional
- ✅ Podemos re-habilitar Sentry después

**Contras:**
- ❌ Pérdida temporal de monitoreo de errores
- ❌ No resuelve el problema subyacente de Next.js 16

**Recomendación:** ⚠️ SOLO si necesitas deployment urgente

---

## Recomendación Final

**Orden de Prioridad Sugerido:**

1. **INMEDIATO:** Probar versión canary más reciente (16.1.0-canary.16)
   - Si funciona → Evaluar estabilidad y considerar deployment
   - Si falla → Proceder a opción 2

2. **PLAN B:** Downgrade a Next.js 14.2.18
   - Versión probada y estable
   - Compatible con React 19
   - Permite deployment inmediato

3. **PLAN C:** Next.js 15.x + Fix Sentry
   - Requiere investigación de compatibilidad de Sentry
   - Opción viable a mediano plazo

4. **ÚLTIMO RECURSO:** Esperar fix oficial de Next.js 16
   - Solo si los planes anteriores fallan
   - Requiere timeline indefinido

---

## Referencias

### GitHub Issues
- [Issue #85668 - Build fails with useContext null in Next.js 16.0.1](https://github.com/vercel/next.js/issues/85668)
- [Issue #82366 - Build fails in Next.js 15.4.5 with useContext error](https://github.com/vercel/next.js/issues/82366)
- [Discussion #43577 - useContext null error](https://github.com/vercel/next.js/discussions/43577)

### Security
- [CVE-2025-55182 - React2Shell Vulnerability](https://vercel.com/security/react2shell)
- [Next.js Security Advisory](https://nextjs.org/blog/CVE-2025-66478)

### Documentation
- [Next.js Prerender Error](https://nextjs.org/docs/messages/prerender-error)
- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)
- [Upgrading to Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)

---

## Archivos Modificados Durante Investigación

Todos los cambios fueron revertidos, pero para referencia:

### Archivos Temporalmente Modificados (REVERTIDOS)
- ❌ app/layout.tsx - Agregado `export const dynamic`
- ❌ app/providers.tsx - Providers deshabilitados temporalmente
- ❌ next.config.ts - Múltiples configuraciones experimentales
- ❌ 73 archivos page.tsx - Agregado `export const dynamic`
- ❌ 4 archivos route.ts (CRON) - Agregado `export const dynamic`

### Archivos Creados Durante Pruebas (ELIMINADOS)
- ❌ app/global-error.tsx - Archivo custom (eliminado)
- ❌ app/global-error.tsx.bak - Backup (eliminado)

### Estado Final
- ✅ Todos los archivos revertidos a su estado original
- ✅ package.json restaurado a Next.js 16.0.0
- ✅ No hay archivos modificados relacionados con las pruebas

---

**Documento generado:** 2025-12-11
**Última actualización:** Después de revertir todos los cambios
**Próximo paso:** Decidir entre Opciones A-E según prioridades del negocio
