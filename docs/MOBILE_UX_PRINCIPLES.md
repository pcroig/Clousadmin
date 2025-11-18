# 📱 Principios de UX Mobile - Clousadmin

**Documento de referencia para decisiones de diseño mobile**

---

## 🎯 Filosofía Mobile-First

### Mobile ≠ Desktop Responsive

**Desktop:** Usuario sentado, mouse preciso, multitarea, pantalla grande, teclado físico
**Mobile:** Usuario en movimiento, dedo impreciso, una tarea a la vez, pantalla pequeña, teclado virtual

**Consecuencia:** No adaptar desktop a mobile, sino diseñar NATIVO para cada contexto.

---

## 👆 Touch & Gestures

### 1. Touch Targets (WCAG 2.5.5)

```
Mínimo absoluto: 44x44px (Apple HIG)
Recomendado: 48x48px (Material Design)
Cómodo: 56x56px (iOS Safari toolbar)
```

**Implementado:**
```typescript
// lib/constants/mobile-design.ts
touchTarget: {
  minimum: 'min-h-[44px] min-w-[44px]',    // 44px
  comfortable: 'min-h-[48px] min-w-[48px]', // 48px
  large: 'min-h-[56px] min-w-[56px]',       // 56px
}
```

**Aplicado en:**
- ✅ Botones: 44px mobile, 36px desktop
- ✅ Inputs: 44px mobile, 36px desktop
- ✅ Bottom nav items: 64px altura
- ⚠️ Pendiente: Cards clickables, list items

### 2. Spacing para Touch

```css
/* Espacio mínimo entre elementos táctiles */
gap: 8px;   /* Mínimo */
gap: 12px;  /* Recomendado */
gap: 16px;  /* Cómodo */
```

**Razón:** Evitar toques accidentales en elementos adyacentes.

**Implementado:**
```typescript
spacing: {
  items: 'space-y-2 sm:space-y-1.5', // 8px mobile, 6px desktop
  section: 'space-y-3 sm:space-y-2', // 12px mobile, 8px desktop
}
```

### 3. Gestures Nativos Mobile

| Gesto | Uso | Estado |
|-------|-----|--------|
| **Swipe horizontal** | Navegar atrás, acciones en listas | ⚠️ Pendiente |
| **Swipe vertical** | Scroll, pull-to-refresh | ⚠️ Pendiente |
| **Long press** | Menú contextual, reordenar | ❌ No implementado |
| **Pinch** | Zoom (si aplica) | ❌ No necesario |
| **Tap** | Acción primaria | ✅ Implementado |
| **Double tap** | Evitar (confuso) | ❌ No usar |

**Swipe-to-dismiss en Bottom Sheets:**
```typescript
// Usuario arrastra sheet hacia abajo → cierra modal
// Debe tener resistencia elástica
// Threshold: 30% de altura o velocidad > 500px/s
```

**Pull-to-refresh en listas:**
```typescript
// Usuario arrastra hacia abajo desde top
// Muestra spinner
// Threshold: 80px
// Haptic feedback al activar
```

---

## 🎭 Feedback Visual & Háptico

### 1. Estados Visuales

**Cada interacción debe tener feedback INMEDIATO:**

```tsx
// ✅ CORRECTO: Feedback en todos los estados
<button className="
  active:scale-95           // Presionado
  active:bg-gray-100        // Color cambia
  transition-all duration-150 // Suave
  disabled:opacity-50       // Deshabilitado visible
  disabled:cursor-not-allowed
">
```

```tsx
// ❌ INCORRECTO: Solo hover (mobile no tiene hover)
<button className="hover:bg-gray-100">
```

**Estados necesarios:**
- Default (reposo)
- Active (presionando) ← **CRÍTICO en mobile**
- Disabled (no disponible)
- Loading (procesando)
- Focus (navegación teclado)

### 2. Haptic Feedback

**Cuándo usar vibración:**

| Acción | Vibración | Duración |
|--------|-----------|----------|
| Botón normal | Ligera | 10ms |
| Botón importante (fichar) | Media | 20ms |
| Acción destructiva | Fuerte | 30ms |
| Error | Patrón (50-100-50) | 200ms |
| Éxito | Patrón (10-50-10) | 70ms |
| Swipe activado | Ligera | 10ms |

**Implementación:**
```typescript
// lib/utils/haptics.ts
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
  if (!('vibrate' in navigator)) return

  const patterns = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    error: [50, 100, 50, 100, 50],
  }

  navigator.vibrate(patterns[type])
}
```

**Uso:**
```tsx
<Button onClick={() => {
  hapticFeedback('medium')  // Vibrar primero
  handleFichar()            // Luego acción
}}>
  Iniciar Jornada
</Button>
```

---

## 📏 Jerarquía Visual Mobile

### 1. Tipografía

**Desktop:** Puede permitirse tamaños más pequeños (usuario más cerca de pantalla)
**Mobile:** Necesita tamaños más grandes (brazo extendido, luz solar)

