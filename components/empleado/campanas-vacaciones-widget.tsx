'use client';

// ========================================
// Widget de Campañas de Vacaciones para Empleado
// ========================================

import { memo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetCard } from '@/components/shared/widget-card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { EstadoAusencia } from '@/lib/constants/enums';

interface CampanaInfo {
  id: string;
  titulo: string;
  fechaInicioObjetivo: Date;
  fechaFinObjetivo: Date;
  miPreferencia?: {
    id: string;
    estado: string;
    fechasPreferidas: string[];
  } | null;
}

interface CampanasVacacionesWidgetProps {
  campanaActiva: CampanaInfo | null;
  onVerDetalles?: (campanaId: string) => void;
}

export const CampanasVacacionesWidget = memo(function CampanasVacacionesWidget({
  campanaActiva,
  onVerDetalles,
}: CampanasVacacionesWidgetProps) {
  if (!campanaActiva) {
    return null; // No mostrar widget si no hay campaña activa
  }

  const estadoBadgeVariant = campanaActiva.miPreferencia?.estado === 'aceptada' 
    ? 'success' 
    : campanaActiva.miPreferencia?.estado === EstadoAusencia.pendiente_aprobacion
    ? 'warning'
    : 'default';

  const estadoLabel = campanaActiva.miPreferencia?.estado === 'aceptada'
    ? 'Participando'
    : campanaActiva.miPreferencia?.estado === EstadoAusencia.pendiente_aprobacion
    ? 'Pendiente'
    : 'Sin participar';

  return (
    <WidgetCard
      title="Campaña de Vacaciones"
      height="h-auto"
      className="bg-gradient-to-br from-blue-50 to-white border-blue-200"
    >
      <div className="space-y-3 px-6 pb-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">
            {campanaActiva.titulo}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {format(new Date(campanaActiva.fechaInicioObjetivo), 'dd MMM', { locale: es })} - {' '}
              {format(new Date(campanaActiva.fechaFinObjetivo), 'dd MMM yyyy', { locale: es })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant={estadoBadgeVariant} className="text-[10px]">
            {estadoLabel}
          </Badge>
          {onVerDetalles && (
            <Button
              onClick={() => onVerDetalles(campanaActiva.id)}
              size="sm"
              variant="outline"
              className="text-[11px] h-7 px-3"
            >
              Ver detalles
            </Button>
          )}
        </div>

        {campanaActiva.miPreferencia && campanaActiva.miPreferencia.fechasPreferidas.length > 0 && (
          <div className="bg-blue-100 rounded-lg p-2 mt-2">
            <p className="text-[10px] text-blue-900 font-medium mb-1">
              Tus fechas preferidas:
            </p>
            <p className="text-[11px] text-blue-800">
              {campanaActiva.miPreferencia.fechasPreferidas.slice(0, 2).map((fecha) => 
                format(new Date(fecha), 'dd MMM', { locale: es })
              ).join(', ')}
              {campanaActiva.miPreferencia.fechasPreferidas.length > 2 && 
                ` y ${campanaActiva.miPreferencia.fechasPreferidas.length - 2} más`
              }
            </p>
          </div>
        )}

        {!campanaActiva.miPreferencia && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
            <p className="text-[11px] text-yellow-900">
              <Clock className="w-3 h-3 inline mr-1" />
              Aún no has participado en esta campaña
            </p>
          </div>
        )}
      </div>
    </WidgetCard>
  );
});





