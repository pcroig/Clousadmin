// ========================================
// Mi Espacio - Contratos Page (Redirect)
// ========================================

import { redirect } from 'next/navigation';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function MiEspacioContratosPage() {
  // Redirigir a la página unificada de Mi Espacio
  redirect('/empleado/mi-espacio');
}
