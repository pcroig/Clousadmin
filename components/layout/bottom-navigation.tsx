// ========================================
// Bottom Navigation Component for Mobile
// ========================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Inbox, Clock, User, Settings, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  rol: 'hr_admin' | 'manager' | 'empleado';
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

export function BottomNavigation({ rol }: BottomNavigationProps) {
  const pathname = usePathname();

  // Navegación para Empleado
  const empleadoNavigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/empleado/dashboard',
      icon: Home,
      isActive: (path) => path === '/empleado/dashboard',
    },
    {
      name: 'Bandeja',
      href: '/empleado/bandeja-entrada',
      icon: Inbox,
      isActive: (path) => path.includes('/empleado/bandeja-entrada'),
    },
    {
      name: 'Ausencias',
      href: '/empleado/mi-espacio/ausencias',
      icon: Calendar,
      isActive: (path) => path.includes('/empleado/mi-espacio/ausencias'),
    },
    {
      name: 'Fichajes',
      href: '/empleado/mi-espacio/fichajes',
      icon: Clock,
      isActive: (path) => path.includes('/empleado/mi-espacio/fichajes'),
    },
    {
      name: 'Mi espacio',
      href: '/empleado/mi-espacio/datos',
      icon: User,
      isActive: (path) =>
        path.startsWith('/empleado/mi-espacio/datos') ||
        path.includes('/empleado/mi-espacio/contratos') ||
        path.includes('/empleado/mi-espacio/documentos'),
    },
  ];

  // Navegación para Manager
  const managerNavigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/manager/dashboard',
      icon: Home,
      isActive: (path) => path === '/manager/dashboard',
    },
    {
      name: 'Horario',
      href: '/manager/horario/fichajes',
      icon: Clock,
      isActive: (path) => path.includes('/manager/horario'),
    },
    {
      name: 'Bandeja',
      href: '/manager/bandeja-entrada',
      icon: Inbox,
      isActive: (path) => path.includes('/manager/bandeja-entrada'),
    },
    {
      name: 'Perfil',
      href: '/manager/settings',
      icon: User,
      isActive: (path) => path.includes('/manager/settings'),
    },
  ];

  // Navegación para HR Admin
  const hrNavigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/hr/dashboard',
      icon: Home,
      isActive: (path) => path === '/hr/dashboard',
    },
    {
      name: 'Horario',
      href: '/hr/horario/fichajes',
      icon: Clock,
      isActive: (path) => path.includes('/hr/horario'),
    },
    {
      name: 'Bandeja',
      href: '/hr/bandeja-entrada',
      icon: Inbox,
      isActive: (path) => path.includes('/hr/bandeja-entrada'),
    },
    {
      name: 'Ajustes',
      href: '/hr/settings',
      icon: Settings,
      isActive: (path) => path.includes('/hr/settings'),
    },
  ];

  // Seleccionar navegación según rol
  const navigation =
    rol === 'hr_admin' ? hrNavigation : rol === 'manager' ? managerNavigation : empleadoNavigation;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 sm:hidden">
      <div className="flex items-center justify-around h-16">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(pathname);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                'active:bg-gray-50',
                active
                  ? 'text-[#d97757]'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-colors',
                  active && 'stroke-[2.5]'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium',
                  active && 'font-semibold'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
