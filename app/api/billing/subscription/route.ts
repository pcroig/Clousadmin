/**
 * API: Get Subscription Status
 *
 * GET /api/billing/subscription
 *
 * Obtiene el estado actual de la suscripción de la empresa.
 */

import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { BILLING_ENABLED, getSubscriptionStatus } from '@/lib/stripe';

export async function GET() {
  // Verificar billing habilitado
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: 'Billing no disponible' }, { status: 404 });
  }

  try {
    // Verificar autenticación
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener estado de suscripción
    const status = await getSubscriptionStatus(session.user.empresaId);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error obteniendo suscripción:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
