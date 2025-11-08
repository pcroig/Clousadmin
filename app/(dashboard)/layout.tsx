// ========================================
// Dashboard Layout - Sidebar + Header
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-[#FAF9F5] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        rol={session.user.rol as 'hr_admin' | 'manager' | 'empleado'}
        usuario={{
          nombre: session.user.nombre,
          apellidos: session.user.apellidos,
          avatar: session.user.avatar,
        }}
      />

      {/* Main Content Area - Header + Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <Header rol={session.user.rol as 'hr_admin' | 'manager' | 'empleado'} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full max-w-[1800px] mx-auto px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
