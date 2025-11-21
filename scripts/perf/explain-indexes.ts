import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ExplainResult = Array<{ 'QUERY PLAN': string }>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function explainEmpleados(empresaId: string): Promise<ExplainResult> {
  return prisma.$queryRaw`
    EXPLAIN ANALYZE
    SELECT "id"
    FROM "empleados"
    WHERE "empresaId" = ${empresaId} AND "activo" = true
    ORDER BY "apellidos" ASC
    LIMIT 50
  `;
}

async function explainCompensaciones(
  empresaId: string,
  inicio: Date,
  fin: Date
): Promise<ExplainResult> {
  return prisma.$queryRaw`
    EXPLAIN ANALYZE
    SELECT "id"
    FROM "compensaciones_horas_extra"
    WHERE "empresaId" = ${empresaId}
      AND "createdAt" >= ${inicio}
      AND "createdAt" < ${fin}
    ORDER BY "createdAt" DESC
    LIMIT 100
  `;
}

async function main() {
  const empresaId = requireEnv('EXPLAIN_EMPRESA_ID');
  const inicioRango = process.env.EXPLAIN_COMPENSACIONES_START
    ? new Date(process.env.EXPLAIN_COMPENSACIONES_START)
    : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const finRango = process.env.EXPLAIN_COMPENSACIONES_END
    ? new Date(process.env.EXPLAIN_COMPENSACIONES_END)
    : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

  console.log('▶️ Ejecutando EXPLAIN ANALYZE para empleados activos...');
  const empleadosPlan = await explainEmpleados(empresaId);
  empleadosPlan.forEach((row) => console.log(row['QUERY PLAN']));

  console.log('\n▶️ Ejecutando EXPLAIN ANALYZE para compensaciones por rango...');
  const compensacionesPlan = await explainCompensaciones(empresaId, inicioRango, finRango);
  compensacionesPlan.forEach((row) => console.log(row['QUERY PLAN']));
}

main()
  .catch((error) => {
    console.error('[scripts/perf/explain-indexes] Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

