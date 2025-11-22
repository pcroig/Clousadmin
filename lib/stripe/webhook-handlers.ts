/**
 * Stripe Webhook Handlers
 *
 * Maneja los eventos de webhook de Stripe para sincronizar datos.
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { mapStripeStatusToPrisma } from './subscriptions';
import { BillingInterval } from '@prisma/client';

/**
 * Maneja la creación/actualización de un producto
 */
export async function handleProductChange(product: Stripe.Product) {
  // Extraer features del metadata o description
  let features: string[] = [];
  if (product.metadata?.features) {
    try {
      features = JSON.parse(product.metadata.features);
    } catch {
      features = product.metadata.features.split(',').map((f) => f.trim());
    }
  }

  await prisma.billingProduct.upsert({
    where: { id: product.id },
    create: {
      id: product.id,
      nombre: product.name,
      descripcion: product.description,
      activo: product.active,
      imagen: product.images?.[0] || null,
      features,
      orden: parseInt(product.metadata?.order || '0', 10),
      metadata: product.metadata as Record<string, unknown>,
    },
    update: {
      nombre: product.name,
      descripcion: product.description,
      activo: product.active,
      imagen: product.images?.[0] || null,
      features,
      orden: parseInt(product.metadata?.order || '0', 10),
      metadata: product.metadata as Record<string, unknown>,
    },
  });
}

/**
 * Maneja la eliminación de un producto
 */
export async function handleProductDeletion(productId: string) {
  await prisma.billingProduct.update({
    where: { id: productId },
    data: { activo: false },
  });
}

/**
 * Maneja la creación/actualización de un precio
 */
export async function handlePriceChange(price: Stripe.Price) {
  if (!price.product || typeof price.product !== 'string') {
    console.error('Price sin product ID:', price.id);
    return;
  }

  // Verificar que el producto existe
  const product = await prisma.billingProduct.findUnique({
    where: { id: price.product },
  });

  if (!product) {
    console.error('Producto no encontrado para precio:', price.product);
    return;
  }

  const interval =
    price.recurring?.interval === 'year' ? BillingInterval.year : BillingInterval.month;

  await prisma.billingPrice.upsert({
    where: { id: price.id },
    create: {
      id: price.id,
      productoId: price.product,
      unitAmount: price.unit_amount || 0,
      currency: price.currency,
      intervalo: interval,
      intervalCount: price.recurring?.interval_count || 1,
      trialDays: price.recurring?.trial_period_days || null,
      activo: price.active,
      metadata: price.metadata as Record<string, unknown>,
    },
    update: {
      unitAmount: price.unit_amount || 0,
      currency: price.currency,
      intervalo: interval,
      intervalCount: price.recurring?.interval_count || 1,
      trialDays: price.recurring?.trial_period_days || null,
      activo: price.active,
      metadata: price.metadata as Record<string, unknown>,
    },
  });
}

/**
 * Maneja la eliminación de un precio
 */
export async function handlePriceDeletion(priceId: string) {
  await prisma.billingPrice.update({
    where: { id: priceId },
    data: { activo: false },
  });
}

/**
 * Maneja la creación/actualización de un customer
 */
export async function handleCustomerChange(customer: Stripe.Customer) {
  const empresaId = customer.metadata?.empresaId;

  if (!empresaId) {
    console.log('Customer sin empresaId en metadata:', customer.id);
    return;
  }

  // Construir dirección si existe
  let direccion = null;
  if (customer.address) {
    direccion = {
      line1: customer.address.line1,
      line2: customer.address.line2,
      city: customer.address.city,
      state: customer.address.state,
      postal_code: customer.address.postal_code,
      country: customer.address.country,
    };
  }

  await prisma.billingCustomer.upsert({
    where: { id: customer.id },
    create: {
      id: customer.id,
      empresaId,
      email: customer.email || '',
      nombre: customer.name,
      direccion,
      taxId: customer.tax_ids?.data?.[0]?.value || null,
    },
    update: {
      email: customer.email || '',
      nombre: customer.name,
      direccion,
      taxId: customer.tax_ids?.data?.[0]?.value || null,
    },
  });
}

/**
 * Maneja la eliminación de un customer
 */
export async function handleCustomerDeletion(customerId: string) {
  // No eliminamos, solo desvinculamos las suscripciones
  await prisma.subscription.updateMany({
    where: { customerId },
    data: { status: 'canceled' },
  });
}

/**
 * Maneja la creación/actualización de una suscripción
 */
export async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const empresaId = subscription.metadata?.empresaId;
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  if (!empresaId) {
    // Intentar obtener empresaId del customer
    const customer = await prisma.billingCustomer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      console.error('No se pudo determinar empresaId para suscripción:', subscription.id);
      return;
    }

    await upsertSubscription(subscription, customer.empresaId, customerId);
  } else {
    await upsertSubscription(subscription, empresaId, customerId);
  }
}

async function upsertSubscription(
  subscription: Stripe.Subscription,
  empresaId: string,
  customerId: string
) {
  const priceId = subscription.items.data[0]?.price?.id;

  if (!priceId) {
    console.error('Suscripción sin price:', subscription.id);
    return;
  }

  // Verificar que el precio existe
  const price = await prisma.billingPrice.findUnique({
    where: { id: priceId },
  });

  if (!price) {
    console.error('Precio no encontrado:', priceId);
    return;
  }

  await prisma.subscription.upsert({
    where: { id: subscription.id },
    create: {
      id: subscription.id,
      empresaId,
      customerId,
      priceId,
      status: mapStripeStatusToPrisma(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      metadata: subscription.metadata as Record<string, unknown>,
    },
    update: {
      priceId,
      status: mapStripeStatusToPrisma(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      metadata: subscription.metadata as Record<string, unknown>,
    },
  });
}

/**
 * Maneja la eliminación/cancelación de una suscripción
 */
export async function handleSubscriptionDeletion(subscription: Stripe.Subscription) {
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'canceled',
      canceledAt: new Date(),
    },
  });
}

/**
 * Maneja el checkout completado
 */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // La suscripción se crea automáticamente y el webhook de subscription.created la procesa
  console.log('Checkout completado:', session.id);

  // Si necesitas lógica adicional (enviar email de bienvenida, etc.)
  // puedes añadirla aquí
}

/**
 * Maneja facturas pagadas
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('Factura pagada:', invoice.id);
  // Aquí puedes añadir lógica para enviar factura por email, etc.
}

/**
 * Maneja facturas con pago fallido
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Pago de factura fallido:', invoice.id);

  // Obtener la suscripción y actualizar estado si es necesario
  if (invoice.subscription && typeof invoice.subscription === 'string') {
    await prisma.subscription.update({
      where: { id: invoice.subscription },
      data: { status: 'past_due' },
    });
  }

  // Aquí puedes añadir lógica para notificar al cliente
}
