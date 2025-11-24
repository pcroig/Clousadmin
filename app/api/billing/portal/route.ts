/**
 * API: Create Billing Portal Session
 *
 * POST /api/billing/portal
 *
 * Crea una sesión del Portal de Cliente de Stripe para gestionar suscripción.
 */

import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { BILLING_ENABLED, createBillingPortalSession, isBillingReady } from '@/lib/stripe';

export async function POST() {
  // Verificar billing habilitado
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: 'Billing no disponible' }, { status: 404 });
  }

  if (!isBillingReady()) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 500 });
  }

  try {
    // Verificar autenticación
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { user } = session;

    // Solo HR Admin puede gestionar billing
    if (user.rol !== 'hr_admin' && user.rol !== 'platform_admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // Crear sesión del portal
    const portalSession = await createBillingPortalSession(user.empresaId);

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Error creando portal session:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';

    // Si no tiene customer, indicar que debe suscribirse primero
    if (message.includes('No se encontró el cliente')) {
      return NextResponse.json(
        { error: 'Debes tener una suscripción activa para acceder al portal' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
