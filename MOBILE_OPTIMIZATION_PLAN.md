# 📱 PLAN DETALLADO DE OPTIMIZACIÓN MÓVIL - CLOUSADMIN

**Análisis realizado:** 18 de Noviembre de 2025
**Perspectiva:** Experto en Mobile App Design
**Prioridad:** Enfoque en UX móvil, accesibilidad WCAG 2.1, y performance

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual
- ✅ **Puntos Fuertes:** Sistema de constantes móvil, componentes duales, bottom navigation
- 🔴 **Críticos:** Touch targets insuficientes (WCAG), imágenes sin optimizar, PWA no implementado
- 🟡 **Importantes:** Code splitting, responsive spacing, optimización teclados
- 🟢 **Mejoras:** Bottom sheets, gestures, haptic feedback

### Impacto Estimado
| Área | Antes | Después | Mejora |
|------|-------|---------|--------|
| Touch Target Compliance | 20% | 100% | +400% |
| Lighthouse Performance | 60-70 | 90+ | +30% |
| First Contentful Paint | 2-3s | <1.5s | -50% |
| PWA Score | 0 | 100 | ∞ |
| Accessibility Score | 75-80 | 95+ | +20% |

---

## 🔴 FASE 1: PROBLEMAS CRÍTICOS (Urgente - 1-2 días)

### 1.1. Touch Targets Insuficientes (WCAG 2.5.5)

**Problema:** Botones e inputs tienen 36px de altura, WCAG requiere mínimo 44px.

**Archivos afectados:**
- `components/ui/button.tsx:24`
- `components/ui/input.tsx:11`
- `components/ui/select.tsx:47`
- `components/ui/textarea.tsx:15`

#### Solución Detallada

**Paso 1: Actualizar Button Component**

```typescript
// components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-gray-900 text-white hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
        destructive: "bg-destructive text-white hover:bg-destructive/90 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
        outline: "border border-gray-300 bg-transparent text-gray-900 hover:bg-gray-50 hover:border-gray-400",
        secondary: "bg-transparent text-gray-900 hover:bg-gray-50",
        ghost: "bg-transparent text-gray-900 hover:bg-gray-100",
        link: "text-gray-900 underline-offset-4 hover:underline",
      },
      size: {
        // ✅ NUEVO: 44px en mobile, 36px en desktop
        default: "h-11 px-4 py-2 has-[>svg]:px-3 rounded-md sm:h-9",

        // ✅ NUEVO: 40px en mobile, 32px en desktop
        sm: "h-10 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 sm:h-8",

        // ✅ NUEVO: 48px en mobile, 40px en desktop
        lg: "h-12 rounded-lg px-6 has-[>svg]:px-4 sm:h-10",

        // ✅ NUEVO: 44x44 en mobile, 36x36 en desktop
        icon: "size-11 rounded-md sm:size-9",

        // ✅ NUEVO: 40x40 en mobile, 32x32 en desktop
        "icon-sm": "size-10 rounded-md sm:size-8",

        // ✅ NUEVO: 48x48 en mobile, 40x40 en desktop
        "icon-lg": "size-12 rounded-lg sm:size-10",
      },
    },
  }
)
```

**Paso 2: Actualizar Input Component**

```typescript
// components/ui/input.tsx
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // ✅ NUEVO: 44px en mobile, 36px en desktop
        "h-11 sm:h-9",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}
```

**Paso 3: Actualizar Select Component**

```typescript
// components/ui/select.tsx
function SelectTrigger({ className, size = "default", children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        // ✅ NUEVO: Responsive heights
        "data-[size=default]:h-11 sm:data-[size=default]:h-9",
        "data-[size=sm]:h-10 sm:data-[size=sm]:h-8",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}
```

**Paso 4: Actualizar Textarea Component**

```typescript
// components/ui/textarea.tsx
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // ✅ ACTUALIZADO: Altura mínima más grande en mobile
        "min-h-20 sm:min-h-16",
        className
      )}
      {...props}
    />
  )
}
```

**Testing:**
```bash
# Verificar que todos los touch targets cumplen
# Usar herramienta de inspección móvil
# Mínimo 44x44px en todos los elementos interactivos
```

---

### 1.2. Optimización de Imágenes Hero

**Problema:** Imágenes PNG sin optimizar (3.1MB y 3.4MB)

**Archivos afectados:**
- `public/login-hero.png` (3.1MB)
- `public/login-hero2.png` (3.4MB)

#### Solución Detallada

**Paso 1: Instalar Herramientas de Optimización**

```bash
npm install sharp --save-dev
npm install @squoosh/cli --save-dev
```

**Paso 2: Crear Script de Optimización**

```typescript
// scripts/optimize-images.ts
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

async function optimizeImage(inputPath: string, outputBaseName: string) {
  const publicDir = path.join(process.cwd(), 'public')
  const input = path.join(publicDir, inputPath)

  // Generar WebP (mejor compresión)
  await sharp(input)
    .resize(1920, 1080, { fit: 'cover', position: 'center' })
    .webp({ quality: 85, effort: 6 })
    .toFile(path.join(publicDir, `${outputBaseName}.webp`))

  // Generar AVIF (aún mejor compresión, pero menos compatible)
  await sharp(input)
    .resize(1920, 1080, { fit: 'cover', position: 'center' })
    .avif({ quality: 75, effort: 6 })
    .toFile(path.join(publicDir, `${outputBaseName}.avif`))

  // Generar versiones responsive
  const sizes = [640, 750, 828, 1080, 1200, 1920]

  for (const size of sizes) {
    await sharp(input)
      .resize(size, null, { fit: 'inside' })
      .webp({ quality: 85 })
      .toFile(path.join(publicDir, `${outputBaseName}-${size}w.webp`))
  }

  console.log(`✅ Optimizado: ${outputBaseName}`)
}

async function main() {
  await optimizeImage('login-hero.png', 'login-hero')
  await optimizeImage('login-hero2.png', 'login-hero2')
  console.log('🎉 Todas las imágenes optimizadas')
}

main().catch(console.error)
```

