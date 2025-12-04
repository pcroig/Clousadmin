// ========================================
// Equipos - Helper Functions
// ========================================

import { prisma } from '@/lib/prisma';

/**
 * Include estándar para queries de equipos
 */
export const equipoInclude = {
  empleados: {
    select: {
      id: true,
      nombre: true,
      apellidos: true,
    },
  },
  empleado_equipos: {
    include: {
      empleado: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          fotoUrl: true,
        },
      },
    },
  },
  sede: {
    select: {
      id: true,
      nombre: true,
      ciudad: true,
    },
  },
  _count: {
    select: {
      empleado_equipos: true,
    },
  },
} as const;

/**
 * Tipo para equipo con relaciones cargadas
 */
export type EquipoWithRelations = NonNullable<
  Awaited<ReturnType<typeof prisma.equipos.findFirst>>
> & {
  empleados: {
    id: string;
    nombre: string;
    apellidos: string;
  } | null;
  empleado_equipos: Array<{
    empleado: {
      id: string;
      nombre: string;
      apellidos: string;
      fotoUrl: string | null;
    };
    fechaIncorporacion: Date;
  }>;
  sede?: {
    id: string;
    nombre: string;
    ciudad: string | null;
  } | null;
  _count?: {
    empleado_equipos: number;
  };
};

/**
 * Formatea un equipo con sus relaciones para API response
 */
export function formatEquipoResponse(team: EquipoWithRelations | null) {
  if (!team) return null;

  return {
    id: team.id,
    empresaId: team.empresaId,
    nombre: team.nombre,
    descripcion: team.descripcion,
    activo: team.activo,
    tipo: team.tipo,
    sedeId: team.sedeId,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    manager: team.empleados
      ? {
          id: team.empleados.id,
          nombre: team.empleados.nombre,
          apellidos: team.empleados.apellidos,
          nombreCompleto: `${team.empleados.nombre} ${team.empleados.apellidos}`,
        }
      : null,
    managerId: team.managerId,
    miembros: team.empleado_equipos.map((miembro) => ({
      id: miembro.empleado.id,
      nombre: miembro.empleado.nombre,
      apellidos: miembro.empleado.apellidos,
      nombreCompleto: `${miembro.empleado.nombre} ${miembro.empleado.apellidos}`,
      fotoUrl: miembro.empleado.fotoUrl,
      fechaIncorporacion: miembro.fechaIncorporacion,
    })),
    sede: team.sede || null,
    numeroMiembros: team._count?.empleado_equipos ?? team.empleado_equipos.length,
  };
}

/**
 * Valida que un equipo pertenezca a una empresa
 */
export async function validateTeamBelongsToCompany(
  equipoId: string,
  empresaId: string
): Promise<boolean> {
  const team = await prisma.equipos.findFirst({
    where: {
      id: equipoId,
      empresaId,
    },
    select: { id: true },
  });

  return !!team;
}

/**
 * Valida que un empleado sea miembro de un equipo
 */
export async function validateEmployeeIsTeamMember(
  empleadoId: string,
  equipoId: string
): Promise<boolean> {
  const member = await prisma.empleado_equipos.findUnique({
    where: {
      empleadoId_equipoId: {
        empleadoId,
        equipoId,
      },
    },
    select: { empleadoId: true },
  });

  return !!member;
}

/**
 * Obtiene los IDs de empleados de un equipo
 */
export async function getTeamMemberIds(equipoId: string): Promise<string[]> {
  const members = await prisma.empleado_equipos.findMany({
    where: { equipoId },
    select: { empleadoId: true },
  });

  return members.map((m) => m.empleadoId);
}

