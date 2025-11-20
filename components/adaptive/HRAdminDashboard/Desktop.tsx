/**
 * HRAdminDashboard - Desktop View
 *
 * Layout completo 3 columnas x 2 filas:
 * - Fila 1: Fichaje, Solicitudes (2 filas), Notificaciones
 * - Fila 2: Plantilla, (Solicitudes cont.), Auto-Completado
 */

'use client'

import { FichajeWidget } from '@/components/adaptive/FichajeWidget'
import { SolicitudesWidget, Solicitud } from '@/components/shared/solicitudes-widget'
import { NotificacionesWidget, Notificacion } from '@/components/shared/notificaciones-widget'
import { PlantillaWidget } from '@/components/dashboard/plantilla-widget'
import { AutoCompletadoWidget } from '@/components/shared/auto-completado-widget'

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

interface HRAdminDashboardDesktopProps {
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

export function HRAdminDashboardDesktop({
  userName,
  solicitudes,
  notificaciones,
  plantillaResumen,
  autoCompletadoStats,
}: HRAdminDashboardDesktopProps) {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Buenos Días, {userName}
        </h1>
      </div>

      {/* Grid 3 columnas x 2 filas */}
      <div className="flex-1 min-h-0 pb-6 overflow-auto">
        <div className="h-full grid grid-cols-3 grid-rows-[1fr_1fr] gap-4">
          {/* Fila 1, Col 1: Fichaje Widget */}
          <div className="min-h-[220px] h-full">
            <FichajeWidget href="/hr/horario/fichajes" />
          </div>

          {/* Fila 1-2, Col 2: Solicitudes Widget (ocupa 2 filas) */}
          <div className="row-span-2 min-h-[440px] h-full">
            <SolicitudesWidget solicitudes={solicitudes} maxItems={8} />
          </div>

          {/* Fila 1, Col 3: Notificaciones Widget */}
          <div className="min-h-[220px] h-full">
            <NotificacionesWidget
              notificaciones={notificaciones}
              maxItems={3}
              href="/hr/bandeja-entrada"
            />
          </div>

          {/* Fila 2, Col 1: Plantilla Widget */}
          <div className="min-h-[220px] h-full">
            <PlantillaWidget
              trabajando={plantillaResumen.trabajando}
              ausentes={plantillaResumen.ausentes}
              sinFichar={plantillaResumen.sinFichar}
              rol="hr_admin"
            />
          </div>

          {/* Fila 2, Col 3: Auto-Completado Widget */}
          <div className="min-h-[220px] h-full">
            <AutoCompletadoWidget stats={autoCompletadoStats} />
          </div>
        </div>
      </div>
    </div>
  )
}