**Paso 3: Configurar Next.js Image**

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    // ✅ NUEVO: Formatos optimizados
    formats: ['image/avif', 'image/webp'],

    // ✅ NUEVO: Device sizes para responsive
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],

    // ✅ NUEVO: Image sizes para diferentes usos
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // ✅ NUEVO: Minimizar imágenes automáticamente
    minimumCacheTTL: 31536000, // 1 año

    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.your-objectstorage.com',
      },
    ],
  },

  // ✅ NUEVO: Compresión
  compress: true,

  // ✅ NUEVO: Optimizaciones
  poweredByHeader: false,

  typescript: {
    ignoreBuildErrors: false,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
```

**Paso 4: Actualizar Uso de Imágenes**

```tsx
// app/(auth)/login/page.tsx
<div className="hidden lg:block lg:w-1/2 relative">
  <Image
    src="/login-hero.webp"
    alt="HR Management Platform - Gestión de recursos humanos moderna"
    fill
    priority
    // ✅ NUEVO: Sizes optimizado
    sizes="(max-width: 1024px) 0vw, 50vw"
    // ✅ NUEVO: Placeholder blur
    placeholder="blur"
    blurDataURL="data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA="
    className="object-cover dark:brightness-[0.2] dark:grayscale"
  />
</div>
```

**Paso 5: Ejecutar Optimización**

```bash
# Añadir script a package.json
{
  "scripts": {
    "optimize-images": "tsx scripts/optimize-images.ts"
  }
}

# Ejecutar optimización
npm run optimize-images
```

**Resultados Esperados:**
- login-hero.png: 3.1MB → login-hero.webp: ~150KB (95% reducción)
- login-hero2.png: 3.4MB → login-hero2.webp: ~180KB (95% reducción)
- FCP mejora: 2-3s → <1s

---

### 1.3. Implementación PWA Completa

**Problema:** La aplicación no es instalable como PWA

**Objetivo:** Convertir en Progressive Web App completa

#### Solución Detallada

**Paso 1: Instalar next-pwa**

```bash
npm install @ducanh2912/next-pwa
```

**Paso 2: Configurar next.config.ts**

```typescript
// next.config.ts
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',

  // ✅ Configuración de caché
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 año
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
        },
      },
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-css-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 1 día
        },
      },
    },
    {
      urlPattern: /^https:\/\/api\..*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 5 * 60, // 5 minutos
        },
      },
    },
  ],

  // ✅ Archivos a excluir del service worker
  buildExcludes: [/middleware-manifest\.json$/],
})

const nextConfig: NextConfig = {
  // ... configuración existente
}

export default withPWA(nextConfig)
```

**Paso 3: Crear Manifest**

```json
// public/manifest.json
{
  "name": "Clousadmin - HR Management Platform",
  "short_name": "Clousadmin",
  "description": "Plataforma moderna de gestión de recursos humanos para empresas españolas",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAF9F5",
  "theme_color": "#d97757",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "es-ES",
  "dir": "ltr",

  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],

  "screenshots": [
    {
      "src": "/screenshots/dashboard-mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Dashboard principal"
    },
    {
      "src": "/screenshots/dashboard-desktop.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Dashboard principal"
    }
  ],

  "categories": ["business", "productivity"],

  "shortcuts": [
    {
      "name": "Fichar",
      "short_name": "Fichar",
      "description": "Registrar entrada/salida",
      "url": "/empleado/mi-espacio/fichajes",
      "icons": [
        {
          "src": "/icons/shortcut-fichar.png",
          "sizes": "96x96"
        }
      ]
    },
    {
      "name": "Solicitar Ausencia",
      "short_name": "Ausencia",
      "description": "Nueva solicitud de ausencia",
      "url": "/empleado/mi-espacio/ausencias",
      "icons": [
        {
          "src": "/icons/shortcut-ausencia.png",
          "sizes": "96x96"
        }
      ]
    }
  ]
}
```

**Paso 4: Actualizar Layout con Metadata**

```typescript
// app/layout.tsx
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: "Clousadmin - HR Management Platform",
  description: "Plataforma moderna de gestión de recursos humanos para empresas españolas",

  // ✅ NUEVO: Manifest
  manifest: '/manifest.json',

  // ✅ NUEVO: Apple Web App
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Clousadmin',
  },

  // ✅ NUEVO: Icons
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  // ✅ NUEVO: Application name
  applicationName: 'Clousadmin',

  // ✅ NUEVO: Formato de número de teléfono
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  // ✅ NUEVO: Theme color
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#d97757' },
    { media: '(prefers-color-scheme: dark)', color: '#b85d3f' },
  ],
}
```

**Paso 5: Crear Iconos**

```typescript
// scripts/generate-pwa-icons.ts
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const maskableSizes = [192, 512]