```css
/* Tamaños mínimos legibles en mobile */
Títulos principales: 20px (1.25rem)
Títulos secundarios: 18px (1.125rem)
Cuerpo de texto: 16px (1rem)      ← Mínimo para lectura
Captions: 14px (0.875rem)         ← Límite inferior
Tiny: 12px (0.75rem)              ⚠️ Solo metadata no crítica
```

**Implementado:**
```typescript
text: {
  pageTitle: 'text-lg sm:text-xl',      // 18px → 20px
  widgetTitle: 'text-sm sm:text-base',  // 14px → 16px
  body: 'text-sm sm:text-xs',           // 14px → 12px (mobile first)
  caption: 'text-[11px]',               // 11px (metadata)
}
```

**Contraste en mobile:**
- Pantallas expuestas a luz solar → necesitan MÁS contraste
- WCAG AA: 4.5:1 (mínimo)
- WCAG AAA: 7:1 (recomendado para mobile)

### 2. Espaciado

**Regla de oro:** Mobile necesita MÁS espacio para respirar (menos info simultánea)

```
Desktop padding: 24px (6 = 1.5rem)
Mobile padding: 16px (4 = 1rem)

Desktop gaps: 8px
Mobile gaps: 12px
```

**Implementado:**
```typescript
spacing: {
  widget: 'p-4 sm:p-3',     // Mobile: 16px, Desktop: 12px
  card: 'p-3 sm:p-2.5',     // Mobile: 12px, Desktop: 10px
}
```

---

## 🎨 Layouts Específicos Mobile

### 1. Bottom Sheets vs Modals

**Desktop:** Dialog centrado (tiene espacio)
**Mobile:** Bottom sheet (pulgar alcanza bottom, no center)

```tsx
// ❌ MALO: Dialog centrado en mobile
<Dialog>
  <DialogContent className="top-1/2"> {/* Usuario no alcanza */}
</Dialog>

// ✅ BUENO: Bottom sheet en mobile
<BottomSheet>
  <SheetContent className="bottom-0"> {/* Pulgar alcanza */}
</BottomSheet>
```

**Características Bottom Sheet:**
- Slide desde abajo
- Handle visual para arrastrar
- Backdrop semi-transparente
- Swipe-to-dismiss
- Snappoints (partial, full)
- Safe area aware (notch)

### 2. Navigation Patterns

**Desktop:** Sidebar vertical (siempre visible)
**Mobile:** Bottom navigation (zona del pulgar)

**Thumb Zone (zona alcanzable con pulgar):**
```
┌─────────────┐
│ Hard reach  │ ← Top: difícil alcanzar
│             │
│ Natural     │ ← Middle: alcanzable
│             │
│ Easy reach  │ ← Bottom: fácil alcanzar ✅
└─────────────┘
```

**Consecuencia:**
- Acciones principales → Bottom
- Navegación → Bottom nav
- Acciones secundarias → Top
- Contenido → Scroll

### 3. Forms en Mobile

**Problemas desktop adaptado:**
- Labels a la izquierda (desperdicia espacio horizontal)
- Campos pequeños
- Keyboard cubre campos
- No autocomplete optimizado

**Solución mobile nativa:**
```tsx
// ✅ Labels arriba (stack vertical)
<div className="flex flex-col gap-2">
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"           // ← Keyboard optimizado
    inputMode="email"      // ← Teclado email
    autoComplete="email"   // ← Autocompletar
    className="h-11"       // ← 44px touch target
  />
</div>

// Scroll automático al focus
input:focus → scroll into view
```

**InputMode para keyboards optimizados:**
```tsx
<Input type="tel" inputMode="tel" />       // Teclado numérico
<Input type="email" inputMode="email" />   // @ y .com
<Input type="text" inputMode="numeric" />  // Solo números
<Input type="search" inputMode="search" /> // Con "buscar"
```

---

## ⚡ Performance Mobile

### 1. Animaciones

**60 FPS obligatorio** (mobile tiene menos potencia que desktop)

**Propiedades que no causan reflow:**
- ✅ `transform` (translate, scale, rotate)
- ✅ `opacity`
- ❌ `width`, `height` (causan reflow)
- ❌ `top`, `left` (causan reflow)

```css
/* ✅ BUENO: Transform es GPU-accelerated */
.slide-in {
  transform: translateY(100%);
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ❌ MALO: Top causa reflow */
.slide-in {
  top: 100%;
  transition: top 300ms;
}
```

**Duración de animaciones mobile:**
- Micro-interactions: 150-200ms
- Sheet open/close: 250-300ms
- Page transitions: 300-400ms
- Never > 500ms (se siente lento)

### 2. Loading States

**Desktop:** Puede mostrar skeletons elaborados
**Mobile:** Debe priorizar velocidad percibida

```tsx
// ✅ BUENO: Loading optimista
<Button onClick={async () => {
  setLoading(true)           // UI responde inmediatamente
  hapticFeedback('light')    // Feedback inmediato
  await actualAction()       // Luego la acción real
  setLoading(false)
}}>
```

