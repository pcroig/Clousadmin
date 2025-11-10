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
import { EstadoAusencia } from '@/lib/constants/enums';

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
  estado: EstadoAusencia.pendiente_aprobacion | 'en_curso' | 'completada' | 'auto_aprobada' | 'rechazada' | 'cancelada' | 'pendiente' | 'aprobada';
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
      height="h-[480px] sm:h-[580px]"
      className="relative"
      contentClassName="overflow-y-auto px-4 sm:px-6 pb-4"
      headerAction={
        onOpenModal && (
          <Button
            onClick={onOpenModal}
            size="sm"
            variant="outline"
            className="text-[10px] sm:text-[11px] h-7 px-2 sm:px-3 border-gray-300"
          >
            <span className="hidden sm:inline">Solicitar ausencia</span>
            <span className="sm:hidden">Solicitar</span>
          </Button>
        )
      }
    >
        <div className="space-y-3 sm:space-y-4">
          {/* Selector de periodo */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500">
            <button className="p-1 hover:bg-gray-100 rounded min-h-[32px] min-w-[32px] flex items-center justify-center">
              <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <span className="text-center">{periodo}</span>
            <button className="p-1 hover:bg-gray-100 rounded min-h-[32px] min-w-[32px] flex items-center justify-center">
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

          {/* Estadísticas principales */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {diasAcumulados.toFixed(1)}
              </div>
              <div className="text-[9px] sm:text-[11px] text-gray-500 mt-1 uppercase">Días acumulados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {diasDisponibles.toFixed(1)}
              </div>
              <div className="text-[9px] sm:text-[11px] text-gray-500 mt-1 uppercase">Días disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {diasUtilizados.toFixed(1)}
              </div>
              <div className="text-[9px] sm:text-[11px] text-gray-500 mt-1 uppercase">Días utilizados</div>
            </div>
          </div>

          {/* Próximas ausencias */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-[13px] font-medium text-gray-400">Próximas ausencias</h3>
            {proximasAusencias.length === 0 ? (
              <p className="text-[10px] sm:text-[11px] text-gray-400 text-center py-4">No hay próximas ausencias</p>
            ) : (
              proximasAusencias.map((ausencia) => {
                const fechas = formatFechaParaDisplay(ausencia.fecha, ausencia.fechaFin);
                return (
                  <div
                    key={ausencia.id}
                    className="flex items-center gap-2 sm:gap-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2 min-h-[44px]"
                    onClick={() => onClickAusencia?.(ausencia.id)}
                  >
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      {ausencia.fechaFin ? (
                        <>
                          <FechaCalendar date={ausencia.fecha} />
                          <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400" />
                          <FechaCalendar date={ausencia.fechaFin} />
                        </>
                      ) : (
                        <FechaCalendar date={ausencia.fecha} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-[13px] font-medium text-gray-900 truncate">{ausencia.tipo}</p>
                      <p className="text-[10px] sm:text-[11px] text-gray-500">{ausencia.dias} {ausencia.dias === 1 ? 'día' : 'días'}</p>
                    </div>
                    <Badge variant={getAusenciaBadgeVariant(ausencia.estado)} className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 flex-shrink-0">
                      {getAusenciaEstadoLabel(ausencia.estado)}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>

          {/* Ausencias pasadas */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-[13px] font-medium text-gray-400">Ausencias pasadas</h3>
            {ausenciasPasadas.length === 0 ? (
              <p className="text-[10px] sm:text-[11px] text-gray-400 text-center py-4">No hay ausencias pasadas</p>
            ) : (
              ausenciasPasadas.map((ausencia) => {
                const fechas = formatFechaParaDisplay(ausencia.fecha, ausencia.fechaFin);
                return (
                  <div
                    key={ausencia.id}
                    className="flex items-center gap-2 sm:gap-3 py-2 opacity-60 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2 hover:opacity-100 min-h-[44px]"
                    onClick={() => onClickAusencia?.(ausencia.id)}
                  >
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      {ausencia.fechaFin ? (
                        <>
                          <FechaCalendar date={ausencia.fecha} />
                          <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400" />
                          <FechaCalendar date={ausencia.fechaFin} />
                        </>
                      ) : (
                        <FechaCalendar date={ausencia.fecha} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-[13px] font-medium text-gray-900 truncate">{ausencia.tipo}</p>
                      <p className="text-[10px] sm:text-[11px] text-gray-500">{ausencia.dias} {ausencia.dias === 1 ? 'día' : 'días'}</p>
                    </div>
                    <Badge variant={getAusenciaBadgeVariant(ausencia.estado)} className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 flex-shrink-0">
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
