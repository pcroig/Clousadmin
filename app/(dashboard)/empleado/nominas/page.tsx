// ========================================
// Empleado - Nóminas
// ========================================

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function EmpleadoNominasPage() {
  const session = await getSession();
  
  if (!session || session.user.rol !== 'empleado') {
    redirect('/login');
  }

  // Redirect a la versión dentro de mi-espacio
  redirect('/empleado/mi-espacio/nominas');
}




