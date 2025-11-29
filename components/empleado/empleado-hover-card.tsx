'use client';

import type { ReactNode } from 'react';

import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

interface EmpleadoHoverCardProps {
  empleado: {
    id?: string;
    nombre: string;
    apellidos?: string | null;
    puesto?: string | null;
    equipo?: string | null;
    equipoNombre?: string | null;
    email?: string | null;
    fotoUrl?: string | null;
  };
  estado?: {
    label: string;
    description?: string;
  };
  children?: ReactNode;
  triggerClassName?: string;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function EmpleadoHoverCard({
  empleado,
  estado,
  children,
  triggerClassName,
  contentClassName,
  align = 'center',
  side = 'top',
}: EmpleadoHoverCardProps) {
  const displayName = [empleado.nombre, empleado.apellidos].filter(Boolean).join(' ').trim() || 'Empleado';
  const equipoLabel = empleado.equipoNombre ?? empleado.equipo ?? null;

  const infoItems: Array<{ label: string; value: ReactNode }> = [
    {
      label: 'Rol',
      value: empleado.puesto ?? <span className="text-muted-foreground">Sin rol definido</span>,
    },
    {
      label: 'Equipo',
      value: equipoLabel ?? <span className="text-muted-foreground">Sin equipo</span>,
    },
    {
      label: 'Email',
      value: empleado.email ? (
        <a href={`mailto:${empleado.email}`} className="text-foreground underline-offset-2 hover:underline">
          {empleado.email}
        </a>
      ) : (
        <span className="text-muted-foreground">Sin email</span>
      ),
    },
  ];

  return (
    <HoverCard openDelay={120} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            'inline-flex max-w-full cursor-help items-center gap-1 text-left align-middle text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            triggerClassName
          )}
        >
          {children ?? displayName}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        align={align}
        side={side}
        className={cn('w-72 space-y-4', contentClassName)}
      >
        <div className="flex items-center gap-3">
          <EmployeeAvatar
            nombre={empleado.nombre}
            apellidos={empleado.apellidos ?? undefined}
            fotoUrl={empleado.fotoUrl ?? undefined}
            size="md"
            className="ring-1 ring-border ring-offset-background"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground leading-tight">{displayName}</p>
            {empleado.puesto ? (
              <p className="text-xs text-muted-foreground">{empleado.puesto}</p>
            ) : null}
            {equipoLabel ? (
              <p className="text-xs text-muted-foreground">{equipoLabel}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {infoItems.map((item) => (
            <div key={item.label} className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <div className="text-sm font-medium text-foreground leading-tight">{item.value}</div>
            </div>
          ))}
        </div>

        {estado ? (
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Estado actual</p>
            <p className="text-sm font-semibold text-foreground">{estado.label}</p>
            {estado.description ? (
              <p className="text-xs text-muted-foreground">{estado.description}</p>
            ) : null}
          </div>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}

