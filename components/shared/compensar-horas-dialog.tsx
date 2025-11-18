'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';

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
  const isContextNominas = props.context === 'nominas';
  const eventoId = props.context === 'nominas' ? props.eventoId : null;
  const defaultMes = props.context === 'nominas' ? props.mes : props.mesInicial;
  const defaultAnio = props.context === 'nominas' ? props.anio : props.anioInicial;

  const [balances, setBalances] = useState<BalanceEmpleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tipoCompensacion, setTipoCompensacion] = useState<'ausencia' | 'nomina'>('ausencia');
  const [usarTodasLasHoras, setUsarTodasLasHoras] = useState(true);
  const [horasPersonalizadas, setHorasPersonalizadas] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState(defaultMes);
  const [anioSeleccionado, setAnioSeleccionado] = useState(defaultAnio);

  // Sync periodo con props segun contexto
  useEffect(() => {
    if (props.context === 'nominas') {
      setMesSeleccionado(props.mes);
      setAnioSeleccionado(props.anio);
    }
  }, [props.context, props.context === 'nominas' ? props.mes : null, props.context === 'nominas' ? props.anio : null]);

  useEffect(() => {
    if (props.context === 'fichajes' && props.isOpen) {
      setMesSeleccionado(props.mesInicial);
      setAnioSeleccionado(props.anioInicial);
    }
  }, [
    props.context,
    props.isOpen,
    props.context === 'fichajes' ? props.mesInicial : null,
    props.context === 'fichajes' ? props.anioInicial : null,
  ]);

  useEffect(() => {
    if (!props.isOpen) return;
    fetchBalances();
  }, [
    props.isOpen,
    props.context,
    eventoId,
    mesSeleccionado,
    anioSeleccionado,
  ]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        mes: String(mesSeleccionado),
        anio: String(anioSeleccionado),
      });

      const endpoint =
        props.context === 'nominas' && eventoId
          ? `/api/nominas/eventos/${eventoId}/balance-horas?${query.toString()}`
          : `/api/fichajes/bolsa-horas?${query.toString()}`;

      const response = await fetch(endpoint);
      const data = await response.json();
      if (response.ok) {
        const positivos = (data.balances || []).filter(
          (item: BalanceEmpleado) => item.balance.balanceTotal > 0
        );
        setBalances(positivos);
        setSelectedIds(new Set());
      } else {
        toast.error(data.error || 'Error al obtener balances');
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      toast.error('Error al obtener balances');
    } finally {
      setLoading(false);
    }
  };

  const balancesFiltrados = useMemo(() => {
    return balances.filter((item) => {
      if (searchTerm.trim() === '') return true;
      const nombreCompleto = `${item.empleado.nombre} ${item.empleado.apellidos}`.toLowerCase();
      return nombreCompleto.includes(searchTerm.toLowerCase());
    });
  }, [balances, searchTerm]);

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

  const handleChangeHoras = (empleadoId: string, value: string) => {
    setHorasPersonalizadas((prev) => ({
      ...prev,
      [empleadoId]: value,
    }));
  };

  const handleCompensar = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un empleado');
      return;
    }

    setProcesando(true);
    try {
      const baseBody = {
        empleadoIds: Array.from(selectedIds),
        tipoCompensacion,
        usarTodasLasHoras,
        horasPorEmpleado: usarTodasLasHoras
          ? undefined
          : Object.fromEntries(
              Array.from(selectedIds).map((id) => [
                id,
                Number(horasPersonalizadas[id] || '0'),
              ])
            ),
      };

      const endpoint =
        props.context === 'nominas' && eventoId
          ? `/api/nominas/eventos/${eventoId}/compensar-horas-masivo`
          : `/api/fichajes/compensar-horas`;

      const body =
        props.context === 'nominas'
          ? baseBody
          : {
              ...baseBody,
              mes: mesSeleccionado,
              anio: anioSeleccionado,
            };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Compensación aplicada. Éxitos: ${data.compensacionesCreadas}, Errores: ${data.errores}`
        );
        setSelectedIds(new Set());
        props.onClose();
      } else {
        toast.error(data.error || 'Error al compensar horas');
      }
    } catch (error) {
      console.error('Error compensando horas:', error);
      toast.error('Error al compensar horas');
    } finally {
      setProcesando(false);
    }
  };

  const periodoLabel = `${MESES[mesSeleccionado - 1]} ${anioSeleccionado}`;

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Compensar Horas Extra</DialogTitle>
          <DialogDescription>
            Selecciona los empleados y define cómo compensar las horas extra de {periodoLabel}
          </DialogDescription>
        </DialogHeader>

        {props.context === 'fichajes' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Select
              value={String(mesSeleccionado)}
              onValueChange={(value) => setMesSeleccionado(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((mes, index) => (
                  <SelectItem key={mes} value={String(index + 1)}>
                    {mes}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={2020}
              max={2100}
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(Number(e.target.value) || anioSeleccionado)}
              placeholder="Año"
            />
          </div>
        )}

        <div className="space-y-4 mt-4">
          {/* Configuración */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded">
            <div>
              <p className="text-xs text-gray-500 mb-1">Tipo de compensación</p>
              <Select
                value={tipoCompensacion}
                onValueChange={(value: 'ausencia' | 'nomina') => setTipoCompensacion(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ausencia">Añadir días de ausencia</SelectItem>
                  <SelectItem value="nomina">Pagar en nómina</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="usarTodas"
                checked={usarTodasLasHoras}
                onCheckedChange={(checked) => setUsarTodasLasHoras(Boolean(checked))}
              />
              <label htmlFor="usarTodas" className="text-sm text-gray-700">
                Compensar todas las horas disponibles
              </label>
            </div>
            <div className="flex items-center">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                {selectedIds.size} empleado(s) seleccionado(s)
              </Badge>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar empleados por nombre..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tabla */}
          <div className="border rounded max-h-80 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-gray-500">
                <Clock className="w-6 h-6 animate-spin text-gray-400 mr-2" />
                Cargando balances...
              </div>
            ) : balancesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
                <p>No hay empleados con horas extra disponibles.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left">
                      <Checkbox
                        checked={
                          balancesFiltrados.length > 0 &&
                          balancesFiltrados.every((item) =>
                            selectedIds.has(item.empleado.id)
                          )
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Empleado</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Equipo</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Horas disponibles</th>
                    {!usarTodasLasHoras && (
                      <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Horas a compensar</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {balancesFiltrados.map((item) => (
                    <tr key={item.empleado.id} className="border-t">
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
                      <td className="p-3 text-gray-500 text-xs">
                        {item.empleado.equipos[0]?.equipo.nombre || 'Sin equipo'}
                      </td>
                      <td className="p-3 font-semibold text-gray-900">
                        {item.balance.balanceTotal.toFixed(2)} h
                      </td>
                      {!usarTodasLasHoras && (
                        <td className="p-3">
                          <Input
                            type="number"
                            placeholder="Horas"
                            value={horasPersonalizadas[item.empleado.id] || ''}
                            onChange={(e) => handleChangeHoras(item.empleado.id, e.target.value)}
                            min={0}
                            max={item.balance.balanceTotal}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={props.onClose}>
              Cancelar
            </Button>
            <Button onClick={handleCompensar} disabled={procesando || selectedIds.size === 0}>
              {procesando ? 'Procesando...' : 'Aplicar compensación'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

