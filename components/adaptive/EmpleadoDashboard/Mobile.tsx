/**
 * EmpleadoDashboard - Mobile Native View
 *
 * Prioriza acciones críticas del empleado:
 * 1. Fichaje (acción más frecuente)
 * 2. Ausencias próximas (info relevante)
 *
 * Oculto en mobile:
 * - Notificaciones (accesibles desde bandeja entrada)
 * - Ausencias pasadas (no críticas)
 * - Estadísticas de ausencias (reducidas)
 */

'use client'

import { useState } from 'react'
import { FichajeWidget } from '@/components/adaptive/FichajeWidget'
import { AusenciasWidget, AusenciaItem } from '@/components/adaptive/AusenciasWidget'
import { SolicitarAusenciaModal } from '@/components/empleado/solicitar-ausencia-modal'
import { PreferenciasVacacionesModal } from '@/components/empleado/preferencias-vacaciones-modal'

interface EmpleadoDashboardMobileProps {
  ausenciasProximas: AusenciaItem[]
  saldoFinal: {
    diasTotales: number
    diasUsados: number
  }
  campanaPendiente?: {
    id: string
    titulo: string
    fechaInicioObjetivo: Date
    fechaFinObjetivo: Date
  } | null
  onClickAusencia: (id: string) => void
}

export function EmpleadoDashboardMobile({
  ausenciasProximas,
  saldoFinal,
  campanaPendiente,
  onClickAusencia,
}: EmpleadoDashboardMobileProps) {
  const [modalAusencia, setModalAusencia] = useState(false)
  const [modalPreferencias, setModalPreferencias] = useState(!!campanaPendiente)

  return (
    <>
      {/* Layout vertical mobile - Solo lo crítico */}
      <div className="space-y-3 p-4">
        {/* 1. CRÍTICO: Fichaje Widget (240px) */}
        <div className="h-[240px]">
          <FichajeWidget href="/empleado/mi-espacio/fichajes" />
        </div>

        {/* 2. IMPORTANTE: Próximas Ausencias (480px - full widget actual) */}
        <div className="h-[480px]">
          <AusenciasWidget
            diasAcumulados={saldoFinal.diasTotales}
            diasDisponibles={saldoFinal.diasTotales - Number(saldoFinal.diasUsados)}
            diasUtilizados={Number(saldoFinal.diasUsados)}
            proximasAusencias={ausenciasProximas}
            ausenciasPasadas={[]} // Mobile: Sin ausencias pasadas
            onOpenModal={() => setModalAusencia(true)}
            onClickAusencia={onClickAusencia}
          />
        </div>

        {/* Notificaciones: OCULTO - accesible desde Bottom Nav > Bandeja Entrada */}
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
