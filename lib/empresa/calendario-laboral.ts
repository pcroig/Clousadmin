import { asJsonValue } from '@/lib/prisma/json';

import type { DiasLaborables } from '@/lib/calculos/dias-laborables';
import type { Prisma, PrismaClient } from '@prisma/client';


type DbClient = PrismaClient | Prisma.TransactionClient;

export async function persistDiasLaborables(
  client: DbClient,
  empresaId: string,
  diasLaborables: DiasLaborables
) {
  const empresa = await client.empresas.findUnique({
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

  await client.empresas.update({
    where: { id: empresaId },
    data: {
      config: nuevaConfig,
    },
  });
}

