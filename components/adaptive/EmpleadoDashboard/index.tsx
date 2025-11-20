/**
 * EmpleadoDashboard - Adaptive Entry Point
 *
 * Renderiza componente nativo según viewport:
 * - Mobile: Solo Fichaje + Ausencias próximas
 * - Desktop: Fichaje + Notificaciones + Ausencias completas
 *
 * Code splitting: Solo carga el bundle necesario
 */

import dynamic from 'next/dynamic'
import { AdaptiveContainer } from '@/components/adaptive/AdaptiveContainer'
import type { Notificacion } from '@/components/shared/notificaciones-widget'
import type { AusenciaItem } from '@/components/shared/ausencias-widget'

// Dynamic imports para code splitting
const EmpleadoDashboardMobile = dynamic(
  () => import('./Mobile').then((mod) => ({ default: mod.EmpleadoDashboardMobile })),
  { ssr: false }
)

const EmpleadoDashboardDesktop = dynamic(
  () => import('./Desktop').then((mod) => ({ default: mod.EmpleadoDashboardDesktop })),
  { ssr: false }
)

interface EmpleadoDashboardProps {
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

export function EmpleadoDashboard(props: EmpleadoDashboardProps) {
  return (
    <AdaptiveContainer
      mobile={
        <EmpleadoDashboardMobile
          ausenciasProximas={props.ausenciasProximas}
          saldoFinal={props.saldoFinal}
          campanaPendiente={props.campanaPendiente}
          onClickAusencia={props.onClickAusencia}
        />
      }
      desktop={
        <EmpleadoDashboardDesktop
          userName={props.userName}
          notificaciones={props.notificaciones}
          saldoFinal={props.saldoFinal}
          ausenciasProximas={props.ausenciasProximas}
          ausenciasPasadas={props.ausenciasPasadas}
          campanaPendiente={props.campanaPendiente}
          onClickAusencia={props.onClickAusencia}
        />
      }
    />
  )
}
