'use client';

import { AlertCircle, Clock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { parseJson } from '@/lib/utils/json';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface BalanceEmpleado {
  empleado: {
    id: string;
    nombre: string;
    apellidos: string;
    email: string;
    equipos: Array<{
      equipo: {
        id: string;
        nombre: string;
      };
    }>;
  };
  balance: {
    balanceTotal: number;
  };
}

interface BalancesResponse {
  balances?: BalanceEmpleado[];
  error?: string;
}

interface CompensarResponse {
  compensacionesCreadas?: number;
  errores?: number;
  error?: string;
}

type CompensarHorasDialogProps =
  | {
      context: 'nominas';
      eventoId: string;
      mes: number;
      anio: number;
      isOpen: boolean;
      onClose: () => void;
    }
  | {
      context: 'fichajes';
      mesInicial: number;
      anioInicial: number;
      isOpen: boolean;
      onClose: () => void;
    };

export function CompensarHorasDialog(props: CompensarHorasDialogProps) {
  const eventoId = props.context === 'nominas' ? props.eventoId : null;
  const defaultMes = props.context === 'nominas' ? props.mes : props.mesInicial;
  const defaultAnio = props.context === 'nominas' ? props.anio : props.anioInicial;

  // Estados de datos
  const [balances, setBalances] = useState<BalanceEmpleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [procesando, setProcesando] = useState(false);

  // Estados de filtros (sin switches, siempre visibles)
  const [mesSeleccionado, setMesSeleccionado] = useState<string>(
    props.context === 'nominas' ? String(defaultMes) : 'all'
  );
  const [anioSeleccionado] = useState(defaultAnio);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('all');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('all');

  // Estado de compensación con slider (0=ausencia, 50=combinado, 100=nomina)
  const [tipoCompensacionSlider, setTipoCompensacionSlider] = useState([50]);

  // Estado de límite de horas
  const [limitarHoras, setLimitarHoras] = useState(false);
  const [maxHorasPorEmpleado, setMaxHorasPorEmpleado] = useState('');

  // Estado de horas personalizadas por empleado
  const [horasPersonalizadas, setHorasPersonalizadas] = useState<Record<string, string>>({});

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        mes: mesSeleccionado,
        anio: String(anioSeleccionado),
      });

      const endpoint =
        props.context === 'nominas' && eventoId
          ? `/api/nominas/eventos/${eventoId}/balance-horas?${query.toString()}`
          : `/api/fichajes/bolsa-horas?${query.toString()}`;

      const response = await fetch(endpoint);
      const data = await parseJson<BalancesResponse>(response);
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener balances');
      }
      const positivos = (data.balances || []).filter((item) => item.balance.balanceTotal > 0);
      setBalances(positivos);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error fetching balances:', error);
      toast.error('Error al obtener balances');
    } finally {
      setLoading(false);
    }
  }, [props.context, eventoId, mesSeleccionado, anioSeleccionado]);

  useEffect(() => {
    if (!props.isOpen) return;
    fetchBalances();
  }, [props.isOpen, fetchBalances]);

  // Opciones para los selects
  const equipoOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const balance of balances) {
      balance.empleado.equipos.forEach((entry) => {
        if (entry.equipo) {
          map.set(entry.equipo.id, entry.equipo.nombre);
        }
      });
    }
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [balances]);

  const empleadoOptions = useMemo(
    () =>
      balances.map((item) => ({
        id: item.empleado.id,
        nombre: `${item.empleado.nombre} ${item.empleado.apellidos}`,
      })),
    [balances]
  );

  // Filtrado
  const balancesFiltrados = useMemo(() => {
    return balances
      .filter((item) => {
        if (empleadoSeleccionado === 'all') return true;
        return item.empleado.id === empleadoSeleccionado;
      })
      .filter((item) => {
        if (equipoSeleccionado === 'all') return true;
        return item.empleado.equipos.some((eq) => eq.equipo?.id === equipoSeleccionado);
      });
  }, [balances, empleadoSeleccionado, equipoSeleccionado]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(balancesFiltrados.map((b) => b.empleado.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (empleadoId: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(empleadoId);
    } else {
      next.delete(empleadoId);
    }
    setSelectedIds(next);
  };

  const getTipoCompensacion = (): 'ausencia' | 'nomina' | 'combinado' => {
    const value = tipoCompensacionSlider[0];
    if (value === 0) return 'ausencia';
    if (value === 100) return 'nomina';
    return 'combinado';
  };

  const getPorcentajeAusencia = (): number => {
    const value = tipoCompensacionSlider[0];
    return 100 - value;
  };

  const handleCompensar = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un empleado');
      return;
    }

    setProcesando(true);
    try {
      const tipoCompensacion = getTipoCompensacion();
      const maxHorasValue =
        limitarHoras && maxHorasPorEmpleado.trim() !== '' ? Number(maxHorasPorEmpleado) : undefined;

      // Detectar si hay horas personalizadas
      const hayPersonalizadas = Array.from(selectedIds).some(
        (id) => horasPersonalizadas[id] && horasPersonalizadas[id].trim() !== ''
      );

      const baseBody: Record<string, unknown> = {
        empleadoIds: Array.from(selectedIds),
        tipoCompensacion,
        usarTodasLasHoras: !hayPersonalizadas,
        horasPorEmpleado: hayPersonalizadas
          ? Object.fromEntries(
              Array.from(selectedIds).map((id) => [id, Number(horasPersonalizadas[id] || '0')])
            )
          : undefined,
        maxHorasPorEmpleado: maxHorasValue,
      };

      if (tipoCompensacion === 'combinado') {
        const porcentajeAusencia = getPorcentajeAusencia();
        baseBody.porcentajeAusencia = porcentajeAusencia;
        baseBody.porcentajeNomina = 100 - porcentajeAusencia;
      }

      const endpoint =
        props.context === 'nominas' && eventoId
          ? `/api/nominas/eventos/${eventoId}/compensar-horas-masivo`
          : `/api/fichajes/compensar-horas`;

      const body =
        props.context === 'nominas'
          ? baseBody
          : {
              ...baseBody,
              mes: mesSeleccionado === 'all' ? 'all' : Number(mesSeleccionado),
              anio: anioSeleccionado,
            };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await parseJson<CompensarResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || 'Error al compensar horas');
      }

      toast.success(
        `Compensación aplicada correctamente. ${data.compensacionesCreadas ?? 0} éxitos, ${data.errores ?? 0} errores.`
      );
      setSelectedIds(new Set());
      props.onClose();
    } catch (error) {
      console.error('Error compensando horas:', error);
      toast.error(error instanceof Error ? error.message : 'Error al compensar horas');
    } finally {
      setProcesando(false);
    }
  };

  const totalHorasSeleccionadas = useMemo(() => {
    const mapa = new Map(balances.map((item) => [item.empleado.id, item.balance.balanceTotal]));
    return Array.from(selectedIds).reduce((sum, id) => sum + (mapa.get(id) ?? 0), 0);
  }, [balances, selectedIds]);

  const getTipoLabel = () => {
    const value = tipoCompensacionSlider[0];
    if (value === 0) return 'Ausencia (100%)';
    if (value === 100) return 'Nómina (100%)';
    const ausencia = 100 - value;
    return `Combinado (${ausencia}% ausencia, ${value}% nómina)`;
  };

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compensar Horas Extra</DialogTitle>
          <DialogDescription />
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sección: Tipo de compensación con Slider */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Tipo de compensación</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Ausencia</span>
                <span className="font-medium text-gray-900">{getTipoLabel()}</span>
                <span className="text-gray-600">Nómina</span>
              </div>

              <Slider
                value={tipoCompensacionSlider}
                onValueChange={setTipoCompensacionSlider}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />

            </div>
          </div>

          {/* Límite de horas (sin sección "avanzada") */}
          <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Switch id="limitar-horas" checked={limitarHoras} onCheckedChange={setLimitarHoras} />
              <Label htmlFor="limitar-horas" className="text-sm font-medium cursor-pointer">
                Limitar horas máximas por empleado
              </Label>
            </div>
            {limitarHoras && (
              <Input
                type="number"
                min={0}
                step="0.5"
                placeholder="Ej: 20"
                value={maxHorasPorEmpleado}
                onChange={(e) => setMaxHorasPorEmpleado(e.target.value)}
                className="w-[120px]"
              />
            )}
          </div>

          {/* Sección: Tabla de empleados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Empleados horas extra ({balancesFiltrados.length})
              </h3>
              {selectedIds.size > 0 && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                  {selectedIds.size} seleccionados · {totalHorasSeleccionadas.toFixed(2)}h
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Filtro por mes (solo en contexto fichajes) */}
              {props.context === 'fichajes' && (
                <div>
                  <Label className="sr-only">Periodo</Label>
                  <Select
                    value={mesSeleccionado}
                    onValueChange={setMesSeleccionado}
                    aria-label="Periodo"
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Año completo</SelectItem>
                      {MESES.map((mes, index) => (
                        <SelectItem key={mes} value={String(index + 1)}>
                          {mes}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro por empleado */}
              <div>
                <Label className="sr-only">Empleado</Label>
                <Select
                  value={empleadoSeleccionado}
                  onValueChange={setEmpleadoSeleccionado}
                  disabled={empleadoOptions.length === 0}
                  aria-label="Empleado"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {empleadoOptions.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        No hay empleados con horas disponibles en este periodo.
                      </div>
                    )}
                    <SelectItem value="all">Todos</SelectItem>
                    {empleadoOptions.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por equipo */}
              <div>
                <Label className="sr-only">Equipo</Label>
                <Select
                  value={equipoSeleccionado}
                  onValueChange={setEquipoSeleccionado}
                  disabled={equipoOptions.length === 0}
                  aria-label="Equipo"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipoOptions.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        No hay equipos con horas disponibles en este periodo.
                      </div>
                    )}
                    <SelectItem value="all">Todos</SelectItem>
                    {equipoOptions.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabla */}
            <div className="border rounded-lg max-h-96 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48 text-gray-500">
                  <Clock className="w-6 h-6 animate-spin text-gray-400 mr-2" />
                  Cargando balances...
                </div>
              ) : balancesFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm">No hay empleados con horas disponibles</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left w-12">
                        <Checkbox
                          checked={
                            balancesFiltrados.length > 0 &&
                            balancesFiltrados.every((item) => selectedIds.has(item.empleado.id))
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Empleado
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Equipo
                      </th>
                      <th className="p-3 text-right text-xs font-medium text-gray-600 uppercase">
                        Horas disponibles
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Horas a compensar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {balancesFiltrados.map((item) => (
                      <tr key={item.empleado.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedIds.has(item.empleado.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOne(item.empleado.id, Boolean(checked))
                            }
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-gray-900">
                            {item.empleado.nombre} {item.empleado.apellidos}
                          </div>
                          <div className="text-xs text-gray-500">{item.empleado.email}</div>
                        </td>
                        <td className="p-3 text-gray-600 text-xs">
                          {item.empleado.equipos[0]?.equipo.nombre || '-'}
                        </td>
                        <td className="p-3 text-right font-semibold text-gray-900">
                          {item.balance.balanceTotal.toFixed(2)} h
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min={0}
                            max={item.balance.balanceTotal}
                            step="0.5"
                            placeholder="Todas"
                            value={horasPersonalizadas[item.empleado.id] || ''}
                            onChange={(e) =>
                              setHorasPersonalizadas((prev) => ({
                                ...prev,
                                [item.empleado.id]: e.target.value,
                              }))
                            }
                            className="w-24"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={props.onClose} disabled={procesando}>
              Cancelar
            </Button>
            <Button onClick={handleCompensar} disabled={procesando || selectedIds.size === 0}>
              {procesando ? 'Procesando...' : `Compensar ${selectedIds.size} empleado(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
