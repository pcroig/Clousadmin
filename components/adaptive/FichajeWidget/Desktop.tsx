/**
 * FichajeWidget - Versión DESKTOP
 *
 * Optimizado para pantallas grandes:
 * - Layout de 2 columnas con anillo de progreso
 * - Visualizaciones adicionales (SVG, estadísticas)
 * - Más información visible simultáneamente
 * - Botones inline horizontal
 */

'use client'

import { Button } from '@/components/ui/button'
import { WidgetCard } from '@/components/shared/widget-card'
import { FichajeManualModal } from '@/components/shared/fichaje-manual-modal'
import { useFichaje } from './useFichaje'

interface FichajeWidgetDesktopProps {
  href?: string
}

export function FichajeWidgetDesktop({
  href = '/empleado/mi-espacio/fichajes',
}: FichajeWidgetDesktopProps) {
  const {
    estadoActual,
    tiempoTrabajado,
    horasHechas,
    horasPorHacer,
    cargando,
    inicializando,
    modalFichajeManual,
    setModalFichajeManual,
    getTituloEstado,
    getBotonPrincipal,
    getBotonSecundario,
    refrescar,
  } = useFichaje()

  const botonPrincipal = getBotonPrincipal()
  const botonSecundario = getBotonSecundario()

  if (inicializando) {
    return (
      <WidgetCard title="Fichaje" href={href}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400 text-sm">Cargando...</div>
        </div>
      </WidgetCard>
    )
  }

  // Calcular porcentaje para anillo (máximo 8 horas)
  const porcentaje = Math.min((horasHechas / 8) * 100, 100)
  const circunferencia = 2 * Math.PI * 70
  const offset = circunferencia - (porcentaje / 100) * circunferencia

  return (
    <>
      <WidgetCard
        title="Fichaje"
        href={href}
        accionExtra={{
          texto: 'Fichaje manual',
          onClick: () => setModalFichajeManual(true),
        }}
        contentClassName="px-6"
      >
        <div className="grid grid-cols-2 gap-6 h-full min-h-0">
          {/* Columna izquierda: Estado y acciones */}
          <div className="flex flex-col justify-center space-y-4">
            {/* Estado actual */}
            <div>
              <div className="text-sm text-gray-500 mb-1">Estado</div>
              <div className="text-2xl font-bold text-gray-900">
                {getTituloEstado()}
              </div>
            </div>

            {/* Cronómetro */}
            <div>
              <div className="text-sm text-gray-500 mb-1">Tiempo trabajado</div>
              <div
                className="text-4xl font-bold font-mono text-gray-900"
                aria-live="polite"
                aria-label={`Tiempo trabajado: ${tiempoTrabajado}`}
              >
                {tiempoTrabajado}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col gap-2 pt-2">
              {botonPrincipal && (
                <Button
                  variant={botonPrincipal.variant as any}
                  onClick={botonPrincipal.accion}
                  disabled={cargando}
                  className="w-full"
                >
                  {cargando ? 'Procesando...' : botonPrincipal.texto}
                </Button>
              )}

              {botonSecundario && (
                <Button
                  variant={botonSecundario.variant as any}
                  onClick={botonSecundario.accion}
                  disabled={cargando}
                  className="w-full"
                >
                  {botonSecundario.texto}
                </Button>
              )}

              {estadoActual === 'finalizado' && (
                <Button
                  onClick={refrescar}
                  variant="outline"
                  className="w-full"
                >
                  Actualizar
                </Button>
              )}
            </div>
          </div>

          {/* Columna derecha: Anillo de progreso */}
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              {/* SVG Anillo de progreso */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                {/* Círculo de fondo */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="12"
                />

                {/* Círculo de progreso */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke={estadoActual === 'trabajando' ? '#d97757' : '#9ca3af'}
                  strokeWidth="12"
                  strokeDasharray={circunferencia}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>

              {/* Texto central del anillo */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900">
                  {horasHechas.toFixed(1)}h
                </div>
                <div className="text-xs text-gray-500">de 8h</div>

                {horasPorHacer > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    {horasPorHacer.toFixed(1)}h restantes
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </WidgetCard>

      {/* Modal de fichaje manual */}
      <FichajeManualModal
        open={modalFichajeManual}
        onClose={() => setModalFichajeManual(false)}
      />
    </>
  )
}
