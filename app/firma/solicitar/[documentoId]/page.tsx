import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SolicitarFirmaClientWrapper } from './wrapper';

interface PageProps {
  params: Promise<{
    documentoId: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Solicitar Firma',
};

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function SolicitarFirmaPage({ params }: PageProps) {
  const { documentoId } = await params;

  if (!documentoId) {
    notFound();
  }

  return <SolicitarFirmaClientWrapper documentoId={documentoId} />;
}