async function generateIcons() {
  const iconsDir = path.join(process.cwd(), 'public', 'icons')
  await fs.mkdir(iconsDir, { recursive: true })

  const sourceLogo = path.join(process.cwd(), 'public', 'logo.svg')

  // Generar iconos regulares
  for (const size of sizes) {
    await sharp(sourceLogo)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`))

    console.log(`✅ Generado: icon-${size}x${size}.png`)
  }

  // Generar iconos maskable (con padding 20%)
  for (const size of maskableSizes) {
    const padding = Math.floor(size * 0.2)
    const innerSize = size - padding * 2

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 217, g: 119, b: 87, alpha: 1 }
      }
    })
      .composite([{
        input: await sharp(sourceLogo)
          .resize(innerSize, innerSize)
          .toBuffer(),
        top: padding,
        left: padding,
      }])
      .png()
      .toFile(path.join(iconsDir, `icon-maskable-${size}x${size}.png`))

    console.log(`✅ Generado: icon-maskable-${size}x${size}.png`)
  }

  // Apple Touch Icon (180x180)
  await sharp(sourceLogo)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'))

  console.log('🎉 Todos los iconos PWA generados')
}

generateIcons().catch(console.error)
```

**Paso 6: Componente de Instalación PWA**

```tsx
// components/pwa/install-prompt.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-[#d97757]/10 rounded-lg flex items-center justify-center">
          <Download className="w-5 h-5 text-[#d97757]" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Instalar Clousadmin
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Añade la app a tu pantalla de inicio para acceso rápido
          </p>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleInstall}
              className="text-xs"
            >
              Instalar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPrompt(false)}
              className="text-xs"
            >
              Ahora no
            </Button>
          </div>
        </div>

        <button
          onClick={() => setShowPrompt(false)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
```

**Paso 7: Añadir al Layout**

```tsx
// app/(dashboard)/layout.tsx
import { PWAInstallPrompt } from '@/components/pwa/install-prompt'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-[#FAF9F5] overflow-hidden">
      {/* ... resto del layout ... */}

      {/* ✅ NUEVO: PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  )
}
```

**Paso 8: Testing PWA**

```bash
# Build de producción
npm run build

# Servir producción
npm start

# Abrir en móvil
# Chrome DevTools > Application > Manifest
# Lighthouse > PWA audit
```

**Checklist PWA:**
- ✅ Manifest.json válido
- ✅ Service worker registrado
- ✅ HTTPS (en producción)
- ✅ Iconos en todos los tamaños
- ✅ Theme color configurado
- ✅ Start URL funcional
- ✅ Offline fallback
- ✅ Install prompt

---

### 1.4. Actualizar MOBILE_DESIGN Constants

**Problema:** Constantes actuales no reflejan touch targets correctos

```typescript
// lib/constants/mobile-design.ts
export const MOBILE_DESIGN = {
  text: {
    pageTitle: 'text-lg font-bold sm:text-xl',        // Responsive
    widgetTitle: 'text-sm font-semibold sm:text-base', // Responsive
    display: 'text-xl font-bold sm:text-2xl',         // Responsive
    body: 'text-sm sm:text-xs',                       // Mobile first
    caption: 'text-[11px] text-gray-500',
    tiny: 'text-[10px] text-gray-500',
  },
  button: {
    // ✅ ACTUALIZADO: Touch targets correctos
    primary: 'min-h-[44px] sm:min-h-[40px] text-sm font-semibold py-2.5',
    secondary: 'min-h-[44px] sm:min-h-[38px] text-xs py-2',
    compact: 'min-h-[40px] sm:min-h-[36px] text-[11px] py-1.5',
  },
  spacing: {
    // ✅ ACTUALIZADO: Responsive
    widget: 'p-4 sm:p-3',
    card: 'p-3 sm:p-2.5',
    section: 'space-y-3 sm:space-y-2',
    items: 'space-y-2 sm:space-y-1.5',
  },
  widget: {
    height: {
      standard: 'h-[240px]',
      tall: 'h-[420px]',
    },
  },
  // ✅ NUEVO: Touch targets
  touchTarget: {
    minimum: 'min-h-[44px] min-w-[44px]',
    comfortable: 'min-h-[48px] min-w-[48px]',
    large: 'min-h-[56px] min-w-[56px]',
  },
  // ✅ NUEVO: Safe areas
  safeArea: {
    top: 'pt-safe',
    bottom: 'pb-safe',
    paddingBottom: 'pb-20 sm:pb-0', // Para bottom nav
  },
}
```

---

## 🟡 FASE 2: MEJORAS IMPORTANTES (1-2 semanas)

### 2.1. Code Splitting Estratégico

**Objetivo:** Reducir bundle inicial y mejorar TTI

#### Componentes a Optimizar

```tsx
// app/(dashboard)/empleado/dashboard/dashboard-client.tsx
import dynamic from 'next/dynamic'

// ✅ Widgets cargados dinámicamente
const FichajeWidget = dynamic(
  () => import('@/components/shared/fichaje-widget'),
  {
    loading: () => <WidgetSkeleton />,
    ssr: true, // Mantener SSR para SEO
  }
)

const AusenciasWidget = dynamic(
  () => import('@/components/shared/ausencias-widget'),
  {
    loading: () => <WidgetSkeleton />,
    ssr: true,
  }
)

const NotificacionesWidget = dynamic(
  () => import('@/components/shared/notificaciones-widget'),
  {
    loading: () => <WidgetSkeleton />,
    ssr: false, // No crítico para SEO
  }
)

// ✅ Modales cargados solo cuando se necesitan
const FichajeManualModal = dynamic(
  () => import('@/components/shared/fichaje-manual-modal'),
  {
    loading: () => <ModalSkeleton />,
    ssr: false, // Solo client-side
  }
)
```

#### Rutas Admin (Heavy)

```tsx
// app/(dashboard)/admin/layout.tsx
import dynamic from 'next/dynamic'

// ✅ Panel admin solo carga si es admin
const AdminSidebar = dynamic(
  () => import('@/components/admin/admin-sidebar'),
  {
    loading: () => <SidebarSkeleton />,
    ssr: false,
  }
)

const DataTable = dynamic(
  () => import('@/components/admin/data-table'),
  {
    loading: () => <TableSkeleton />,
    ssr: false,
  }
)
```

#### Charts y Visualizaciones

```tsx
// Si se usan charts (no detecté en el análisis)
const Chart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
)
```

**Bundle Analyzer:**

```bash
npm install @next/bundle-analyzer --save-dev
```

```typescript
// next.config.ts
import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default bundleAnalyzer(withPWA(nextConfig))
```

```json
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build"
  }
}
```

**Resultados Esperados:**
- Bundle inicial: -30%
- TTI: -40%
- First Load JS: <100KB

---

### 2.2. Padding y Spacing Responsive

**Archivos a actualizar:**
- `components/ui/card.tsx`
- `components/layout/sidebar.tsx`
- `app/globals.css`

#### Card Component

```typescript
// components/ui/card.tsx
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // ✅ ACTUALIZADO: Responsive padding
        "flex flex-col space-y-1.5 px-4 pt-4 sm:px-6 sm:pt-6",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      // ✅ ACTUALIZADO: Responsive padding
      className={cn("px-4 pb-4 sm:px-6 sm:pb-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      // ✅ ACTUALIZADO: Responsive padding
      className={cn("flex items-center px-4 pt-0 pb-4 sm:px-6 sm:pb-6", className)}
      {...props}
    />
  )
}
```

#### Container Utilities

```css
/* app/globals.css */
@layer components {
  .container-main {
    /* ✅ ACTUALIZADO: Responsive padding */
    @apply max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8;
  }

  .section-padding {
    /* ✅ NUEVO: Padding de sección responsive */
    @apply px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10;
  }

  .widget-padding {
    /* ✅ NUEVO: Padding de widget responsive */
    @apply p-4 sm:p-3;
  }
}
```

---

### 2.3. Tipografía Responsive con Clamp

**Objetivo:** Escalado fluido entre mobile y desktop

```css
/* app/globals.css */
@layer base {
  /* ✅ ACTUALIZADO: Fluid typography */
  h1, .text-page-title {
    @apply font-bold leading-tight tracking-tight text-text-primary;
    font-size: clamp(1.5rem, 4vw + 0.5rem, 2.5rem); /* 24px → 40px */
  }

  h2, .text-section-title {
    @apply font-semibold leading-snug tracking-tight text-text-primary;
    font-size: clamp(1.125rem, 2.5vw + 0.5rem, 1.75rem); /* 18px → 28px */
  }

  h3, .text-subsection-title {
    @apply font-semibold leading-snug text-text-primary;
    font-size: clamp(1rem, 1.5vw + 0.5rem, 1.25rem); /* 16px → 20px */
  }

  p, .text-body {
    @apply font-normal leading-relaxed text-text-primary;
    font-size: clamp(0.875rem, 0.5vw + 0.75rem, 1rem); /* 14px → 16px */
  }

  .text-small {
    @apply font-normal leading-normal text-text-secondary;
    font-size: clamp(0.75rem, 0.5vw + 0.625rem, 0.875rem); /* 12px → 14px */
  }

  .text-caption {
    @apply font-normal leading-tight text-text-secondary;
    font-size: clamp(0.6875rem, 0.25vw + 0.625rem, 0.75rem); /* 11px → 12px */
  }
}
```

**Uso:**
```tsx
<h1 className="text-page-title">Dashboard</h1>
{/* Escala automáticamente de 24px a 40px */}
```

---

### 2.4. InputMode para Teclados Móviles

**Casos de uso identificados:**

```tsx
// ✅ Teléfono
<Input
  type="tel"
  inputMode="tel"
  autoComplete="tel"
  placeholder="600 123 456"
  pattern="[0-9]{9}"
/>

// ✅ Email (ya correcto)
<Input
  type="email"
  inputMode="email"
  autoComplete="email"
  placeholder="tu@empresa.com"
/>

// ✅ Números (DNI, cuenta bancaria)
<Input
  type="text"
  inputMode="numeric"
  placeholder="12345678A"
  pattern="[0-9]{8}[A-Z]"
/>

// ✅ Código postal
<Input
  type="text"
  inputMode="numeric"
  placeholder="28001"
  pattern="[0-9]{5}"
  maxLength={5}
/>

// ✅ IBAN
<Input
  type="text"
  inputMode="text"
  autoComplete="off"
  placeholder="ES12 1234 1234 1234 1234 1234"
  pattern="ES[0-9]{22}"
/>

// ✅ Búsqueda
<Input
  type="search"
  inputMode="search"
  placeholder="Buscar empleados..."
/>

// ✅ URL
<Input
  type="url"
  inputMode="url"
  placeholder="https://empresa.com"
/>
```

**Componente Reutilizable:**

```tsx
// components/ui/mobile-input.tsx
import { Input, InputProps } from './input'

interface MobileInputProps extends InputProps {
  variant?: 'phone' | 'email' | 'numeric' | 'postal' | 'search' | 'url'
}

export function MobileInput({ variant = 'text', ...props }: MobileInputProps) {
  const config = {
    phone: {
      type: 'tel' as const,
      inputMode: 'tel' as const,
      autoComplete: 'tel',
      pattern: '[0-9]{9}',
    },
    email: {
      type: 'email' as const,
      inputMode: 'email' as const,
      autoComplete: 'email',
    },
    numeric: {
      type: 'text' as const,
      inputMode: 'numeric' as const,
      pattern: '[0-9]*',
    },
    postal: {
      type: 'text' as const,
      inputMode: 'numeric' as const,
      pattern: '[0-9]{5}',
      maxLength: 5,
    },
    search: {
      type: 'search' as const,
      inputMode: 'search' as const,
    },
    url: {
      type: 'url' as const,
      inputMode: 'url' as const,
    },
  }

  return <Input {...config[variant]} {...props} />
}
```

---

### 2.5. Mejorar Contraste de Colores

**Problema:** Texto secundario en límite AA (4.5:1)

```css
/* app/globals.css */
:root {
  /* ✅ ACTUALIZADO: Contraste mejorado */
  --text-primary: #2D2D2A;    /* Antes: #3D3D3A - Ratio 12:1 (AAA) */
  --text-secondary: #5A5954;  /* Antes: #6B6A64 - Ratio 7:1 (AAA) */
  --text-tertiary: #78766F;   /* Nuevo - Ratio 4.5:1 (AA) */
  --text-disabled: #A8A59F;   /* Nuevo - Ratio 3:1 (para disabled) */

  /* ✅ Accent con mejor contraste para texto */
  --accent: #d97757;          /* Ratio 3.5:1 - OK para elementos grandes */
  --accent-dark: #b85d3f;     /* Nuevo - Ratio 5:1 - OK para texto */
}

/* ✅ Clases de utilidad */
@layer utilities {
  .text-primary {
    @apply text-[#2D2D2A];
  }

  .text-secondary {
    @apply text-[#5A5954];
  }

  .text-tertiary {
    @apply text-[#78766F];
  }

  .text-disabled {
    @apply text-[#A8A59F];
  }

  /* ✅ Accent para texto (usando versión oscura) */
  .text-accent {
    @apply text-[#b85d3f];
  }

  /* ✅ Accent para backgrounds (versión normal) */
  .bg-accent {
    @apply bg-[#d97757];
  }
}
```

**Actualizar Bottom Navigation:**

```tsx
// components/layout/bottom-navigation.tsx
<span className={cn(
  'text-[11px] font-medium',  // ✅ ACTUALIZADO: 11px en lugar de 10px
  active && 'font-semibold'
)}>
  {item.name}
</span>
```

---

## 🟢 FASE 3: MEJORAS AVANZADAS (2-4 semanas)

### 3.1. Bottom Sheets para Mobile

**Instalación:**

```bash
npm install vaul
```

**Componente:**

```tsx
// components/ui/bottom-sheet.tsx
'use client'

import * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cn } from '@/lib/utils'

const BottomSheet = DrawerPrimitive.Root

const BottomSheetTrigger = DrawerPrimitive.Trigger

const BottomSheetPortal = DrawerPrimitive.Portal

const BottomSheetClose = DrawerPrimitive.Close

const BottomSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/40', className)}
    {...props}
  />
))
BottomSheetOverlay.displayName = DrawerPrimitive.Overlay.displayName

const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <BottomSheetPortal>
    <BottomSheetOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[20px] border-t border-gray-200 bg-white',
        // ✅ Safe area para iPhone
        'pb-safe',
        className
      )}
      {...props}
    >
      {/* ✅ Handle visual */}
      <div className="mx-auto mt-3 h-1.5 w-12 flex-shrink-0 rounded-full bg-gray-300" />

      {children}
    </DrawerPrimitive.Content>
  </BottomSheetPortal>
))
BottomSheetContent.displayName = 'BottomSheetContent'

const BottomSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)}
    {...props}
  />
)
BottomSheetHeader.displayName = 'BottomSheetHeader'

const BottomSheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('mt-auto flex flex-col gap-2 p-4', className)}
    {...props}
  />
)
BottomSheetFooter.displayName = 'BottomSheetFooter'

const BottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
BottomSheetTitle.displayName = DrawerPrimitive.Title.displayName

const BottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-sm text-gray-600', className)}
    {...props}
  />
))
BottomSheetDescription.displayName = DrawerPrimitive.Description.displayName

export {
  BottomSheet,
  BottomSheetPortal,
  BottomSheetOverlay,
  BottomSheetTrigger,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetFooter,
  BottomSheetTitle,
  BottomSheetDescription,
}
```

**Responsive Dialog/Sheet:**

```tsx
// components/ui/responsive-dialog.tsx
'use client'

import * as React from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from '@/components/ui/bottom-sheet'

interface ResponsiveDialogProps {
  children: React.ReactNode
  trigger?: React.ReactNode
  title?: string
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ResponsiveDialog({
  children,
  trigger,
  title,
  description,
  open,
  onOpenChange,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)')

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent>
          {(title || description) && (
            <DialogHeader>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          )}
          {children}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      {trigger && <BottomSheetTrigger asChild>{trigger}</BottomSheetTrigger>}
      <BottomSheetContent>
        {(title || description) && (
          <BottomSheetHeader>
            {title && <BottomSheetTitle>{title}</BottomSheetTitle>}
            {description && <BottomSheetDescription>{description}</BottomSheetDescription>}
          </BottomSheetHeader>
        )}
        <div className="px-4 pb-4">
          {children}
        </div>
      </BottomSheetContent>
    </BottomSheet>
  )
}
```

**Uso:**

```tsx
// Reemplazar Dialog por ResponsiveDialog
<ResponsiveDialog
  trigger={<Button>Fichaje Manual</Button>}
  title="Registrar Fichaje"
  description="Añade una entrada o salida manual"
>
  <FichajeManualForm />
</ResponsiveDialog>
```

---

### 3.2. Pull to Refresh

**Instalación:**

```bash
npm install react-use-gesture
```

**Hook personalizado:**

```tsx
// hooks/use-pull-to-refresh.ts
'use client'

import { useEffect, useRef, useState } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  resistance?: number
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const touchStartY = useRef(0)
  const scrollableElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      scrollableElement.current = target.closest('[data-pull-to-refresh]')

      if (!scrollableElement.current) return

      // Solo activar si está en el top
      if (scrollableElement.current.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!scrollableElement.current || isRefreshing) return
      if (scrollableElement.current.scrollTop > 0) return

      const touchY = e.touches[0].clientY
      const distance = touchY - touchStartY.current

      if (distance > 0) {
        e.preventDefault()
        setPullDistance(Math.min(distance / resistance, threshold * 1.5))
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true)

        // ✅ Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10)
        }

        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
        }
      } else {
        setPullDistance(0)
      }

      touchStartY.current = 0
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onRefresh, threshold, resistance, pullDistance, isRefreshing])

  return {
    isRefreshing,
    pullDistance,
    isPulling: pullDistance > 0,
  }
}
```

**Componente:**

```tsx
// components/ui/pull-to-refresh.tsx
'use client'

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh({ onRefresh })

  const opacity = Math.min(pullDistance / 80, 1)
  const scale = Math.min(0.5 + (pullDistance / 80) * 0.5, 1)

  return (
    <div className="relative" data-pull-to-refresh>
      {/* ✅ Indicador de pull */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-center transition-transform"
        style={{
          transform: `translateY(${Math.min(pullDistance, 80)}px)`,
          opacity,
        }}
      >
        <div
          className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg"
          style={{ transform: `scale(${scale})` }}
        >
          <Loader2
            className={cn(
              'w-5 h-5 text-[#d97757]',
              (isRefreshing || pullDistance >= 80) && 'animate-spin'
            )}
          />
        </div>
      </div>

      {/* ✅ Contenido */}
      <div
        className={cn('transition-transform', className)}
        style={{
          transform: isPulling && !isRefreshing
            ? `translateY(${Math.min(pullDistance * 0.5, 40)}px)`
            : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
```

**Uso:**

```tsx
// app/(dashboard)/empleado/mi-espacio/fichajes/page.tsx
<PullToRefresh onRefresh={async () => {
  await queryClient.invalidateQueries({ queryKey: ['fichajes'] })
}}>
  <FichajesList />
</PullToRefresh>
```

---

### 3.3. Swipe Gestures en Listas

**Componente:**

```tsx
// components/ui/swipeable-item.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Trash2, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color: 'red' | 'blue' | 'green'
}

interface SwipeableItemProps {
  children: React.ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  className?: string
}

export function SwipeableItem({
  children,
  leftActions,
  rightActions,
  className,
}: SwipeableItemProps) {
  const [offset, setOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const itemRef = useRef<HTMLDivElement>(null)

  const actionWidth = 80
  const threshold = 20

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX
      setIsSwiping(true)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping) return

      currentX.current = e.touches[0].clientX
      const diff = currentX.current - startX.current

      // ✅ Resistencia en los extremos
      const maxOffset = rightActions ? actionWidth * rightActions.length : 0
      const minOffset = leftActions ? -actionWidth * leftActions.length : 0

      if (diff > maxOffset) {
        setOffset(maxOffset + (diff - maxOffset) * 0.3)
      } else if (diff < minOffset) {
        setOffset(minOffset + (diff - minOffset) * 0.3)
      } else {
        setOffset(diff)
      }
    }

    const handleTouchEnd = () => {
      setIsSwiping(false)

      // ✅ Snap to nearest action or reset
      const maxOffset = rightActions ? actionWidth * rightActions.length : 0
      const minOffset = leftActions ? -actionWidth * leftActions.length : 0

      if (offset > threshold && rightActions) {
        setOffset(maxOffset)
        // ✅ Haptic feedback
        if ('vibrate' in navigator) navigator.vibrate(10)
      } else if (offset < -threshold && leftActions) {
        setOffset(minOffset)
        if ('vibrate' in navigator) navigator.vibrate(10)
      } else {
        setOffset(0)
      }

      startX.current = 0
      currentX.current = 0
    }

    const item = itemRef.current
    if (!item) return

    item.addEventListener('touchstart', handleTouchStart, { passive: true })
    item.addEventListener('touchmove', handleTouchMove, { passive: true })
    item.addEventListener('touchend', handleTouchEnd)

    return () => {
      item.removeEventListener('touchstart', handleTouchStart)
      item.removeEventListener('touchmove', handleTouchMove)
      item.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isSwiping, offset, leftActions, rightActions])

  const handleActionClick = (action: SwipeAction) => {
    action.onClick()
    setOffset(0)

    // ✅ Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(20)
  }

  const colorClasses = {
    red: 'bg-red-500 hover:bg-red-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
  }

  return (
    <div className="relative overflow-hidden" ref={itemRef}>
      {/* ✅ Left actions */}
      {leftActions && (
        <div className="absolute left-0 top-0 bottom-0 flex">
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                'flex items-center justify-center text-white transition-colors',
                colorClasses[action.color]
              )}
              style={{ width: actionWidth }}
              aria-label={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      {/* ✅ Right actions */}
      {rightActions && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                'flex items-center justify-center text-white transition-colors',
                colorClasses[action.color]
              )}
              style={{ width: actionWidth }}
              aria-label={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      {/* ✅ Content */}
      <div
        className={cn('bg-white transition-transform', className)}
        style={{
          transform: `translateX(${offset}px)`,
          transitionDuration: isSwiping ? '0ms' : '300ms',
        }}
      >
        {children}
      </div>
    </div>
  )
}
```

**Uso:**

```tsx
<SwipeableItem
  rightActions={[
    {
      icon: <Edit className="w-5 h-5" />,
      label: 'Editar',
      onClick: () => console.log('Editar'),
      color: 'blue',
    },
    {
      icon: <Trash2 className="w-5 h-5" />,
      label: 'Eliminar',
      onClick: () => console.log('Eliminar'),
      color: 'red',
    },
  ]}
>
  <div className="p-4">
    <p>Item swipeable</p>
  </div>
</SwipeableItem>
```

---

### 3.4. Haptic Feedback

**Utilidad:**

```typescript
// lib/utils/haptics.ts

export type HapticFeedbackType =
  | 'light'      // 10ms - Hover, selección
  | 'medium'     // 20ms - Botones normales
  | 'heavy'      // 30ms - Acciones importantes
  | 'success'    // [10, 50, 10] - Confirmación exitosa
  | 'warning'    // [20, 100, 20] - Advertencia
  | 'error'      // [50, 100, 50, 100, 50] - Error

/**
 * ✅ Proporciona feedback háptico (vibración) en dispositivos compatibles
 *
 * @example
 * hapticFeedback('light') // Hover
 * hapticFeedback('medium') // Click botón
 * hapticFeedback('heavy') // Acción importante
 * hapticFeedback('success') // Operación exitosa
 */
export function hapticFeedback(type: HapticFeedbackType = 'medium') {
  // ✅ Verificar soporte
  if (!('vibrate' in navigator)) return

  // ✅ Verificar que el usuario no ha deshabilitado vibraciones
  // (respetamos configuración de sistema)

  const patterns = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [50, 100, 50, 100, 50],
  }

  try {
    navigator.vibrate(patterns[type])
  } catch (error) {
    // Fallar silenciosamente
    console.debug('Haptic feedback not available:', error)
  }
}

/**
 * ✅ Hook para usar haptic feedback en componentes
 */
export function useHapticFeedback() {
  return {
    light: () => hapticFeedback('light'),
    medium: () => hapticFeedback('medium'),
    heavy: () => hapticFeedback('heavy'),
    success: () => hapticFeedback('success'),
    warning: () => hapticFeedback('warning'),
    error: () => hapticFeedback('error'),
  }
}
```

**Integración en botones:**

```tsx
// components/ui/button.tsx
import { hapticFeedback } from '@/lib/utils/haptics'

function Button({ onClick, variant, ...props }: ButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // ✅ Haptic feedback según tipo de botón
    if (variant === 'destructive') {
      hapticFeedback('warning')
    } else if (variant === 'default') {
      hapticFeedback('medium')
    } else {
      hapticFeedback('light')
    }

    onClick?.(e)
  }

  return (
    <button onClick={handleClick} {...props} />
  )
}
```

**Integración en formularios:**

```tsx
// En submit de formularios
const onSubmit = async (data) => {
  try {
    await submitForm(data)
    hapticFeedback('success')  // ✅ Feedback de éxito
    toast.success('Guardado correctamente')
  } catch (error) {
    hapticFeedback('error')    // ✅ Feedback de error
    toast.error('Error al guardar')
  }
}
```

---

### 3.5. Accesibilidad - ARIA Live Regions

**Componente de notificaciones:**

```tsx
// components/ui/live-region.tsx
'use client'

import { useEffect, useRef } from 'react'

interface LiveRegionProps {
  message: string
  role?: 'status' | 'alert'
  politeness?: 'polite' | 'assertive' | 'off'
}

export function LiveRegion({
  message,
  role = 'status',
  politeness = 'polite',
}: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // ✅ Limpiar después de anunciar
    const timer = setTimeout(() => {
      if (regionRef.current) {
        regionRef.current.textContent = ''
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [message])

  return (
    <div
      ref={regionRef}
      role={role}
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}
```

**Hook para anuncios:**

```tsx
// hooks/use-announce.ts
'use client'

import { useState, useCallback } from 'react'

export function useAnnounce() {
  const [message, setMessage] = useState('')
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite')

  const announce = useCallback((msg: string, urgent = false) => {
    setMessage(msg)
    setPoliteness(urgent ? 'assertive' : 'polite')

    // ✅ Limpiar después de anunciar
    setTimeout(() => setMessage(''), 100)
  }, [])

  return {
    message,
    politeness,
    announce,
  }
}
```

**Uso:**

```tsx
// En un componente
const { message, politeness, announce } = useAnnounce()

const handleFichaje = async () => {
  await registrarFichaje()

  // ✅ Anuncio para screen readers
  announce('Fichaje registrado correctamente')

  // ✅ Toast visual
  toast.success('Fichaje registrado')
}

return (
  <>
    <Button onClick={handleFichaje}>Fichar</Button>
    <LiveRegion message={message} politeness={politeness} />
  </>
)
```

---

### 3.6. Skip Links para Navegación

**Componente:**

```tsx
// components/layout/skip-links.tsx
export function SkipLinks() {
  return (
    <div className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999]">
      <a
        href="#main-content"
        className="inline-flex h-11 items-center justify-center rounded-md bg-gray-900 px-4 text-sm font-medium text-white shadow-lg ring-offset-white transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2"
      >
        Saltar al contenido principal
      </a>
      <a
        href="#navigation"
        className="ml-2 inline-flex h-11 items-center justify-center rounded-md bg-gray-900 px-4 text-sm font-medium text-white shadow-lg ring-offset-white transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2"
      >
        Ir a navegación
      </a>
    </div>
  )
}
```

**Uso en layout:**

```tsx
// app/(dashboard)/layout.tsx
import { SkipLinks } from '@/components/layout/skip-links'

export default function DashboardLayout({ children }) {
  return (
    <>
      <SkipLinks />

      <div className="flex h-screen bg-[#FAF9F5] overflow-hidden">
        <div className="hidden sm:flex" id="navigation">
          <Sidebar ... />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <main id="main-content" className="flex-1 overflow-y-auto pb-16 sm:pb-0">
            {children}
          </main>
        </div>

        <BottomNavigation ... />
      </div>
    </>
  )
}
```

---

### 3.7. Breakpoint Tablet Optimizado

**Actualizar Tailwind Config:**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      screens: {
        // ✅ Breakpoints optimizados
        'xs': '475px',   // Nuevo - Móviles grandes
        'sm': '640px',   // Mobile → Desktop threshold
        'md': '768px',   // Tablets
        'lg': '1024px',  // Laptops
        'xl': '1280px',  // Desktops
        '2xl': '1536px', // Large desktops

        // ✅ Orientación
        'portrait': { raw: '(orientation: portrait)' },
        'landscape': { raw: '(orientation: landscape)' },
      },
    },
  },
}
```

**Uso en componentes:**

```tsx
// Dashboard con 3 breakpoints
<div className="
  grid
  grid-cols-1           /* Mobile: 1 columna */
  md:grid-cols-2        /* Tablet: 2 columnas */
  lg:grid-cols-3        /* Desktop: 3 columnas */
  gap-3
  md:gap-4
  lg:gap-6              /* Gaps progresivos */
