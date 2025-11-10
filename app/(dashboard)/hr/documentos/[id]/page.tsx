// ========================================
// HR - Carpeta Detail View (Server Component)
// ========================================

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { CarpetaDetailClient } from './carpeta-detail-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function HRCarpetaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    const tipoDocumento = carpeta.nombre === 'Nóminas' ? 'nomina' : 
                         carpeta.nombre === 'Contratos' ? 'contrato' :
                         carpeta.nombre === 'Justificantes' ? 'justificante' : null;

    if (tipoDocumento) {
      documentosAgregados = await prisma.documento.findMany({
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
        orderBy: {
          createdAt: 'desc',
        },
      });
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
