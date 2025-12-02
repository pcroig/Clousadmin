'use client';

import { Bell, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UsuarioRol } from '@/lib/constants/enums';

interface MobileHeaderProps {
  usuario: {
    nombre: string;
    apellidos: string;
    email: string;
    avatar?: string | null;
  };
  rol: UsuarioRol;
  notificacionesCount?: number;
}

export function MobileHeader({ usuario, rol, notificacionesCount = 0 }: MobileHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const basePath =
    rol === UsuarioRol.hr_admin ? '/hr' :
    rol === UsuarioRol.manager ? '/manager' :
    '/empleado';

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const showMiEspacio = rol === UsuarioRol.hr_admin || rol === UsuarioRol.manager;

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Avatar y menú de ajustes */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <EmployeeAvatar
                nombre={usuario.nombre}
                apellidos={usuario.apellidos}
                fotoUrl={usuario.avatar}
                size="sm"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-gray-900">
                {usuario.nombre} {usuario.apellidos}
              </p>
              <p className="text-xs text-gray-500">{usuario.email}</p>
            </div>
            <DropdownMenuSeparator />

            {showMiEspacio && (
              <>
                <DropdownMenuItem asChild>
                  <Link href={`${basePath}/mi-espacio`} className="cursor-pointer">
                    Mi Espacio
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem asChild>
              <Link href={`${basePath}/settings`} className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Ajustes
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bandeja de entrada */}
        <Link href={`${basePath}/bandeja-entrada`}>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-gray-600" />
            {notificacionesCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notificacionesCount > 9 ? '9+' : notificacionesCount}
              </span>
            )}
          </Button>
        </Link>
      </div>
    </div>
  );
}
