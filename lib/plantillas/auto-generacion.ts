/**
 * Utilidades para auto-generar documentos en procesos automáticos
 */

import { prisma } from '@/lib/prisma';
import { agregarJobGeneracion } from './queue';

interface AutoGenerarArgs {
  empresaId: string;
  empleadoId: string;
  solicitadoPor: string;
}

export async function autoGenerarDocumentosOffboarding({
  empresaId,
  empleadoId,
  solicitadoPor,
}: AutoGenerarArgs): Promise<number> {
  const plantillas = await prisma.plantillaDocumento.findMany({
    where: {
      activa: true,
      autoGenerarOffboarding: true,
      OR: [{ empresaId }, { empresaId: null }],
    },
    select: {
      id: true,
      carpetaDestinoDefault: true,
      requiereFirma: true,
    },
  });

  await Promise.all(
    plantillas.map((plantilla) =>
      agregarJobGeneracion({
        plantillaId: plantilla.id,
        empleadoIds: [empleadoId],
        configuracion: {
          carpetaDestino: plantilla.carpetaDestinoDefault || 'Offboarding',
          notificarEmpleado: true,
          requiereFirma: plantilla.requiereFirma,
        },
        solicitadoPor,
        empresaId,
      }).catch((error) => {
        console.error('[AutoGenerarOffboarding] Error creando job:', error);
      })
    )
  );

  return plantillas.length;
}

