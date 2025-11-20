// ========================================
// Empleado Dashboard Client Component
// ========================================
//
// Wrapper que usa el componente adaptive EmpleadoDashboard
// Mobile: Solo Fichaje + Ausencias próximas
// Desktop: Fichaje + Notificaciones + Ausencias completas

'use client'

import { useRouter } from 'next/navigation'
import { EmpleadoDashboard } from '@/components/adaptive/EmpleadoDashboard'
import type { Notificacion } from '@/components/shared/notificaciones-widget'
import type { AusenciaItem } from '@/components/shared/ausencias-widget'

interface DashboardClientProps {
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
}

export function EmpleadoDashboardClient({
  userName,
  notificaciones,
  saldoFinal,
  ausenciasProximas,
  ausenciasPasadas,
  campanaPendiente,
}: DashboardClientProps) {
  const router = useRouter()

  const handleClickAusencia = (ausenciaId: string) => {
    // Navegar a la página de ausencias
    router.push('/empleado/mi-espacio/ausencias')
  }

  return (
    <EmpleadoDashboard
      userName={userName}
      notificaciones={notificaciones}
      saldoFinal={saldoFinal}
      ausenciasProximas={ausenciasProximas}
      ausenciasPasadas={ausenciasPasadas}
      campanaPendiente={campanaPendiente}
      onClickAusencia={handleClickAusencia}
    />
  )
}
