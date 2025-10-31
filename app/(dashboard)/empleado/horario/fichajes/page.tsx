// ========================================
// Empleado Fichajes Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FichajesEmpleadoClient } from './fichajes-empleado-client';
import { obtenerResumenBalance } from '@/lib/calculos/balance-horas';

export default async function FichajesEmpleadoPage() {
  const session = await getSession();

  if (!session || !session.user.empleadoId) {
    redirect('/login');
  }

  // Obtener balance de horas real
  let balanceResumen = {
    diario: 0,
    semanal: 0,
    mensual: 0,
    acumulado: 0,
  };

  try {
    balanceResumen = await obtenerResumenBalance(session.user.empleadoId);
  } catch (error) {
    console.error('Error obteniendo balance:', error);
  }

  return <FichajesEmpleadoClient balanceInicial={balanceResumen} />;
}

