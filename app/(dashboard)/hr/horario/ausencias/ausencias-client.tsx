'use client';

// ========================================
// Ausencias Client Component
// ========================================

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TableHeader as PageHeader } from '@/components/shared/table-header';
import { TableFilters } from '@/components/shared/table-filters';
import { Check, X, Calendar, Filter, Edit2, CheckCircle, Search, Settings, ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GestionarAusenciasModal } from './gestionar-ausencias-modal';
import { CrearCampanaModal } from './crear-campana-modal';
import { PopoverMonitoreoCampana } from '@/components/hr/popover-monitoreo-campana';
import { toast } from 'sonner';
import { EstadoAusencia } from '@/lib/constants/enums';
import { getAusenciaEstadoLabel } from '@/lib/utils/formatters';

interface Ausencia {
  id: string;
  empleadoId: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  diasLaborables: number;
  diasSolicitados?: number;
  medioDia: boolean;
  periodo?: string | null;
  estado: string;
  motivo: string | null;
  motivoRechazo: string | null;
  descripcion?: string | null;
  justificanteUrl?: string | null;
  documentoId?: string | null;
  empleado: {
    nombre: string;
    apellidos: string;
    puesto: string;
  };
}

interface Campana {
  id: string;
  titulo: string;
  estado: string;
  fechaInicioObjetivo: string;
  fechaFinObjetivo: string;
  totalEmpleadosAsignados: number;
  empleadosCompletados: number;
  _count: {
    preferencias: number;
  };
}

type EditFormState = {
  tipo: string;
  estado: EstadoAusencia;
  fechaInicio: string;
  fechaFin: string;
  medioDia: boolean;
  motivo: string;
  descripcion: string;
  justificanteUrl: string | null;
  documentoId: string | null;
};

const createEmptyEditForm = (): EditFormState => ({
  tipo: 'vacaciones',
  estado: EstadoAusencia.pendiente,
  fechaInicio: '',
  fechaFin: '',
  medioDia: false,
  motivo: '',
  descripcion: '',
  justificanteUrl: null,
  documentoId: null,
});

interface AusenciasClientProps {
  initialCampanasExpanded?: boolean;
}

