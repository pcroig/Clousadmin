// ========================================
// Helper: Obtener o crear jornada por defecto
// ========================================
// Devuelve una jornada activa marcada como predefinida para la empresa.
// Si no existe, crea una configuración base mínima.

import type { Prisma, PrismaClient } from '@prisma/client';

type JornadaClient = PrismaClient | Prisma.TransactionClient;

export async function getOrCreateDefaultJornada(
  client: JornadaClient,
  empresaId: string
) {
  const jornadaExistente = await client.jornada.findFirst({
    where: {
      empresaId,
      esPredefinida: true,
      activa: true,
    },
  });

  if (jornadaExistente) {
    return jornadaExistente;
  }

  return client.jornada.create({
    data: {
      empresaId,
      nombre: 'Jornada por Defecto',
      horasSemanales: 40,
      config: {
        tipo: 'flexible',
        limiteInferior: '07:00',
        limiteSuperior: '21:00',
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

