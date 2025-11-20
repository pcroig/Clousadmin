'use client';

import { DocumentosTab } from '@/components/shared/mi-espacio/documentos-tab';

import type { MiEspacioEmpleado } from '@/types/empleado';

interface MiEspacioDocumentosClientProps {
  empleado: MiEspacioEmpleado;
}

export function MiEspacioDocumentosClient({ empleado }: MiEspacioDocumentosClientProps) {
  return <DocumentosTab empleado={empleado} />;
}
