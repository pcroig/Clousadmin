/**
 * FichajeWidget - Versión MOBILE NATIVA
 *
 * Optimizado específicamente para mobile:
 * - Layout vertical compacto
 * - Touch targets grandes (WCAG 44px)
 * - Sin elementos decorativos innecesarios
 * - Foco en acciones principales
 * - Tipografía optimizada para pantallas pequeñas
 */

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FichajeManualModal } from '@/components/shared/fichaje-manual-modal'
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design'
import { useFichaje } from './useFichaje'
import { Clock, Plus } from 'lucide-react'

export function FichajeWidgetMobile() {
  const {
    estadoActual,
    tiempoTrabajado,
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
      <Card className={MOBILE_DESIGN.widget.height.standard}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-gray-400 text-sm">Cargando...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Card compacto para mobile */}
      <Card className={`${MOBILE_DESIGN.widget.height.standard} flex flex-col overflow-hidden`}>
        <CardContent className={`flex-1 ${MOBILE_DESIGN.spacing.widget} flex flex-col`}>
          {/* Header compacto con estado */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className={MOBILE_DESIGN.text.widgetTitle}>Fichaje</span>
            </div>

            {/* Botón fichaje manual - Touch target 44px */}
            <button
              onClick={() => setModalFichajeManual(true)}
              className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
              aria-label="Fichaje manual"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Cronómetro principal destacado */}
          <div className="bg-gray-50 rounded-lg p-4 text-center mb-3">
            <div className={`${MOBILE_DESIGN.text.caption} mb-1`}>
              {getTituloEstado()}
            </div>

            <div
              className={`${MOBILE_DESIGN.text.display} font-mono text-gray-900`}
              aria-live="polite"
              aria-label={`Tiempo trabajado: ${tiempoTrabajado}`}
            >
              {tiempoTrabajado}
            </div>

            <div className={`${MOBILE_DESIGN.text.caption} mt-1`}>
              Horas trabajadas hoy
            </div>
          </div>

          {/* Botones de acción - Solo los necesarios, full width */}
          <div className={`${MOBILE_DESIGN.spacing.items} mt-auto`}>
            {/* Botón principal siempre visible */}
            {botonPrincipal && (
              <Button
                variant={botonPrincipal.variant as any}
                onClick={botonPrincipal.accion}
                disabled={cargando}
                className={`w-full ${MOBILE_DESIGN.button.primary}`}
              >
                {cargando ? 'Procesando...' : botonPrincipal.texto}
              </Button>
            )}

            {/* Botón secundario solo si existe */}
            {botonSecundario && (
              <Button
                variant={botonSecundario.variant as any}
                onClick={botonSecundario.accion}
                disabled={cargando}
                className={`w-full ${MOBILE_DESIGN.button.secondary}`}
              >
                {botonSecundario.texto}
              </Button>
            )}

            {/* Si está finalizado, botón para nueva jornada */}
            {estadoActual === 'finalizado' && (
              <Button
                onClick={refrescar}
                variant="outline"
                className={`w-full ${MOBILE_DESIGN.button.secondary}`}
              >
                Actualizar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de fichaje manual */}
      <FichajeManualModal
        open={modalFichajeManual}
        onClose={() => setModalFichajeManual(false)}
      />
    </>
  )
}
