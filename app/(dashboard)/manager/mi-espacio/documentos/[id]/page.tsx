// ========================================
// Manager - Carpeta Detail View from Mi Espacio (Server Component)
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

import { CarpetaDetailClientEmpleado } from '@/app/(dashboard)/empleado/mi-espacio/documentos/[id]/carpeta-detail-client';

export default async function ManagerMiEspacioCarpetaDetailPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.manager) {
    redirect('/login');
  }

  const { id } = await params;

  // Obtener empleado Manager
  const empleado = await prisma.empleados.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    include: {
      equipos: true,
    },
  });

  if (!empleado) {
    redirect('/manager/dashboard');
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
    redirect('/manager/mi-espacio');
  }

  // Verificar permisos: carpeta propia o compartida
  const equipoIds = empleado.equipos.map(eq => eq.equipoId);
  const tieneAccesoPorEquipo = equipoIds.some(eqId => carpeta.asignadoA === `equipo:${eqId}`);

  const tieneAcceso =
    carpeta.empleadoId === empleado.id ||
    (carpeta.compartida &&
      (carpeta.asignadoA === 'todos' ||
        carpeta.asignadoA?.includes(`empleado:${empleado.id}`) ||
        tieneAccesoPorEquipo));

  if (!tieneAcceso) {
    redirect('/manager/mi-espacio');
  }

  // Determinar si puede subir archivos
  const allowedUploadFolders = new Set([
    'Justificantes',
    'Otros',
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
      const firmaEmpleado = sol.firmas[0];
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
