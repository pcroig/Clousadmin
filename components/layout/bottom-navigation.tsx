// ========================================
// Bottom Navigation Component for Mobile
// ========================================

'use client';

import {
  Building2,
  Calendar,
  Clock,
  FileText,
  FolderOpen,
  Home,
  MoreHorizontal,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
      name: 'Inicio',
      href: '/empleado/dashboard',
      icon: Home,
      isActive: (path) => path === '/empleado/dashboard',
    },
    {
      name: 'Fichajes',
      href: '/empleado/mi-espacio/fichajes',
      icon: Clock,
      isActive: (path) => path.includes('/empleado/mi-espacio/fichajes'),
    },
    {
      name: 'Ausencias',
      href: '/empleado/mi-espacio/ausencias',
      icon: Calendar,
      isActive: (path) => path.includes('/empleado/mi-espacio/ausencias'),
    },
    {
      name: 'Documentos',
      href: '/empleado/mi-espacio/documentos',
      icon: FolderOpen,
      isActive: (path) => path.includes('/empleado/mi-espacio/documentos'),
    },
    {
      name: 'Otros',
      href: '/empleado/mi-espacio/datos',
      icon: MoreHorizontal,
      isActive: (path) =>
        path.includes('/empleado/mi-espacio/datos') ||
        path.includes('/empleado/mi-espacio/contratos') ||
        path.includes('/empleado/mi-espacio/nominas'),
    },
  ];

  // Navegación para Manager (4 items - Mi Espacio va en avatar)
  const managerNavigation: NavItem[] = [
    {
      name: 'Inicio',
      href: '/manager/dashboard',
      icon: Home,
      isActive: (path) => path === '/manager/dashboard',
    },
    {
      name: 'Fichajes',
      href: '/manager/horario/fichajes',
      icon: Clock,
      isActive: (path) => path.includes('/manager/horario/fichajes'),
    },
    {
      name: 'Ausencias',
      href: '/manager/horario/ausencias',
      icon: Calendar,
      isActive: (path) => path.includes('/manager/horario/ausencias'),
    },
    {
      name: 'Equipo',
      href: '/manager/equipo',
      icon: Users,
      isActive: (path) => path.includes('/manager/equipo'),
    },
  ];

  // Navegación para HR Admin
  const hrNavigation: NavItem[] = [
    {
      name: 'Inicio',
      href: '/hr/dashboard',
      icon: Home,
      isActive: (path) => path === '/hr/dashboard',
    },
    {
      name: 'Fichajes',
      href: '/hr/horario/fichajes',
      icon: Clock,
      isActive: (path) => path.includes('/hr/horario/fichajes'),
    },
    {
      name: 'Ausencias',
      href: '/hr/horario/ausencias',
      icon: Calendar,
      isActive: (path) => path.includes('/hr/horario/ausencias'),
    },
    {
      name: 'Org',
      href: '/hr/organizacion/personas',
      icon: Building2,
      isActive: (path) => path.includes('/hr/organizacion'),
    },
    {
      name: 'Otros',
      href: '/hr/documentos',
      icon: MoreHorizontal,
      isActive: (path) =>
        path.includes('/hr/documentos') ||
        path.includes('/hr/payroll') ||
        path.includes('/hr/informes'),
    },
  ];

  // Seleccionar navegación según rol
  const navigation =
    rol === 'hr_admin' ? hrNavigation : rol === 'manager' ? managerNavigation : empleadoNavigation;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.08)] sm:hidden">
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
