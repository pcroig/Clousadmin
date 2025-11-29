// ========================================
// Ausencias Widget - Absences Widget
// ========================================
// Shows employee absence balance and upcoming/past absences

'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { memo } from 'react';

import { FechaCalendar } from '@/components/shared/fecha-calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EstadoAusencia } from '@/lib/constants/enums';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import {
  getAusenciaBadgeVariant,
  getAusenciaEstadoLabel,
} from '@/lib/utils/formatters';

import { WidgetCard } from './widget-card';

export interface AusenciaItem {
  id: string;
  fecha: Date;
  fechaFin?: Date;
  tipo: string;
  dias: number;
  estado: EstadoAusencia;
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
    <div className="h-full">
      {/* Mobile: Sin header, solo próximas ausencias + botón */}
      <div className="sm:hidden h-full">
        <Card className={`${MOBILE_DESIGN.widget.height.tall} flex flex-col overflow-hidden ${MOBILE_DESIGN.card.default}`}>
          <CardContent className={`flex-1 ${MOBILE_DESIGN.spacing.widget} flex flex-col overflow-hidden`}>
            {/* Header interno con botón */}
            <div className="flex items-center justify-between mb-4">
              <h3 className={`${MOBILE_DESIGN.text.sectionTitle} text-gray-900`}>Próximas ausencias</h3>
              {onOpenModal && (
                <Button
                  onClick={onOpenModal}
                  size="sm"
                  variant="outline"
                  className={`${MOBILE_DESIGN.button.secondary} px-4 border-gray-300`}
                >
                  Solicitar
                </Button>
              )}
            </div>

            {/* Lista de próximas ausencias */}
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 -mx-4 px-4">
              {proximasAusencias.length === 0 ? (
                <p className={`${MOBILE_DESIGN.text.body} text-gray-400 text-center py-8`}>No hay próximas ausencias</p>
              ) : (
                proximasAusencias.map((ausencia) => (
                  <div
                    key={ausencia.id}
                    className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-3 min-h-[56px]"
                    onClick={() => onClickAusencia?.(ausencia.id)}
                  >
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                      <p className={`${MOBILE_DESIGN.text.body} font-medium text-gray-900 truncate`}>{ausencia.tipo}</p>
                      <p className={MOBILE_DESIGN.text.caption}>{ausencia.dias} {ausencia.dias === 1 ? 'día' : 'días'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop: Vista completa con header */}
      <div className="hidden sm:block h-full">
        <WidgetCard
          title="Ausencias"
          href="/empleado/mi-espacio/ausencias"
          className="relative"
          contentClassName="overflow-y-auto scrollbar-thin px-6"
          headerAction={
            onOpenModal && (
              <Button
                onClick={onOpenModal}
                size="sm"
                variant="outline"
                className="text-[11px] h-7 px-3 border-gray-300"
              >
                Solicitar ausencia
              </Button>
            )
          }
        >
          <div className="space-y-4">
            {/* Selector de periodo */}
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <button className="p-1 hover:bg-gray-100 rounded min-h-[32px] min-w-[32px] flex items-center justify-center">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-center">{periodo}</span>
              <button className="p-1 hover:bg-gray-100 rounded min-h-[32px] min-w-[32px] flex items-center justify-center">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Estadísticas principales */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{diasAcumulados.toFixed(1)}</div>
                <div className="text-[11px] text-gray-500 mt-1 uppercase">Días acumulados</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{diasDisponibles.toFixed(1)}</div>
                <div className="text-[11px] text-gray-500 mt-1 uppercase">Días disponibles</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{diasUtilizados.toFixed(1)}</div>
                <div className="text-[11px] text-gray-500 mt-1 uppercase">Días utilizados</div>
              </div>
            </div>

            {/* Próximas ausencias */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-medium text-gray-400">Próximas ausencias</h3>
              {proximasAusencias.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-4">No hay próximas ausencias</p>
              ) : (
                proximasAusencias.map((ausencia) => (
                  <div
                    key={ausencia.id}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2 min-h-[44px]"
                    onClick={() => onClickAusencia?.(ausencia.id)}
                  >
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                      <p className="text-[13px] font-medium text-gray-900 truncate">{ausencia.tipo}</p>
                      <p className="text-[11px] text-gray-500">{ausencia.dias} {ausencia.dias === 1 ? 'día' : 'días'}</p>
                    </div>
                    <Badge variant={getAusenciaBadgeVariant(ausencia.estado)} className="text-[10px] px-2 py-0.5 flex-shrink-0">
                      {getAusenciaEstadoLabel(ausencia.estado)}
                    </Badge>
                  </div>
                ))
              )}
            </div>

            {/* Ausencias pasadas */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-medium text-gray-400">Ausencias pasadas</h3>
              {ausenciasPasadas.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-4">No hay ausencias pasadas</p>
              ) : (
                ausenciasPasadas.map((ausencia) => (
                  <div
                    key={ausencia.id}
                    className="flex items-center gap-3 py-2 opacity-60 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2 hover:opacity-100 min-h-[44px]"
                    onClick={() => onClickAusencia?.(ausencia.id)}
                  >
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                      <p className="text-[13px] font-medium text-gray-900 truncate">{ausencia.tipo}</p>
                      <p className="text-[11px] text-gray-500">{ausencia.dias} {ausencia.dias === 1 ? 'día' : 'días'}</p>
                    </div>
                    <Badge variant={getAusenciaBadgeVariant(ausencia.estado)} className="text-[10px] px-2 py-0.5 flex-shrink-0">
                      {getAusenciaEstadoLabel(ausencia.estado)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </WidgetCard>
      </div>
    </div>
  );
});
