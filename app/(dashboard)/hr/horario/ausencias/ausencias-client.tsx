'use client';

// ========================================
// Ausencias Client Component
// ========================================

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Paperclip } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CompactFilterBar } from '@/components/adaptive/CompactFilterBar';
import { MobileActionBar } from '@/components/adaptive/MobileActionBar';
import { ResponsiveContainer } from '@/components/adaptive/ResponsiveContainer';
import { DataFilters, type FilterOption } from '@/components/shared/filters/data-filters';
import { DateRangeControls } from '@/components/shared/filters/date-range-controls';
import { LoadingButton } from '@/components/shared/loading-button';
import { TableHeader as PageHeader } from '@/components/shared/table-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { EstadoAusencia } from '@/lib/constants/enums';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { calcularRangoFechas } from '@/lib/utils/fechas';
import { getAusenciaEstadoLabel } from '@/lib/utils/formatters';
import { parseJson } from '@/lib/utils/json';

import { CrearCampanaModal } from './crear-campana-modal';
import { GestionarAusenciasModal } from './gestionar-ausencias-modal';

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
  justificanteUrl: null,
  documentoId: null,
});

interface AusenciasClientProps {
  initialCampanasExpanded?: boolean;
}

const ESTADO_OPTIONS: FilterOption[] = [
  { value: EstadoAusencia.pendiente, label: getAusenciaEstadoLabel(EstadoAusencia.pendiente) },
  { value: EstadoAusencia.confirmada, label: getAusenciaEstadoLabel(EstadoAusencia.confirmada) },
  { value: EstadoAusencia.completada, label: getAusenciaEstadoLabel(EstadoAusencia.completada) },
  { value: EstadoAusencia.rechazada, label: getAusenciaEstadoLabel(EstadoAusencia.rechazada) },
];

