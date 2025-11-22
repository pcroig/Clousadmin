// ========================================
// Bandeja de Entrada - Notificaciones Tab
// ========================================

'use client';

import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { obtenerIconoPorTipo } from '@/lib/notificaciones/helpers';
import { cn } from '@/lib/utils';
import { formatRelativeTimeShort } from '@/lib/utils/formatRelativeTime';

import type { NotificacionUI } from '@/types/Notificacion';
import type { MouseEvent } from 'react';

interface BandejaEntradaNotificacionesProps {
  notificaciones: NotificacionUI[];
  onMarcarLeida?: (id: string) => void;
}

export function BandejaEntradaNotificaciones({
  notificaciones,
  onMarcarLeida,
}: BandejaEntradaNotificacionesProps) {
  const router = useRouter();

  const handleClick = (notificacion: NotificacionUI) => {
    onMarcarLeida?.(notificacion.id);

    const accionUrl = notificacion.metadata?.accionUrl;
    if (accionUrl) {
      router.push(accionUrl);
    }
  };

  const renderAccion = (notificacion: NotificacionUI) => {
    const accionUrl = notificacion.metadata?.accionUrl;
    const accionTexto = notificacion.metadata?.accionTexto;
    const tieneAccionEspecial =
      notificacion.metadata?.requiresModal ||
      notificacion.metadata?.requiresSignature ||
      notificacion.metadata?.requiresSelection;

    if (
      !accionUrl ||
      !accionTexto ||
      !tieneAccionEspecial
    ) {
      return null;
    }

    const handleAccion = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onMarcarLeida?.(notificacion.id);
      router.push(accionUrl);
    };

    return (
      <Button
        type="button"
        size="sm"
        variant="default"
        onClick={handleAccion}
        className="mt-2"
      >
        {accionTexto}
      </Button>
    );
  };

  return (
    <div>
      {notificaciones.length === 0 ? (
        <EmptyState
          layout="inline"
          icon={Bell}
          title="Sin notificaciones"
          description="Te avisaremos aquí cuando haya novedades."
        />
      ) : (
        <div className="divide-y divide-gray-200 border border-gray-200 rounded-2xl overflow-hidden">
          {notificaciones.map((notificacion) => {
            const Icon = obtenerIconoPorTipo(notificacion.tipo);

            return (
              <div
                key={notificacion.id}
                className={cn(
                  'py-4 px-2 sm:px-3 cursor-pointer transition-colors hover:bg-gray-50',
                  !notificacion.leida && 'bg-amber-50/25'
                )}
                onClick={() => handleClick(notificacion)}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <Icon className="h-4 w-4 text-tertiary" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {notificacion.titulo || 'Notificación'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                        <span>{formatRelativeTimeShort(notificacion.fecha)}</span>
                        {!notificacion.leida && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                      </div>
                    </div>

                    {notificacion.mensaje && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {notificacion.mensaje}
                      </p>
                    )}

                    {renderAccion(notificacion)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
