// ========================================
// Empleado - Carpeta Detail View (Server Component)
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { CarpetaDetailClientEmpleado } from './carpeta-detail-client';

export default async function EmpleadoCarpetaDetailPage(context: { params: Promise<{ id: string }> }) {
    const params = await context.params;
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Await params en Next.js 15+
  const { id } = await params;

  // Obtener empleado
  const empleado = await prisma.empleados.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!empleado) {
    redirect('/login');
  }

  // Obtener carpeta con documentos
  const carpeta = await prisma.carpetas.findUnique({
    where: {
      id: id,
    },
    include: {
      documento_carpetas: {
        include: {
          documento: true,
        },
        orderBy: {
          documento: {
            createdAt: 'desc',
          },
        },
      },
    },
  });

  if (!carpeta) {
    redirect('/empleado/mi-espacio/documentos');
  }

  // Verificar permisos: carpeta propia o compartida
  const tieneAcceso =
    carpeta.empleadoId === empleado.id ||
    (carpeta.compartida &&
      (carpeta.asignadoA === 'todos' ||
        carpeta.asignadoA?.includes(`empleado:${empleado.id}`)));

  if (!tieneAcceso) {
    redirect('/empleado/mi-espacio/documentos');
  }

  // Determinar si puede subir archivos
  const allowedUploadFolders = new Set([
    'Justificantes',
    'Otros',
    // Compatibilidad con carpetas antiguas
    'Personales',
    'Médicos',
  ]);

  const puedeSubir =
    carpeta.empleadoId === empleado.id && allowedUploadFolders.has(carpeta.nombre);

  // Obtener información de firmas para cada documento
  const documentIds = carpeta.documento_carpetas.map(dc => dc.documento.id);
  const solicitudesFirma = await prisma.solicitudes_firma.findMany({
    where: {
      documentoId: { in: documentIds },
      empresaId: session.user.empresaId,
    },
    include: {
      firmas: {
        where: {
          empleadoId: empleado.id,
        },
      },
    },
  });

  // Crear un mapa de documentoId -> estado de firma
  const firmasPorDocumento = new Map(
    solicitudesFirma.map(sol => {
      const firmaEmpleado = sol.firmas[0]; // Solo debería haber una firma por empleado por solicitud
      return [
        sol.documentoId,
        {
          tieneSolicitud: true,
          firmado: firmaEmpleado?.firmado ?? false,
          firmaId: firmaEmpleado?.id,
          estadoSolicitud: sol.estado,
        },
      ];
    })
  );

  // Serializar datos para evitar problemas con Date
  const carpetaData = {
    id: carpeta.id,
    nombre: carpeta.nombre,
    esSistema: carpeta.esSistema,
    compartida: carpeta.compartida,
    documentos: carpeta.documento_carpetas.map((dc) => {
      const doc = dc.documento;
      const firmaInfo = firmasPorDocumento.get(doc.id);
      return {
        id: doc.id,
        nombre: doc.nombre,
        tipoDocumento: doc.tipoDocumento,
        mimeType: doc.mimeType,
        tamano: doc.tamano,
        createdAt: doc.createdAt.toISOString(),
        // IMPORTANTE: Usar el campo firmado de la BD, NO el de firmaInfo
        // Solo el documento que realmente contiene el PDF firmado debe aparecer como firmado
        firmado: doc.firmado,
        firmadoEn: doc.firmadoEn?.toISOString() ?? null,
        firmaInfo: firmaInfo ? {
          tieneSolicitud: firmaInfo.tieneSolicitud,
          firmado: firmaInfo.firmado,
          firmaId: firmaInfo.firmaId,
          estadoSolicitud: firmaInfo.estadoSolicitud,
        } : null,
      };
    }),
  };

  return (
    <CarpetaDetailClientEmpleado carpeta={carpetaData} puedeSubir={puedeSubir} />
  );
}
