/**
 * useAusencias Hook - Shared business logic for AusenciasWidget
 *
 * Maneja el estado y acciones compartidas entre Mobile y Desktop
 */

'use client'

import { useState } from 'react'

export interface AusenciaItem {
  id: string
  fecha: Date
  fechaFin?: Date
  tipo: string
  dias: number
  estado: 'pendiente' | 'confirmada' | 'rechazada' | 'completada'
}

interface UseAusenciasProps {
  diasAcumulados: number
  diasDisponibles: number
  diasUtilizados: number
  proximasAusencias?: AusenciaItem[]
  ausenciasPasadas?: AusenciaItem[]
  periodo?: string
}

export function useAusencias({
  diasAcumulados,
  diasDisponibles,
  diasUtilizados,
  proximasAusencias = [],
  ausenciasPasadas = [],
  periodo = 'De enero de 2024 a diciembre de 2024',
}: UseAusenciasProps) {
  const [currentPeriodo, setCurrentPeriodo] = useState(periodo)

  const handlePreviousPeriod = () => {
    // TODO: Implementar lógica para cambiar periodo
    console.log('Previous period')
  }

  const handleNextPeriod = () => {
    // TODO: Implementar lógica para cambiar periodo
    console.log('Next period')
  }

  // Calcular estadísticas
  const stats = {
    acumulados: diasAcumulados,
    disponibles: diasDisponibles,
    utilizados: diasUtilizados,
    porcentajeUsado: diasAcumulados > 0 ? (diasUtilizados / diasAcumulados) * 100 : 0,
  }

  // Filtrar próximas ausencias (solo futuras y no rechazadas)
  const proximasFiltered = proximasAusencias.filter(
    (a) => a.estado !== 'rechazada'
  )

  // Filtrar pasadas ausencias
  const pasadasFiltered = ausenciasPasadas.filter(
    (a) => a.estado === 'completada'
  )

  return {
    stats,
    proximasFiltered,
    pasadasFiltered,
    currentPeriodo,
    handlePreviousPeriod,
    handleNextPeriod,
  }
}
