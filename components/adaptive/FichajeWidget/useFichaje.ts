/**
 * Hook de lógica de negocio para Fichaje
 *
 * Separa la lógica del rendering para permitir
 * componentes mobile y desktop independientes
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { calcularHorasTrabajadas } from '@/lib/calculos/fichajes-cliente'
import { formatTiempoTrabajado } from '@/lib/utils/formatters'
import type { FichajeEvento } from '@prisma/client'
import { toast } from 'sonner'

export type EstadoFichaje = 'sin_fichar' | 'trabajando' | 'en_pausa' | 'finalizado'

interface Fichaje {
  id: string
  fecha: string
  estado: string
  horasTrabajadas: number | null
  eventos: Array<{
    id: string
    tipo: string
    hora: string | Date
  }>
}

export interface UseFichajeReturn {
  // Estado
  estadoActual: EstadoFichaje
  tiempoTrabajado: string
  horasHechas: number
  horasPorHacer: number
  cargando: boolean
  inicializando: boolean
  horaEntrada: Date | null
  modalFichajeManual: boolean

  // Acciones
  handleFichar: (tipoOverride?: string) => Promise<void>
  setModalFichajeManual: (open: boolean) => void
  refrescar: () => Promise<void>

  // Helpers
  getTituloEstado: () => string
  getBotonPrincipal: () => { texto: string; accion: () => void; variant?: string } | null
  getBotonSecundario: () => { texto: string; accion: () => void; variant?: string } | null
}

/**
 * Hook con toda la lógica de fichaje
 * Compartido entre versiones mobile y desktop
 */
