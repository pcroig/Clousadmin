/**
 * AusenciasWidget - Adaptive Entry Point
 *
 * Renderiza componente nativo según viewport:
 * - Mobile: Solo próximas ausencias (360px, sin stats, sin pasadas)
 * - Desktop: Vista completa (480px, con stats, próximas + pasadas)
 *
 * Code splitting: Solo carga el bundle necesario
 */

import dynamic from 'next/dynamic'
import { AdaptiveContainer } from '@/components/adaptive/AdaptiveContainer'
import type { AusenciaItem } from './useAusencias'

// Dynamic imports para code splitting
const AusenciasWidgetMobile = dynamic(
  () => import('./Mobile').then((mod) => ({ default: mod.AusenciasWidgetMobile })),
  { ssr: false }
)

const AusenciasWidgetDesktop = dynamic(
  () => import('./Desktop').then((mod) => ({ default: mod.AusenciasWidgetDesktop })),
  { ssr: false }
)

interface AusenciasWidgetProps {
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

export function AusenciasWidget(props: AusenciasWidgetProps) {
  return (
    <AdaptiveContainer
      mobile={
        <AusenciasWidgetMobile
          diasAcumulados={props.diasAcumulados}
          diasDisponibles={props.diasDisponibles}
          diasUtilizados={props.diasUtilizados}
          proximasAusencias={props.proximasAusencias}
          ausenciasPasadas={props.ausenciasPasadas}
          onOpenModal={props.onOpenModal}
          onClickAusencia={props.onClickAusencia}
        />
      }
      desktop={
        <AusenciasWidgetDesktop
          diasAcumulados={props.diasAcumulados}
          diasDisponibles={props.diasDisponibles}
          diasUtilizados={props.diasUtilizados}
          proximasAusencias={props.proximasAusencias}
          ausenciasPasadas={props.ausenciasPasadas}
          periodo={props.periodo}
          onOpenModal={props.onOpenModal}
          onClickAusencia={props.onClickAusencia}
          href={props.href}
        />
      }
    />
  )
}

// Re-export type for convenience
export type { AusenciaItem } from './useAusencias'
