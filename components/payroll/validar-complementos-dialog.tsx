'use client';

import { AlertCircle, CheckCircle, Clock, Search, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { parseJson } from '@/lib/utils/json';

interface Complemento {
  id: string;
  empleadoId: string;
  tipoComplementoId: string;
  importePersonalizado: number | null;
  validado: boolean;
  rechazado: boolean;
  motivoRechazo: string | null;
  validadoPor: string | null;
  fechaValidacion: Date | null;
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
  tipoComplemento: {
    id: string;
    nombre: string;
    descripcion: string | null;
    importeFijo: number | null;
    periodicidad: string;
  };
}

interface Stats {
  total: number;
  validados: number;
  pendientes: number;
  rechazados: number;
  variables: number;
}

type FiltroEstado = 'todos' | 'pendientes' | 'validados' | 'rechazados' | 'variables';

interface ValidarComplementosDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventoId: string;
}

interface ComplementosResponse {
  complementos?: Complemento[];
  stats?: Stats;
  error?: string;
}

interface ValidarResponse {
  complementosActualizados?: number;
  error?: string;
}

export function ValidarComplementosDialog({
  isOpen,
  onClose,
  eventoId,
}: ValidarComplementosDialogProps) {
  const [complementos, setComplementos] = useState<Complemento[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('pendientes');
  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);

  const fetchComplementos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/nominas/eventos/${eventoId}/complementos-pendientes`);
      const data = await parseJson<ComplementosResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar complementos');
      }

      setComplementos(data.complementos || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching complementos:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cargar complementos');
    } finally {
      setLoading(false);
    }
  }, [eventoId]);

  useEffect(() => {
    if (isOpen && eventoId) {
      fetchComplementos();
    }
  }, [isOpen, eventoId, fetchComplementos]);

  const complementosFiltrados = useMemo(() => {
    return complementos.filter((comp) => {
      // Filtro por búsqueda
      const matchesSearch =
        searchTerm === '' ||
        `${comp.empleado.nombre} ${comp.empleado.apellidos}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        comp.tipoComplemento.nombre.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por estado
      const matchesEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'pendientes' && !comp.validado && !comp.rechazado) ||
        (filtroEstado === 'validados' && comp.validado) ||
        (filtroEstado === 'rechazados' && comp.rechazado) ||
        (filtroEstado === 'variables' && !comp.importePersonalizado && !comp.tipoComplemento.importeFijo);

      return matchesSearch && matchesEstado;
    });
  }, [complementos, searchTerm, filtroEstado]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = complementosFiltrados
        .filter(c => !c.validado && !c.rechazado)
        .map(c => c.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleValidar = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un complemento');
      return;
    }

    setProcesando(true);
    try {
      const response = await fetch(`/api/nominas/eventos/${eventoId}/validar-complementos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complementoIds: Array.from(selectedIds),
          accion: 'validar',
        }),
      });

      const data = await parseJson<ValidarResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || 'Error al validar complementos');
      }

      toast.success(`${data.complementosActualizados ?? 0} complemento(s) validado(s)`);
      setSelectedIds(new Set());
      await fetchComplementos();
    } catch (error) {
      console.error('Error validando complementos:', error);
      toast.error(error instanceof Error ? error.message : 'Error al validar complementos');
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un complemento');
      return;
    }

    if (!motivoRechazo.trim()) {
      toast.error('Debe indicar un motivo de rechazo');
      return;
    }

    setProcesando(true);
    try {
      const response = await fetch(`/api/nominas/eventos/${eventoId}/validar-complementos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complementoIds: Array.from(selectedIds),
          accion: 'rechazar',
          motivoRechazo: motivoRechazo.trim(),
        }),
      });

      const data = await parseJson<ValidarResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || 'Error al rechazar complementos');
      }

      toast.success(`${data.complementosActualizados ?? 0} complemento(s) rechazado(s)`);
      setSelectedIds(new Set());
      setShowRechazarModal(false);
      setMotivoRechazo('');
      await fetchComplementos();
    } catch (error) {
      console.error('Error rechazando complementos:', error);
      toast.error(error instanceof Error ? error.message : 'Error al rechazar complementos');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Validar Complementos</DialogTitle>
            <DialogDescription>
              Valida o rechaza complementos de empleados para este evento de nóminas
            </DialogDescription>
          </DialogHeader>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-5 gap-3 py-4">
              <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600 mt-1">Total</div>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-green-600">{stats.validados}</div>
                <div className="text-xs text-gray-600 mt-1">Validados</div>
              </div>
              <div className="bg-orange-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.pendientes}</div>
                <div className="text-xs text-gray-600 mt-1">Pendientes</div>
              </div>
              <div className="bg-red-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-red-600">{stats.rechazados}</div>
                <div className="text-xs text-gray-600 mt-1">Rechazados</div>
              </div>
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.variables}</div>
                <div className="text-xs text-gray-600 mt-1">Variables</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3 items-center py-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o tipo de complemento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filtroEstado}
              onValueChange={(value: FiltroEstado) => setFiltroEstado(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendientes">Solo pendientes</SelectItem>
                <SelectItem value="validados">Solo validados</SelectItem>
                <SelectItem value="rechazados">Solo rechazados</SelectItem>
                <SelectItem value="variables">Solo variables</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 py-2 px-3 bg-blue-50 rounded">
              <span className="text-sm text-blue-900 font-medium">
                {selectedIds.size} complemento(s) seleccionado(s)
              </span>
              <div className="flex-1" />
              <Button size="sm" onClick={handleValidar} disabled={procesando}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Validar seleccionados
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowRechazarModal(true)}
                disabled={procesando}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar seleccionados
              </Button>
            </div>
          )}

          {/* Lista */}
          <div className="flex-1 overflow-y-auto border rounded">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Clock className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : complementosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <AlertCircle className="w-12 h-12 mb-3 text-gray-400" />
                <p>No se encontraron complementos</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left">
                      <Checkbox
                        checked={
                          complementosFiltrados.filter(c => !c.validado && !c.rechazado).length > 0 &&
                          complementosFiltrados
                            .filter(c => !c.validado && !c.rechazado)
                            .every(c => selectedIds.has(c.id))
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Empleado</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Complemento</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Importe</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-600 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {complementosFiltrados.map((comp) => {
                    const esVariable = !comp.importePersonalizado && !comp.tipoComplemento.importeFijo;
                    const importe = comp.importePersonalizado || comp.tipoComplemento.importeFijo;
                    const deshabilitado = comp.validado || comp.rechazado;

                    return (
                      <tr key={comp.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedIds.has(comp.id)}
                            onCheckedChange={(checked) => handleSelectOne(comp.id, checked as boolean)}
                            disabled={deshabilitado}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 text-sm">
                              {comp.empleado.nombre} {comp.empleado.apellidos}
                            </span>
                            <span className="text-xs text-gray-500">{comp.empleado.email}</span>
                            {comp.empleado.equipos.length > 0 && (
                              <span className="text-xs text-gray-400 mt-0.5">
                                {comp.empleado.equipos[0].equipo.nombre}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 text-sm">{comp.tipoComplemento.nombre}</span>
                            {comp.tipoComplemento.descripcion && (
                              <span className="text-xs text-gray-500">{comp.tipoComplemento.descripcion}</span>
                            )}
                            {esVariable && (
                              <Badge variant="secondary" className="mt-1 w-fit text-xs">
                                Variable
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {importe ? (
                            <span className="font-medium text-gray-900">
                              €{Number(importe).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Pendiente</span>
                          )}
                        </td>
                        <td className="p-3">
                          {comp.validado ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Validado
                            </Badge>
                          ) : comp.rechazado ? (
                            <Badge className="bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3 mr-1" />
                              Rechazado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendiente
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de rechazo */}
      {showRechazarModal && (
        <Dialog open={showRechazarModal} onOpenChange={setShowRechazarModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechazar complementos</DialogTitle>
              <DialogDescription>
                Indica el motivo del rechazo para los {selectedIds.size} complemento(s) seleccionado(s)
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Motivo del rechazo..."
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRechazarModal(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleRechazar} disabled={procesando}>
                Rechazar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

