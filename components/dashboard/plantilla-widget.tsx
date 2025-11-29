// ========================================
// Plantilla Widget - Staff Overview Widget
// ========================================

'use client';

import Link from 'next/link';

import { EmpleadoHoverCard } from '@/components/empleado/empleado-hover-card';
import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import { WidgetCard } from '@/components/shared/widget-card';
import type { PlantillaResumen } from '@/lib/calculos/plantilla';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { cn } from '@/lib/utils';

type PlantillaWidgetProps = PlantillaResumen & {
  rol?: 'hr_admin' | 'manager' | 'empleado'; // Para personalizar URLs según rol
  /**
   * Variante de visualización
   * - card: Widget con card (desktop)
   * - compact: Sin card, más compacto (mobile)
   */
  variant?: 'card' | 'compact';
};

export function PlantillaWidget({ 
  trabajando, 
  enPausa, 
  ausentes, 
  sinFichar, 
  fueraDeHorario, 
  rol = 'hr_admin',
  variant = 'card',
}: PlantillaWidgetProps) {
  // URLs según rol
  const baseUrl = rol === 'manager' ? '/manager' : '/hr';
  const hrefPersonas = rol === 'manager' ? '/manager/horario/fichajes' : '/hr/organizacion/personas';
  const hrefFichajes = `${baseUrl}/horario/fichajes`;
  const hrefAusencias = `${baseUrl}/horario/ausencias?estado=confirmada`;

  const items = [
    {
      label: 'Trabajando',
      count: trabajando.count,
      empleados: trabajando.empleados,
      href: hrefFichajes,
    },
    {
      label: 'En pausa',
      count: enPausa.count,
      empleados: enPausa.empleados,
      href: hrefFichajes,
    },
    {
      label: 'Ausentes',
      count: ausentes.count,
      empleados: ausentes.empleados,
      href: hrefAusencias,
    },
    {
      label: 'Sin fichar',
      count: sinFichar.count,
      empleados: sinFichar.empleados,
      href: hrefFichajes,
    },
    {
      label: 'Fuera de horario',
      count: fueraDeHorario.count,
      empleados: fueraDeHorario.empleados,
      href: hrefPersonas,
    },
  ];

  // Versión compacta para mobile (sin card)
  if (variant === 'compact') {
    return (
      <div className="space-y-2">{items.map((item) => (
          <Link key={item.label} href={item.href} className="block">
            <div className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-sm active:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className={cn(MOBILE_DESIGN.text.caption, 'font-semibold text-gray-900')}>
                  {item.label}
                </p>
                <p className={cn(MOBILE_DESIGN.text.tiny)}>{item.count} personas</p>
              </div>
              <div className="flex -space-x-1.5 flex-shrink-0 ml-2">
                {item.empleados.slice(0, 3).map((emp) => (
                  <EmpleadoHoverCard
                    key={`${item.label}-${emp.id}`}
                    empleado={{
                      nombre: emp.primerNombre ?? emp.nombre,
                      apellidos: emp.apellidos,
                      email: emp.email,
                      puesto: emp.puesto,
                      equipoNombre: emp.equipoNombre,
                      fotoUrl: emp.avatar,
                    }}
                    estado={{ label: item.label }}
                    triggerClassName="inline-flex gap-0"
                  >
                    <EmployeeAvatar
                      nombre={emp.nombre}
                      fotoUrl={emp.avatar ?? null}
                      size="sm"
                      className={cn(MOBILE_DESIGN.components.avatar.small, 'border border-white')}
                      fallbackClassName="text-[9px]"
                    />
                  </EmpleadoHoverCard>
                ))}
                {item.count > 3 && (
                  <div className={cn(
                    MOBILE_DESIGN.components.avatar.small,
                    'flex items-center justify-center rounded-full border border-white bg-gray-100 text-[9px] font-semibold text-gray-600'
                  )}>
                    +{item.count - 3}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  // Versión normal con card (desktop)
  return (
    <WidgetCard
      title="Plantilla"
      href={hrefPersonas}
      contentClassName="px-6 pb-6"
      useScroll
    >
        <div className="space-y-2.5">
          {items.map((item) => (
            <Link key={item.label} href={item.href} className="block">
            <div className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-sm cursor-pointer group">
              <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 group-hover:text-gray-700">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-gray-500">{item.count} personas</p>
              </div>
              <div className="flex -space-x-2 flex-shrink-0 ml-3">
                  {item.empleados.slice(0, 4).map((emp) => (
                  <EmpleadoHoverCard
                    key={`${item.label}-${emp.id}`}
                    empleado={{
                      nombre: emp.primerNombre ?? emp.nombre,
                      apellidos: emp.apellidos,
                      email: emp.email,
                      puesto: emp.puesto,
                      equipoNombre: emp.equipoNombre,
                      fotoUrl: emp.avatar,
                    }}
                    estado={{ label: item.label }}
                    triggerClassName="inline-flex gap-0"
                  >
                    <EmployeeAvatar
                      nombre={emp.nombre}
                      fotoUrl={emp.avatar ?? null}
                      size="sm"
                      className="h-8 w-8 border-2 border-white"
                      fallbackClassName="text-[11px]"
                    />
                  </EmpleadoHoverCard>
                ))}
                  {item.count > 4 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[11px] font-semibold text-gray-600">
                      +{item.count - 4}
                  </div>
                )}
              </div>
            </div>
          </Link>
          ))}
        </div>
    </WidgetCard>
  );
}
