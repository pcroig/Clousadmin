// ========================================
// Dashboard Layout - No Header, Only Sidebar
// ========================================

import { redirect } from 'next/navigation';

import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { PWAInstallBanner } from '@/components/shared/pwa-install-banner';
import { getCurrentUserAvatar, getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const rol = session.user.rol as UsuarioRol;
  const showMobileNav = rol !== UsuarioRol.platform_admin;

  // Obtener avatar desde empleado.fotoUrl (fuente única de verdad)
  const avatarUrl = await getCurrentUserAvatar(session);

  return (
    <div className="flex h-screen bg-[#FAF9F5] overflow-hidden">
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div className="hidden sm:flex">
        <Sidebar
          rol={rol}
          usuario={{
            nombre: session.user.nombre,
            apellidos: session.user.apellidos,
            avatar: avatarUrl,
          }}
        />
      </div>

      {/* Main Content Area - Full height */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <main className="flex-1 overflow-y-auto pb-16 sm:pb-0 scrollbar-thin">
          <div className="h-full max-w-[1800px] mx-auto px-4 py-4 sm:px-8 sm:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Only on mobile */}
      {showMobileNav && (
        <BottomNavigation rol={rol as 'hr_admin' | 'manager' | 'empleado'} />
      )}
      <PWAInstallBanner />
    </div>
  );
}
