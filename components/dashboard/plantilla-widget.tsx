// ========================================
// Plantilla Widget - Staff Overview Widget
// ========================================

'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/components/shared/utils';
import { WidgetCard } from '@/components/shared/widget-card';

interface EmpleadoResumen {
  nombre: string;
  avatar?: string;
}

interface PlantillaWidgetProps {
  trabajando: {
    count: number;
    empleados: EmpleadoResumen[];
  };
  ausencias: {
    count: number;
    empleados: EmpleadoResumen[];
  };
  vacaciones: {
    count: number;
    empleados: EmpleadoResumen[];
  };
}

export function PlantillaWidget({ trabajando, ausencias, vacaciones }: PlantillaWidgetProps) {

  return (
    <WidgetCard
      title="Plantilla"
      href="/hr/organizacion/personas"
      contentClassName="px-6 pb-6"
    >
        <div className="space-y-2.5">
          {/* Trabajando */}
          <Link href="/hr/horario/fichajes" className="block">
            <div className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-sm cursor-pointer group">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 group-hover:text-gray-700">Trabajando</p>
                <p className="text-[11px] text-gray-500">{trabajando.count} personas</p>
              </div>
              <div className="flex -space-x-2 flex-shrink-0 ml-3">
                {trabajando.empleados.slice(0, 4).map((emp, idx) => (
                  <Avatar
                    key={idx}
                    className="h-8 w-8 border-2 border-white rounded-lg"
                  >
                    {emp.avatar && <AvatarImage src={emp.avatar} />}
                    <AvatarFallback className="bg-accent text-white text-[11px] font-medium rounded-lg">
                      {getInitials(emp.nombre)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {trabajando.count > 4 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-white bg-accent-light text-[11px] font-semibold text-accent">
                    +{trabajando.count - 4}
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Ausencias */}
          <Link href="/hr/horario/ausencias?estado=en_curso" className="block">
            <div className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-sm cursor-pointer group">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 group-hover:text-gray-700">Ausencias</p>
                <p className="text-[11px] text-gray-500">{ausencias.count} personas</p>
              </div>
              <div className="flex -space-x-2 flex-shrink-0 ml-3">
                {ausencias.empleados.slice(0, 4).map((emp, idx) => (
                  <Avatar
                    key={idx}
                    className="h-8 w-8 border-2 border-white rounded-lg"
                  >
                    {emp.avatar && <AvatarImage src={emp.avatar} />}
                    <AvatarFallback className="bg-warning text-white text-[11px] font-medium rounded-lg">
                      {getInitials(emp.nombre)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {ausencias.count > 4 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-white bg-warning-light text-[11px] font-semibold text-warning">
                    +{ausencias.count - 4}
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Vacaciones */}
          <Link href="/hr/horario/ausencias?tipo=vacaciones" className="block">
            <div className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-sm cursor-pointer group">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 group-hover:text-gray-700">Vacaciones</p>
                <p className="text-[11px] text-gray-500">{vacaciones.count} personas</p>
              </div>
              <div className="flex -space-x-2 flex-shrink-0 ml-3">
                {vacaciones.empleados.slice(0, 4).map((emp, idx) => (
                  <Avatar
                    key={idx}
                    className="h-8 w-8 border-2 border-white rounded-lg"
                  >
                    {emp.avatar && <AvatarImage src={emp.avatar} />}
                    <AvatarFallback className="bg-info text-white text-[11px] font-medium rounded-lg">
                      {getInitials(emp.nombre)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {vacaciones.count > 4 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-white bg-info-light text-[11px] font-semibold text-info">
                    +{vacaciones.count - 4}
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>
    </WidgetCard>
  );
}
