'use client';

// ========================================
// Fichajes Client Component - Vista por Jornadas
// ========================================

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CompensarHorasDialog } from '@/components/shared/compensar-horas-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EstadoFichaje } from '@/lib/constants/enums';
import { formatearHorasMinutos } from '@/lib/utils/formatters';
import { extractArrayFromResponse } from '@/lib/utils/api-response';

import { EditarFichajeModal } from './editar-fichaje-modal';
import { JornadasModal } from './jornadas-modal';
import { RevisionModal } from './revision-modal';



// NUEVO MODELO: Fichaje tiene eventos dentro
interface FichajeEvento {
  id: string;
  tipo: string;
  hora: string;
  editado: boolean;
  motivoEdicion: string | null;
}

interface Fichaje {
  id: string;
  fecha: string;
  estado: string;
  horasTrabajadas: number | string | null; // Prisma Decimal se serializa como string
  horasEnPausa: number | string | null; // Prisma Decimal se serializa como string
  horasEsperadas?: number | string | null;
  balance?: number | string | null;
  autoCompletado: boolean;
  eventos: FichajeEvento[];
  empleado: {
    id: string;
    nombre: string;
    apellidos: string;
    puesto: string;
  };
}

interface JornadaDia {
  empleadoId: string;
  empleadoNombre: string;
  fecha: Date;
  fichaje: Fichaje;
  horasTrabajadas: number;
  horasEsperadas: number;
  horarioEntrada: string | null;
  horarioSalida: string | null;
  balance: number;
}

// Interfaz para el modal de edición (solo necesita el evento)
interface FichajeEventoParaEditar {
  id: string;
  tipo: string;
  hora: string;
  editado?: boolean;
}

