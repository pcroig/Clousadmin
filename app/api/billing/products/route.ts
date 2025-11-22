/**
 * API: Get Available Products/Plans
 *
 * GET /api/billing/products
 *
 * Obtiene los productos/planes disponibles para suscripción.
 * Esta ruta es pública para mostrar en pricing pages.
 */

import { NextResponse } from 'next/server';
import { getActiveProducts, BILLING_ENABLED } from '@/lib/stripe';

export async function GET() {
  // Verificar billing habilitado
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: 'Billing no disponible' }, { status: 404 });
  }

  try {
    const products = await getActiveProducts();
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
