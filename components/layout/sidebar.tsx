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
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

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
  const [openMenus, setOpenMenus] = useState<string[]>(['Bandeja de entrada']);
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
  const hrNavigation = [
    {
      name: 'Dashboard',
      href: '/hr/dashboard',
      icon: Home,
    },
    {
      name: 'Bandeja de entrada',
      icon: Inbox,
      children: [
        { name: 'Solicitudes', href: '/hr/bandeja-entrada?tab=solicitudes' },
        { name: 'Resueltas', href: '/hr/bandeja-entrada?tab=solved' },
        { name: 'Notificaciones', href: '/hr/bandeja-entrada?tab=notificaciones' },
      ],
    },
    {
      name: 'Horario',
      icon: Clock,
      children: [
        { name: 'Fichajes', href: '/hr/horario/fichajes' },
        { name: 'Ausencias', href: '/hr/horario/ausencias' },
      ],
    },
    {
      name: 'Organización',
      icon: Building2,
      children: [
        { name: 'Personas', href: '/hr/organizacion/personas' },
        { name: 'Equipos', href: '/hr/organizacion/equipos' },
        { name: 'Puestos de trabajo', href: '/hr/organizacion/puestos' },
      ],
    },
    {
      name: 'Mi espacio',
      href: '/hr/mi-espacio',
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
    {
      name: 'Configuración',
      href: '/hr/configuracion',
      icon: Settings,
    },
  ];

  // Navegación para Manager (similar a HR pero limitado)
  const managerNavigation = [
    {
      name: 'Dashboard',
      href: '/manager/dashboard',
      icon: Home,
    },
    {
      name: 'Bandeja de entrada',
      icon: Inbox,
      children: [
        { name: 'Solicitudes', href: '/hr/bandeja-entrada?tab=solicitudes' },
        { name: 'Resueltas', href: '/hr/bandeja-entrada?tab=solved' },
        { name: 'Notificaciones', href: '/hr/bandeja-entrada?tab=notificaciones' },
      ],
    },
    {
      name: 'Horario',
      icon: Clock,
      children: [
        { name: 'Fichajes', href: '/hr/horario/fichajes' },
        { name: 'Ausencias', href: '/hr/horario/ausencias' },
      ],
    },
    {
      name: 'Mi espacio',
      href: '/manager/mi-espacio',
      icon: User,
    },
  ];

  // Navegación para Empleado
  const empleadoNavigation = [
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
      icon: User,
      children: [
        { name: 'General', href: '/empleado/mi-espacio?tab=general' },
        { name: 'Ausencias', href: '/empleado/mi-espacio?tab=ausencias' },
        { name: 'Fichajes', href: '/empleado/mi-espacio?tab=fichajes' },
        { name: 'Contratos', href: '/empleado/mi-espacio?tab=contratos' },
        { name: 'Documentos', href: '/empleado/mi-espacio?tab=documentos' },
      ],
    },
  ];

  // Seleccionar navegación según rol
  const navigation =
    rol === 'hr_admin' ? hrNavigation : rol === 'manager' ? managerNavigation : empleadoNavigation;

  const handleLogout = async () => {
    try {
      // Llamar a la acción del servidor para destruir la sesión
      const { logoutAction } = await import('@/app/(auth)/login/actions');
      await logoutAction();

      // Esperar un poco para asegurar que la cookie se ha eliminado
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Hacer hard redirect (usar window.location para forzar recarga)
      window.location.href = '/login';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Intentar redirigir de todas formas
      window.location.href = '/login';
    }
  };

  return (
    <div
      className={`flex h-screen flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo y Toggle */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
        {!isCollapsed && (
          <h1 className="text-lg font-bold text-gray-900">Clousadmin</h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-lg p-1.5 hover:bg-gray-100"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          if (item.children) {
            const isOpen = openMenus.includes(item.name);
            return (
              <div key={item.name}>
                <button
                  onClick={() => !isCollapsed && toggleMenu(item.name)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  title={isCollapsed ? item.name : ''}
                >
                  <div className="flex items-center gap-3">
                    {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>
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

      {/* User Info & Logout */}
      <div className="border-t border-gray-200 p-4">
        {!isCollapsed ? (
          <div className="space-y-3">
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
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center rounded-lg p-2 hover:bg-gray-100"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}
