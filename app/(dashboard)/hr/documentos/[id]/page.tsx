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
  const carpeta = await prisma.carpeta.findUnique({
    where: {
      id: id,
    },
    include: {
      documentos: {
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
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

  // Si es carpeta global (sin empleadoId), obtener documentos agregados de todos los empleados
  let documentosAgregados = carpeta.documentos;
  let esGlobal = false;

  if (!carpeta.empleadoId && carpeta.compartida && carpeta.esSistema) {
    esGlobal = true;
    // Buscar todos los documentos del mismo tipo en carpetas de empleados
    const tipoDocumento = obtenerTipoDocumentoDesdeCarpeta(carpeta.nombre);

    if (tipoDocumento) {
      // Obtener documentos de carpetas de empleados Y documentos directamente en esta carpeta global
      const [documentosEmpleados, documentosCarpetaGlobal] = await Promise.all([
        prisma.documento.findMany({
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
        prisma.documento.findMany({
          where: {
            carpetaId: carpeta.id,
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
      const documentosMap = new Map();
      [...documentosEmpleados, ...documentosCarpetaGlobal].forEach((doc) => {
        documentosMap.set(doc.id, doc);
      });
      
      documentosAgregados = Array.from(documentosMap.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    }
  }

  // Obtener lista de empleados para el filtro (si es carpeta global)
  let empleados: Array<{ id: string; nombre: string; apellidos: string }> = [];
  if (esGlobal) {
    empleados = await prisma.empleado.findMany({
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

  // Serializar datos para evitar problemas con Date
  const carpetaData = {
    id: carpeta.id,
    nombre: carpeta.nombre,
    esSistema: carpeta.esSistema,
    compartida: carpeta.compartida,
    asignadoA: carpeta.asignadoA,
    empleado: carpeta.empleado,
    esGlobal,
    documentos: documentosAgregados.map((doc) => ({
      id: doc.id,
      nombre: doc.nombre,
      tipoDocumento: doc.tipoDocumento,
      mimeType: doc.mimeType,
      tamano: doc.tamano,
      createdAt: doc.createdAt.toISOString(),
      empleado: doc.empleado ? {
        id: doc.empleado.id,
        nombre: doc.empleado.nombre,
        apellidos: doc.empleado.apellidos,
      } : null,
    })),
  };

  return <CarpetaDetailClient carpeta={carpetaData} empleados={empleados} />;
}
