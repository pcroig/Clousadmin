/**
 * Stripe Configuration
 *
 * Centraliza la configuración de Stripe y feature flags para billing.
 * Permite activar/desactivar pagos fácilmente.
 */

// Feature flag para activar/desactivar pagos
// Cuando esté en false, toda la UI de pagos está oculta
export const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';

// Stripe public key (usada en el cliente)
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Stripe secret key (solo servidor)
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// Stripe webhook secret
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// URL base de la app (para redirects)
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Configuración de planes por defecto
export const DEFAULT_TRIAL_DAYS = 14;

// Tipos de planes
export const PLAN_TYPES = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

export type PlanType = typeof PLAN_TYPES[keyof typeof PLAN_TYPES];

// Límites por plan (se pueden consultar desde metadata de Stripe)
export const PLAN_LIMITS = {
  [PLAN_TYPES.STARTER]: {
    maxEmpleados: 10,
    firmaDigital: false,
    integraciones: false,
    soportePrioritario: false,
  },
  [PLAN_TYPES.PROFESSIONAL]: {
    maxEmpleados: 50,
    firmaDigital: true,
    integraciones: true,
    soportePrioritario: false,
  },
  [PLAN_TYPES.ENTERPRISE]: {
    maxEmpleados: -1, // Sin límite
    firmaDigital: true,
    integraciones: true,
    soportePrioritario: true,
  },
} as const;

// Verificar si la configuración de Stripe está completa
export function isStripeConfigured(): boolean {
  return !!(STRIPE_SECRET_KEY && STRIPE_PUBLISHABLE_KEY);
}

// Verificar si billing está habilitado y configurado
export function isBillingReady(): boolean {
  return BILLING_ENABLED && isStripeConfigured();
}
