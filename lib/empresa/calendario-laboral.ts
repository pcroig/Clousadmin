import type { Prisma, PrismaClient } from '@prisma/client';
import type { DiasLaborables } from '@/lib/calculos/dias-laborables';

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

  const configActual = empresa.config as Prisma.JsonValue;
  const nuevaConfig: Prisma.JsonValue = {
    ...(typeof configActual === 'object' && configActual !== null ? configActual : {}),
    diasLaborables,
  };

  await client.empresa.update({
    where: { id: empresaId },
    data: {
      config: nuevaConfig as Prisma.InputJsonValue,
    },
  });
}