export function FichajesClient({ initialState }: { initialState?: string }) {
  const [jornadas, setJornadas] = useState<JornadaDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstadoFichaje, setFiltroEstadoFichaje] = useState(initialState || 'todos'); // fichaje individual: confirmado/auto/rechazado
  const [rangoFechas, setRangoFechas] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [fechaBase, setFechaBase] = useState(new Date());
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  const [jornadasModal, setJornadasModal] = useState(false);
  const [revisionModal, setRevisionModal] = useState(false);
  const [cuadrandoFichajes, setCuadrandoFichajes] = useState(false);
  const [showCompensarHorasDialog, setShowCompensarHorasDialog] = useState(false);
  const [periodoCompensar, setPeriodoCompensar] = useState<{ mes: number; anio: number }>(() =>
    obtenerPeriodoDesdeFecha(new Date())
  );
  const [editarFichajeModal, setEditarFichajeModal] = useState<{
    open: boolean;
    fichaje: FichajeEventoParaEditar | null;
  }>({
    open: false,
    fichaje: null,
  });

  const calcularHorasTrabajadas = useCallback((eventos: FichajeEvento[]): number => {
    let horasTotales = 0;
    let inicioTrabajo: Date | null = null;

    for (const evento of eventos) {
      const hora = new Date(evento.hora);

      switch (evento.tipo) {
        case 'entrada':
          inicioTrabajo = hora;
          break;

        case 'pausa_inicio':
          if (inicioTrabajo) {
            const tiempoTrabajado = (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
            horasTotales += tiempoTrabajado;
            inicioTrabajo = null;
          }
          break;

        case 'pausa_fin':
          inicioTrabajo = hora;
          break;

        case 'salida':
          if (inicioTrabajo) {
            const tiempoTrabajado = (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
            horasTotales += tiempoTrabajado;
            inicioTrabajo = null;
          }
          break;
      }
    }

    return Math.round(horasTotales * 100) / 100;
  }, []);

  const agruparPorJornada = useCallback((fichajes: Fichaje[]): JornadaDia[] => {
    const grupos: Record<string, Fichaje[]> = {};

    fichajes.forEach(f => {
      if (!grupos[f.fecha]) {
        grupos[f.fecha] = [];
      }
      grupos[f.fecha].push(f);
    });

    return Object.entries(grupos).map(([fecha, fichajesDelDia]) => {
      const eventosOrdenados = fichajesDelDia
        .flatMap<FichajeEvento>((registro) => registro.eventos)
        .sort(
          (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
        );

      let horasTrabajadas = 0;
      const fichaje = fichajesDelDia[0];
      if (fichaje.horasTrabajadas !== null && fichaje.horasTrabajadas !== undefined) {
        const valor = fichaje.horasTrabajadas;
        horasTrabajadas = typeof valor === 'string' ? parseFloat(valor) : valor;
        if (Number.isNaN(horasTrabajadas)) {
          horasTrabajadas = calcularHorasTrabajadas(eventosOrdenados);
        }
      } else {
        horasTrabajadas = calcularHorasTrabajadas(eventosOrdenados);
      }

      const entrada = eventosOrdenados.find(e => e.tipo === 'entrada');
      const salida = eventosOrdenados.find(e => e.tipo === 'salida');

      const horarioEntrada = entrada ? format(new Date(entrada.hora), 'HH:mm') : null;
      const horarioSalida = salida ? format(new Date(salida.hora), 'HH:mm') : null;

      const horasEsperadas = (() => {
        const valor = (fichaje as { horasEsperadas?: number | string | null }).horasEsperadas;
        if (valor === null || valor === undefined) {
          return 0;
        }
        const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
        return Number.isFinite(numero) ? numero : 0;
      })();

      const balance = (() => {
        const valor = (fichaje as { balance?: number | string | null }).balance;
        if (valor === null || valor === undefined) {
          return Math.round((horasTrabajadas - horasEsperadas) * 100) / 100;
        }
        const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
        return Number.isFinite(numero)
          ? numero
          : Math.round((horasTrabajadas - horasEsperadas) * 100) / 100;
      })();

      return {
        empleadoId: fichaje.empleado.id,
        empleadoNombre: `${fichaje.empleado.nombre} ${fichaje.empleado.apellidos}`,
        fecha: new Date(fecha),
        fichaje,
        horasTrabajadas,
        horasEsperadas,
        horarioEntrada,
        horarioSalida,
        balance,
      };
    }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }, [calcularHorasTrabajadas]);

  const fetchFichajes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Calcular rango de fechas según selección
      const { inicio, fin } = calcularRangoFechas(fechaBase, rangoFechas);
      params.append('fechaInicio', inicio.toISOString().split('T')[0]);
      params.append('fechaFin', fin.toISOString().split('T')[0]);

      if (filtroEstadoFichaje !== 'todos') {
        params.append('estado', filtroEstadoFichaje);
      }

      const response = await fetch(`/api/fichajes?${params}`);
      const payload = await response.json();

      if (!response.ok) {
        const errorMessage =
          (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string')
            ? payload.error
            : 'No se pudieron cargar los fichajes';
        toast.error(errorMessage);
        setJornadas([]);
        return;
      }

      const fichajes = extractArrayFromResponse<Fichaje>(payload, { key: 'fichajes' });
      const jornadasAgrupadas = agruparPorJornada(fichajes);
      setJornadas(jornadasAgrupadas);
    } catch (error) {
      console.error('Error fetching fichajes:', error);
    } finally {
      setLoading(false);
    }
  }, [agruparPorJornada, fechaBase, rangoFechas, filtroEstadoFichaje]);

  useEffect(() => {
    fetchFichajes();
  }, [fetchFichajes]);

  function calcularRangoFechas(fecha: Date, rango: 'dia' | 'semana' | 'mes') {
    const inicio = new Date(fecha);
    const fin = new Date(fecha);

    switch (rango) {
      case 'dia':
        // Mismo día
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'semana':
        // Inicio de semana (lunes)
        const diaSemana = fecha.getDay();
        const diffInicio = diaSemana === 0 ? -6 : 1 - diaSemana;
        inicio.setDate(fecha.getDate() + diffInicio);
        inicio.setHours(0, 0, 0, 0);
        // Fin de semana (domingo)
        fin.setDate(inicio.getDate() + 6);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'mes':
        // Primer día del mes
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        // Último día del mes
        fin.setMonth(fecha.getMonth() + 1, 0);
        fin.setHours(23, 59, 59, 999);
        break;
    }

    return { inicio, fin };
  }

  // NUEVO MODELO: Los fichajes ya vienen agrupados (un fichaje por día con eventos)
  // useEffect(() => {
  //   fetchFichajes();
  // }, [filtroEstadoFichaje, rangoFechas, fechaBase]);

  // useEffect(() => {
  //   fetchFichajes();
  // }, [filtroEstadoFichaje, rangoFechas, fechaBase]);

  async function handleCuadrarFichajes() {
    setCuadrandoFichajes(true);
    
    try {
      console.log('[Cuadrar fichajes] Abriendo modal de revisión...');
      
      // Abrir modal de revisión directamente
      setRevisionModal(true);
      
    } catch (error) {
      console.error('[Cuadrar fichajes] Error:', error);
      toast.error('Error al abrir cuadre de fichajes. Revisa la consola para más detalles.');
    } finally {
      setCuadrandoFichajes(false);
    }
  }

  async function handleEditarFichajeDesdeRevision({ fichajeId, empleadoId, fecha }: { fichajeId: string; empleadoId: string; fecha: string }) {
    setRevisionModal(false);

    const fechaIso = new Date(fecha).toISOString();
    const rowKey = `${empleadoId}_${fechaIso}`;

    setTimeout(() => {
      const rowElement = document.getElementById(rowKey);
      rowElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);

    try {
      const response = await fetch(`/api/fichajes/${fichajeId}`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const eventos = Array.isArray(data.eventos) ? data.eventos : [];
      if (eventos.length === 0) {
        return;
      }

      const eventoSalida = eventos.find((evento: FichajeEvento) => evento.tipo === 'salida');
      const eventoObjetivo = eventoSalida || eventos[eventos.length - 1];

      if (eventoObjetivo) {
        setEditarFichajeModal({
          open: true,
          fichaje: {
            id: eventoObjetivo.id,
            tipo: eventoObjetivo.tipo,
            hora: eventoObjetivo.hora,
            editado: Boolean(eventoObjetivo.editado),
          },
        });
      }
    } catch (error) {
      console.error('[Fichajes] Error al abrir edición desde revisión:', error);
    }
  }

  async function handleEditarFichaje(fichajeId: string, hora: string, tipo: string) {
    try {
      const response = await fetch(`/api/fichajes/${fichajeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hora,
          tipo,
        }),
      });

      if (response.ok) {
        toast.success('Fichaje actualizado correctamente');
        fetchFichajes(); // Recargar fichajes
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al actualizar fichaje');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar fichaje');
    }
  }

  const handleAbrirCompensacion = () => {
    setPeriodoCompensar(obtenerPeriodoDesdeFecha(fechaBase));
    setShowCompensarHorasDialog(true);
  };

  function getFichajeBadge(estado: string) {
    const variants: Record<string, { label: string; className: string }> = {
      en_curso: { label: 'En curso', className: 'bg-yellow-100 text-yellow-800' },
      finalizado: { label: 'Finalizado', className: 'bg-green-100 text-green-800' },
      revisado: { label: 'Revisado', className: 'bg-green-50 text-green-700 border-green-200 border' },
      pendiente: { label: 'Pendiente', className: 'bg-gray-100 text-gray-800' },
      // Estados legacy (compatibilidad temporal con datos existentes)
      pendiente_revision: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      aprobado: { label: 'Finalizado', className: 'bg-green-100 text-green-800' },
      rechazado: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      confirmado: { label: 'Finalizado', className: 'bg-green-100 text-green-800' },
      auto: { label: 'Finalizado', className: 'bg-green-100 text-green-800' },
    };

    const variant = variants[estado] || variants.en_curso;
    return (
      <Badge className={variant.className + ' text-xs'}>
        {variant.label}
      </Badge>
    );
  }

  // Filtrar jornadas por búsqueda de empleado y estado de fichaje
  let jornadasFiltradas = busquedaEmpleado
    ? jornadas.filter(j => 
        j.empleadoNombre.toLowerCase().includes(busquedaEmpleado.toLowerCase())
      )
    : jornadas;

  // Aplicar filtro de estado de fichaje
  if (filtroEstadoFichaje !== 'todos') {
    jornadasFiltradas = jornadasFiltradas.filter(jornada => 
      jornada.fichaje.estado === filtroEstadoFichaje
    );
  }

  // Fichajes que requieren atención (no completados ni aprobados)
  const fichajesRevisados = jornadasFiltradas.filter(j => j.fichaje.estado === 'revisado').length;
  const fichajesPendientesRevision = jornadasFiltradas.filter(j => 
    j.fichaje.estado === EstadoFichaje.pendiente || 
    j.fichaje.estado === 'pendiente_revision' || // Legacy
    j.fichaje.estado === EstadoFichaje.en_curso ||
    j.fichaje.estado === 'rechazado' // Legacy - tratar como pendiente
  ).length;

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Fichajes</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setJornadasModal(true)}
            className="border-gray-200"
          >
            <Clock className="w-4 h-4 mr-2" />
            Gestionar Jornadas
          </Button>
          <Button
            variant="outline"
            className="border-gray-200"
            onClick={handleAbrirCompensacion}
          >
            <Clock className="w-4 h-4 mr-2" />
            Compensar horas
          </Button>
          <Button
            onClick={handleCuadrarFichajes}
            className="bg-gray-900 text-white hover:bg-gray-800"
          >
            + Cuadrar fichajes
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        {/* Izquierda: Búsqueda y filtro */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Búsqueda por empleado */}
          <Input
            placeholder="Buscar empleado..."
            value={busquedaEmpleado}
            onChange={(e) => setBusquedaEmpleado(e.target.value)}
            className="w-[200px]"
          />

          {/* Filtro de estado de fichaje */}
          <Select value={filtroEstadoFichaje} onValueChange={setFiltroEstadoFichaje}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Estado del fichaje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="en_curso">En curso</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="revisado">Revisado</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
            </SelectContent>
          </Select>

          {fichajesRevisados > 0 && (
            <Badge className="bg-green-50 text-green-700 border-green-200 border">
              {fichajesRevisados} revisados
            </Badge>
          )}
          
          {fichajesPendientesRevision > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800">
              {fichajesPendientesRevision} pendientes
            </Badge>
          )}
        </div>

        {/* Derecha: Rango de fechas y navegación */}
        <div className="flex items-center gap-2">
          {/* Selector de rango */}
          <Select value={rangoFechas} onValueChange={(v) => setRangoFechas(v as 'dia' | 'semana' | 'mes')}>
            <SelectTrigger className="w-[120px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dia">Día</SelectItem>
              <SelectItem value="semana">Semana</SelectItem>
              <SelectItem value="mes">Mes</SelectItem>
            </SelectContent>
          </Select>

          {/* Navegación de fechas */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nueva = new Date(fechaBase);
              if (rangoFechas === 'dia') nueva.setDate(nueva.getDate() - 1);
              else if (rangoFechas === 'semana') nueva.setDate(nueva.getDate() - 7);
              else nueva.setMonth(nueva.getMonth() - 1);
              setFechaBase(nueva);
            }}
            title="Período anterior"
          >
            ←
          </Button>

          <span className="text-sm font-medium min-w-[160px] text-center">
            {rangoFechas === 'dia' && format(fechaBase, 'dd MMM', { locale: es })}
            {rangoFechas === 'semana' && `Sem ${format(fechaBase, 'w', { locale: es })}`}
            {rangoFechas === 'mes' && format(fechaBase, 'MMM yyyy', { locale: es })}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nueva = new Date(fechaBase);
              if (rangoFechas === 'dia') nueva.setDate(nueva.getDate() + 1);
              else if (rangoFechas === 'semana') nueva.setDate(nueva.getDate() + 7);
              else nueva.setMonth(nueva.getMonth() + 1);
              setFechaBase(nueva);
            }}
            title="Próximo período"
          >
            →
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFechaBase(new Date())}
          >
            Hoy
          </Button>

        {cuadrandoFichajes && (
            <div className="text-sm text-gray-600 ml-2">Cuadrando...</div>
        )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto px-2 sm:px-4">
            <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Horas Trabajadas</TableHead>
                <TableHead>Horas Esperadas</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : jornadasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {busquedaEmpleado ? 'No se encontraron empleados' : 'No hay fichajes'}
                  </TableCell>
                </TableRow>
              ) : (
                jornadasFiltradas.map((jornada) => {
                  const key = `${jornada.empleadoId}_${jornada.fecha.toISOString()}`;
                  
                  return (
                    <React.Fragment key={key}>
                      <TableRow 
                        id={key}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          const eventos = jornada.fichaje.eventos;
                          if (eventos && eventos.length > 0) {
                            const eventoSalida = eventos.find((e: FichajeEvento) => e.tipo === 'salida');
                            const target = (eventoSalida || eventos[eventos.length - 1]) as FichajeEvento;
                            setEditarFichajeModal({
                              open: true,
                              fichaje: {
                                id: target.id,
                                tipo: target.tipo,
                                hora: target.hora,
                                editado: Boolean(target.editado),
                              },
                            });
                          }
                        }}
                      >
                        <TableCell>
                          {/* Reservado para icono futuro */}
                        </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">
                            {jornada.empleadoNombre}
                      </div>
                    </TableCell>
                    <TableCell>
                          <span className="text-sm text-gray-600">
                            {format(jornada.fecha, 'dd MMM yyyy', { locale: es })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {formatearHorasMinutos(jornada.horasTrabajadas)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {formatearHorasMinutos(jornada.horasEsperadas)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {jornada.horarioEntrada && jornada.horarioSalida
                              ? `${jornada.horarioEntrada} - ${jornada.horarioSalida}`
                              : jornada.horarioEntrada
                              ? `${jornada.horarioEntrada} - ...`
                              : 'Sin datos'}
                          </span>
                    </TableCell>
                    <TableCell>
                          <span
                            className={`text-sm font-medium ${
                              jornada.balance >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {Number.isFinite(jornada.balance) && jornada.balance !== 0
                              ? `${jornada.balance > 0 ? '+' : '-'}${formatearHorasMinutos(
                                  Math.abs(jornada.balance)
                                )}`
                              : '0h 0m'}
                          </span>
                    </TableCell>
                    <TableCell>
                          {getFichajeBadge(jornada.fichaje.estado)}
                        </TableCell>
                      </TableRow>
                      
                      {/* Panel expandido eliminado; usamos modal al click en fila */}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Modal Gestionar Jornadas */}
      <JornadasModal 
        open={jornadasModal} 
        onClose={() => setJornadasModal(false)} 
      />

      {/* Modal Editar Fichaje */}
      <EditarFichajeModal
        open={editarFichajeModal.open}
        fichaje={editarFichajeModal.fichaje}
        fichajeDiaId={(() => {
          // Inferir el fichaje del día a partir del evento seleccionado buscando en jornadas cargadas
          const evt = editarFichajeModal.fichaje;
          if (!evt) return undefined;
          const match = jornadas.find(j => j.fichaje.eventos.some(e => e.id === evt.id));
          return match?.fichaje.id;
        })()}
        onClose={() => setEditarFichajeModal({ open: false, fichaje: null })}
        onSave={handleEditarFichaje}
      />

      {/* Modal Revisión de Fichajes */}
      <RevisionModal
        open={revisionModal}
        onClose={() => setRevisionModal(false)}
        onReviewed={() => {
          fetchFichajes(); // Recargar fichajes después de revisar
        }}
        onEditFichaje={handleEditarFichajeDesdeRevision}
      />

      {showCompensarHorasDialog && (
        <CompensarHorasDialog
          context="fichajes"
          mesInicial={periodoCompensar.mes}
          anioInicial={periodoCompensar.anio}
          isOpen={showCompensarHorasDialog}
          onClose={() => setShowCompensarHorasDialog(false)}
        />
      )}
    </div>
  );
}

function obtenerPeriodoDesdeFecha(fecha: Date) {
  const referencia = new Date(fecha);
  return {
    mes: referencia.getMonth() + 1,
    anio: referencia.getFullYear(),
  };
}
