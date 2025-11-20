// ========================================
// Empleado - Contratos
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

export default async function EmpleadoContratosPage() {
  const session = await getSession();
  
  if (!session || session.user.rol !== UsuarioRol.empleado) {
    redirect('/login');
  }

  // Redirect a la versión dentro de mi-espacio
  redirect('/empleado/mi-espacio/contratos');
}




