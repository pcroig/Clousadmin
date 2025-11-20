/**
 * EmpleadoDashboard - Desktop View
 *
 * Vista completa con 3 widgets en grid:
 * 1. Fichaje (1 fila)
 * 2. Notificaciones (2 filas - columna central)
 * 3. Ausencias completas (2 filas - incluye stats, próximas, pasadas)
 */

'use client'

import { useState } from 'react'
import { FichajeWidget } from '@/components/adaptive/FichajeWidget'
import { NotificacionesWidget, Notificacion } from '@/components/shared/notificaciones-widget'
import { AusenciasWidget, AusenciaItem } from '@/components/shared/ausencias-widget'
import { SolicitarAusenciaModal } from '@/components/empleado/solicitar-ausencia-modal'
import { PreferenciasVacacionesModal } from '@/components/empleado/preferencias-vacaciones-modal'

interface EmpleadoDashboardDesktopProps {
  userName: string
  notificaciones: Notificacion[]
  saldoFinal: {
    diasTotales: number
    diasUsados: number
  }
  ausenciasProximas: AusenciaItem[]
  ausenciasPasadas: AusenciaItem[]
  campanaPendiente?: {
    id: string
    titulo: string
    fechaInicioObjetivo: Date
    fechaFinObjetivo: Date
  } | null
  onClickAusencia: (id: string) => void
}

export function EmpleadoDashboardDesktop({
  userName,
  notificaciones,
  saldoFinal,
  ausenciasProximas,
  ausenciasPasadas,
  campanaPendiente,
  onClickAusencia,
}: EmpleadoDashboardDesktopProps) {
  const [modalAusencia, setModalAusencia] = useState(false)
  const [modalPreferencias, setModalPreferencias] = useState(!!campanaPendiente)

  return (
    <>
      <div className="h-full w-full flex flex-col overflow-hidden">
        {/* Header con saludo - Desktop only */}
        <div className="flex-shrink-0 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Buenos Días, {userName}
          </h1>
        </div>

        {/* Grid 3 columnas - Layout desktop */}
        <div className="flex-1 min-h-0 pb-6 overflow-auto">
          <div className="h-full grid grid-cols-3 auto-rows-fr gap-4">
            {/* Col 1: Fichaje Widget (1 fila) */}
            <div className="min-h-[240px] h-full">
              <FichajeWidget href="/empleado/mi-espacio/fichajes" />
            </div>

            {/* Col 2: Notificaciones Widget (2 filas) */}
            <div className="row-span-2 min-h-[480px] h-full">
              <NotificacionesWidget
                notificaciones={notificaciones}
                maxItems={8}
                altura="doble"
              />
            </div>

            {/* Col 3: Ausencias Widget (2 filas - completo) */}
            <div className="row-span-2 min-h-[480px] h-full">
              <AusenciasWidget
                diasAcumulados={saldoFinal.diasTotales}
                diasDisponibles={saldoFinal.diasTotales - Number(saldoFinal.diasUsados)}
                diasUtilizados={Number(saldoFinal.diasUsados)}
                proximasAusencias={ausenciasProximas}
                ausenciasPasadas={ausenciasPasadas}
                onOpenModal={() => setModalAusencia(true)}
                onClickAusencia={onClickAusencia}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de solicitar ausencia */}
      <SolicitarAusenciaModal
        open={modalAusencia}
        onClose={() => setModalAusencia(false)}
        onSuccess={() => {
          setModalAusencia(false)
          window.location.reload()
        }}
      />

      {/* Modal de preferencias de vacaciones */}
      {campanaPendiente && (
        <PreferenciasVacacionesModal
          open={modalPreferencias}
          onClose={() => setModalPreferencias(false)}
          onSuccess={() => {
            setModalPreferencias(false)
            window.location.reload()
          }}
          campanaId={campanaPendiente.id}
          campanaTitulo={campanaPendiente.titulo}
          fechaInicioObjetivo={campanaPendiente.fechaInicioObjetivo.toISOString().split('T')[0]}
          fechaFinObjetivo={campanaPendiente.fechaFinObjetivo.toISOString().split('T')[0]}
        />
      )}
    </>
  )
}
