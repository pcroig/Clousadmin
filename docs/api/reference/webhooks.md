# Webhooks en Clousadmin API

## Índice
- [Descripción General](#descripción-general)
- [Webhook de Stripe](#webhook-de-stripe)
- [Webhook de Google Calendar](#webhook-de-google-calendar)
- [Seguridad y Verificación](#seguridad-y-verificación)
- [Troubleshooting](#troubleshooting)
- [Mejores Prácticas](#mejores-prácticas)

---

## Descripción General

Clousadmin utiliza webhooks para recibir notificaciones en tiempo real de servicios externos como Stripe (facturación) y Google Calendar (sincronización de eventos).

**Características:**
- Procesamiento asíncrono de eventos
- Verificación de firmas para seguridad
- Manejo de reintentos automáticos
- Logging detallado para debugging

**URLs de Webhooks:**

| Servicio | URL | Método |
|----------|-----|--------|
| Stripe | `https://tu-dominio.com/api/webhooks/stripe` | POST |
| Google Calendar | `https://tu-dominio.com/api/integrations/calendar/webhook` | POST |

---

## Webhook de Stripe

### Descripción

Recibe notificaciones de eventos relacionados con facturación, suscripciones, pagos y productos de Stripe.

**Endpoint:** `POST /api/webhooks/stripe`

**Autenticación:** Firma en header `stripe-signature`

---

### Configuración en Stripe Dashboard

#### Paso 1: Acceder a Webhooks

1. Inicia sesión en [Stripe Dashboard](https://dashboard.stripe.com)
2. Ve a **Developers** > **Webhooks**
3. Click en **Add endpoint**

#### Paso 2: Configurar Endpoint

**URL del endpoint:**
```
https://tu-dominio.com/api/webhooks/stripe
```

Para testing local con Stripe CLI:
```
http://localhost:3000/api/webhooks/stripe
```

**Descripción (opcional):**
```
Clousadmin webhook para eventos de facturación
```

#### Paso 3: Seleccionar Eventos

Selecciona los siguientes eventos a escuchar:

**Productos y Precios:**
- `product.created` - Nuevo producto creado
- `product.updated` - Producto actualizado
- `product.deleted` - Producto eliminado
- `price.created` - Nuevo precio creado
- `price.updated` - Precio actualizado
- `price.deleted` - Precio eliminado

**Clientes:**
- `customer.created` - Nuevo cliente
- `customer.updated` - Cliente actualizado
- `customer.deleted` - Cliente eliminado

**Suscripciones:**
- `customer.subscription.created` - Nueva suscripción
- `customer.subscription.updated` - Suscripción actualizada
- `customer.subscription.deleted` - Suscripción cancelada

**Pagos:**
- `checkout.session.completed` - Checkout completado
- `invoice.paid` - Factura pagada
- `invoice.payment_failed` - Pago fallido

#### Paso 4: Obtener Signing Secret

1. Una vez creado el endpoint, verás un **Signing secret**
2. Copia este secret (comienza con `whsec_`)
3. Añádelo a tu archivo `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Paso 5: Testing con Stripe CLI (Desarrollo)

Para desarrollo local, usa Stripe CLI:

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Escuchar eventos y reenviarlos a local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Esto mostrará tu webhook secret, añádelo a .env
# > Ready! Your webhook signing secret is whsec_...
```

---

### Eventos Manejados

#### 1. Eventos de Productos

##### product.created / product.updated

Se dispara cuando se crea o actualiza un producto en Stripe.

**Payload de ejemplo:**
```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "product.created",
  "data": {
    "object": {
      "id": "prod_ABC123",
      "object": "product",
      "name": "Plan Premium",
      "description": "Plan premium con todas las funcionalidades",
      "active": true,
      "metadata": {
        "max_employees": "50",
        "features": "all"
      },
      "created": 1732473600
    }
  }
}
```

**Acción en Clousadmin:**
- Se crea/actualiza el producto en la base de datos local
- Se sincronizan metadata y características
- Se actualiza el catálogo de planes disponibles

---

##### product.deleted

Se dispara cuando se elimina un producto.

**Acción en Clousadmin:**
- Se marca el producto como inactivo (soft delete)
- Se notifica a clientes que tengan este plan
- Se previene nueva creación de suscripciones con este producto

---

#### 2. Eventos de Precios

##### price.created / price.updated

Se dispara cuando se crea o actualiza un precio.

**Payload de ejemplo:**
```json
{
  "id": "evt_1234567890",
  "type": "price.created",
  "data": {
    "object": {
      "id": "price_ABC123",
      "object": "price",
      "product": "prod_ABC123",
      "unit_amount": 4900,
      "currency": "eur",
      "recurring": {
        "interval": "month",
        "interval_count": 1
      },
      "metadata": {}
    }
  }
}
```

**Acción en Clousadmin:**
- Se crea/actualiza el precio en la base de datos
- Se actualiza la información de facturación
- Se recalculan costos para clientes actuales si aplica

---

#### 3. Eventos de Clientes

##### customer.created / customer.updated

Se dispara cuando se crea o actualiza un cliente de Stripe.

**Payload de ejemplo:**
```json
{
  "id": "evt_1234567890",
  "type": "customer.created",
  "data": {
    "object": {
      "id": "cus_ABC123",
      "object": "customer",
      "email": "empresa@ejemplo.com",
      "name": "Empresa SA",
      "metadata": {
        "empresaId": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  }
}
```

**Acción en Clousadmin:**
- Se vincula el ID de Stripe con la empresa en Clousadmin
- Se actualiza información de facturación
- Se sincronizan emails y datos de contacto

---

#### 4. Eventos de Suscripciones

##### customer.subscription.created

Se dispara cuando un cliente se suscribe a un plan.

**Payload de ejemplo:**
```json
{
  "id": "evt_1234567890",
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_ABC123",
      "object": "subscription",
      "customer": "cus_ABC123",
      "status": "active",
      "items": {
        "data": [{
          "price": {
            "id": "price_ABC123",
            "product": "prod_ABC123"
          },
          "quantity": 1
        }]
      },
      "current_period_start": 1732473600,
      "current_period_end": 1735065600,
      "cancel_at_period_end": false
    }
  }
}
```

**Acción en Clousadmin:**
- Se activa el plan para la empresa
- Se desbloquean funcionalidades del plan
- Se actualiza límite de empleados según plan
- Se envía email de bienvenida al plan

---

##### customer.subscription.updated

Se dispara cuando se modifica una suscripción (cambio de plan, renovación, etc.).

**Acción en Clousadmin:**
- Se actualiza el plan activo
- Se ajustan límites y funcionalidades
- Se recalcula facturación prorrateada si aplica
- Se notifica a la empresa del cambio

---

##### customer.subscription.deleted

Se dispara cuando se cancela una suscripción.

**Acción en Clousadmin:**
- Se desactiva el plan premium
- Se cambia a plan gratuito o se bloquea acceso
- Se notifica a la empresa de la cancelación
- Se programan recordatorios de renovación

---

#### 5. Eventos de Checkout

##### checkout.session.completed

Se dispara cuando un cliente completa el proceso de checkout.

**Payload de ejemplo:**
```json
{
  "id": "evt_1234567890",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_ABC123",
      "object": "checkout.session",
      "customer": "cus_ABC123",
      "subscription": "sub_ABC123",
      "payment_status": "paid",
      "amount_total": 4900,
      "currency": "eur",
      "metadata": {
        "empresaId": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  }
}
```

**Acción en Clousadmin:**
- Se confirma el pago exitoso
- Se activa inmediatamente el plan
- Se envía email de confirmación con factura
- Se registra la transacción en el historial

---

#### 6. Eventos de Facturas

##### invoice.paid

Se dispara cuando se paga una factura (renovación, etc.).

**Payload de ejemplo:**
```json
{
  "id": "evt_1234567890",
  "type": "invoice.paid",
  "data": {
    "object": {
      "id": "in_ABC123",
      "object": "invoice",
      "customer": "cus_ABC123",
      "subscription": "sub_ABC123",
      "amount_paid": 4900,
      "currency": "eur",
      "status": "paid",
      "invoice_pdf": "https://invoice.stripe.com/...",
      "hosted_invoice_url": "https://invoice.stripe.com/..."
    }
  }
}
```

**Acción en Clousadmin:**
- Se registra el pago
- Se extiende período de suscripción
- Se envía email con factura PDF
- Se actualiza historial de pagos

---

##### invoice.payment_failed

Se dispara cuando falla un pago (tarjeta rechazada, fondos insuficientes, etc.).

**Payload de ejemplo:**
```json
{
  "id": "evt_1234567890",
  "type": "invoice.payment_failed",
  "data": {
    "object": {
      "id": "in_ABC123",
      "object": "invoice",
      "customer": "cus_ABC123",
      "subscription": "sub_ABC123",
      "amount_due": 4900,
      "attempt_count": 1,
      "next_payment_attempt": 1732560000,
      "last_finalization_error": {
        "message": "Your card was declined."
      }
    }
  }
}
```

**Acción en Clousadmin:**
- Se marca la factura como impagada
- Se envía email de notificación urgente
- Se muestra banner de pago pendiente en dashboard
- Se programa retry automático según configuración de Stripe
- Se bloquea acceso si se agotan intentos

---

### Formato de Respuesta del Webhook

El webhook siempre responde con 200 OK, incluso si hay errores internos, para evitar que Stripe reintente indefinidamente.

**Respuesta exitosa:**
```json
{
  "received": true
}
```

**Respuesta con error (también 200 OK):**
```json
{
  "received": true,
  "error": "Error procesando evento: ..."
}
```

---

### Ejemplo de Implementación (Código Real)

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    // Verificar firma de Stripe
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  console.log(`Received event: ${event.type}`);

  try {
    // Manejar eventos
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    // Retornar 200 de todos modos para evitar reintentos
    return NextResponse.json({ received: true, error: error.message });
  }
}
```

---

## Webhook de Google Calendar

### Descripción

Recibe notificaciones cuando hay cambios en calendarios de Google Calendar sincronizados con ausencias en Clousadmin.

**Endpoint:** `POST /api/integrations/calendar/webhook`

**Autenticación:** Headers de Google Calendar (x-goog-channel-id, x-goog-resource-id)

---

### Configuración de Google Calendar Push Notifications

#### Paso 1: Configurar OAuth2

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea o selecciona un proyecto
3. Habilita la API de Google Calendar
4. Crea credenciales OAuth 2.0
5. Añade el callback URL: `https://tu-dominio.com/api/integrations/calendar/callback`

#### Paso 2: Registrar Canal de Notificaciones

Se registra automáticamente cuando un usuario conecta su calendario, pero el código es:

```typescript
import { google } from 'googleapis';

async function watchCalendar(calendarId: string, accessToken: string) {
  const calendar = google.calendar({ version: 'v3' });

  const watchResponse = await calendar.events.watch({
    calendarId: calendarId,
    requestBody: {
      id: generateChannelId(), // UUID único
      type: 'web_hook',
      address: 'https://tu-dominio.com/api/integrations/calendar/webhook',
      expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
    },
    auth: accessToken,
  });

  return watchResponse.data;
}
```

**Importante:**
- Los canales expiran (max 7 días para calendarios)
- Debes renovarlos periódicamente
- Guarda el `resourceId` y `channelId` para poder cancelar el watch

---

### Headers de Notificación

Google Calendar envía estos headers en cada notificación:

| Header | Descripción |
|--------|-------------|
| `x-goog-channel-id` | ID del canal (UUID que proporcionaste) |
| `x-goog-resource-id` | ID del recurso (calendario) siendo observado |
| `x-goog-resource-state` | Estado del recurso: `sync`, `exists`, `not_exists`, `update` |
| `x-goog-resource-uri` | URI del recurso |
| `x-goog-message-number` | Número secuencial del mensaje |

---

### Estados del Recurso

#### sync

Se envía inmediatamente después de registrar el watch. Confirma que el canal está activo.

**Acción en Clousadmin:**
- Log de confirmación
- No se hace nada más

---

#### exists / update

Se envía cuando hay cambios en eventos del calendario.

**Acción en Clousadmin:**
1. Obtiene la lista de eventos recientes
2. Compara con ausencias sincronizadas
3. Detecta cambios:
   - Evento eliminado → Cancelar ausencia
   - Evento modificado → Actualizar ausencia
   - Evento nuevo → Crear ausencia
4. Procesa cambios en background
5. Notifica al empleado si aplica

---

#### not_exists

Se envía cuando el recurso ya no existe (calendario eliminado).

**Acción en Clousadmin:**
- Desactiva la sincronización
- Notifica al usuario que debe reconectar
- Limpia webhooks asociados

---

### Ejemplo de Payload

Google Calendar NO envía datos en el body del webhook, solo headers:

```bash
POST /api/integrations/calendar/webhook
x-goog-channel-id: 550e8400-e29b-41d4-a716-446655440000
x-goog-resource-id: abc123-resource-id
x-goog-resource-state: update
x-goog-resource-uri: https://www.googleapis.com/calendar/v3/calendars/primary/events
x-goog-message-number: 42
```

**Body:**
```
(vacío)
```

Cuando recibes la notificación, debes hacer una petición GET a la API de Google Calendar para obtener los eventos actualizados.

---

### Ejemplo de Implementación

```typescript
// app/api/integrations/calendar/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const channelId = req.headers.get('x-goog-channel-id');
  const resourceId = req.headers.get('x-goog-resource-id');
  const state = req.headers.get('x-goog-resource-state');

  if (!channelId || !resourceId || !state) {
    return NextResponse.json(
      { error: 'Missing required headers' },
      { status: 400 }
    );
  }

  console.log(`Calendar webhook: channel=${channelId}, state=${state}`);

  // Evento sync: solo confirmar
  if (state === 'sync') {
    return new NextResponse('OK', { status: 200 });
  }

  try {
    // Buscar la integración de calendario
    const integration = await prisma.calendarIntegration.findUnique({
      where: { channelId },
      include: { empleado: true },
    });

    if (!integration) {
      console.error('Integration not found for channel:', channelId);
      return new NextResponse('OK', { status: 200 });
    }

    // Procesar cambios en background (no bloquear webhook)
    processCalendarChanges(integration).catch(err => {
      console.error('Error processing calendar changes:', err);
    });

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error handling calendar webhook:', error);
    return new NextResponse('OK', { status: 200 });
  }
}

async function processCalendarChanges(integration: any) {
  const calendar = google.calendar({ version: 'v3' });

  // Obtener eventos recientes
  const response = await calendar.events.list({
    calendarId: 'primary',
    auth: integration.accessToken,
    timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];

  // Procesar cada evento y sincronizar con ausencias
  for (const event of events) {
    await syncEventWithAusencia(event, integration.empleadoId);
  }
}
```

---

## Seguridad y Verificación

### Stripe: Verificación de Firma

Stripe firma todos los webhooks con tu webhook secret. **Siempre verifica la firma**:

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    // Esto lanza error si la firma no es válida
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Procesar evento...
}
```

---

### Google Calendar: Validación de Headers

Google Calendar no firma webhooks, pero envía headers únicos:

```typescript
export async function POST(req: NextRequest) {
  const channelId = req.headers.get('x-goog-channel-id');
  const resourceId = req.headers.get('x-goog-resource-id');

  // Verificar que el channel ID existe en tu DB
  const integration = await prisma.calendarIntegration.findUnique({
    where: { channelId },
  });

  if (!integration) {
    // Channel ID no reconocido - posible ataque
    return NextResponse.json({ error: 'Unknown channel' }, { status: 404 });
  }

  // Verificar que el resourceId coincide
  if (integration.resourceId !== resourceId) {
    return NextResponse.json({ error: 'Resource mismatch' }, { status: 400 });
  }

  // OK, procesar webhook
}
```

---

## Troubleshooting

### Stripe

#### Error: "No signatures found matching the expected signature"

**Causa:** El webhook secret es incorrecto o el body fue modificado.

**Solución:**
1. Verifica que `STRIPE_WEBHOOK_SECRET` sea correcto
2. Asegúrate de usar `await req.text()` (no `req.json()`)
3. No modifiques el body antes de verificar firma

---

#### Error: "Webhook endpoint returned unexpected status"

**Causa:** Tu endpoint respondió con status diferente a 200.

**Solución:**
- Siempre retorna 200 OK, incluso si hay error interno
- Loggea errores pero no los propagues al webhook

```typescript
try {
  // Procesar evento
} catch (error) {
  console.error('Error:', error);
  // Retornar 200 de todos modos
  return NextResponse.json({ received: true, error: error.message });
}
```

---

#### Eventos duplicados

**Causa:** Stripe reintenta si no recibe 200 rápidamente.

**Solución:**
- Implementa idempotencia usando `event.id`
- Procesa en background si la operación es lenta

```typescript
// Guardar event ID procesado
await prisma.processedWebhookEvent.create({
  data: {
    eventId: event.id,
    type: event.type,
    processedAt: new Date(),
  },
});

// Al procesar, verificar si ya se procesó
const alreadyProcessed = await prisma.processedWebhookEvent.findUnique({
  where: { eventId: event.id },
});

if (alreadyProcessed) {
  console.log('Event already processed, skipping');
  return NextResponse.json({ received: true });
}
```

---

### Google Calendar

#### No se reciben notificaciones

**Causas posibles:**
1. Canal expirado (max 7 días)
2. URL del webhook incorrecta
3. Certificado SSL inválido

**Solución:**
- Implementa renovación automática de canales cada 6 días
- Verifica que tu dominio tenga HTTPS válido
- Revisa logs de Google Cloud Console

---

#### Notificaciones muy frecuentes

**Causa:** Google envía notificación por cada cambio, incluso pequeños.

**Solución:**
- Implementa debouncing (esperar 1-2 segundos antes de procesar)
- Cachea eventos para evitar peticiones repetidas a Google API

```typescript
const lastSync = new Map<string, number>();

async function shouldProcessWebhook(channelId: string): Promise<boolean> {
  const last = lastSync.get(channelId);
  const now = Date.now();

  if (last && now - last < 2000) {
    // Menos de 2 segundos desde último, skip
    return false;
  }

  lastSync.set(channelId, now);
  return true;
}
```

---

## Mejores Prácticas

### 1. Procesa en Background

No bloquees el webhook haciendo operaciones lentas:

```typescript
export async function POST(req: NextRequest) {
  // Validar y parsear
  const event = await validateWebhook(req);

  // Encolar para procesamiento asíncrono
  await queueJob('process-webhook', { eventId: event.id });

  // Responder inmediatamente
  return NextResponse.json({ received: true });
}
```

---

### 2. Implementa Idempotencia

Usa IDs únicos para evitar procesar eventos duplicados:

```typescript
const eventId = event.id;

// Verificar si ya se procesó
const exists = await prisma.webhookEvent.findUnique({
  where: { eventId },
});

if (exists) {
  return NextResponse.json({ received: true, duplicate: true });
}

// Marcar como procesado
await prisma.webhookEvent.create({
  data: { eventId, type: event.type, processedAt: new Date() },
});

// Procesar...
```

---

### 3. Loggea Todo

Mantén logs detallados para debugging:

```typescript
console.log({
  timestamp: new Date().toISOString(),
  eventId: event.id,
  eventType: event.type,
  customerId: event.data.object.customer,
});
```

---

### 4. Maneja Errores Gracefully

No dejes que un error rompa todo:

```typescript
try {
  await processEvent(event);
} catch (error) {
  console.error('Error processing event:', error);

  // Enviar a servicio de monitoring
  Sentry.captureException(error, {
    extra: { eventId: event.id, eventType: event.type },
  });

  // Retornar success de todos modos
  return NextResponse.json({ received: true, error: error.message });
}
```

---

### 5. Monitorea Webhooks

Usa herramientas de monitoring:

- **Stripe Dashboard** > Webhooks > Ver intentos y respuestas
- **Google Cloud Console** > APIs > Calendar API > Metrics
- **Sentry/Datadog** > Alertas en errores de webhook

---

## Testing

### Stripe CLI

```bash
# Enviar evento de prueba
stripe trigger customer.subscription.created

# Ver logs en tiempo real
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Enviar evento custom
stripe events resend evt_1234567890
```

---

### cURL Manual

```bash
# Stripe (no funcionará sin firma válida)
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: ..." \
  -d @stripe-event.json

# Google Calendar
curl -X POST http://localhost:3000/api/integrations/calendar/webhook \
  -H "x-goog-channel-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-goog-resource-id: abc123" \
  -H "x-goog-resource-state: update"
```

---

## Recursos Adicionales

- [Stripe Webhooks Docs](https://stripe.com/docs/webhooks)
- [Google Calendar Push Notifications](https://developers.google.com/calendar/api/guides/push)
- [Documentación Principal de API](../README.md)
- [Ver todos los endpoints](/api-docs)
