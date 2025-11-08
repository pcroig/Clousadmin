// ========================================
// Settings Layout Component (Claude-style)
// ========================================

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

import { UsuarioRol } from '@/lib/constants/enums';

interface SettingsSection {
  id: string;
  label: string;
  href: string;
}

interface SettingsLayoutProps {
  rol: UsuarioRol.hr_admin | 'manager' | 'empleado';
  children: React.ReactNode;
}

export const SettingsLayout = ({ rol, children }: SettingsLayoutProps) => {
  const pathname = usePathname();

  const basePath = useMemo(() => {
    if (rol === UsuarioRol.hr_admin) return '/hr';
    if (rol === UsuarioRol.manager) return '/manager';
    return '/empleado';
  }, [rol]);

  const sections: SettingsSection[] = useMemo(() => {
    const items: SettingsSection[] = [
      {
        id: 'general',
        label: 'General',
        href: `${basePath}/settings`,
      },
      {
        id: 'notifications',
        label: 'Notificaciones',
        href: `${basePath}/settings/notificaciones`,
      },
    ];

    if (rol === UsuarioRol.hr_admin) {
      items.splice(1, 0, {
        id: 'company',
        label: 'Compañía',
        href: `${basePath}/settings/compania`,
      });
      items.push({
        id: 'integrations',
        label: 'Integraciones',
        href: `${basePath}/settings/integraciones`,
      });
    } else if (rol === UsuarioRol.empleado) {
      items.push({
        id: 'integrations',
        label: 'Integraciones',
        href: `${basePath}/settings/integraciones`,
      });
    }

    return items;
  }, [basePath, rol]);

  const isActiveSection = (href: string) => {
    if (href.endsWith('/settings')) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="flex h-full w-full gap-12">
      <aside className="hidden w-72 flex-shrink-0 py-12 lg:block">
        <nav className="sticky top-12 space-y-3 text-sm">
          <span className="px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Configuración</span>

          {sections.map((section) => {
            const active = isActiveSection(section.href);
            return (
              <Link
                key={section.id}
                href={section.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors',
                  active
                    ? 'bg-[#EAE6DE] font-semibold text-gray-900'
                    : 'text-gray-600 hover:bg-[#F4F1EB]'
                )}
              >
                <span className="flex-1">{section.label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-[#1F6FEB]" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto py-12">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
};