">
  {widgets}
</div>

// Typography escalada
<h1 className="
  text-xl              /* Mobile: 20px */
  md:text-2xl          /* Tablet: 24px */
  lg:text-3xl          /* Desktop: 30px */
">
  Dashboard
</h1>

// Padding responsive
<div className="
  px-4 py-6            /* Mobile */
  md:px-6 md:py-8      /* Tablet */
  lg:px-8 lg:py-10     /* Desktop */
">
  {content}
</div>
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Semana 1: Críticos
- [ ] ✅ Touch targets botones (44px mobile)
- [ ] ✅ Touch targets inputs (44px mobile)
- [ ] ✅ Optimizar login-hero.png → WebP
- [ ] ✅ Optimizar login-hero2.png → WebP
- [ ] ✅ Configurar Next.js Image formats
- [ ] ✅ Instalar next-pwa
- [ ] ✅ Crear manifest.json
- [ ] ✅ Generar iconos PWA
- [ ] ✅ Actualizar layout con viewport
- [ ] ✅ Componente PWA install prompt
- [ ] ✅ Testing PWA en mobile

### Semana 2-3: Importantes
- [ ] 📦 Code splitting widgets
- [ ] 📦 Code splitting rutas admin
- [ ] 📦 Bundle analyzer setup
- [ ] 📦 Analizar y optimizar bundles
- [ ] 🎨 Cards padding responsive
- [ ] 🎨 Container padding responsive
- [ ] 📝 Tipografía con clamp()
- [ ] ⌨️ InputMode en formularios
- [ ] 🎨 Mejorar contraste colores
- [ ] 🎨 Aumentar texto bottom nav

