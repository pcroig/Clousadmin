import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FirmarDocumentoClientWrapper } from './wrapper';

interface PageProps {
  params: Promise<{
    firmaId: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Firmar Documento',
};

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function FirmarDocumentoPage({ params }: PageProps) {
  const { firmaId } = await params;

  if (!firmaId) {
    notFound();
  }

  return <FirmarDocumentoClientWrapper firmaId={firmaId} />;
}
