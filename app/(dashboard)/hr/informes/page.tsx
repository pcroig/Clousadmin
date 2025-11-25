// ========================================
// HR Analytics/Informes Page - Optimized with Dynamic Import
// ========================================

import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

// Lazy load analytics (recharts es pesado - ~140KB)
const AnalyticsClient = dynamic(() => import('./analytics-client').then((mod) => ({ default: mod.AnalyticsClient })), {
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        <p className="text-sm text-gray-500">Cargando analytics...</p>
      </div>
    </div>
  ),
  ssr: false, // Charts no necesitan SSR
});

export default async function InformesPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  return <AnalyticsClient />;
}

