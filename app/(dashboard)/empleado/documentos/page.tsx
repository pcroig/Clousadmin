// ========================================
// Empleado - Documentos
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function EmpleadoDocumentosPage() {
  const session = await getSession();
  
  if (!session || session.user.rol !== UsuarioRol.empleado) {
    redirect('/login');
  }

  // Redirect a la versión dentro de mi-espacio
  redirect('/empleado/mi-espacio/documentos');
}