export function AusenciasClient({}: AusenciasClientProps) {
  const isMobile = useIsMobile();
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [campanaActiva, setCampanaActiva] = useState<Campana | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [filtroEquipo, setFiltroEquipo] = useState('todos');
  const [equiposOptions, setEquiposOptions] = useState<FilterOption[]>([]);
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  
  // Date State
  const [rangoFechas, setRangoFechas] = useState<'dia' | 'semana' | 'mes'>('mes');
  const [fechaBase, setFechaBase] = useState(new Date());
  
  // Modals
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

  // Load Equipos
  useEffect(() => {
    async function loadEquipos() {
      try {
        const response = await fetch('/api/organizacion/equipos');
        if (response.ok) {
          const data = await parseJson<Array<{ id: string; nombre: string }>>(response).catch(() => []);
          if (Array.isArray(data)) {
            setEquiposOptions(data.map(e => ({ label: e.nombre, value: e.id })));
          }
        }
      } catch (error) {
        console.error('[Ausencias] Error cargando equipos', error);
      }
    }
    loadEquipos();
  }, []);

  const goToPreviousPeriod = useCallback(() => {
    const nuevaFecha = new Date(fechaBase);
    if (rangoFechas === 'dia') {
      nuevaFecha.setDate(nuevaFecha.getDate() - 1);
    } else if (rangoFechas === 'semana') {
      nuevaFecha.setDate(nuevaFecha.getDate() - 7);
    } else {
      nuevaFecha.setMonth(nuevaFecha.getMonth() - 1);
    }
    setFechaBase(nuevaFecha);
  }, [fechaBase, rangoFechas]);

  const goToNextPeriod = useCallback(() => {
    const nuevaFecha = new Date(fechaBase);
    if (rangoFechas === 'dia') {
      nuevaFecha.setDate(nuevaFecha.getDate() + 1);
    } else if (rangoFechas === 'semana') {
      nuevaFecha.setDate(nuevaFecha.getDate() + 7);
    } else {
      nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
    }
    setFechaBase(nuevaFecha);
  }, [fechaBase, rangoFechas]);

  const periodLabel = useMemo(() => {
    switch (rangoFechas) {
      case 'dia':
        return format(fechaBase, 'dd MMM', { locale: es });
      case 'semana':
        return `Sem ${format(fechaBase, 'w', { locale: es })}`;
      default:
        return format(fechaBase, 'MMM yyyy', { locale: es });
    }
  }, [fechaBase, rangoFechas]);

  const fetchAusencias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const { inicio, fin } = calcularRangoFechas(fechaBase, rangoFechas);
      params.append('fechaInicio', format(inicio, 'yyyy-MM-dd'));
      params.append('fechaFin', format(fin, 'yyyy-MM-dd'));

      if (filtroEstado !== 'todas') {
        params.append('estado', filtroEstado);
      }
      if (filtroEquipo !== 'todos') {
        params.append('equipoId', filtroEquipo);
      }
      if (busquedaEmpleado) {
        params.append('search', busquedaEmpleado);
      }

      const response = await fetch(`/api/ausencias?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar las ausencias');
      }
      
      const data = await response.json() as Record<string, unknown>;
      setAusencias(
        extractArrayFromResponse<Ausencia>(data, { key: 'ausencias' })
      );
    } catch (error) {
      console.error('[fetchAusencias] Error:', error);
      toast.error('No se pudieron cargar las ausencias');
      setAusencias([]);
    } finally {
      setLoading(false);
    }
  }, [busquedaEmpleado, filtroEquipo, filtroEstado, fechaBase, rangoFechas]);

  const fetchCampanaActiva = useCallback(async () => {
    try {
      const response = await fetch('/api/campanas-vacaciones');
      if (response.ok) {
        const data = await response.json() as Campana | null;
        setCampanaActiva(data); // API now returns single campaign or null
      }
    } catch (error) {
      console.error('Error fetching campaña activa:', error);
    }
  }, []);

  useEffect(() => {
    fetchAusencias();
    fetchCampanaActiva();
  }, [fetchAusencias, fetchCampanaActiva]);

  // Edicion Effect
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

  async function _handleAprobar(id: string) {
    try {
      const response = await fetch(`/api/ausencias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aprobar' }),
      });

      const data = await response.json() as { error?: string } | unknown;
      
      if (response.ok) {
        toast.success('Ausencia aprobada correctamente');
        fetchAusencias();
      } else {
        const errorData = data as { error?: string };
        toast.error(errorData.error || 'Error al aprobar la ausencia');
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

      const data = await response.json() as { error?: string } | unknown;

      if (response.ok) {
        toast.success('Ausencia rechazada correctamente');
        setRechazarModal({ open: false, ausenciaId: null });
        setMotivoRechazo('');
        fetchAusencias();
      } else {
        const errorData = data as { error?: string };
        toast.error(errorData.error || 'Error al rechazar la ausencia');
      }
    } catch (error) {
      console.error('[handleRechazar] Error:', error);
      toast.error('Error de conexión al rechazar la ausencia');
    }
  }

  const closeEditarModal = () => {
    setEditarModal({ open: false, ausencia: null });
    setEditForm(createEmptyEditForm());
    setEditJustificanteFile(null);
    setEditError('');
    setUploadingEditJustificante(false);
    setSavingEdit(false);
  };

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
      
      const uploadData = await uploadResponse.json() as { 
        url: string; 
        error?: string; 
        documento?: { id: string } | null;
      } | unknown;
      
      if (!uploadResponse.ok) {
        const errorData = uploadData as { error?: string };
        throw new Error(errorData.error || 'Error al subir justificante');
      }

      const successData = uploadData as { url: string; documento?: { id: string } | null };
      return {
        url: successData.url,
        documentoId: successData.documento?.id || null,
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

      const payload: Record<string, unknown> = {
        tipo: editForm.tipo,
        fechaInicio: editForm.fechaInicio,
        fechaFin: editForm.fechaFin,
        medioDia: editForm.medioDia,
        motivo: editForm.motivo || null,
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

      const data = await response.json() as { error?: string } | unknown;
      if (!response.ok) {
        const errorData = data as { error?: string };
        throw new Error(errorData.error || 'Error al actualizar la ausencia');
      }

      toast.success('Ausencia actualizada correctamente');
      closeEditarModal();
      fetchAusencias();
    } catch (error: unknown) {
      console.error('[handleGuardarEdicion] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar la ausencia';
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

  // Mobile list renderer
  const renderMobileList = () => {
    if (ausencias.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-gray-500">
            {busquedaEmpleado ? 'No se encontraron ausencias' : 'No hay ausencias registradas'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4 pb-20">
        {ausencias.map((ausencia) => (
          <Card key={ausencia.id} className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900">
                  {ausencia.empleado.nombre} {ausencia.empleado.apellidos}
                </h3>
                <p className="text-xs text-gray-500">{ausencia.empleado.puesto}</p>
              </div>
              {getEstadoBadge(ausencia.estado)}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
              <div>
                <p className="text-xs text-gray-500">Tipo</p>
                <p>{getTipoBadge(ausencia.tipo)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fechas</p>
                <p>
                  {format(new Date(ausencia.fechaInicio), 'dd MMM', { locale: es })} -{' '}
                  {format(new Date(ausencia.fechaFin), 'dd MMM', { locale: es })}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Motivo</p>
                <p className="text-gray-800">{ausencia.motivo || 'Sin motivo'}</p>
              </div>
            </div>
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
                  Ver justificante
                </a>
              </Button>
            ) : (
              <p className="text-xs text-gray-500">Sin justificante</p>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderCampaignCard = () => {
    if (!campanaActiva) return null;
    return (
      <Card className="mb-6 p-4 bg-blue-50 border-blue-100">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="font-medium text-blue-900">{campanaActiva.titulo}</h3>
            <p className="text-sm text-blue-700">
              Objetivo: {format(new Date(campanaActiva.fechaInicioObjetivo), 'd MMM')} -{' '}
              {format(new Date(campanaActiva.fechaFinObjetivo), 'd MMM yyyy', { locale: es })}
            </p>
          </div>
          <Badge className="bg-blue-200 text-blue-800 hover:bg-blue-300">Activa</Badge>
        </div>
        <div className="flex gap-4 text-sm text-blue-800">
          <div>
            <span className="font-bold">{campanaActiva._count.preferencias}</span> solicitudes
          </div>
          <div>
            <span className="font-bold">
              {Math.round((campanaActiva.empleadosCompletados / campanaActiva.totalEmpleadosAsignados) * 100) || 0}%
            </span>{' '}
            completado
          </div>
        </div>
      </Card>
    );
  };

  const renderDesktopTable = () => (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Fechas</TableHead>
            <TableHead>Días</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ausencias.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                {busquedaEmpleado ? 'No se encontraron ausencias' : 'No hay ausencias registradas'}
              </TableCell>
            </TableRow>
          ) : (
            ausencias.map((ausencia) => (
              <TableRow key={ausencia.id}>
                <TableCell>
                  <div className="font-medium">{ausencia.empleado.nombre} {ausencia.empleado.apellidos}</div>
                  <div className="text-xs text-gray-500">{ausencia.empleado.puesto}</div>
                </TableCell>
                <TableCell>{getTipoBadge(ausencia.tipo)}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(ausencia.fechaInicio), 'dd MMM yyyy', { locale: es })}
                  </div>
                  <div className="text-xs text-gray-500">
                    Hasta {format(new Date(ausencia.fechaFin), 'dd MMM yyyy', { locale: es })}
                  </div>
                </TableCell>
                <TableCell>
                  {ausencia.diasLaborables} {ausencia.medioDia ? '(Medio día)' : ''}
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={ausencia.motivo || ''}>
                  {ausencia.motivo || '-'}
                </TableCell>
                <TableCell>{getEstadoBadge(ausencia.estado)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditarModal({ open: true, ausencia })}
                    >
                      Editar
                    </Button>
                    {ausencia.estado === EstadoAusencia.pendiente && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => _handleAprobar(ausencia.id)}
                        >
                          Aprobar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setRechazarModal({ open: true, ausenciaId: ausencia.id })}
                        >
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <ResponsiveContainer variant="page" className="h-full w-full flex flex-col overflow-hidden">
      {isMobile ? (
        <>
          <MobileActionBar
            title="Ausencias"
            primaryAction={{
              label: 'Campaña',
              onClick: () => setCrearCampanaModal(true),
              display: 'label',
            }}
            secondaryActions={[
              {
                icon: <Settings className="w-4 h-4" />,
                label: 'Gestionar ausencias',
                onClick: () => setGestionarModal(true),
              },
            ]}
            className="mb-3"
          />

          <div className="flex-shrink-0 mb-3">
            <DataFilters
              searchQuery={busquedaEmpleado}
              onSearchChange={setBusquedaEmpleado}
              searchPlaceholder="Buscar empleado..."
              estadoValue={filtroEstado}
              onEstadoChange={setFiltroEstado}
              estadoOptions={ESTADO_OPTIONS}
              equipoValue={filtroEquipo}
              onEquipoChange={setFiltroEquipo}
              equipoOptions={equiposOptions}
            />
          </div>

          {renderCampaignCard()}

          <div className="flex-1 min-h-0 overflow-y-auto">
            {renderMobileList()}
          </div>
        </>
      ) : (
        <>
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
          
          {renderCampaignCard()}
          
          <div className="flex items-center justify-between mb-6 gap-4">
            <DataFilters
              searchQuery={busquedaEmpleado}
              onSearchChange={setBusquedaEmpleado}
              estadoValue={filtroEstado}
              onEstadoChange={setFiltroEstado}
              estadoOptions={ESTADO_OPTIONS}
              equipoValue={filtroEquipo}
              onEquipoChange={setFiltroEquipo}
              equipoOptions={equiposOptions}
            />
          </div>
          
          <div className="flex-1 overflow-y-auto">{renderDesktopTable()}</div>
        </>
      )}

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
                    onValueChange={(val) => setEditForm(prev => ({ ...prev, tipo: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Using hardcoded options to match the component context */}
                      <SelectItem value="vacaciones">Vacaciones</SelectItem>
                      <SelectItem value="enfermedad">Enfermedad</SelectItem>
                      <SelectItem value="enfermedad_familiar">Enfermedad Familiar</SelectItem>
                      <SelectItem value="maternidad_paternidad">Maternidad/Paternidad</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
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
                      {Object.values(EstadoAusencia).map((estado) => (
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
                  <Label>Fecha Inicio</Label>
                  <Input 
                    type="date" 
                    value={editForm.fechaInicio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fechaInicio: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Fecha Fin</Label>
                  <Input 
                    type="date" 
                    value={editForm.fechaFin}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fechaFin: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Motivo</Label>
                <Textarea 
                  value={editForm.motivo}
                  onChange={(e) => setEditForm(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Detalles de la ausencia..."
                />
              </div>

              {editError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{editError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeEditarModal}>
              Cancelar
            </Button>
            <LoadingButton 
              loading={savingEdit || uploadingEditJustificante}
              onClick={handleGuardarEdicion}
            >
              Guardar Cambios
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Crear Campaña */}
      <CrearCampanaModal
        open={crearCampanaModal}
        onClose={() => setCrearCampanaModal(false)}
        onCreated={() => {
          fetchCampanaActiva();
          toast.success('Campaña creada correctamente');
        }}
      />

      {/* Modal Gestionar Ausencias */}
      <GestionarAusenciasModal
        open={gestionarModal}
        onClose={() => setGestionarModal(false)}
        onSaved={() => {
          setGestionarModal(false);
          fetchAusencias();
        }}
      />
    </ResponsiveContainer>
  );
}
