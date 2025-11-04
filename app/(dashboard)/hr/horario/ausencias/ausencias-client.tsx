'use client';

// ========================================
// Ausencias Client Component
// ========================================

import { useState, useEffect } from 'react';
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
import { TableHeader as PageHeader } from '@/components/shared/table-header';
import { TableFilters } from '@/components/shared/table-filters';
import { Check, X, Calendar, Filter, Edit2, CheckCircle, Search, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GestionarAusenciasModal } from './gestionar-ausencias-modal';
import { CrearCampanaModal } from './crear-campana-modal';
import { PopoverMonitoreoCampana } from '@/components/hr/popover-monitoreo-campana';

interface Ausencia {
  id: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  diasLaborables: number;
  estado: string;
  motivo: string | null;
  motivoRechazo: string | null;
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

export function AusenciasClient() {
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  const [campanasExpandidas, setCampanasExpandidas] = useState(false);
  
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
  const [motivoRechazo, setMotivoRechazo] = useState('');

  useEffect(() => {
    fetchAusencias();
    fetchCampanas();
  }, [filtroEstado]);

  async function fetchAusencias() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado !== 'todas') {
        params.append('estado', filtroEstado);
      }

      const response = await fetch(`/api/ausencias?${params}`);
      const data = await response.json();
      setAusencias(data);
    } catch (error) {
      console.error('Error fetching ausencias:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCampanas() {
    try {
      const response = await fetch('/api/campanas-vacaciones?estado=abierta');
      if (response.ok) {
        const data = await response.json();
        setCampanas(data);
      }
    } catch (error) {
      console.error('Error fetching campañas:', error);
    }
  }

  async function handleAprobar(id: string) {
    try {
      const response = await fetch(`/api/ausencias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aprobar' }),
      });

      if (response.ok) {
        fetchAusencias();
      }
    } catch (error) {
      console.error('Error aprobando ausencia:', error);
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

      if (response.ok) {
        setRechazarModal({ open: false, ausenciaId: null });
        setMotivoRechazo('');
        fetchAusencias();
      }
    } catch (error) {
      console.error('Error rechazando ausencia:', error);
    }
  }

  function handleCuadrarIA(campanaId: string) {
    // Refrescar campañas después de cuadrar con IA
    fetchCampanas();
  }

  function handleCuadrarManual(campanaId: string) {
    // TODO: Implementar modal de cuadrado manual
    alert('Funcionalidad de cuadrado manual próximamente');
  }

  function getEstadoBadge(estado: string) {
    const variants: Record<string, { label: string; className: string }> = {
      pendiente_aprobacion: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      en_curso: { label: 'En Curso', className: 'bg-blue-100 text-blue-800' },
      completada: { label: 'Completada', className: 'bg-gray-100 text-gray-800' },
      auto_aprobada: { label: 'Auto-aprobada', className: 'bg-green-100 text-green-800' },
      rechazada: { label: 'Rechazada', className: 'bg-red-100 text-red-800' },
      cancelada: { label: 'Cancelada', className: 'bg-gray-100 text-gray-800' },
    };

    const variant = variants[estado] || variants.pendiente_aprobacion;
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

  const ausenciasPendientes = ausencias.filter(a => a.estado === 'pendiente_aprobacion').length;

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
              <Calendar className="w-5 h-5 text-blue-600" />
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
              <Badge className="bg-blue-100 text-blue-800 border-0">
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
              <SelectItem value="pendiente_aprobacion">Pendientes</SelectItem>
              <SelectItem value="en_curso">En Curso</SelectItem>
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
        <Card className="p-0">
          <Table>
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
                    <TableCell className="text-gray-500 text-sm">-</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
      <Dialog open={editarModal.open} onOpenChange={(open) => setEditarModal({ open, ausencia: null })}>
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
                  <Select defaultValue={editarModal.ausencia.tipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Select defaultValue={editarModal.ausencia.estado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="aprobada">Aprobada</SelectItem>
                      <SelectItem value="rechazada">Rechazada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha inicio</Label>
                  <Input
                    type="date"
                    defaultValue={editarModal.ausencia.fechaInicio}
                  />
                </div>
                <div>
                  <Label>Fecha fin</Label>
                  <Input
                    type="date"
                    defaultValue={editarModal.ausencia.fechaFin}
                  />
                </div>
              </div>

              <div>
                <Label>Motivo</Label>
                <Input
                  placeholder="Motivo de la ausencia"
                  defaultValue={editarModal.ausencia.motivo || ''}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                💡 Esta funcionalidad requiere la API de edición. Por ahora es solo vista previa.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarModal({ open: false, ausencia: null })}>
              Cancelar
            </Button>
            <Button
              disabled
              className="bg-gray-400 cursor-not-allowed"
            >
              Guardar Cambios (Próximamente)
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