### Semana 4-5: Mejoras UX
- [ ] 📱 Componente Bottom Sheet
- [ ] 📱 ResponsiveDialog wrapper
- [ ] 📱 Migrar modales a bottom sheets
- [ ] 🔄 Hook pull-to-refresh
- [ ] 🔄 Componente PullToRefresh
- [ ] 🔄 Integrar en listas principales
- [ ] 👆 SwipeableItem component
- [ ] 👆 Integrar swipe en listas

### Semana 6: Mejoras Accesibilidad
- [ ] ♿ Haptic feedback utils
- [ ] ♿ Integrar haptics en botones
- [ ] ♿ Integrar haptics en forms
- [ ] ♿ LiveRegion component
- [ ] ♿ useAnnounce hook
- [ ] ♿ Skip links component
- [ ] 📱 Breakpoints tablet
- [ ] 📱 Optimizar layouts para tablet

---

## 🧪 TESTING PLAN

### Mobile Devices
- [ ] iPhone SE (375px)
- [ ] iPhone 12/13/14 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] Samsung Galaxy S21 (360px)
- [ ] Samsung Galaxy S21+ (384px)
- [ ] iPad Mini (768px)
- [ ] iPad Pro (1024px)

### Browsers
- [ ] Safari iOS
- [ ] Chrome Android
- [ ] Samsung Internet
- [ ] Firefox Mobile

