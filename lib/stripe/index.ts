/**
 * Stripe Integration
 *
 * Exporta toda la funcionalidad de Stripe para uso en la aplicación.
 *
 * Uso:
 * ```ts
 * import { BILLING_ENABLED, getActiveProducts, createCheckoutSession } from '@/lib/stripe';
 * ```
 */

// Configuración y feature flags
export {
  BILLING_ENABLED,
  STRIPE_PUBLISHABLE_KEY,
  APP_URL,
  DEFAULT_TRIAL_DAYS,
  PLAN_TYPES,
  PLAN_LIMITS,
  isStripeConfigured,
  isBillingReady,
  type PlanType,
} from './config';

// Cliente de Stripe (solo servidor)
export { getStripe, canInitializeStripe } from './client';

// Gestión de suscripciones
export {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  getActiveSubscription,
  hasActiveSubscription,
  getSubscriptionStatus,
  cancelSubscriptionAtPeriodEnd,
  reactivateSubscription,
  mapStripeStatusToPrisma,
} from './subscriptions';

// Gestión de productos y precios
export {
  getActiveProducts,
  getProductById,
  getPriceById,
  formatPrice,
  getMonthlyEquivalent,
  calculateAnnualSavings,
  type ProductWithPrices,
} from './products';

// Tipos
export * from './types';
