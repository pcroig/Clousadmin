import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FirmarDocumentoClient } from './firmar-documento-client';

interface PageProps {
  params: {
    firmaId: string;
  };
}

export const metadata: Metadata = {
  title: 'Firmar Documento',
};

export default async function FirmarDocumentoPage({ params }: PageProps) {
  const { firmaId } = await params;

  if (!firmaId) {
    notFound();
  }

  return <FirmarDocumentoClient firmaId={firmaId} />;
}
