/**
 * Stripe Products & Prices Management
 *
 * Helpers para consultar productos y precios desde la base de datos.
 * Los productos/precios se sincronizan via webhooks desde Stripe.
 */

import { prisma } from '@/lib/prisma';
import { BillingInterval } from '@prisma/client';

export interface ProductWithPrices {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen: string | null;
  features: string[];
  orden: number;
  metadata: Record<string, unknown> | null;
  precios: {
    id: string;
    unitAmount: number;
    currency: string;
    intervalo: BillingInterval;
    intervalCount: number;
    trialDays: number | null;
  }[];
}

/**
 * Obtiene todos los productos activos con sus precios
 * Ordenados por el campo "orden" para mostrar en pricing page
 */
export async function getActiveProducts(): Promise<ProductWithPrices[]> {
  const products = await prisma.billingProduct.findMany({
    where: {
      activo: true,
    },
    include: {
      precios: {
        where: {
          activo: true,
        },
        orderBy: {
          intervalo: 'asc', // Mensual primero
        },
      },
    },
    orderBy: {
      orden: 'asc',
    },
  });

  return products.map((product) => ({
    id: product.id,
    nombre: product.nombre,
    descripcion: product.descripcion,
    imagen: product.imagen,
    features: (product.features as string[]) || [],
    orden: product.orden,
    metadata: product.metadata as Record<string, unknown> | null,
    precios: product.precios.map((price) => ({
      id: price.id,
      unitAmount: price.unitAmount,
      currency: price.currency,
      intervalo: price.intervalo,
      intervalCount: price.intervalCount,
      trialDays: price.trialDays,
    })),
  }));
}

/**
 * Obtiene un producto por ID
 */
export async function getProductById(productId: string) {
  return prisma.billingProduct.findUnique({
    where: { id: productId },
    include: {
      precios: {
        where: { activo: true },
      },
    },
  });
}

/**
 * Obtiene un precio por ID
 */
export async function getPriceById(priceId: string) {
  return prisma.billingPrice.findUnique({
    where: { id: priceId },
    include: {
      producto: true,
    },
  });
}

/**
 * Formatea un precio en euros
 */
export function formatPrice(
  unitAmount: number,
  currency: string = 'eur',
  interval?: BillingInterval
): string {
  const amount = unitAmount / 100;
  const formatted = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);

  if (interval) {
    const suffix = interval === 'month' ? '/mes' : '/a\u00f1o';
    return `${formatted}${suffix}`;
  }

  return formatted;
}

/**
 * Calcula el precio mensual equivalente para comparación
 */
export function getMonthlyEquivalent(unitAmount: number, interval: BillingInterval): number {
  if (interval === 'year') {
    return Math.round(unitAmount / 12);
  }
  return unitAmount;
}

/**
 * Calcula el ahorro anual si se paga anualmente vs mensualmente
 */
export function calculateAnnualSavings(
  monthlyPrice: number,
  yearlyPrice: number
): {
  amount: number;
  percentage: number;
} {
  const monthlyTotal = monthlyPrice * 12;
  const savings = monthlyTotal - yearlyPrice;
  const percentage = Math.round((savings / monthlyTotal) * 100);

  return {
    amount: savings,
    percentage,
  };
}