export function AusenciasClient({ initialCampanasExpanded = false }: AusenciasClientProps) {
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  const [campanasExpandidas, setCampanasExpandidas] = useState(initialCampanasExpanded);
  
  const [gestionarModal, setGestionarModal] = useState(false);
  const [crearCampanaModal, setCrearCampanaModal] = useState(false);
  const [rechazarModal, setRechazarModal] = useState<{ open: boolean; ausenciaId: string | null }>({
    open: false,
    ausenciaId: null
  });
  const [editarModal, setEditarModal] = useState<{ open: boolean; ausencia: Ausencia | null }>({
    open: false,
    ausencia: null
  });
  const [editForm, setEditForm] = useState<EditFormState>(createEmptyEditForm());
  const [editJustificanteFile, setEditJustificanteFile] = useState<File | null>(null);
  const [uploadingEditJustificante, setUploadingEditJustificante] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const fetchAusencias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado !== 'todas') {
        params.append('estado', filtroEstado);
      }

      const response = await fetch(`/api/ausencias?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar las ausencias');
      }
      
      const data = await response.json();
      setAusencias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[fetchAusencias] Error:', error);
      toast.error('No se pudieron cargar las ausencias');
      setAusencias([]);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

const fetchCampanas = useCallback(async () => {
    try {
      const response = await fetch('/api/campanas-vacaciones?estado=abierta');
      if (response.ok) {
        const data = await response.json();
        setCampanas(data);
      }
    } catch (error) {
      console.error('Error fetching campañas:', error);
    }
  }, []);

  useEffect(() => {
    if (editarModal.ausencia) {
      const ausencia = editarModal.ausencia;
      const fechaInicio = ausencia.fechaInicio ? format(new Date(ausencia.fechaInicio), 'yyyy-MM-dd') : '';
      const fechaFin = ausencia.fechaFin ? format(new Date(ausencia.fechaFin), 'yyyy-MM-dd') : '';

      setEditForm({
        tipo: ausencia.tipo,
        estado: (ausencia.estado as EstadoAusencia) || EstadoAusencia.pendiente,
        fechaInicio,
        fechaFin,
        medioDia: Boolean(ausencia.medioDia),
        motivo: ausencia.motivo || '',
        descripcion: ausencia.descripcion || '',
        justificanteUrl: ausencia.justificanteUrl || null,
        documentoId: ausencia.documentoId || null,
      });
      setEditJustificanteFile(null);
      setEditError('');
    } else {
      setEditForm(createEmptyEditForm());
      setEditJustificanteFile(null);
      setEditError('');
      setUploadingEditJustificante(false);
      setSavingEdit(false);
    }
  }, [editarModal.ausencia]);

  useEffect(() => {
    fetchAusencias();
    fetchCampanas();
  }, [fetchAusencias, fetchCampanas]);

  async function handleAprobar(id: string) {
    try {
      const response = await fetch(`/api/ausencias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aprobar' }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Ausencia aprobada correctamente');
        fetchAusencias();
      } else {
        toast.error(data.error || 'Error al aprobar la ausencia');
      }
    } catch (error) {
      console.error('[handleAprobar] Error:', error);
      toast.error('Error de conexión al aprobar la ausencia');
    }
  }

  async function handleRechazar() {
    if (!rechazarModal.ausenciaId || !motivoRechazo.trim()) return;

    try {
      const response = await fetch(`/api/ausencias/${rechazarModal.ausenciaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'rechazar',
          motivoRechazo: motivoRechazo,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Ausencia rechazada correctamente');
        setRechazarModal({ open: false, ausenciaId: null });
        setMotivoRechazo('');
        fetchAusencias();
      } else {
        toast.error(data.error || 'Error al rechazar la ausencia');
      }
    } catch (error) {
      console.error('[handleRechazar] Error:', error);
      toast.error('Error de conexión al rechazar la ausencia');
    }
  }

  function handleCuadrarIA(campanaId: string) {
    // Refrescar campañas después de cuadrar con IA
    fetchCampanas();
  }

  function handleCuadrarManual(campanaId: string) {
    // TODO: Implementar modal de cuadrado manual
    toast.info('Funcionalidad de cuadrado manual próximamente');
  }

  const estadoOptions = [
    EstadoAusencia.pendiente,
    EstadoAusencia.confirmada,
    EstadoAusencia.completada,
    EstadoAusencia.rechazada,
  ];

  const tipoOptions = [
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'enfermedad', label: 'Enfermedad' },
    { value: 'enfermedad_familiar', label: 'Enfermedad Familiar' },
    { value: 'maternidad_paternidad', label: 'Maternidad/Paternidad' },
    { value: 'otro', label: 'Otro' },
  ];

  const closeEditarModal = () => {
    setEditarModal({ open: false, ausencia: null });
    setEditForm(createEmptyEditForm());
    setEditJustificanteFile(null);
    setEditError('');
    setUploadingEditJustificante(false);
    setSavingEdit(false);
  };

  /**
   * Sube un justificante al servidor y retorna la URL y documentoId
   * @param file - Archivo a subir
   * @param empleadoId - ID del empleado asociado
   * @returns Promise con { url, documentoId }
   */
  const uploadJustificante = async (file: File, empleadoId: string): Promise<{ url: string; documentoId: string | null }> => {
    setUploadingEditJustificante(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', 'justificante');
      formData.append('crearDocumento', 'true');
      formData.append('empleadoId', empleadoId);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Error al subir justificante');
      }

      return {
        url: uploadData.url,
        documentoId: uploadData.documento?.id || null,
      };
    } finally {
      setUploadingEditJustificante(false);
    }
  };

  const handleGuardarEdicion = async () => {
    if (!editarModal.ausencia) return;
    
    // Validaciones
    if (!editForm.fechaInicio || !editForm.fechaFin) {
      setEditError('Selecciona las fechas de inicio y fin');
      return;
    }

    const fechaInicio = new Date(editForm.fechaInicio);
    const fechaFin = new Date(editForm.fechaFin);
    
    if (fechaFin < fechaInicio) {
      setEditError('La fecha de fin debe ser posterior o igual a la fecha de inicio');
      return;
    }

    if (editForm.tipo === 'otro' && !editForm.motivo?.trim()) {
      setEditError('El motivo es obligatorio para ausencias de tipo "Otro"');
      return;
    }

    setSavingEdit(true);
    setEditError('');

    try {
      let justificanteUrl = editForm.justificanteUrl;
      let documentoIdToSend: string | null | undefined = editForm.documentoId;

      // Subir justificante si hay archivo nuevo
      if (editJustificanteFile) {
        if (!editarModal.ausencia.empleadoId) {
          throw new Error('No se puede subir justificante: falta empleado');
        }
        const uploadResult = await uploadJustificante(editJustificanteFile, editarModal.ausencia.empleadoId);
        justificanteUrl = uploadResult.url;
        documentoIdToSend = uploadResult.documentoId;
      }

      const payload: Record<string, any> = {
        tipo: editForm.tipo,
        fechaInicio: editForm.fechaInicio,
        fechaFin: editForm.fechaFin,
        medioDia: editForm.medioDia,
        motivo: editForm.motivo || null,
        descripcion: editForm.descripcion || null,
        estado: editForm.estado,
      };

      // Incluir justificanteUrl si existe (nuevo o existente)
      if (justificanteUrl !== null && justificanteUrl !== undefined) {
        payload.justificanteUrl = justificanteUrl;
      }
      
      // Incluir documentoId si existe (nuevo o existente)
      if (documentoIdToSend !== null && documentoIdToSend !== undefined) {
        payload.documentoId = documentoIdToSend;
      }

      const response = await fetch(`/api/ausencias/${editarModal.ausencia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar la ausencia');
      }

      toast.success('Ausencia actualizada correctamente');
      closeEditarModal();
      fetchAusencias();
    } catch (error: any) {
      console.error('[handleGuardarEdicion] Error:', error);
      const errorMessage = error.message || 'Error al actualizar la ausencia';
      setEditError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSavingEdit(false);
      setUploadingEditJustificante(false);
    }
  };

  function getEstadoBadge(estado: string) {
    const variants: Record<string, { label: string; className: string }> = {
      pendiente: { label: getAusenciaEstadoLabel(EstadoAusencia.pendiente), className: 'bg-yellow-100 text-yellow-800' },
      confirmada: { label: getAusenciaEstadoLabel(EstadoAusencia.confirmada), className: 'bg-green-100 text-green-800' },
      completada: { label: getAusenciaEstadoLabel(EstadoAusencia.completada), className: 'bg-gray-100 text-gray-800' },
      rechazada: { label: getAusenciaEstadoLabel(EstadoAusencia.rechazada), className: 'bg-red-100 text-red-800' },
    };

    const variant = variants[estado] || variants.pendiente;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  }

  function getTipoBadge(tipo: string) {
    const tipos: Record<string, string> = {
      vacaciones: 'Vacaciones',
      enfermedad: 'Enfermedad',
      enfermedad_familiar: 'Enfermedad Familiar',
      maternidad_paternidad: 'Maternidad/Paternidad',
      otro: 'Otro',
    };
    return tipos[tipo] || tipo;
  }

  const ausenciasPendientes = ausencias.filter(a => a.estado === EstadoAusencia.pendiente).length;

  // Filtros en cliente
  const ausenciasFiltradas = ausencias.filter((ausencia) => {
    // Buscar por empleado
    if (busquedaEmpleado) {
      const nombreCompleto = `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`.toLowerCase();
      if (!nombreCompleto.includes(busquedaEmpleado.toLowerCase())) return false;
    }

    return true;
  });

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <PageHeader
        title="Ausencias"
        actionButton={{
          label: '+ Nueva Campaña',
          onClick: () => setCrearCampanaModal(true),
        }}
        secondaryActionButton={{
          label: 'Gestionar ausencias',
          onClick: () => setGestionarModal(true),
          variant: 'outline',
        }}
      />

      {/* Panel de Campañas Activas */}
      {campanas.length > 0 && (
        <Card className="mb-6">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setCampanasExpandidas(!campanasExpandidas)}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Campañas de Vacaciones en Curso
                </h3>
                <p className="text-sm text-gray-500">
                  {campanas.length} campaña{campanas.length !== 1 ? 's' : ''} activa{campanas.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-yellow-100 text-yellow-800 border-0">
                En curso
              </Badge>
              {campanasExpandidas ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {campanasExpandidas && (
            <div className="border-t border-gray-200 p-4 space-y-3">
              {campanas.map((campana) => (
                <div
                  key={campana.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{campana.titulo}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        <Calendar className="w-3.5 h-3.5 inline mr-1" />
                        {format(new Date(campana.fechaInicioObjetivo), 'dd MMM', { locale: es })} -{' '}
                        {format(new Date(campana.fechaFinObjetivo), 'dd MMM yyyy', { locale: es })}
                      </span>
                      <span>
                        {campana.empleadosCompletados}/{campana.totalEmpleadosAsignados} completados
                      </span>
                    </div>
                  </div>
                  <PopoverMonitoreoCampana
                    campanaId={campana.id}
                    onCuadrarIA={handleCuadrarIA}
                    onCuadrarManual={handleCuadrarManual}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Filtros */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Buscar empleado */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar empleado..."
              value={busquedaEmpleado}
              onChange={(e) => setBusquedaEmpleado(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro por estado */}
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="confirmada">Confirmadas</SelectItem>
              <SelectItem value="completada">Completadas</SelectItem>
              <SelectItem value="rechazada">Rechazadas</SelectItem>
            </SelectContent>
          </Select>

          {ausenciasPendientes > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800">
              {ausenciasPendientes} pendientes
            </Badge>
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
                <TableHead>Nombre</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tipo de ausencia</TableHead>
                <TableHead>Justificante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : ausenciasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {busquedaEmpleado ? 'No se encontraron ausencias' : 'No hay ausencias'}
                  </TableCell>
                </TableRow>
              ) : (
                ausenciasFiltradas.map((ausencia) => (
                  <TableRow key={ausencia.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setEditarModal({ open: true, ausencia })}>
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {ausencia.empleado.nombre} {ausencia.empleado.apellidos}
                      </div>
                    </TableCell>
                    <TableCell>{ausencia.diasLaborables} días</TableCell>
                    <TableCell>{getEstadoBadge(ausencia.estado)}</TableCell>
                    <TableCell>{getTipoBadge(ausencia.tipo)}</TableCell>
                    <TableCell className="text-sm">
                      {ausencia.justificanteUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-0 text-primary flex items-center gap-1"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a href={ausencia.justificanteUrl} target="_blank" rel="noopener noreferrer">
                            <Paperclip className="h-4 w-4" />
                            Ver
                          </a>
                        </Button>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Modal Rechazar */}
      <Dialog open={rechazarModal.open} onOpenChange={(open) => setRechazarModal({ open, ausenciaId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Ausencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="motivo">Motivo del rechazo *</Label>
              <Input
                id="motivo"
                placeholder="Explica el motivo del rechazo"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarModal({ open: false, ausenciaId: null })}>
              Cancelar
            </Button>
            <Button
              onClick={handleRechazar}
              disabled={!motivoRechazo.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Rechazar Ausencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Ausencia */}
      <Dialog
        open={editarModal.open}
        onOpenChange={(open) => {
          if (!open) {
            closeEditarModal();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Ausencia</DialogTitle>
          </DialogHeader>
          
          {editarModal.ausencia && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {editarModal.ausencia.empleado.nombre} {editarModal.ausencia.empleado.apellidos}
                </p>
                <p className="text-xs text-gray-500">{editarModal.ausencia.empleado.puesto}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={editForm.tipo}
                    onValueChange={(value) => setEditForm((prev) => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Estado</Label>
                  <Select
                    value={editForm.estado}
                    onValueChange={(value) => setEditForm((prev) => ({ ...prev, estado: value as EstadoAusencia }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {estadoOptions.map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          {getAusenciaEstadoLabel(estado)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha inicio</Label>
                  <Input
                    type="date"
                    value={editForm.fechaInicio}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, fechaInicio: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Fecha fin</Label>
                  <Input
                    type="date"
                    value={editForm.fechaFin}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, fechaFin: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="edit-medio-dia"
                  type="checkbox"
                  checked={editForm.medioDia}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, medioDia: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="edit-medio-dia" className="cursor-pointer text-sm text-gray-700">
                  Medio día
                </Label>
              </div>

              <div>
                <Label>Motivo</Label>
                <Input
                  placeholder="Motivo de la ausencia"
                  value={editForm.motivo}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, motivo: e.target.value }))}
                />
              </div>

              <div>
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Descripción adicional"
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Justificante</Label>
                {editForm.justificanteUrl && (
                  <Button variant="link" size="sm" asChild className="px-0">
                    <a href={editForm.justificanteUrl} target="_blank" rel="noopener noreferrer">
                      Ver justificante actual
                    </a>
                  </Button>
                )}
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setEditJustificanteFile(e.target.files?.[0] || null)}
                  disabled={uploadingEditJustificante || savingEdit}
                />
                <p className="text-xs text-gray-500">
                  PDF, JPG o PNG. Máx. 5MB.
                </p>
                {editJustificanteFile && (
                  <p className="text-xs text-gray-600">
                    Archivo seleccionado: {editJustificanteFile.name}
                  </p>
                )}
              </div>

              {editError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editError}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeEditarModal} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button
              onClick={handleGuardarEdicion}
              disabled={savingEdit || uploadingEditJustificante}
            >
              {savingEdit ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Gestionar Ausencias */}
      <GestionarAusenciasModal
        open={gestionarModal}
        onClose={() => setGestionarModal(false)}
        onSaved={() => {
          fetchAusencias();
          setGestionarModal(false);
        }}
      />

      {/* Modal Crear Campaña */}
      <CrearCampanaModal
        open={crearCampanaModal}
        onClose={() => setCrearCampanaModal(false)}
        onCreated={() => {
          fetchCampanas();
          setCrearCampanaModal(false);
        }}
        solapamientoMaximoPct={30}
      />
    </div>
  );
}

