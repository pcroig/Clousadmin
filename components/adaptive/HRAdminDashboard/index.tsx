/**
 * HRAdminDashboard - Adaptive Entry Point
 *
 * Renderiza componente nativo según viewport:
 * - Mobile: Fichaje compacto (1 fila) + Plantilla
 * - Desktop: Grid 3x2 completo (Fichaje, Solicitudes, Notificaciones, Plantilla, Auto-Completado)
 *
 * Code splitting: Solo carga el bundle necesario
 */

'use client'

import dynamic from 'next/dynamic'
import { AdaptiveContainer } from '@/components/adaptive/AdaptiveContainer'
import type { Notificacion } from '@/components/shared/notificaciones-widget'
import type { Solicitud } from '@/components/shared/solicitudes-widget'

// Dynamic imports para code splitting
const HRAdminDashboardMobile = dynamic(
  () => import('./Mobile').then((mod) => ({ default: mod.HRAdminDashboardMobile })),
  { ssr: false }
)

const HRAdminDashboardDesktop = dynamic(
  () => import('./Desktop').then((mod) => ({ default: mod.HRAdminDashboardDesktop })),
  { ssr: false }
)

interface PlantillaData {
  trabajando: {
    count: number
    empleados: { nombre: string; avatar?: string }[]
  }
  ausentes: {
    count: number
    empleados: { nombre: string; avatar?: string }[]
  }
  sinFichar: {
    count: number
    empleados: { nombre: string; avatar?: string }[]
  }
}

interface HRAdminDashboardProps {
  userName: string
  solicitudes: Solicitud[]
  notificaciones: Notificacion[]
  plantillaResumen: PlantillaData
  autoCompletadoStats: {
    fichajesCompletados: number
    ausenciasCompletadas: number
    solicitudesCompletadas: number
  }
}

export function HRAdminDashboard(props: HRAdminDashboardProps) {
  return (
    <AdaptiveContainer
      mobile={
        <HRAdminDashboardMobile
          plantillaResumen={props.plantillaResumen}
        />
      }
      desktop={
        <HRAdminDashboardDesktop
          userName={props.userName}
          solicitudes={props.solicitudes}
          notificaciones={props.notificaciones}
          plantillaResumen={props.plantillaResumen}
          autoCompletadoStats={props.autoCompletadoStats}
        />
      }
    />
  )
}