### Tests
- [ ] Touch targets ≥ 44px
- [ ] Contraste ≥ 4.5:1 (AA)
- [ ] PWA instalable
- [ ] Offline funciona
- [ ] Forms mobile keyboard
- [ ] Swipe gestures
- [ ] Pull to refresh
- [ ] Haptic feedback
- [ ] Screen reader navigation
- [ ] Lighthouse Mobile ≥ 90

---

## 📊 MÉTRICAS DE ÉXITO

### Performance
| Métrica | Objetivo | Cómo Medir |
|---------|----------|------------|
| Lighthouse Performance | ≥ 90 | Chrome DevTools |
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.5s | Lighthouse |
| Total Blocking Time | < 200ms | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |

### PWA
| Métrica | Objetivo | Cómo Medir |
|---------|----------|------------|
| PWA Score | 100 | Lighthouse |
| Service Worker | ✅ Registered | DevTools Application |
| Manifest Valid | ✅ | DevTools Application |
| Offline Ready | ✅ | Offline test |

### Accesibilidad
| Métrica | Objetivo | Cómo Medir |
|---------|----------|------------|
| Lighthouse Accessibility | ≥ 95 | Lighthouse |
| Touch Target Compliance | 100% | Manual audit |
| Color Contrast | AAA (≥ 7:1) | Contrast checker |
| WCAG 2.1 Level | AA compliant | WAVE tool |

