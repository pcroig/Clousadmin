/**
 * Stripe Webhook Endpoint
 *
 * Recibe eventos de Stripe y sincroniza datos en la base de datos.
 * URL: /api/webhooks/stripe
 *
 * Configuración en Stripe Dashboard:
 * 1. Ve a Developers > Webhooks
 * 2. Añade endpoint: https://tu-dominio.com/api/webhooks/stripe
 * 3. Selecciona eventos: product.*, price.*, customer.*, customer.subscription.*
 * 4. Copia el signing secret a STRIPE_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { canInitializeStripe, getStripe } from '@/lib/stripe/client';
import { BILLING_ENABLED, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe/config';
import {
  handleCheckoutCompleted,
  handleCustomerChange,
  handleCustomerDeletion,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handlePriceChange,
  handlePriceDeletion,
  handleProductChange,
  handleProductDeletion,
  handleSubscriptionChange,
  handleSubscriptionDeletion,
} from '@/lib/stripe/webhook-handlers';

// Eventos que manejamos
const RELEVANT_EVENTS = new Set([
  'product.created',
  'product.updated',
  'product.deleted',
  'price.created',
  'price.updated',
  'price.deleted',
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
]);

export async function POST(request: NextRequest) {
  // Verificar si billing está habilitado
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: 'Billing disabled' }, { status: 404 });
  }

  // Verificar configuración de Stripe
  if (!canInitializeStripe() || !STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe no configurado correctamente');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  // Verificar si es un evento que manejamos
  if (!RELEVANT_EVENTS.has(event.type)) {
    console.log('Evento ignorado:', event.type);
    return NextResponse.json({ received: true });
  }

  console.log('Procesando evento:', event.type);

  try {
    switch (event.type) {
      // Productos
      case 'product.created':
      case 'product.updated':
        await handleProductChange(event.data.object as Stripe.Product);
        break;
      case 'product.deleted':
        await handleProductDeletion((event.data.object as Stripe.Product).id);
        break;

      // Precios
      case 'price.created':
      case 'price.updated':
        await handlePriceChange(event.data.object as Stripe.Price);
        break;
      case 'price.deleted':
        await handlePriceDeletion((event.data.object as Stripe.Price).id);
        break;

      // Customers
      case 'customer.created':
      case 'customer.updated':
        await handleCustomerChange(event.data.object as Stripe.Customer);
        break;
      case 'customer.deleted':
        await handleCustomerDeletion((event.data.object as Stripe.Customer).id);
        break;

      // Suscripciones
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeletion(event.data.object as Stripe.Subscription);
        break;

      // Checkout
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      // Facturas
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error procesando webhook:', errorMessage);
    // Retornamos 200 para que Stripe no reintente (el error está de nuestro lado)
    return NextResponse.json({ error: errorMessage }, { status: 200 });
  }
}
