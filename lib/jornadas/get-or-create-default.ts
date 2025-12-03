// ========================================
// Helper: Obtener o crear jornada por defecto
// ========================================
// Devuelve una jornada activa marcada como predefinida para la empresa.
// Si no existe, crea una configuración base mínima.

import type { Prisma, PrismaClient } from '@prisma/client';

type JornadaClient = PrismaClient | Prisma.TransactionClient;

export async function getPredefinedJornada(
  client: JornadaClient,
  empresaId: string
) {
  return (client as PrismaClient).jornadas.findFirst({
    where: {
      empresaId,
      esPredefinida: true,
    },
  });
}

export async function getOrCreateDefaultJornada(
  client: JornadaClient,
  empresaId: string
) {
  const jornadaExistente = await getPredefinedJornada(client, empresaId);

  if (jornadaExistente) {
    return jornadaExistente;
  }

  // NOTE: 'nombre' field has been removed from Jornada model
  // NOTE: limiteInferior/Superior are now global in Empresa.config
  return (client as PrismaClient).jornadas.create({
    data: {
      empresaId,
      horasSemanales: 40,
      config: {
        tipo: 'flexible',
        lunes: { activo: true },
        martes: { activo: true },
        miercoles: { activo: true },
        jueves: { activo: true },
        viernes: { activo: true },
        sabado: { activo: false },
        domingo: { activo: false },
      },
      esPredefinida: true,
      activa: true,
    },
  });
}