**Skeleton screens:**
```tsx
// Mobile: Simples, rápidos de renderizar
<div className="h-11 bg-gray-200 rounded-md animate-pulse" />

// Desktop: Pueden ser más elaborados
<div className="space-y-3">
  <div className="h-4 bg-gray-200 rounded w-3/4" />
  <div className="h-4 bg-gray-200 rounded w-1/2" />
</div>
```

---

## 📲 Contexto de Uso Mobile

### 1. Una Mano vs Dos Manos

**Estadística:** 75% de usuarios usan móvil con una mano

**Implicaciones diseño:**
- Botones principales → Bottom (alcanzable con pulgar)
- Acciones secundarias → Top menu
- Content → Middle (scroll)
- FAB → Bottom right (pulgar derecho)

### 2. Distracciones

**Desktop:** Usuario enfocado, sin interrupciones
**Mobile:** Usuario multitarea, interrupciones constantes

**Consecuencias:**
- **Guardar estado:** Si app va a background, guardar progreso
- **Confirmaciones:** Acciones destructivas necesitan confirm
- **Timeouts:** Más largos que desktop (usuario puede estar distraído)
- **Shortcuts:** Más prominentes (usuario quiere tareas rápidas)

### 3. Conectividad

**Desktop:** WiFi estable
**Mobile:** 4G/5G inestable, puede cambiar a 3G/2G

**Estrategias:**
- **Offline first:** App debe funcionar sin internet
- **Optimistic UI:** Mostrar cambios antes de confirmar server
- **Retry logic:** Reintentar requests fallidos
- **Cache aggressive:** Cachear todo lo posible

---

## 🎯 Decisiones de Diseño por Componente

### Bottom Navigation

**¿Por qué bottom nav en vez de hamburger menu?**
- ✅ Alcanzable con pulgar (thumb zone)
- ✅ Navegación visible siempre (no escondida)
- ✅ 1 tap vs 2 taps (hamburger = tap menu + tap item)
- ✅ Menos cognitive load (ves opciones)

**Número de items:**
- Óptimo: 4-5 items
- Máximo: 5 items (iOS HIG)
- Si más: usar tab bar scrollable (Android) o priorizar

**¿Iconos + texto o solo iconos?**
- ✅ Iconos + texto (mejor reconocimiento)
- ❌ Solo iconos (requiere aprendizaje)

### Bottom Sheets

**¿Por qué no modals centrados?**
- ✅ Más natural en mobile (swipe gesture)
- ✅ Pulgar alcanza contenido
- ✅ Menos sorpresivo (viene desde donde tocaste)
- ✅ Mantiene contexto (ves app detrás)

**Snap points:**
```
Collapsed: 20% (peek)
Half: 50% (contenido resumido)
Full: 90% (contenido completo, respeta safe area)
```

### Widgets Mobile

**Desktop:** Puede mostrar múltiples métricas simultáneas
**Mobile:** Priorizar UNA métrica principal

**Ejemplo Fichaje:**
```
Desktop:
- Estado
- Cronómetro
- Horas hechas
- Horas restantes
- Anillo de progreso
- 3 botones

Mobile:
- Cronómetro (principal) ← FOCO
- Estado (secondary)
- 2 botones máximo
```

---

## ✅ Checklist de UX Mobile

Antes de lanzar un componente mobile, verificar:

**Touch & Interacción:**
- [ ] Touch targets ≥ 44px
- [ ] Spacing entre elementos ≥ 8px
- [ ] Active states visibles
- [ ] Haptic feedback en acciones importantes
- [ ] Loading states optimistas

**Visual:**
- [ ] Texto ≥ 14px para lectura
- [ ] Contraste ≥ 4.5:1 (mejor 7:1)
- [ ] Elementos importantes en thumb zone
- [ ] Safe area respetada (notch)

**Forms:**
- [ ] Labels verticales (no horizontales)
- [ ] InputMode optimizado
- [ ] AutoComplete configurado
- [ ] Keyboard no cubre campos
- [ ] Validación inline

**Navigation:**
- [ ] Bottom nav en vez de sidebar
- [ ] Bottom sheets en vez de modals
- [ ] Swipe gestures implementados
- [ ] Back button funciona

**Performance:**
- [ ] Animaciones ≤ 300ms
- [ ] Solo transform/opacity animados
- [ ] Code splitting por viewport
- [ ] Lazy loading de imágenes

**Context:**
- [ ] Funciona offline
- [ ] Guarda estado al background
- [ ] Retry automático en errores red
- [ ] Timeouts apropiados

---

## 📚 Referencias

**Guías de diseño consultadas:**
- Apple Human Interface Guidelines (iOS)
- Material Design 3 (Android)
- WCAG 2.1 Level AA
- Linear (mobile app)
- Notion (mobile app)
- Slack (mobile app)

**Métricas objetivo:**
- Touch compliance: 100%
- Contraste mínimo: 7:1 (AAA)
- Animaciones: < 300ms
- First Input Delay: < 100ms
- Tiempo de respuesta percibido: < 50ms

---

**Última actualización:** 18 Noviembre 2025
**Próxima revisión:** Después de testing con usuarios reales
