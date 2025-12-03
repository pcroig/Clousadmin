import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SolicitarFirmaClient } from './solicitar-firma-client';

interface PageProps {
  params: {
    documentoId: string;
  };
}

export const metadata: Metadata = {
  title: 'Solicitar Firma',
};

export default async function SolicitarFirmaPage({ params }: PageProps) {
  const { documentoId } = await params;

  if (!documentoId) {
    notFound();
  }

  return <SolicitarFirmaClient documentoId={documentoId} />;
}
