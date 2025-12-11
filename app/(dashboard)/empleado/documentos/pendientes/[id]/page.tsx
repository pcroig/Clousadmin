// ========================================
// Empleado - Rellenar Documento Pendiente
// ========================================

import { notFound, redirect } from 'next/navigation';

import { RellenarDocumentoForm } from '@/components/empleado/rellenar-documento-form';
import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RellenarDocumentoPage(props: PageProps) {
  const params = await props.params;
  const session = await getSession();

  if (!session || session.user.rol === UsuarioRol.hr_admin) {
    redirect('/login');
  }

  if (!session.user.empleadoId) {
    redirect('/empleado/dashboard');
  }

  const documentoGenerado = await prisma.documentosGenerado.findUnique({
    where: { id: params.id },
    include: {
      documento: {
        select: {
          id: true,
          nombre: true,
          requiereFirma: true,
        },
      },
      plantillas_documentos: {
        select: {
          nombre: true,
          formato: true,
          permiteRellenar: true,
          configuracionIA: true,
        },
      },
    },
  });

  if (
    !documentoGenerado ||
    documentoGenerado.empleadoId !== session.user.empleadoId
  ) {
    notFound();
  }

  if (
    !documentoGenerado.plantillas_documentos.permiteRellenar ||
    documentoGenerado.plantillas_documentos.formato !== 'pdf_rellenable'
  ) {
    notFound();
  }

  const configuracionIA = documentoGenerado.plantillas_documentos
    .configuracionIA as Record<string, unknown> | null;
  const camposFusionados = Array.isArray(configuracionIA?.camposFusionados)
    ? (configuracionIA?.camposFusionados as Array<{
        nombre: string;
        tipo?: string;
        origen?: string;
        confianza?: number;
      }>)
    : [];

  const campos = camposFusionados.map((campo) => ({
    nombre: campo.nombre,
    tipo: campo.tipo || 'text',
    origen: campo.origen || 'nativo',
    confianza: campo.confianza,
  }));

  return (
    <RellenarDocumentoForm
      documentoGeneradoId={documentoGenerado.id}
      documentoNombre={documentoGenerado.documento.nombre}
      plantillaNombre={documentoGenerado.plantillas_documentos.nombre}
      requiereFirma={documentoGenerado.documento.requiereFirma}
      campos={campos}
      valoresIniciales={
        (documentoGenerado.camposCompletados as Record<string, string>) || {}
      }
      pendienteRellenar={documentoGenerado.pendienteRellenar}
    />
  );
}

