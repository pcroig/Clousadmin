import { VerSolicitudClient } from './ver-solicitud-client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ solicitudId: string }>;
}

export default async function VerSolicitudPage({ params }: PageProps) {
  const { solicitudId } = await params;

  return <VerSolicitudClient solicitudId={solicitudId} />;
}
