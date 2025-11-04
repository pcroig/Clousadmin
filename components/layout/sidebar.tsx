// ========================================
// Sidebar Component with User Info
// ========================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Inbox,
  Clock,
  Building2,
  FolderOpen,
  DollarSign,
  BarChart3,
  Settings,
  ChevronDown,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavigationChild {
  name: string;
  href: string;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon?: any;
  children?: NavigationChild[];
}

interface SidebarProps {
  rol: 'hr_admin' | 'manager' | 'empleado';
  usuario: {
    nombre: string;
    apellidos: string;
    avatar?: string | null;
  };
}

export function Sidebar({ rol, usuario }: SidebarProps) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(['Horario', 'Organización']);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) =>
      prev.includes(menu) ? prev.filter((m) => m !== menu) : [...prev, menu]
    );
  };

  const isActive = (path: string) => pathname?.startsWith(path);

  const getInitials = () => {
    return `${usuario.nombre.charAt(0)}${usuario.apellidos.charAt(0)}`.toUpperCase();
  };

  // Navegación para HR
  const hrNavigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/hr/dashboard',
      icon: Home,
    },
    {
      name: 'Bandeja de entrada',
      href: '/hr/bandeja-entrada',
      icon: Inbox,
    },
    {
      name: 'Horario',
      href: '/hr/horario/fichajes',
      icon: Clock,
      children: [
        { name: 'Fichajes', href: '/hr/horario/fichajes' },
        { name: 'Ausencias', href: '/hr/horario/ausencias' },
      ],
    },
    {
      name: 'Organización',
      href: '/hr/organizacion/personas',
      icon: Building2,
      children: [
        { name: 'Personas', href: '/hr/organizacion/personas' },
        { name: 'Equipos', href: '/hr/organizacion/equipos' },
        { name: 'Puestos de trabajo', href: '/hr/organizacion/puestos' },
      ],
    },
    {
      name: 'Mi espacio',
      href: '/hr/mi-espacio?tab=general',
      icon: User,
    },
    {
      name: 'Documentos',
      href: '/hr/documentos',
      icon: FolderOpen,
    },
    {
      name: 'Payroll',
      href: '/hr/payroll',
      icon: DollarSign,
    },
    {
      name: 'Analytics',
      href: '/hr/analytics',
      icon: BarChart3,
    },
  ];

  // Navegación para Manager (similar a HR pero limitado)
  const managerNavigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/manager/dashboard',
      icon: Home,
    },
    {
      name: 'Bandeja de entrada',
      href: '/manager/bandeja-entrada',
      icon: Inbox,
    },
    {
      name: 'Horario',
      href: '/manager/horario/fichajes',
      icon: Clock,
      children: [
        { name: 'Fichajes', href: '/manager/horario/fichajes' },
        { name: 'Ausencias', href: '/manager/horario/ausencias' },
      ],
    },
    {
      name: 'Equipo',
      href: '/manager/equipo',
      icon: Building2,
    },
    {
      name: 'Mi espacio',
      href: '/manager/mi-espacio?tab=general',
      icon: User,
    },
  ];

  // Navegación para Empleado
  const empleadoNavigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/empleado/dashboard',
      icon: Home,
    },
    {
      name: 'Bandeja de entrada',
      href: '/empleado/bandeja-entrada',
      icon: Inbox,
    },
    {
      name: 'Mi espacio',
      href: '/empleado/mi-espacio?tab=general',
      icon: User,
    },
  ];

  // Seleccionar navegación según rol
  const navigation =
    rol === 'hr_admin' ? hrNavigation : rol === 'manager' ? managerNavigation : empleadoNavigation;

  return (
    <div
      className={`relative flex h-screen flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Toggle Button - En el borde */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-4 -right-2.5 z-10 rounded-full p-1 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3 text-gray-600" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-gray-600" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 mt-4">
        {navigation.map((item) => {
          if ('children' in item && item.children) {
            const isOpen = openMenus.includes(item.name);
            return (
              <div key={item.name}>
                {/* Item principal - navegable */}
                <div className="flex items-center gap-1">
                  <Link
                    href={item.href || '#'}
                    className={`flex-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                      isActive(item.href || '')
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={isCollapsed ? item.name : ''}
                  >
                    {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                  {!isCollapsed && (
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <ChevronDown
                        className={`h-4 w-4 text-gray-600 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>
                {/* Submenu */}
                {isOpen && !isCollapsed && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block rounded-lg px-3 py-2 text-sm ${
                          isActive(child.href)
                            ? 'bg-gray-100 font-medium text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href || '#'}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item.href || '')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={isCollapsed ? item.name : ''}
            >
              {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info - Click to Settings */}
      <Link
        href={`/${rol === 'hr_admin' ? 'hr' : rol === 'manager' ? 'manager' : 'empleado'}/settings`}
        className="border-t border-gray-200 p-4 hover:bg-gray-50 transition-colors"
      >
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {usuario.avatar && <AvatarImage src={usuario.avatar} />}
              <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">
                {usuario.nombre} {usuario.apellidos}
              </p>
              <p className="text-xs text-gray-500">
                {rol === 'hr_admin' ? 'HR Admin' : rol === 'manager' ? 'Manager' : 'Empleado'}
              </p>
            </div>
            <Settings className="h-4 w-4 text-gray-400" />
          </div>
        ) : (
          <div className="flex w-full items-center justify-center">
            <Avatar className="h-9 w-9">
              {usuario.avatar && <AvatarImage src={usuario.avatar} />}
              <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </Link>
    </div>
  );
}
