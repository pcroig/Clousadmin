import { VerSolicitudClient } from './ver-solicitud-client';

interface PageProps {
  params: Promise<{ solicitudId: string }>;
}

export default async function VerSolicitudPage({ params }: PageProps) {
  const { solicitudId } = await params;

  return <VerSolicitudClient solicitudId={solicitudId} />;
}
