// ========================================
// Ausencias Widget - Absences Widget
// ========================================
// Shows employee absence balance and upcoming/past absences

'use client';

import { memo } from 'react';
import { Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FechaCalendar } from '@/components/shared/fecha-calendar';
import { WidgetCard } from './widget-card';
import {
  getAusenciaBadgeVariant,
  getAusenciaEstadoLabel,
  getAusenciaTipoColor,
  formatFechaParaDisplay,
} from '@/lib/utils/formatters';

export interface AusenciaItem {
  id: string;
  fecha: Date;
  fechaFin?: Date;
  tipo: string;
  dias: number;
  estado: 'pendiente_aprobacion' | 'en_curso' | 'completada' | 'auto_aprobada' | 'rechazada' | 'cancelada' | 'pendiente' | 'aprobada';
}

interface AusenciasWidgetProps {
  diasAcumulados: number;
  diasDisponibles: number;
  diasUtilizados: number;
  proximasAusencias?: AusenciaItem[];
  ausenciasPasadas?: AusenciaItem[];
  periodo?: string;
  onOpenModal?: () => void;
  onClickAusencia?: (id: string) => void;
}

export const AusenciasWidget = memo(function AusenciasWidget({
  diasAcumulados,
  diasDisponibles,
  diasUtilizados,
  proximasAusencias = [],
  ausenciasPasadas = [],
  periodo = 'De enero de 2024 a diciembre de 2024',
  onOpenModal,
  onClickAusencia,
}: AusenciasWidgetProps) {

  return (
    <WidgetCard
      title="Ausencias"
      href="/empleado/horario/ausencias"
      height="h-[580px]"
      className="relative"
      contentClassName="overflow-y-auto px-6 pb-4"
      headerAction={
        onOpenModal && (
          <Button
            onClick={onOpenModal}
            size="sm"
            variant="ghost"
            className="text-[11px] h-7 px-2 hover:bg-gray-100"
          >
            Abrir ausencia
          </Button>
        )
      }
    >
        <div className="space-y-4">
          {/* Selector de periodo */}
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <button className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>{periodo}</span>
            <button className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Estadísticas principales */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {diasAcumulados.toFixed(1)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1 uppercase">Días acumulados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {diasDisponibles.toFixed(1)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1 uppercase">Días disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {diasUtilizados.toFixed(1)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1 uppercase">Días utilizados</div>
            </div>
          </div>

          {/* Próximas ausencias */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-medium text-gray-400">Próximas ausencias</h3>
            {proximasAusencias.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-4">No hay próximas ausencias</p>
            ) : (
              proximasAusencias.map((ausencia) => {
                const fechas = formatFechaParaDisplay(ausencia.fecha, ausencia.fechaFin);
                return (
                  <div
                    key={ausencia.id}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
                    onClick={() => onClickAusencia?.(ausencia.id)}
                  >
                    <div className="flex items-center gap-2">
                      {ausencia.fechaFin ? (
                        <>
                          <FechaCalendar date={ausencia.fecha} />
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                          <FechaCalendar date={ausencia.fechaFin} />
                        </>
                      ) : (
                        <FechaCalendar date={ausencia.fecha} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900">{ausencia.tipo}</p>
                      <p className="text-[11px] text-gray-500">{ausencia.dias} {ausencia.dias === 1 ? 'día' : 'días'}</p>
                    </div>
                    <Badge variant={getAusenciaBadgeVariant(ausencia.estado)} className="text-[10px] px-2 py-0.5">
                      {getAusenciaEstadoLabel(ausencia.estado)}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>

          {/* Ausencias pasadas */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-medium text-gray-400">Ausencias pasadas</h3>
            {ausenciasPasadas.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-4">No hay ausencias pasadas</p>
            ) : (
              ausenciasPasadas.map((ausencia) => {
                const fechas = formatFechaParaDisplay(ausencia.fecha, ausencia.fechaFin);
                return (
                  <div
                    key={ausencia.id}
                    className="flex items-center gap-3 py-2 opacity-60 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2 hover:opacity-100"
                    onClick={() => onClickAusencia?.(ausencia.id)}
                  >
                    <div className="flex items-center gap-2">
                      {ausencia.fechaFin ? (
                        <>
                          <FechaCalendar date={ausencia.fecha} />
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                          <FechaCalendar date={ausencia.fechaFin} />
                        </>
                      ) : (
                        <FechaCalendar date={ausencia.fecha} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900">{ausencia.tipo}</p>
                      <p className="text-[11px] text-gray-500">{ausencia.dias} {ausencia.dias === 1 ? 'día' : 'días'}</p>
                    </div>
                    <Badge variant={getAusenciaBadgeVariant(ausencia.estado)} className="text-[10px] px-2 py-0.5">
                      {getAusenciaEstadoLabel(ausencia.estado)}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
    </WidgetCard>
  );
});
