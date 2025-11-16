// ========================================
// Plantilla Detail Page - Server Component
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PlantillaDetailClient } from './plantilla-detail-client';
import { UsuarioRol } from '@/lib/constants/enums';

export default async function PlantillaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  const { id } = await params;

  // Obtener plantilla con datos completos
  const plantilla = await prisma.plantillaDocumento.findUnique({
    where: { id },
    include: {
      documentosGenerados: {
        take: 10,
        orderBy: { generadoEn: 'desc' },
        include: {
          empleado: {
            select: {
              nombre: true,
              apellidos: true,
            },
          },
        },
      },
      _count: {
        select: {
          documentosGenerados: true,
        },
      },
    },
  });

  if (!plantilla) {
    redirect('/hr/documentos');
  }

  // Verificar permisos (solo plantillas oficiales o de su empresa)
  if (plantilla.empresaId && plantilla.empresaId !== session.user.empresaId) {
    redirect('/hr/documentos');
  }

  // Formatear datos para el cliente
  const plantillaData = {
    id: plantilla.id,
    nombre: plantilla.nombre,
    descripcion: plantilla.descripcion,
    categoria: plantilla.categoria,
    tipo: plantilla.tipo,
    formato: plantilla.formato,
    esOficial: plantilla.esOficial,
    activa: plantilla.activa,
    requiereContrato: plantilla.requiereContrato,
    requiereFirma: plantilla.requiereFirma,
    carpetaDestinoDefault: plantilla.carpetaDestinoDefault,
    variablesUsadas: (plantilla.variablesUsadas as string[]) || [],
    usarIAParaExtraer: plantilla.usarIAParaExtraer,
    configuracionIA: plantilla.configuracionIA,
    totalDocumentosGenerados: plantilla._count.documentosGenerados,
    createdAt: plantilla.createdAt.toISOString(),
    updatedAt: plantilla.updatedAt.toISOString(),
    documentosGenerados: plantilla.documentosGenerados.map((doc) => ({
      id: doc.id,
      empleadoNombre: `${doc.empleado.nombre} ${doc.empleado.apellidos}`,
      generadoEn: doc.generadoEn.toISOString(),
      documentoId: doc.documentoId,
      firmado: doc.firmado,
      requiereFirma: doc.requiereFirma,
    })),
  };

  return <PlantillaDetailClient plantilla={plantillaData} />;
}


