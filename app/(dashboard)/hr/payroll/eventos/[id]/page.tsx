// ========================================
// Página: Detalles de Evento de Nómina
// ========================================
// Vista detallada de un evento mensual con lista de nóminas

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EventoDetailsClient } from './evento-details-client';

export default async function EventoDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Solo HR admins y platform admins tienen acceso
  if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
    redirect('/hr');
  }

  const { id } = await params;

  return <EventoDetailsClient eventoId={id} />;
}