export function useFichaje(): UseFichajeReturn {
  const [estadoActual, setEstadoActual] = useState<EstadoFichaje>('sin_fichar')
  const [tiempoTrabajado, setTiempoTrabajado] = useState('00:00')
  const [horasHechas, setHorasHechas] = useState(0)
  const [horasPorHacer, setHorasPorHacer] = useState(8)
  const [cargando, setCargando] = useState(false)
  const [inicializando, setInicializando] = useState(true)
  const [horaEntrada, setHoraEntrada] = useState<Date | null>(null)
  const [modalFichajeManual, setModalFichajeManual] = useState(false)

  // Actualizar tiempo trabajado cada segundo
  useEffect(() => {
    if (estadoActual !== 'trabajando' || !horaEntrada) {
      return
    }

    const actualizarTiempo = () => {
      if (horaEntrada) {
        const ahora = new Date()
        const diffMs = ahora.getTime() - horaEntrada.getTime()
        setTiempoTrabajado(formatTiempoTrabajado(diffMs))
      }
    }

    actualizarTiempo()
    const intervalo = setInterval(actualizarTiempo, 1000)

    return () => clearInterval(intervalo)
  }, [estadoActual, horaEntrada])

  // Actualizar horas trabajadas
  const actualizarHorasTrabajadas = useCallback((eventos: FichajeEvento[]) => {
    if (eventos.length === 0) {
      setHorasHechas(0)
      setHorasPorHacer(8)
      setTiempoTrabajado('00:00')
      return
    }

    const horasTotales = calcularHorasTrabajadas(eventos)
    const horasRedondeadas = Math.round(horasTotales * 10) / 10

    setHorasHechas(horasRedondeadas)
    setHorasPorHacer(Math.max(0, 8 - horasRedondeadas))

    if (horasTotales > 0) {
      const horas = Math.floor(horasTotales)
      const minutos = Math.floor((horasTotales - horas) * 60)
      setTiempoTrabajado(
        `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
      )
    } else {
      setTiempoTrabajado('00:00')
    }
  }, [])

  // Obtener estado actual del API
  const obtenerEstadoActual = useCallback(async () => {
    try {
      const hoy = new Date()
      const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

      const response = await fetch(`/api/fichajes?fecha=${fechaLocal}&propios=1`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        console.error('[useFichaje] Error obteniendo fichaje:', response.status)
        setEstadoActual('sin_fichar')
        setHorasHechas(0)
        setHorasPorHacer(8)
        setHoraEntrada(null)
        setInicializando(false)
        return
      }

      const fichajes: Fichaje[] = await response.json()

      if (fichajes.length === 0) {
        setEstadoActual('sin_fichar')
        setHorasHechas(0)
        setHorasPorHacer(8)
        setHoraEntrada(null)
      } else {
        const fichajeHoy = fichajes[0]

        // Buscar hora de entrada
        const entrada = fichajeHoy.eventos.find((e) => e.tipo === 'entrada')
        if (entrada) {
          setHoraEntrada(new Date(entrada.hora))
        }

        // Determinar estado
        if (fichajeHoy.estado === 'finalizado') {
          setEstadoActual('finalizado')
          setHoraEntrada(null)
        } else if (fichajeHoy.eventos.length > 0) {
          const ultimoEvento = fichajeHoy.eventos[fichajeHoy.eventos.length - 1]

          switch (ultimoEvento.tipo) {
            case 'entrada':
              setEstadoActual('trabajando')
              break
            case 'pausa_inicio':
              setEstadoActual('en_pausa')
              break
            case 'pausa_fin':
              setEstadoActual('trabajando')
              break
            case 'salida':
              setEstadoActual('finalizado')
              setHoraEntrada(null)
              break
            default:
              setEstadoActual('sin_fichar')
          }
        }

        // Calcular horas trabajadas
        const eventosFormateados: FichajeEvento[] = fichajeHoy.eventos.map((e) => ({
          id: e.id,
          tipo: e.tipo as 'entrada' | 'pausa_inicio' | 'pausa_fin' | 'salida',
          hora: typeof e.hora === 'string' ? new Date(e.hora) : e.hora,
          fichajeId: fichajeHoy.id,
          ubicacion: null,
          editado: false,
          motivoEdicion: null,
          horaOriginal: null,
          editadoPor: null,
          createdAt: new Date(),
        }))

        actualizarHorasTrabajadas(eventosFormateados)
      }
    } catch (error) {
      console.error('[useFichaje] Error obteniendo estado:', error)
    } finally {
      setInicializando(false)
    }
  }, [actualizarHorasTrabajadas])

  // Cargar al montar
  useEffect(() => {
    obtenerEstadoActual()
  }, [obtenerEstadoActual])

  // Fichar (entrada, pausa, salida)
  async function handleFichar(tipoOverride?: string) {
    if (cargando) return

    setCargando(true)
    try {
      let tipo = tipoOverride || 'entrada'

      if (!tipoOverride) {
        switch (estadoActual) {
          case 'sin_fichar':
            tipo = 'entrada'
            break
          case 'trabajando':
            tipo = 'pausa_inicio'
            break
          case 'en_pausa':
            tipo = 'pausa_fin'
            break
          default:
            tipo = 'entrada'
        }
      }

      const response = await fetch('/api/fichajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || 'Error al fichar')
        return
      }

      await obtenerEstadoActual()
      toast.success('Fichaje registrado correctamente')
    } catch (error) {
      console.error('[useFichaje] Error al fichar:', error)
      toast.error('Error al registrar fichaje')
    } finally {
      setCargando(false)
    }
  }

  // Helpers para UI
  function getTituloEstado(): string {
    switch (estadoActual) {
      case 'trabajando':
        return 'Trabajando'
      case 'en_pausa':
        return 'En pausa'
      case 'finalizado':
        return 'Jornada finalizada'
      default:
        return 'Sin fichar'
    }
  }

  function getBotonPrincipal() {
    switch (estadoActual) {
      case 'sin_fichar':
        return {
          texto: 'Iniciar Jornada',
          accion: () => handleFichar('entrada'),
        }
      case 'trabajando':
        return {
          texto: 'Pausar',
          accion: () => handleFichar('pausa_inicio'),
          variant: 'secondary' as const,
        }
      case 'en_pausa':
        return {
          texto: 'Reanudar',
          accion: () => handleFichar('pausa_fin'),
        }
      default:
        return null
    }
  }

  function getBotonSecundario() {
    if (estadoActual === 'trabajando' || estadoActual === 'en_pausa') {
      return {
        texto: 'Finalizar Jornada',
        accion: () => handleFichar('salida'),
        variant: 'outline' as const,
      }
    }
    return null
  }

  return {
    // Estado
    estadoActual,
    tiempoTrabajado,
    horasHechas,
    horasPorHacer,
    cargando,
    inicializando,
    horaEntrada,
    modalFichajeManual,

    // Acciones
    handleFichar,
    setModalFichajeManual,
    refrescar: obtenerEstadoActual,

    // Helpers
    getTituloEstado,
    getBotonPrincipal,
    getBotonSecundario,
  }
}
