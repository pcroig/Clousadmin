/**
 * Stripe Subscriptions Management
 *
 * Helpers para gestionar suscripciones, checkout y portal del cliente.
 */

import { SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

import { prisma } from '@/lib/prisma';

import { getStripe } from './client';
import { APP_URL, DEFAULT_TRIAL_DAYS } from './config';

/**
 * Crea o recupera un cliente de Stripe para una empresa
 */
export async function getOrCreateStripeCustomer(
  empresaId: string,
  email: string,
  nombre?: string
): Promise<string> {
  const stripe = getStripe();

  // Verificar si ya existe un customer
  const existingCustomer = await prisma.billingCustomer.findUnique({
    where: { empresaId },
  });

  if (existingCustomer) {
    return existingCustomer.id;
  }

  // Crear customer en Stripe
  const customer = await stripe.customers.create({
    email,
    name: nombre || undefined,
    metadata: {
      empresaId,
    },
  });

  // Guardar en base de datos
  await prisma.billingCustomer.create({
    data: {
      id: customer.id,
      empresaId,
      email,
      nombre,
    },
  });

  return customer.id;
}

/**
 * Crea una sesión de Checkout para suscribirse a un plan
 */
export async function createCheckoutSession(params: {
  empresaId: string;
  priceId: string;
  email: string;
  nombreEmpresa?: string;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const { empresaId, priceId, email, nombreEmpresa, successUrl, cancelUrl } = params;

  // Obtener o crear customer
  const customerId = await getOrCreateStripeCustomer(empresaId, email, nombreEmpresa);

  // Obtener información del precio para determinar trial
  const price = await prisma.billingPrice.findUnique({
    where: { id: priceId },
  });

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: price?.trialDays || DEFAULT_TRIAL_DAYS,
      metadata: {
        empresaId,
      },
    },
    success_url: successUrl || `${APP_URL}/hr/settings/facturacion?success=true`,
    cancel_url: cancelUrl || `${APP_URL}/hr/settings/facturacion?canceled=true`,
    metadata: {
      empresaId,
    },
    // Localización para España
    locale: 'es',
    // Permitir códigos promocionales
    allow_promotion_codes: true,
    // Información de impuestos automática
    automatic_tax: { enabled: false }, // Habilitar si tienes Stripe Tax configurado
    // Datos de facturación
    billing_address_collection: 'required',
    // Información de la empresa
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
  });

  return session;
}

/**
 * Crea una sesión del Portal de Cliente de Stripe
 * Permite al cliente gestionar su suscripción, métodos de pago, etc.
 */
export async function createBillingPortalSession(
  empresaId: string,
  returnUrl?: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();

  // Obtener customer ID
  const customer = await prisma.billingCustomer.findUnique({
    where: { empresaId },
  });

  if (!customer) {
    throw new Error('No se encontró el cliente de facturación');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl || `${APP_URL}/hr/settings/facturacion`,
    locale: 'es',
  });

  return session;
}

/**
 * Obtiene la suscripción activa de una empresa
 */
export async function getActiveSubscription(empresaId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      empresaId,
      status: {
        in: ['active', 'trialing'],
      },
    },
    include: {
      price: {
        include: {
          producto: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return subscription;
}

/**
 * Verifica si una empresa tiene una suscripción activa
 */
export async function hasActiveSubscription(empresaId: string): Promise<boolean> {
  const subscription = await getActiveSubscription(empresaId);
  return !!subscription;
}

/**
 * Obtiene el estado de la suscripción con detalles
 */
export async function getSubscriptionStatus(empresaId: string) {
  const subscription = await getActiveSubscription(empresaId);

  if (!subscription) {
    return {
      hasSubscription: false,
      status: null,
      plan: null,
      price: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isTrialing: false,
      trialEnd: null,
    };
  }

  return {
    hasSubscription: true,
    status: subscription.status,
    plan: subscription.price.producto
      ? {
          id: subscription.price.producto.id,
          nombre: subscription.price.producto.nombre,
          descripcion: subscription.price.producto.descripcion,
          features: Array.isArray(subscription.price.producto.features)
            ? (subscription.price.producto.features as string[])
            : [],
        }
      : null,
    price: subscription.price
      ? {
          id: subscription.price.id,
          unitAmount: subscription.price.unitAmount,
          currency: subscription.price.currency,
          intervalo: subscription.price.intervalo,
        }
      : null,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    isTrialing: subscription.status === 'trialing',
    trialEnd: subscription.trialEnd,
  };
}

/**
 * Cancela una suscripción al final del periodo actual
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  // Actualizar en base de datos
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    },
  });

  return subscription;
}

/**
 * Reactiva una suscripción que estaba programada para cancelarse
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  // Actualizar en base de datos
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
  });

  return subscription;
}

/**
 * Mapea el estado de Stripe al enum de Prisma
 */
export function mapStripeStatusToPrisma(
  stripeStatus: Stripe.Subscription.Status
): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: 'active',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    past_due: 'past_due',
    trialing: 'trialing',
    unpaid: 'unpaid',
    paused: 'paused',
  };

  return statusMap[stripeStatus] || 'incomplete';
}
