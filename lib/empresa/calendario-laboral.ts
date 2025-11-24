import type { Prisma, PrismaClient } from '@prisma/client';

import type { DiasLaborables } from '@/lib/calculos/dias-laborables';
import { asJsonValue } from '@/lib/prisma/json';

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function persistDiasLaborables(
  client: DbClient,
  empresaId: string,
  diasLaborables: DiasLaborables
) {
  const empresa = await client.empresa.findUnique({
    where: { id: empresaId },
    select: { config: true },
  });

  if (!empresa) {
    throw new Error('Empresa no encontrada');
  }

  const configActual =
    typeof empresa.config === 'object' && empresa.config !== null
      ? (empresa.config as Record<string, unknown>)
      : {};
  const nuevaConfig = asJsonValue({
    ...configActual,
    diasLaborables,
  });

  await client.empresa.update({
    where: { id: empresaId },
    data: {
      config: nuevaConfig,
    },
  });
}

