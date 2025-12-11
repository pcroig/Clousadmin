// ========================================
// Empleado Fichajes Page
// ========================================

import { redirect } from 'next/navigation';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default function FichajesEmpleadoPage() {
  redirect('/empleado/mi-espacio/fichajes');
}

