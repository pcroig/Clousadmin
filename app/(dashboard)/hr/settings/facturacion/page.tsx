/**
 * Billing Settings Page - HR Admin
 *
 * Página de gestión de facturación y suscripción.
 * Solo visible si BILLING_ENABLED está activado.
 */

import { redirect, notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { BILLING_ENABLED, getSubscriptionStatus, getActiveProducts } from '@/lib/stripe';

import { BillingClient } from './billing-client';
import { BillingLoading } from './billing-loading';

export default async function BillingSettingsPage() {
  // Si billing no está habilitado, mostrar 404
  if (!BILLING_ENABLED) {
    notFound();
  }

  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  if (!session.user.empresaId) {
    redirect('/hr/dashboard');
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
