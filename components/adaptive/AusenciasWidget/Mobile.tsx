/**
 * AusenciasWidget - Mobile Native View
 *
 * Muestra SOLO próximas ausencias (reducido):
 * - Sin estadísticas (acumulados, disponibles, utilizados)
 * - Sin selector de periodo
 * - Sin ausencias pasadas
 * - Altura reducida: 360px (vs 480px desktop)
 * - Botón "Solicitar" prominente
 */

'use client'

import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FechaCalendar } from '@/components/shared/fecha-calendar'
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design'
import { useAusencias, AusenciaItem } from './useAusencias'

interface AusenciasWidgetMobileProps {
  diasAcumulados: number
  diasDisponibles: number
  diasUtilizados: number
  proximasAusencias?: AusenciaItem[]
  ausenciasPasadas?: AusenciaItem[]
  onOpenModal?: () => void
  onClickAusencia?: (id: string) => void
}

export function AusenciasWidgetMobile({
  diasAcumulados,
  diasDisponibles,
  diasUtilizados,
  proximasAusencias,
  ausenciasPasadas,
  onOpenModal,
  onClickAusencia,
}: AusenciasWidgetMobileProps) {
  const { proximasFiltered } = useAusencias({
    diasAcumulados,
    diasDisponibles,
    diasUtilizados,
    proximasAusencias,
    ausenciasPasadas,
  })

  return (
    <Card className="h-[360px] flex flex-col overflow-hidden">
      <CardContent className="flex-1 p-4 flex flex-col overflow-hidden">
        {/* Header con botón Solicitar */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`${MOBILE_DESIGN.text.sectionTitle} text-gray-900`}>
            Próximas ausencias
          </h3>
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

        {/* Lista de próximas ausencias - Solo max 5 items */}
        <div className="flex-1 overflow-y-auto space-y-2 -mx-4 px-4">
          {proximasFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className={`${MOBILE_DESIGN.text.body} text-gray-400 text-center`}>
                No hay próximas ausencias
              </p>
              {onOpenModal && (
                <Button
                  onClick={onOpenModal}
                  size="sm"
                  variant="outline"
                  className="mt-4"
                >
                  Solicitar ausencia
                </Button>
              )}
            </div>
          ) : (
            proximasFiltered.slice(0, 5).map((ausencia) => (
              <div
                key={ausencia.id}
                className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-3 min-h-[56px]"
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
                  <p className={`${MOBILE_DESIGN.text.body} font-medium text-gray-900 truncate`}>
                    {ausencia.tipo}
                  </p>
                  <p className={MOBILE_DESIGN.text.caption}>
                    {ausencia.dias} {ausencia.dias === 1 ? 'día' : 'días'}
                  </p>
                </div>

                {/* Estado badge */}
                <div className="flex-shrink-0">
                  {ausencia.estado === 'pendiente' && (
                    <div className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded">
                      Pendiente
                    </div>
                  )}
                  {ausencia.estado === 'confirmada' && (
                    <div className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                      Confirmada
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: Ver todas (solo si hay más de 5) */}
        {proximasFiltered.length > 5 && (
          <div className="pt-3 border-t border-gray-200 mt-2">
            <a
              href="/empleado/mi-espacio/ausencias"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todas ({proximasFiltered.length})
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
