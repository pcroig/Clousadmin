'use client';

import type { MiEspacioEmpleado } from '@/types/empleado';
import { DocumentosTab } from '@/components/shared/mi-espacio/documentos-tab';

interface MiEspacioDocumentosClientProps {
  empleado: MiEspacioEmpleado;
}

export function MiEspacioDocumentosClient({ empleado }: MiEspacioDocumentosClientProps) {
  return <DocumentosTab empleado={empleado} />;
}
