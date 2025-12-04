import { CAMPANAS_VACACIONES_ENABLED } from '@/lib/constants/feature-flags';
import { prisma, Prisma } from '@/lib/prisma';

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

const CAMPANAS_MIGRATION_ID = '20251120093000_update_campanas_propuestas';

let missingColumnLogged = false;
const missingColumnMessage = `[CampanasVacaciones] Falta aplicar la migración ${CAMPANAS_MIGRATION_ID}. Ejecuta "npm run db:deploy" o aplica el SQL correspondiente.`;

const isMissingPreferenciaColumnError = (error: unknown): boolean => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== 'P2022') {
    return false;
  }

  const column = (error.meta?.column_name as string | undefined) ?? error.message;
  return column?.includes('propuestaEnviada');
};

const handleMissingColumn = () => {
  if (missingColumnLogged) {
    return;
  }
  missingColumnLogged = true;
  console.error(missingColumnMessage);
};

export async function obtenerCampanaPendiente(
  empleadoId: string,
  empresaId: string
): Promise<CampanaPendiente | null> {
  if (!CAMPANAS_VACACIONES_ENABLED) {
    return null;
  }

  const preferenciaPendiente = await prisma.preferencias_vacaciones.findFirst({
    where: {
      empleadoId,
      empresaId,
      completada: false,
    },
    select: {
      id: true,
      campana_vacaciones: {
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

  if (!preferenciaPendiente?.campana_vacaciones) {
    return null;
  }

  if (preferenciaPendiente.campana_vacaciones.estado !== 'abierta') {
    return null;
  }

  return {
    id: preferenciaPendiente.campana_vacaciones.id,
    titulo: preferenciaPendiente.campana_vacaciones.titulo,
    fechaInicioObjetivo: preferenciaPendiente.campana_vacaciones.fechaInicioObjetivo,
    fechaFinObjetivo: preferenciaPendiente.campana_vacaciones.fechaFinObjetivo,
  };
}

export async function obtenerPropuestaPendiente(
  empleadoId: string,
  empresaId: string
): Promise<CampanaPropuestaPendiente | null> {
  if (!CAMPANAS_VACACIONES_ENABLED) {
    return null;
  }

  try {
    const preferencia = await prisma.preferencias_vacaciones.findFirst({
      where: {
        empleadoId,
        empresaId,
        propuestaEnviada: true,
        aceptada: false,
      },
      select: {
        id: true,
        propuestaIA: true,
        campana_vacaciones: {
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

    if (!preferencia?.campana_vacaciones || !preferencia.propuestaIA) {
      return null;
    }

    const propuesta = preferencia.propuestaIA as CampanaPropuestaPendiente['propuesta'];

    return {
      id: preferencia.campana_vacaciones.id,
      titulo: preferencia.campana_vacaciones.titulo,
      fechaInicioObjetivo: preferencia.campana_vacaciones.fechaInicioObjetivo,
      fechaFinObjetivo: preferencia.campana_vacaciones.fechaFinObjetivo,
      propuesta,
    };
  } catch (error: unknown) {
    if (isMissingPreferenciaColumnError(error)) {
      handleMissingColumn();
      return null;
    }
    throw error;
  }
}

