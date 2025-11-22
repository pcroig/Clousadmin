/**
 * Stripe Types
 *
 * Tipos TypeScript para la integración con Stripe.
 */

import { BillingInterval, SubscriptionStatus } from '@prisma/client';

// Re-exportar tipos de Prisma
export { BillingInterval, SubscriptionStatus };

/**
 * Información de suscripción para el frontend
 */
export interface SubscriptionInfo {
  hasSubscription: boolean;
  status: SubscriptionStatus | null;
  plan: {
    id: string;
    nombre: string;
    descripcion: string | null;
    features: string[];
  } | null;
  price: {
    id: string;
    unitAmount: number;
    currency: string;
    intervalo: BillingInterval;
  } | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  isTrialing: boolean;
  trialEnd: Date | null;
}

/**
 * Producto para mostrar en pricing page
 */
export interface PricingProduct {
  id: string;
  nombre: string;
  descripcion: string | null;
  features: string[];
  destacado?: boolean;
  precios: PricingPrice[];
}

/**
 * Precio para mostrar en pricing page
 */
export interface PricingPrice {
  id: string;
  amount: number;
  currency: string;
  interval: BillingInterval;
  trialDays: number | null;
  monthlyEquivalent?: number;
}

/**
 * Eventos de webhook de Stripe que manejamos
 */
export type StripeWebhookEvent =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'price.created'
  | 'price.updated'
  | 'price.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed';

/**
 * Respuesta de crear checkout session
 */
export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

/**
 * Respuesta de crear portal session
 */
export interface PortalSessionResponse {
  url: string;
}
