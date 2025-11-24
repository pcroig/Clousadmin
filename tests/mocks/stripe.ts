/**
 * Mock de Stripe para tests
 * Evita llamadas reales y cargos a tarjetas
 */

import { vi } from 'vitest';

// ========================================
// MOCK DATA
// ========================================

export const mockStripeCustomer = {
  id: 'cus_test123',
  object: 'customer',
  email: 'test@empresa.com',
  name: 'Empresa Test',
  metadata: {},
  created: Date.now(),
};

export const mockStripeProduct = {
  id: 'prod_test123',
  object: 'product',
  name: 'Plan Premium',
  description: 'Plan premium con todas las funcionalidades',
  active: true,
  metadata: {},
  created: Date.now(),
};

export const mockStripePrice = {
  id: 'price_test123',
  object: 'price',
  product: 'prod_test123',
  unit_amount: 4900, // 49.00 EUR
  currency: 'eur',
  recurring: {
    interval: 'month',
    interval_count: 1,
  },
  metadata: {},
  created: Date.now(),
};

export const mockStripeSubscription = {
  id: 'sub_test123',
  object: 'subscription',
  customer: 'cus_test123',
  status: 'active',
  items: {
    data: [
      {
        id: 'si_test123',
        price: mockStripePrice,
        quantity: 1,
      },
    ],
  },
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  cancel_at_period_end: false,
  metadata: {},
  created: Date.now(),
};

export const mockStripeCheckoutSession = {
  id: 'cs_test123',
  object: 'checkout.session',
  customer: 'cus_test123',
  subscription: 'sub_test123',
  payment_status: 'paid',
  amount_total: 4900,
  currency: 'eur',
  success_url: 'http://localhost:3000/success',
  cancel_url: 'http://localhost:3000/cancel',
  url: 'https://checkout.stripe.com/test',
  metadata: {},
};

export const mockStripeInvoice = {
  id: 'in_test123',
  object: 'invoice',
  customer: 'cus_test123',
  subscription: 'sub_test123',
  status: 'paid',
  amount_paid: 4900,
  amount_due: 0,
  currency: 'eur',
  hosted_invoice_url: 'https://invoice.stripe.com/test',
  invoice_pdf: 'https://invoice.stripe.com/test.pdf',
  metadata: {},
  created: Date.now(),
};

// ========================================
// MOCK STRIPE CLIENT
// ========================================

export const mockStripe = {
  customers: {
    create: vi.fn().mockResolvedValue(mockStripeCustomer),
    retrieve: vi.fn().mockResolvedValue(mockStripeCustomer),
    update: vi.fn().mockResolvedValue(mockStripeCustomer),
    del: vi.fn().mockResolvedValue({ id: 'cus_test123', deleted: true }),
  },

  products: {
    create: vi.fn().mockResolvedValue(mockStripeProduct),
    retrieve: vi.fn().mockResolvedValue(mockStripeProduct),
    update: vi.fn().mockResolvedValue(mockStripeProduct),
    list: vi.fn().mockResolvedValue({ data: [mockStripeProduct] }),
  },

  prices: {
    create: vi.fn().mockResolvedValue(mockStripePrice),
    retrieve: vi.fn().mockResolvedValue(mockStripePrice),
    list: vi.fn().mockResolvedValue({ data: [mockStripePrice] }),
  },

  subscriptions: {
    create: vi.fn().mockResolvedValue(mockStripeSubscription),
    retrieve: vi.fn().mockResolvedValue(mockStripeSubscription),
    update: vi.fn().mockResolvedValue(mockStripeSubscription),
    del: vi.fn().mockResolvedValue({ ...mockStripeSubscription, status: 'canceled' }),
    list: vi.fn().mockResolvedValue({ data: [mockStripeSubscription] }),
  },

  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue(mockStripeCheckoutSession),
      retrieve: vi.fn().mockResolvedValue(mockStripeCheckoutSession),
    },
  },

  invoices: {
    retrieve: vi.fn().mockResolvedValue(mockStripeInvoice),
    list: vi.fn().mockResolvedValue({ data: [mockStripeInvoice] }),
  },

  webhooks: {
    constructEvent: vi.fn((payload, signature, secret) => {
      // Mock de verificación de webhook
      return {
        id: 'evt_test123',
        object: 'event',
        type: 'customer.subscription.created',
        data: {
          object: mockStripeSubscription,
        },
        created: Date.now(),
      };
    }),
  },

  billingPortal: {
    sessions: {
      create: vi.fn().mockResolvedValue({
        id: 'bps_test123',
        object: 'billing_portal.session',
        url: 'https://billing.stripe.com/test',
        customer: 'cus_test123',
      }),
    },
  },
};

/**
 * Configura el mock de Stripe en el test
 */
export function setupStripeMock() {
  vi.mock('stripe', () => {
    return {
      default: vi.fn(() => mockStripe),
      Stripe: vi.fn(() => mockStripe),
    };
  });
}

/**
 * Mock de evento de webhook de Stripe
 */
export function mockStripeWebhookEvent(type: string, data: any) {
  return {
    id: 'evt_test' + Math.random(),
    object: 'event',
    type,
    data: {
      object: data,
    },
    created: Math.floor(Date.now() / 1000),
  };
}
