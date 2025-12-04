// ========================================
// HR - Carpeta Detail View (Server Component)
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { obtenerTipoDocumentoDesdeCarpeta } from '@/lib/documentos';
import { prisma } from '@/lib/prisma';

import { CarpetaDetailClient } from './carpeta-detail-client';


export default async function HRCarpetaDetailPage(context: { params: Promise<{ id: string }> }) {
    const params = await context.params;
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Await params en Next.js 15+
  const { id } = await params;

  // Obtener carpeta con documentos y empleado
  const carpeta = await prisma.carpetas.findUnique({
    where: {
      id: id,
    },
    include: {
      documento_carpetas: {
        include: {
          documento: {
            include: {
              empleado: {
                select: {
                  id: true,
                  nombre: true,
                  apellidos: true,
                },
              },
            },
          },
        },
        orderBy: {
          documento: {
            createdAt: 'desc',
          },
        },
      },
      empleado: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
        },
      },
    },
  });

  if (!carpeta) {
    redirect('/hr/documentos');
  }

  // Si es carpeta master del sistema compartida (para HR), obtener documentos agregados de todos los empleados
  // Estas son las 4 carpetas: Contratos, Nóminas, Justificantes, Otros (sin empleadoId asignado)
  let documentosAgregados = carpeta.documento_carpetas.map(dc => dc.documento);
  type DocumentoConEmpleado = (typeof documentosAgregados)[number];
  const esCarpetaMasterHR = !carpeta.empleadoId && carpeta.compartida && carpeta.esSistema;

  if (esCarpetaMasterHR) {
    // Buscar todos los documentos del mismo tipo en carpetas de empleados
    const tipoDocumento = obtenerTipoDocumentoDesdeCarpeta(carpeta.nombre);

    if (tipoDocumento) {
      // Obtener documentos de carpetas de empleados Y documentos directamente en esta carpeta global
      const [documentosEmpleados, documentosCarpetaGlobal] = await Promise.all([
        prisma.documentos.findMany({
          where: {
            empresaId: session.user.empresaId,
            tipoDocumento: tipoDocumento,
            empleadoId: { not: null },
          },
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
              },
            },
          },
        }),
        prisma.documentos.findMany({
          where: {
            documento_carpetas: {
              some: {
                carpetaId: carpeta.id,
              },
            },
            empresaId: session.user.empresaId,
          },
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
              },
            },
          },
        }),
      ]);

      // Combinar y eliminar duplicados por ID
      const documentosMap = new Map<string, DocumentoConEmpleado>();
      [...documentosEmpleados, ...documentosCarpetaGlobal].forEach((doc) => {
        documentosMap.set(doc.id, doc as DocumentoConEmpleado);
      });

      documentosAgregados = Array.from(documentosMap.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    }
  }

  // Obtener lista de empleados para el filtro (si es carpeta master para HR)
  let empleados: Array<{ id: string; nombre: string; apellidos: string }> = [];
  if (esCarpetaMasterHR) {
    empleados = await prisma.empleados.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  // Obtener información de firmas para cada documento
  const documentIds = documentosAgregados.map(d => d.id);
  const solicitudesFirma = await prisma.solicitudes_firma.findMany({
    where: {
      documentoId: { in: documentIds },
      empresaId: session.user.empresaId,
    },
    include: {
      firmas: {
        select: {
          id: true,
          firmado: true,
          empleadoId: true,
        },
      },
    },
  });

  // Crear un mapa de documentoId -> estado de firma
  const firmasPorDocumento = new Map(
    solicitudesFirma.map(sol => {
      // Una solicitud puede tener múltiples firmantes, consideramos completada si todos firmaron
      const todosFirmados = sol.firmas.length > 0 && sol.firmas.every(f => f.firmado);
      return [
        sol.documentoId,
        {
          tieneSolicitud: true,
          firmado: todosFirmados,
          solicitudId: sol.id,
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
    asignadoA: carpeta.asignadoA,
    empleado: carpeta.empleado,
    esCarpetaMasterHR,
    documentos: documentosAgregados.map((doc) => {
      const firmaInfo = firmasPorDocumento.get(doc.id);
      return {
        id: doc.id,
        nombre: doc.nombre,
        tipoDocumento: doc.tipoDocumento,
        mimeType: doc.mimeType,
        tamano: doc.tamano,
        createdAt: doc.createdAt.toISOString(),
        firmado: firmaInfo?.firmado ?? false,
        firmadoEn: null,
        firmaInfo: firmaInfo ? {
          tieneSolicitud: firmaInfo.tieneSolicitud,
          firmado: firmaInfo.firmado,
          solicitudId: firmaInfo.solicitudId,
          estadoSolicitud: firmaInfo.estadoSolicitud,
        } : null,
        empleado: doc.empleado ? {
          id: doc.empleado.id,
          nombre: doc.empleado.nombre,
          apellidos: doc.empleado.apellidos,
        } : null,
      };
    }),
  };

  return <CarpetaDetailClient carpeta={carpetaData} empleados={empleados} />;
}