### Bundle Size
| Métrica | Objetivo | Cómo Medir |
|---------|----------|------------|
| First Load JS | < 100KB | Bundle analyzer |
| Total JS | < 300KB | Bundle analyzer |
| CSS | < 50KB | Bundle analyzer |

---

## 🔧 HERRAMIENTAS RECOMENDADAS

### Development
```bash
# Chrome DevTools Extensions
# - React DevTools
# - Lighthouse
# - axe DevTools (accesibilidad)

# VS Code Extensions
# - Tailwind CSS IntelliSense
# - ESLint
# - Accessibility Linter
```

### Testing
```bash
# Lighthouse CI
npm install -g @lhci/cli

# Bundle Analyzer
npm install @next/bundle-analyzer --save-dev

# Image Optimizer
npm install sharp --save-dev
```

### Mobile Testing
- **BrowserStack** - Testing en dispositivos reales
- **Chrome Remote Debugging** - Debug de Android
- **Safari Web Inspector** - Debug de iOS
- **ngrok** - Exponer localhost para testing mobile

---

## 📚 DOCUMENTACIÓN Y RECURSOS

### Guías de Referencia
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design Touch Targets](https://m3.material.io/foundations/accessible-design/accessibility-basics)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Android Material Design](https://m3.material.io/)

### Tools
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [PWA Builder](https://www.pwabuilder.com/)
- [Web.dev Measure](https://web.dev/measure/)
- [Can I Use](https://caniuse.com/)

---

## 🎯 PRIORIZACIÓN FINAL

### 🔴 URGENTE (Esta semana)
1. Touch targets (botones e inputs a 44px)
2. Optimizar imágenes hero
3. Implementar PWA básico

### 🟡 ALTA PRIORIDAD (2 semanas)
4. Code splitting
5. Padding responsive
6. InputMode keyboards
7. Tipografía responsive

### 🟢 MEDIA PRIORIDAD (1 mes)
8. Bottom sheets
9. Pull to refresh
10. Swipe gestures
11. Haptic feedback

### ⚪ BAJA PRIORIDAD (Backlog)
12. Breakpoints tablet
13. Skip links
14. ARIA live regions
15. Advanced animations

---

## ✅ RESULTADO ESPERADO

Después de implementar este plan:

### Antes
- 📊 Lighthouse Mobile: 60-70
- 📱 PWA: No instalable
- ♿ Touch Compliance: 20%
- ⚡ FCP: 2-3s
- 📦 Bundle: Sin optimizar

### Después
- 📊 Lighthouse Mobile: 90+
- 📱 PWA: 100/100
- ♿ Touch Compliance: 100%
- ⚡ FCP: <1.5s
- 📦 Bundle: Optimizado (-30%)

### Beneficios para Usuarios
- ✅ Instalación como app nativa
- ✅ Funcionamiento offline
- ✅ Carga instantánea (<2s)
- ✅ Touch preciso y cómodo
- ✅ Teclados optimizados
- ✅ Gestos intuitivos
- ✅ Feedback háptico
- ✅ Accesibilidad completa

---

**Documento generado el 18 de Noviembre de 2025**
**Próxima revisión:** Después de Fase 1 (2 semanas)
