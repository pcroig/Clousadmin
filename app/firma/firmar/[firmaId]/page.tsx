import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FirmarDocumentoClientWrapper } from './wrapper';

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

  return <FirmarDocumentoClientWrapper firmaId={firmaId} />;
}
