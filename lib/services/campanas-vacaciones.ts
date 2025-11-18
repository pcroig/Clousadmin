import { prisma } from '@/lib/prisma';

interface CampanaPendiente {
  id: string;
  titulo: string;
  fechaInicioObjetivo: Date;
  fechaFinObjetivo: Date;
}

export async function obtenerCampanaPendiente(
  empleadoId: string,
  empresaId: string
): Promise<CampanaPendiente | null> {
  const preferenciaPendiente = await prisma.preferenciaVacaciones.findFirst({
    where: {
      empleadoId,
      empresaId,
      completada: false,
    },
    include: {
      campana: {
        select: {
          id: true,
          titulo: true,
          fechaInicioObjetivo: true,
          fechaFinObjetivo: true,
          estado: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!preferenciaPendiente?.campana) {
    return null;
  }

  if (preferenciaPendiente.campana.estado !== 'abierta') {
    return null;
  }

  return {
    id: preferenciaPendiente.campana.id,
    titulo: preferenciaPendiente.campana.titulo,
    fechaInicioObjetivo: preferenciaPendiente.campana.fechaInicioObjetivo,
    fechaFinObjetivo: preferenciaPendiente.campana.fechaFinObjetivo,
  };
}

