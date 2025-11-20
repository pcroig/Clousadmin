import { prisma } from '@/lib/prisma';

interface CampanaPendiente {
  id: string;
  titulo: string;
  fechaInicioObjetivo: Date;
  fechaFinObjetivo: Date;
}

interface CampanaPropuestaPendiente {
  id: string;
  titulo: string;
  fechaInicioObjetivo: Date;
  fechaFinObjetivo: Date;
  propuesta: {
    fechaInicio: string;
    fechaFin: string;
    dias: number;
    tipo: 'ideal' | 'alternativo' | 'ajustado';
    motivo: string;
  };
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

export async function obtenerPropuestaPendiente(
  empleadoId: string,
  empresaId: string
): Promise<CampanaPropuestaPendiente | null> {
  const preferencia = await prisma.preferenciaVacaciones.findFirst({
    where: {
      empleadoId,
      empresaId,
      propuestaEnviada: true,
      aceptada: false,
    },
    include: {
      campana: {
        select: {
          id: true,
          titulo: true,
          fechaInicioObjetivo: true,
          fechaFinObjetivo: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  if (!preferencia?.campana || !preferencia.propuestaIA) {
    return null;
  }

  const propuesta = preferencia.propuestaIA as CampanaPropuestaPendiente['propuesta'];

  return {
    id: preferencia.campana.id,
    titulo: preferencia.campana.titulo,
    fechaInicioObjetivo: preferencia.campana.fechaInicioObjetivo,
    fechaFinObjetivo: preferencia.campana.fechaFinObjetivo,
    propuesta,
  };
}

