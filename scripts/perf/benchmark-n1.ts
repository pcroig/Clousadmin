import { performance } from 'node:perf_hooks';
import { PrismaClient } from '@prisma/client';

import { calcularBalanceMensualBatch } from '../../lib/calculos/balance-horas';

const prisma = new PrismaClient();
let queryCounter = 0;

prisma.$on('query', () => {
  queryCounter += 1;
});

function popQueryCount() {
  const current = queryCounter;
  queryCounter = 0;
  return current;
}

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function benchmarkBolsaHoras(empresaId: string, mes: number, anio: number) {
  const empleados = await prisma.empleado.findMany({
    where: { empresaId, activo: true },
    select: { id: true },
  });

  const empleadoIds = empleados.map((e) => e.id);
  if (empleadoIds.length === 0) {
    console.log('[Bolsa Horas] No hay empleados activos para evaluar');
    return;
  }

  popQueryCount();
  const start = performance.now();
  await calcularBalanceMensualBatch(empresaId, empleadoIds, mes, anio);
  const duration = performance.now() - start;
  const queries = popQueryCount();
  console.log(
    `[Bolsa Horas] Empleados=${empleadoIds.length} | ${duration.toFixed(2)}ms | ${queries} queries`
  );
}

async function benchmarkRevisionFichajes(empresaId: string) {
  popQueryCount();
  const start = performance.now();

  const autoCompletados = await prisma.autoCompletado.findMany({
    where: {
      empresaId,
      estado: 'pendiente',
      tipo: 'fichaje_revision',
    },
    select: {
      id: true,
      datosOriginales: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 200,
  });

  const fichajeIds = Array.from(
    new Set(
      autoCompletados
        .map((ac) => {
          const datosOriginales = ac.datosOriginales as { fichajeId?: string } | null;
          return datosOriginales?.fichajeId;
        })
        .filter((id): id is string => Boolean(id))
    )
  );

  if (fichajeIds.length > 0) {
    await prisma.fichaje.findMany({
      where: { id: { in: fichajeIds } },
      select: {
        id: true,
        empleado: {
          select: {
            id: true,
            jornada: {
              select: {
                id: true,
                nombre: true,
                horasSemanales: true,
                config: true,
              },
            },
          },
        },
        eventos: {
          orderBy: { hora: 'asc' },
          select: {
            id: true,
            tipo: true,
            hora: true,
          },
        },
      },
    });
  }

  const duration = performance.now() - start;
  const queries = popQueryCount();
  console.log(
    `[Revisión Fichajes] AutoCompletados=${autoCompletados.length} | ${duration.toFixed(
      2
    )}ms | ${queries} queries`
  );
}

async function benchmarkEventosNomina(empresaId: string) {
  popQueryCount();
  const start = performance.now();

  const eventos = await prisma.eventoNomina.findMany({
    where: { empresaId },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    take: 12,
    include: {
      _count: {
        select: { nominas: true },
      },
      nominas: {
        select: {
          id: true,
          complementosPendientes: true,
          alertas: {
            where: { resuelta: false },
            select: { id: true, tipo: true },
          },
        },
      },
    },
  });

  let rangoInicio: Date | null = null;
  let rangoFin: Date | null = null;

  for (const evento of eventos) {
    const inicio = new Date(evento.anio, evento.mes - 1, 1);
    const fin = new Date(evento.anio, evento.mes, 1);
    if (!rangoInicio || inicio < rangoInicio) {
      rangoInicio = inicio;
    }
    if (!rangoFin || fin > rangoFin) {
      rangoFin = fin;
    }
  }

  if (rangoInicio && rangoFin) {
    await prisma.compensacionHoraExtra.findMany({
      where: {
        empresaId,
        createdAt: {
          gte: rangoInicio,
          lt: rangoFin,
        },
      },
      select: {
        id: true,
        estado: true,
        horasBalance: true,
        createdAt: true,
      },
    });
  }

  const duration = performance.now() - start;
  const queries = popQueryCount();
  console.log(
    `[Eventos Nómina] Eventos=${eventos.length} | ${duration.toFixed(2)}ms | ${queries} queries`
  );
}

async function main() {
  const empresaId = requireEnv('BENCH_EMPRESA_ID');
  const mes = Number(requireEnv('BENCH_MES', `${new Date().getMonth() + 1}`));
  const anio = Number(requireEnv('BENCH_ANIO', `${new Date().getFullYear()}`));

  await benchmarkBolsaHoras(empresaId, mes, anio);
  await benchmarkRevisionFichajes(empresaId);
  await benchmarkEventosNomina(empresaId);
}

main()
  .catch((error) => {
    console.error('[scripts/perf/benchmark-n1] Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

