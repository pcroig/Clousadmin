// ========================================
// HR Payroll Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PayrollClient } from './payroll-client';

export default async function PayrollPage() {
  const session = await getSession();

  if (!session || session.user.rol !== 'hr_admin') {
    redirect('/login');
  }

  // Obtener datos reales de nóminas
  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1; // 1-12
  const anioActual = ahora.getFullYear();

  // Obtener todas las nóminas de la empresa (filtrado por empresaId del empleado)
  const nominas = await prisma.nomina.findMany({
    where: {
      empleado: {
        empresaId: session.user.empresaId,
      },
    },
    select: {
      id: true,
      mes: true,
      anio: true,
      salarioBruto: true,
      tieneAnomalias: true,
      verificado: true,
    },
  });

  // Filtrar nóminas del mes actual
  const nominasMesActual = nominas.filter(
    (n) => n.mes === mesActual && n.anio === anioActual
  );

  // Calcular total bruto del mes actual
  const totalBruto = nominasMesActual.reduce((sum, n) => {
    return sum + Number(n.salarioBruto);
  }, 0);

  // Contar nóminas pendientes de revisión (con anomalías o sin verificar)
  const pendientesRevision = nominasMesActual.filter(
    (n) => n.tieneAnomalias || !n.verificado
  ).length;

  // Verificar si hay nóminas
  const hayNominas = nominas.length > 0;

  return (
    <PayrollClient
      nominasMesActual={nominasMesActual.length}
      totalBruto={totalBruto}
      pendientesRevision={pendientesRevision}
      hayNominas={hayNominas}
      mesActual={mesActual}
      anioActual={anioActual}
    />
  );
}

