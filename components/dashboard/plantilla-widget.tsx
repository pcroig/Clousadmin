// ========================================
// Plantilla Widget - Staff Overview Widget
// ========================================

'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/components/shared/utils';
import { WidgetCard } from '@/components/shared/widget-card';
import { getAvatarStyle } from '@/lib/design-system';

interface EmpleadoResumen {
  nombre: string;
  avatar?: string;
}

interface PlantillaWidgetProps {
  trabajando: {
    count: number;
    empleados: EmpleadoResumen[];
  };
  ausentes: {
    count: number;
    empleados: EmpleadoResumen[];
  };
  sinFichar: {
    count: number;
    empleados: EmpleadoResumen[];
  };
  rol?: 'hr_admin' | 'manager' | 'empleado'; // Para personalizar URLs según rol
}

export function PlantillaWidget({ trabajando, ausentes, sinFichar, rol = 'hr_admin' }: PlantillaWidgetProps) {
  // URLs según rol
  const baseUrl = rol === 'manager' ? '/manager' : '/hr';
  const hrefPersonas = rol === 'manager' ? '/manager/horario/fichajes' : '/hr/organizacion/personas';
  const hrefFichajes = `${baseUrl}/horario/fichajes`;
  const hrefAusencias = `${baseUrl}/horario/ausencias?estado=confirmada`;

  return (
    <WidgetCard
      title="Plantilla"
      href={hrefPersonas}
      contentClassName="px-6 pb-6"
    >
        <div className="space-y-2.5">
          {/* Trabajando */}
          <Link href={hrefFichajes} className="block">
            <div className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-sm cursor-pointer group">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 group-hover:text-gray-700">Trabajando</p>
                <p className="text-[11px] text-gray-500">{trabajando.count} personas</p>
              </div>
              <div className="flex -space-x-2 flex-shrink-0 ml-3">
                {trabajando.empleados.slice(0, 4).map((emp, idx) => {
                  const avatarStyle = getAvatarStyle(emp.nombre);

                  return (
                    <Avatar
                      key={idx}
                      className="h-8 w-8 border-2 border-white"
                    >
                      {emp.avatar && <AvatarImage src={emp.avatar} />}
                      <AvatarFallback
                        className="text-[11px] font-semibold uppercase"
                        style={avatarStyle}
                      >
                        {getInitials(emp.nombre)}
                      </AvatarFallback>
                    </Avatar>
                  );
                })}
                {trabajando.count > 4 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-accent-light text-[11px] font-semibold text-accent">
                    +{trabajando.count - 4}
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Ausentes */}
          <Link href={hrefAusencias} className="block">
            <div className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-sm cursor-pointer group">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 group-hover:text-gray-700">Ausentes</p>
                <p className="text-[11px] text-gray-500">{ausentes.count} personas</p>
              </div>
              <div className="flex -space-x-2 flex-shrink-0 ml-3">
                {ausentes.empleados.slice(0, 4).map((emp, idx) => {
                  const avatarStyle = getAvatarStyle(emp.nombre);

                  return (
                    <Avatar
                      key={idx}
                      className="h-8 w-8 border-2 border-white"
                    >
                      {emp.avatar && <AvatarImage src={emp.avatar} />}
                      <AvatarFallback
                        className="text-[11px] font-semibold uppercase"
                        style={avatarStyle}
                      >
                        {getInitials(emp.nombre)}
                      </AvatarFallback>
                    </Avatar>
                  );
                })}
                {ausentes.count > 4 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-warning-light text-[11px] font-semibold text-warning">
                    +{ausentes.count - 4}
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Sin fichar */}
          <Link href={hrefFichajes} className="block">
            <div className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-sm cursor-pointer group">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 group-hover:text-gray-700">Sin fichar</p>
                <p className="text-[11px] text-gray-500">{sinFichar.count} personas</p>
              </div>
              <div className="flex -space-x-2 flex-shrink-0 ml-3">
                {sinFichar.empleados.slice(0, 4).map((emp, idx) => {
                  const avatarStyle = getAvatarStyle(emp.nombre);

                  return (
                    <Avatar
                      key={idx}
                      className="h-8 w-8 border-2 border-white"
                    >
                      {emp.avatar && <AvatarImage src={emp.avatar} />}
                      <AvatarFallback
                        className="text-[11px] font-semibold uppercase"
                        style={avatarStyle}
                      >
                        {getInitials(emp.nombre)}
                      </AvatarFallback>
                    </Avatar>
                  );
                })}
                {sinFichar.count > 4 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-error-light text-[11px] font-semibold text-error">
                    +{sinFichar.count - 4}
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>
    </WidgetCard>
  );
}
