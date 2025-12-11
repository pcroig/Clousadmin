/**
 * Billing Settings Page - HR Admin
 *
 * Página de gestión de facturación y suscripción.
 * Solo visible si BILLING_ENABLED está activado.
 */

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { BILLING_ENABLED, getActiveProducts, getSubscriptionStatus } from '@/lib/stripe';

import { BillingClient } from './billing-client';
import { BillingLoading } from './billing-loading';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function BillingSettingsPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  if (!session.user.empresaId) {
    redirect('/hr/dashboard');
  }

  if (!BILLING_ENABLED) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación desactivada</CardTitle>
          <CardDescription>
            Activa la pasarela de pago para gestionar planes y métodos de cobro desde Clousadmin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Añade las claves de Stripe y establece <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_BILLING_ENABLED=true</code>{' '}
            para habilitar esta sección. Mientras tanto, puedes gestionar cobros directamente desde tu panel de Stripe.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Obtener estado de suscripción y productos en paralelo
  const [subscriptionStatus, products] = await Promise.all([
    getSubscriptionStatus(session.user.empresaId),
    getActiveProducts(),
  ]);

  return (
    <Suspense fallback={<BillingLoading />}>
      <BillingClient subscription={subscriptionStatus} products={products} />
    </Suspense>
  );
}
