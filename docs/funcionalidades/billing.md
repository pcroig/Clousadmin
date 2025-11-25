# 💳 Billing & Pasarela de Pago (Stripe)

**Estado**: Beta interna (visible solo si `NEXT_PUBLIC_BILLING_ENABLED=true`)  
**Componentes**: UI de facturación, APIs de checkout/portal, webhooks Stripe, sincronización Prisma

---

## 🎯 Objetivos

- Ofrecer alta/baja de suscripciones directamente desde Clousadmin.
- Mantener sincronizados productos, precios, clientes y suscripciones de Stripe en nuestra BD.
- Garantizar seguridad y trazabilidad (feature flag + validaciones de rol HR Admin).

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_BILLING_ENABLED` | Feature flag para mostrar/ocultar toda la UI |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave pública para el cliente (plan-selection, pricing) |
| `STRIPE_SECRET_KEY` | Clave secreta usada en el servidor (`lib/stripe/client.ts`) |
| `STRIPE_WEBHOOK_SECRET` | Firma usada por `/api/webhooks/stripe` |
| `NEXT_PUBLIC_APP_URL` | Se usa para `success_url` y `cancel_url` |

> Usa `.env.example` como referencia. Sin `STRIPE_SECRET_KEY` el cliente no se inicializa (`getStripe()` lanza error controlado).

### Feature Flag

- `BILLING_ENABLED` se calcula en `lib/stripe/config.ts`.
- Todas las páginas y APIs de facturación retornan 404 si el flag está deshabilitado.

---

## 🧱 Arquitectura

```
app/(dashboard)/hr/settings/facturacion/
├── page.tsx             # Server Component → billing-client
├── billing-client.tsx   # UI principal (pricing, estado plan, CTA portal)
├── billing-loading.tsx  # Skeleton

lib/stripe/
├── config.ts            # Flags, claves y planes
├── client.ts            # Singleton Stripe
├── products.ts          # Sincronización de productos/precios
├── subscriptions.ts     # Checkout, portal, estado
├── webhook-handlers.ts  # Handlers atómicos por evento

app/api/billing/
├── products/route.ts    # Lista planes activos (cacheable)
├── checkout/route.ts    # Crea sesión de checkout (POST)
├── portal/route.ts      # Crea sesión de Customer Portal (POST)
├── subscription/route.ts# Estado actual del plan

app/api/webhooks/stripe/route.ts  # Entrada única de eventos
```

### Modelos Prisma relacionados

- `BillingProduct`, `BillingPrice`, `BillingCustomer`, `Subscription`.
- Migración ya aplicada en `prisma/schema.prisma`.

---

## 🔌 APIs & Flujos

### 1. Obtener planes disponibles
`GET /api/billing/products`

- Usa `lib/stripe/products.ts` para leer `BillingProduct` + `BillingPrice`.
- Se puede cachear con `revalidateTag('billing-products')`.

### 2. Crear sesión de checkout
`POST /api/billing/checkout`

- Body: `{ priceId: string }`
- Requiere sesión HR Admin / Platform Admin (`getSession()`).
- Crea (o reutiliza) `billingCustomer`, genera `stripe.checkout.sessions.create`.
- Respuesta: `{ sessionId, url }`.

### 3. Acceder al portal del cliente
`POST /api/billing/portal`

- Reutiliza el customer guardado y crea una sesión del Customer Portal.
- Permite a HR actualizar método de pago, facturas, cancelaciones.

### 4. Leer estado de suscripción
`GET /api/billing/subscription`

- Devuelve `hasSubscription`, plan actual, fechas y flags (`cancelAtPeriodEnd`, `isTrialing`).

---

## 🔁 Webhooks

Endpoint: `POST /api/webhooks/stripe`

1. Verifica feature flag y configuración (`canInitializeStripe` + `STRIPE_WEBHOOK_SECRET`).
2. Comprueba `stripe-signature` y construye el evento.
3. Ignora eventos no listados en `RELEVANT_EVENTS`.
4. Redirige al handler correspondiente:
   - Productos/Precios → sincroniza catálogos (`handleProductChange`, `handlePriceChange`).
   - Customers → mantiene `billingCustomer`.
   - Subscriptions → `handleSubscriptionChange` actualiza `subscription` y estado agregado.
   - Checkout completado → enlaza la session y crea la suscripción final.
   - Invoice paid / payment_failed → métricas + alertas futuras.

> Si falla el procesamiento devolvemos 200 para que Stripe no reintente infinitamente (el handler guarda logs con contexto).

---

## 🖥️ UI de Facturación

- **Ruta**: `/hr/settings/facturacion`
- **Acceso**: Visible en Settings → Facturación (solo HR Admin, requiere `BILLING_ENABLED=true`)
- Componentes:
  - `billing-client.tsx`: UI principal con estado de suscripción, planes disponibles y portal de gestión
  - Estado actual: muestra plan activo, límite de empleados, CTA "Gestionar suscripción" (Customer Portal)
  - Catálogo de planes: grid responsive con badges, precios mensuales/anuales y features
- Mobile-first mediante `ResponsiveContainer`

---

## ✅ Checklist de Calidad

- [x] Feature flag global (nada de billing se renderiza si está off).
- [x] Roles verificados server-side (solo HR Admin / Platform Admin).
- [x] Configuración centralizada (`lib/stripe/config.ts`).
- [x] Capa de sincronización a BD mediante webhooks idempotentes.
- [x] Sin secretos expuestos en el cliente (solo publishable key).
- [x] Manejo de errores consistente (`NextResponse.json({ error }, { status })`).

---

## 🔜 Próximos pasos

- Métricas de uso y facturación dentro del dashboard.
- Límite dinámico de empleados según `PLAN_LIMITS`.
- Automatizar downgrade cuando se exceden límites (gracia configurable).
- Reportes PDF de facturación mensual.


