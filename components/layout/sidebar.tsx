// ========================================
// Sidebar Component with User Info
// ========================================

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Inbox,
  Clock,
  Building2,
  FolderOpen,
  DollarSign,
  BarChart3,
  Calendar,
  FileText,
  ChevronDown,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  HeadphonesIcon,
  ShieldCheck,
  UserPlus,
  ListChecks,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAvatarStyle } from '@/lib/design-system';
import { toast } from 'sonner';

import { UsuarioRol } from '@/lib/constants/enums';

interface SidebarProps {
  rol: UsuarioRol;
  usuario: {
    nombre: string;
    apellidos: string;
    avatar?: string | null;
  };
}

export function Sidebar({ rol, usuario }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState<string[]>(['Bandeja de entrada']);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) =>
      prev.includes(menu) ? prev.filter((m) => m !== menu) : [...prev, menu]
    );
  };

  const isActive = (path: string) => pathname?.startsWith(path);

  const getInitials = () => {
    return `${usuario.nombre.charAt(0)}${usuario.apellidos.charAt(0)}`.toUpperCase();
  };

  const avatarStyle = getAvatarStyle(`${usuario.nombre} ${usuario.apellidos}`);

  const containerPadding = isCollapsed ? 'px-2 py-6' : 'px-4 py-6';
  const itemHorizontalPadding = isCollapsed ? 'px-0' : 'px-3';
  const itemGap = isCollapsed ? 'gap-0' : 'gap-3';
  const footerPadding = isCollapsed ? 'p-3' : 'p-4';
  const collapsibleTriggerClasses = isCollapsed ? 'justify-center px-0' : `justify-between ${itemHorizontalPadding}`;
  const linkAlignmentClasses = isCollapsed ? `justify-center ${itemHorizontalPadding}` : itemHorizontalPadding;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { logoutAction } = await import('@/app/(auth)/login/actions');
      await logoutAction();
      await new Promise((resolve) => setTimeout(resolve, 100));
      window.location.href = '/login';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
      window.location.href = '/login';
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSettings = () => {
    if (rol === UsuarioRol.hr_admin) {
      router.push('/hr/settings');
      return;
    }

    if (rol === UsuarioRol.manager) {
      router.push('/manager/settings');
      return;
    }

    if (rol === UsuarioRol.empleado) {
      router.push('/empleado/mi-espacio/datos');
      return;
    }

    router.push('/platform/invitaciones');
  };

  const handleSupport = () => {
    window.open('mailto:soporte@clousadmin.com?subject=Soporte', '_blank');
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
      name: 'Nóminas',
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
        { name: 'Solicitudes', href: '/manager/bandeja-entrada?tab=solicitudes' },
        { name: 'Resueltas', href: '/manager/bandeja-entrada?tab=solved' },
        { name: 'Notificaciones', href: '/manager/bandeja-entrada?tab=notificaciones' },
      ],
    },
    {
      name: 'Horario',
      icon: Clock,
      children: [
        { name: 'Fichajes', href: '/manager/horario/fichajes' },
        { name: 'Ausencias', href: '/manager/horario/ausencias' },
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
      href: '/empleado/mi-espacio/datos',
      icon: User,
    },
    {
      name: 'Ausencias',
      href: '/empleado/mi-espacio/ausencias',
      icon: Calendar,
    },
    {
      name: 'Fichajes',
      href: '/empleado/mi-espacio/fichajes',
      icon: Clock,
    },
    {
      name: 'Contratos',
      href: '/empleado/mi-espacio/contratos',
      icon: FileText,
    },
    {
      name: 'Documentos',
      href: '/empleado/mi-espacio/documentos',
      icon: FolderOpen,
    },
  ];

  // Navegación para Platform Admin
  const platformNavigation = [
    {
      name: 'Panel de invitaciones',
      href: '/platform/invitaciones',
      icon: ShieldCheck,
    },
    {
      name: 'Invitar empresas',
      href: '/platform/invitaciones',
      icon: UserPlus,
    },
    {
      name: 'Waitlist',
      href: '/platform/invitaciones#waitlist',
      icon: ListChecks,
    },
  ];

  // Seleccionar navegación según rol
  const navigation =
    rol === UsuarioRol.hr_admin
      ? hrNavigation
      : rol === UsuarioRol.manager
        ? managerNavigation
        : rol === UsuarioRol.empleado
          ? empleadoNavigation
          : platformNavigation;

  return (
    <aside
      className={`relative flex h-screen flex-col bg-white border-r border-gray-200 transition-[width] duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-6 -right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50"
        aria-label={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Navigation */}
      <nav className={`flex-1 space-y-1 overflow-y-auto ${containerPadding}`}>
        {navigation.map((item) => {
          if (item.children) {
            const isOpen = openMenus.includes(item.name);
            return (
              <div key={item.name}>
                <button
                  onClick={() => !isCollapsed && toggleMenu(item.name)}
                  className={`flex w-full items-center rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 ${collapsibleTriggerClasses}`}
                  title={isCollapsed ? item.name : ''}
                >
                  <div className={`flex items-center ${itemGap}`}>
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
              className={`flex items-center ${itemGap} rounded-lg py-2 text-sm font-medium ${linkAlignmentClasses} ${
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

      {/* User Menu Dropdown */}
      <div className="border-t border-gray-200 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`w-full ${footerPadding} hover:bg-gray-50 transition-colors focus:outline-none`}>
              {!isCollapsed ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {usuario.avatar && <AvatarImage src={usuario.avatar} />}
                    <AvatarFallback
                      className="text-sm font-semibold uppercase"
                      style={avatarStyle}
                    >
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden text-left">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {usuario.nombre} {usuario.apellidos}
                    </p>
                    <p className="text-xs text-gray-500">
                      {rol === UsuarioRol.hr_admin
                        ? 'HR Admin'
                        : rol === UsuarioRol.manager
                          ? 'Manager'
                          : rol === UsuarioRol.empleado
                            ? 'Empleado'
                            : 'Platform Admin'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </div>
              ) : (
                <div className="flex w-full items-center justify-center">
                  <Avatar className="h-9 w-9">
                    {usuario.avatar && <AvatarImage src={usuario.avatar} />}
                    <AvatarFallback
                      className="text-xs font-semibold uppercase"
                      style={avatarStyle}
                    >
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            <DropdownMenuItem onClick={handleSettings} disabled={loggingOut}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Ajustes</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSupport} disabled={loggingOut}>
              <HeadphonesIcon className="mr-2 h-4 w-4" />
              <span>Contactar soporte</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={loggingOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
