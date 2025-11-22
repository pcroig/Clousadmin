/**
 * API: Create Checkout Session
 *
 * POST /api/billing/checkout
 * Body: { priceId: string }
 *
 * Crea una sesión de Stripe Checkout para suscribirse a un plan.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BILLING_ENABLED, createCheckoutSession, isBillingReady } from '@/lib/stripe';

export async function POST(request: NextRequest) {
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
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo HR Admin puede gestionar billing
    if (session.rol !== 'hr_admin' && session.rol !== 'platform_admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json({ error: 'priceId es requerido' }, { status: 400 });
    }

    // Obtener datos de la empresa
    const empresa = await prisma.empresa.findUnique({
      where: { id: session.empresaId },
      select: { id: true, nombre: true, email: true },
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    // Crear sesión de checkout
    const checkoutSession = await createCheckoutSession({
      empresaId: empresa.id,
      priceId,
      email: empresa.email || session.email,
      nombreEmpresa: empresa.nombre,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Error creando checkout session:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
