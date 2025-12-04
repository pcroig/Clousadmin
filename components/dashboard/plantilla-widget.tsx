// ========================================
// Plantilla Widget - Staff Overview Widget
// ========================================

'use client';

import { useState } from 'react';

import { EmpleadoHoverCard } from '@/components/empleado/empleado-hover-card';
import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import { WidgetCard } from '@/components/shared/widget-card';
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogHeader,
  DialogScrollableContent,
  DialogTitle,
} from '@/components/ui/dialog';
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

type PlantillaItem = {
  key:
    | 'trabajando'
    | 'enPausa'
    | 'ausentes'
    | 'sinFichar'
    | 'fueraDeHorario';
  label: string;
  count: number;
  empleados: PlantillaResumen['trabajando']['empleados'];
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
  const [selectedItem, setSelectedItem] = useState<PlantillaItem | null>(null);

  const items: PlantillaItem[] = [
    {
      key: 'trabajando',
      label: 'Trabajando',
      count: trabajando.count,
      empleados: trabajando.empleados,
    },
    {
      key: 'sinFichar',
      label: 'Sin fichar',
      count: sinFichar.count,
      empleados: sinFichar.empleados,
    },
    {
      key: 'ausentes',
      label: 'Ausentes',
      count: ausentes.count,
      empleados: ausentes.empleados,
    },
    {
      key: 'fueraDeHorario',
      label: 'Fuera de horario',
      count: fueraDeHorario.count,
      empleados: fueraDeHorario.empleados,
    },
    {
      key: 'enPausa',
      label: 'En pausa',
      count: enPausa.count,
      empleados: enPausa.empleados,
    },
  ];

  const scopeLabel = rol === 'hr_admin' ? 'la organización' : 'tu equipo';

  const peopleLabel = (count: number) => `${count} ${count === 1 ? 'persona' : 'personas'}`;

  const handleItemClick = (item: PlantillaItem) => {
    setSelectedItem(item);
  };

  const closeDialog = () => {
    setSelectedItem(null);
  };

  const dialog = (
    <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => {
      if (!open) {
        closeDialog();
      }
    }}>
      <DialogScrollableContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{selectedItem?.label ?? ''}</DialogTitle>
          <DialogDescription>
            {selectedItem ? `${peopleLabel(selectedItem.count)} de ${scopeLabel}` : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="pb-6">
          {selectedItem && selectedItem.empleados.length > 0 ? (
            <ul className="space-y-2">
              {selectedItem.empleados.map((emp) => {
                const nombreCompleto = emp.apellidos
                  ? `${emp.primerNombre ?? emp.nombre} ${emp.apellidos}`
                  : emp.nombre;
                const rolYEquipo = [
                  emp.puesto,
                  emp.equipoNombre,
                ].filter(Boolean).join(' • ') || 'Sin rol asignado';
                return (
                  <li
                    key={emp.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5"
                  >
                    <EmployeeAvatar
                      nombre={emp.nombre}
                      fotoUrl={emp.avatar ?? null}
                      size="sm"
                      className="h-9 w-9 border border-gray-200 flex-shrink-0"
                      fallbackClassName="text-[11px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {nombreCompleto}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {rolYEquipo}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No hay personas en este estado de {scopeLabel}.
            </p>
          )}
        </DialogBody>
      </DialogScrollableContent>
    </Dialog>
  );

  // Versión compacta para mobile (sin card)
  if (variant === 'compact') {
    return (
      <>
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleItemClick(item)}
              className="block w-full text-left"
            >
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2 transition-all hover:border-gray-300 hover:shadow-sm active:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className={cn(MOBILE_DESIGN.text.caption, 'font-semibold text-gray-900')}>
                    {item.label}
                  </p>
                  <p className={cn(MOBILE_DESIGN.text.tiny)}>{peopleLabel(item.count)}</p>
                </div>
                <div className="ml-2 flex -space-x-1.5 flex-shrink-0">
                  {item.empleados.slice(0, 3).map((emp) => (
                    <EmpleadoHoverCard
                      key={`${item.key}-${emp.id}`}
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
                        className={cn(
                          MOBILE_DESIGN.components.avatar.small,
                          'border border-white'
                        )}
                        fallbackClassName="text-[9px]"
                      />
                    </EmpleadoHoverCard>
                  ))}
                  {item.count > 3 && (
                    <div
                      className={cn(
                        MOBILE_DESIGN.components.avatar.small,
                        'flex items-center justify-center rounded-full border border-white bg-gray-100 text-[9px] font-semibold text-gray-600'
                      )}
                    >
                      +{item.count - 3}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        {dialog}
      </>
    );
  }

  // Versión normal con card (desktop)
  return (
    <>
      <WidgetCard
        title="Plantilla"
        contentClassName="px-6 pb-6"
        useScroll
      >
        <div className="space-y-2.5">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleItemClick(item)}
              className="block w-full text-left"
            >
              <div className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2 transition-all hover:border-gray-300 hover:shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 group-hover:text-gray-700">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-gray-500">{peopleLabel(item.count)}</p>
                </div>
                <div className="ml-3 flex -space-x-2 flex-shrink-0">
                  {item.empleados.slice(0, 4).map((emp) => (
                    <EmpleadoHoverCard
                      key={`${item.key}-${emp.id}`}
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
            </button>
          ))}
        </div>
      </WidgetCard>
      {dialog}
    </>
  );
}
