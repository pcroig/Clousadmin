/**
 * AusenciasWidget - Desktop View
 *
 * Vista completa con todas las funcionalidades:
 * - Estadísticas (acumulados, disponibles, utilizados)
 * - Selector de periodo
 * - Próximas ausencias
 * - Ausencias pasadas
 * - Altura completa: 480px (2 filas)
 */

'use client'

import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WidgetCard } from '@/components/shared/widget-card'
import { FechaCalendar } from '@/components/shared/fecha-calendar'
import { useAusencias, AusenciaItem } from './useAusencias'
import {
  getAusenciaBadgeVariant,
  getAusenciaEstadoLabel,
} from '@/lib/utils/formatters'

interface AusenciasWidgetDesktopProps {
  diasAcumulados: number
  diasDisponibles: number
  diasUtilizados: number
  proximasAusencias?: AusenciaItem[]
  ausenciasPasadas?: AusenciaItem[]
  periodo?: string
  onOpenModal?: () => void
  onClickAusencia?: (id: string) => void
  href?: string
}

export function AusenciasWidgetDesktop({
  diasAcumulados,
  diasDisponibles,
  diasUtilizados,
  proximasAusencias,
  ausenciasPasadas,
  periodo,
  onOpenModal,
  onClickAusencia,
  href = '/empleado/mi-espacio/ausencias',
}: AusenciasWidgetDesktopProps) {
  const {
    stats,
    proximasFiltered,
    pasadasFiltered,
    currentPeriodo,
    handlePreviousPeriod,
    handleNextPeriod,
  } = useAusencias({
    diasAcumulados,
    diasDisponibles,
    diasUtilizados,
    proximasAusencias,
    ausenciasPasadas,
    periodo,
  })

  return (
    <WidgetCard
      title="Ausencias"
      href={href}
      className="relative"
      contentClassName="overflow-y-auto px-6"
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
          <button
            className="p-1 hover:bg-gray-100 rounded min-h-[32px] min-w-[32px] flex items-center justify-center"
            onClick={handlePreviousPeriod}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-center">{currentPeriodo}</span>
          <button
            className="p-1 hover:bg-gray-100 rounded min-h-[32px] min-w-[32px] flex items-center justify-center"
            onClick={handleNextPeriod}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Estadísticas principales (3 columnas) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {stats.acumulados.toFixed(1)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 uppercase">
              Días acumulados
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {stats.disponibles.toFixed(1)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 uppercase">
              Días disponibles
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {stats.utilizados.toFixed(1)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 uppercase">
              Días utilizados
            </div>
          </div>
        </div>

        {/* Próximas ausencias */}
        <div className="space-y-2">
          <h3 className="text-[13px] font-medium text-gray-400">
            Próximas ausencias
          </h3>
          {proximasFiltered.length === 0 ? (
            <p className="text-[11px] text-gray-400 text-center py-4">
              No hay próximas ausencias
            </p>
          ) : (
            proximasFiltered.map((ausencia) => (
              <div
                key={ausencia.id}
                className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2 min-h-[44px]"
                onClick={() => onClickAusencia?.(ausencia.id)}
              >
                {/* Fechas */}
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">
                    {ausencia.tipo}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {ausencia.dias} {ausencia.dias === 1 ? 'día' : 'días'}
                  </p>
                </div>

                {/* Estado badge */}
                <Badge
                  variant={getAusenciaBadgeVariant(ausencia.estado)}
                  className="text-[10px] px-2 py-0.5 flex-shrink-0"
                >
                  {getAusenciaEstadoLabel(ausencia.estado)}
                </Badge>
              </div>
            ))
          )}
        </div>

        {/* Ausencias pasadas */}
        <div className="space-y-2">
          <h3 className="text-[13px] font-medium text-gray-400">
            Ausencias pasadas
          </h3>
          {pasadasFiltered.length === 0 ? (
            <p className="text-[11px] text-gray-400 text-center py-4">
              No hay ausencias pasadas
            </p>
          ) : (
            pasadasFiltered.map((ausencia) => (
              <div
                key={ausencia.id}
                className="flex items-center gap-3 py-2 opacity-60 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2 hover:opacity-100 min-h-[44px]"
                onClick={() => onClickAusencia?.(ausencia.id)}
              >
                {/* Fechas */}
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">
                    {ausencia.tipo}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {ausencia.dias} {ausencia.dias === 1 ? 'día' : 'días'}
                  </p>
                </div>

                {/* Estado badge */}
                <Badge
                  variant={getAusenciaBadgeVariant(ausencia.estado)}
                  className="text-[10px] px-2 py-0.5 flex-shrink-0"
                >
                  {getAusenciaEstadoLabel(ausencia.estado)}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </WidgetCard>
  )
}
