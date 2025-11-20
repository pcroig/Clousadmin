/**
 * HRAdminDashboard - Mobile Native View
 *
 * Diseño específico para HR Admin mobile:
 * 1. Fichaje compacto (1 fila: botón + tiempo)
 * 2. Plantilla completa (trabajando, ausentes, sin fichar)
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useFichaje } from '@/components/adaptive/FichajeWidget/useFichaje'
import { PlantillaWidget } from '@/components/dashboard/plantilla-widget'
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design'

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

interface HRAdminDashboardMobileProps {
  plantillaResumen: PlantillaData
}

export function HRAdminDashboardMobile({
  plantillaResumen,
}: HRAdminDashboardMobileProps) {
  const {
    tiempoTrabajado,
    getBotonPrincipal,
    handleFichar,
  } = useFichaje()

  const botonPrincipal = getBotonPrincipal()

  return (
    <div className="space-y-3 p-4">
      {/* 1. FICHAJE COMPACTO (1 fila) */}
      <Card className="h-[80px]">
        <CardContent className="p-4 h-full flex items-center justify-between gap-4">
          {/* Tiempo trabajado */}
          <div className="flex-shrink-0">
            <p className="text-xs text-gray-500 mb-1">Tiempo trabajado</p>
            <p className="text-2xl font-mono font-bold text-gray-900">
              {tiempoTrabajado}
            </p>
          </div>

          {/* Botón de fichar */}
          <Button
            onClick={() => handleFichar()}
            variant={botonPrincipal?.variant as any}
            className={`${MOBILE_DESIGN.touchTarget.minimum} px-6 font-semibold`}
          >
            {botonPrincipal?.texto || 'Fichar'}
          </Button>
        </CardContent>
      </Card>

      {/* 2. PLANTILLA ADAPTADA (mobile sin avatares para ahorrar espacio) */}
      <div className="h-[280px]">
        <PlantillaWidget
          trabajando={plantillaResumen.trabajando}
          ausentes={plantillaResumen.ausentes}
          sinFichar={plantillaResumen.sinFichar}
          rol="hr_admin"
        />
      </div>
    </div>
  )
}
