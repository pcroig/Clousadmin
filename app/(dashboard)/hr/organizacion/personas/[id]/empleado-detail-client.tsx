// ========================================
// Empleado Detail Client Component
// ========================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Edit2, Calendar, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { FechaCalendar } from '@/components/shared/fecha-calendar';
import { FichajesTab as FichajesTabShared } from '../../../mi-espacio/tabs/fichajes-tab';
import { GeneralTab as GeneralTabShared } from '../../../mi-espacio/tabs/general-tab';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/shared/loading-button';
import { DarDeBajaModal } from '@/components/hr/DarDeBajaModal';
import { getAvatarPlaceholderClasses } from '@/lib/design-system';
import { cn } from '@/lib/utils';

interface EmpleadoDetailClientProps {
  empleado: any; // TODO: Type properly
  usuario: any;
}

export function EmpleadoDetailClient({ empleado, usuario }: EmpleadoDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');

  // Función helper para actualizar campos del empleado
  const handleFieldUpdate = async (field: string, value: any) => {
    try {
      const response = await fetch(`/api/empleados/${empleado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar campo');
      }

      toast.success('Campo actualizado correctamente');
      // Recargar la página para reflejar cambios (especialmente importante para puesto)
      router.refresh();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar campo');
    }
  };

  const getInitials = () => {
    return `${empleado.nombre.charAt(0)}${empleado.apellidos.charAt(0)}`.toUpperCase();
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'fichajes', label: 'Fichajes' },
    { id: 'ausencias', label: 'Ausencia' },
    { id: 'contratos', label: 'Contratos' },
    { id: 'documentos', label: 'Documentos' },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header con avatar y nombre */}
      <div className="mb-6">
        <Link
          href="/hr/organizacion/personas"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver</span>
        </Link>

        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {empleado.fotoUrl && <AvatarImage src={empleado.fotoUrl} />}
            <AvatarFallback
              className={cn(
                getAvatarPlaceholderClasses(`${empleado.nombre} ${empleado.apellidos}`),
                'text-lg font-semibold'
              )}
            >
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {empleado.nombre} {empleado.apellidos}
            </h1>
            <p className="text-sm text-gray-500">{empleado.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'general' && <GeneralTabShared empleado={empleado} usuario={usuario} rol="hr_admin" onFieldUpdate={handleFieldUpdate} />}
        {activeTab === 'fichajes' && <FichajesTabShared empleadoId={empleado.id} />}
        {activeTab === 'ausencias' && <AusenciasTab empleado={empleado} />}
        {activeTab === 'contratos' && <ContratosTab empleado={empleado} onFieldUpdate={handleFieldUpdate} />}
        {activeTab === 'documentos' && <DocumentosTab empleado={empleado} />}
      </div>
    </div>
  );
}

// Tab Components
function AusenciasTab({ empleado }: any) {
  const [ausencias, setAusencias] = useState<any[]>([]);
  const [saldo, setSaldo] = useState({
    diasTotales: 0,
    diasUsados: 0,
    diasPendientes: 0,
    diasDisponibles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proximas' | 'pasadas'>('proximas');

  useEffect(() => {
    fetchAusencias();
  }, [empleado.id]);

  async function fetchAusencias() {
    setLoading(true);
    try {
      const response = await fetch(`/api/ausencias?empleadoId=${empleado.id}`);
      if (response.ok) {
        const data = await response.json();
        setAusencias(data);
        calcularSaldo(data);
      }
    } catch (error) {
      console.error('Error fetching ausencias:', error);
    } finally {
      setLoading(false);
    }
  }

  function calcularSaldo(ausencias: any[]) {
    const totalDias = 22;
    
    // Días usados: ausencias en curso, completadas o auto-aprobadas
    const diasUsados = ausencias
      .filter((a) => a.estado === 'en_curso' || a.estado === 'completada' || a.estado === 'auto_aprobada')
      .reduce((sum, a) => sum + Number(a.diasSolicitados), 0);

    // Días pendientes: ausencias en estado pendiente_aprobacion
    const diasPendientes = ausencias
      .filter((a) => a.estado === 'pendiente_aprobacion')
      .reduce((sum, a) => sum + Number(a.diasSolicitados), 0);

    setSaldo({
      diasTotales: totalDias,
      diasUsados,
      diasPendientes,
      diasDisponibles: totalDias - diasUsados - diasPendientes,
    });
  }

  // Ordenar ausencias por fecha (más recientes primero)
  const ausenciasOrdenadas = ausencias
    .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());

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

  function getTipoLabel(tipo: string) {
    const tipos: Record<string, string> = {
      vacaciones: 'Vacaciones',
      enfermedad: 'Enfermedad',
      enfermedad_familiar: 'Enfermedad Familiar',
      maternidad_paternidad: 'Maternidad/Paternidad',
      otro: 'Otro',
    };
    return tipos[tipo] || tipo;
  }

  return (
    <div className="space-y-6">
      {/* Widget Saldo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#F26C21]" />
            Saldo de Vacaciones {new Date().getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{saldo.diasTotales}</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
              <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{saldo.diasUsados}</div>
              <div className="text-xs text-gray-500 mt-1">Usados</div>
              </div>
              <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{saldo.diasPendientes}</div>
              <div className="text-xs text-gray-500 mt-1">Pendientes</div>
              </div>
              <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{saldo.diasDisponibles}</div>
              <div className="text-xs text-gray-500 mt-1">Disponibles</div>
              </div>
            </div>
        </CardContent>
      </Card>

      {/* Tabla de Ausencias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Ausencias de {empleado.nombre}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Cargando...</p>
          ) : ausencias.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No hay ausencias registradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Fecha Fin</TableHead>
                  <TableHead className="text-center">Días</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ausenciasOrdenadas.map((ausencia) => {
                  const fechaInicio = new Date(ausencia.fechaInicio);
                  const fechaFin = new Date(ausencia.fechaFin);
                  
                  return (
                    <TableRow 
                      key={ausencia.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        // Aquí podrías abrir un modal para editar si lo deseas
                        console.log('Ausencia seleccionada:', ausencia.id);
                      }}
                    >
                      <TableCell className="font-medium">{getTipoLabel(ausencia.tipo)}</TableCell>
                      <TableCell>{fechaInicio.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                      <TableCell>{fechaFin.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                      <TableCell className="text-center">{ausencia.diasSolicitados}</TableCell>
                      <TableCell>{getEstadoBadge(ausencia.estado)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ContratosTab({ empleado, onFieldUpdate }: { empleado: any; onFieldUpdate: (field: string, value: any) => Promise<void> }) {
  const [aumentosSalario, setAumentosSalario] = useState([
    { id: 1, salario: 2004, fecha: '21/10/2025', descripcion: '' }
  ]);
  const [archivos, setArchivos] = useState([
    { id: 1, nombre: 'Receipt27914618_20251024.pdf' }
  ]);
  const [diasLaborables, setDiasLaborables] = useState({
    lun: true,
    mar: true,
    mie: true,
    jue: true,
    vie: true,
    sab: false,
    dom: false,
  });
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [jornadaSeleccionadaId, setJornadaSeleccionadaId] = useState<string | null>(empleado.jornadaId || null);
  const [puestos, setPuestos] = useState<any[]>([]);
  const [tipoContrato, setTipoContrato] = useState(empleado.tipoContrato || 'indefinido');
  const [fechaFin, setFechaFin] = useState(
    empleado.contratos?.[0]?.fechaFin ? new Date(empleado.contratos[0].fechaFin).toISOString().split('T')[0] : ''
  );
  const [showDarDeBajaModal, setShowDarDeBajaModal] = useState(false);

  const contratoActual = empleado.contratos?.[0] || {};

  // Función para obtener días laborables de la jornada
  const obtenerDiasLaborablesDeJornada = (jornada: any) => {
    if (!jornada?.config) {
      return { lun: true, mar: true, mie: true, jue: true, vie: true, sab: false, dom: false };
    }
    const config = jornada.config;
    const mapeoDias: Record<string, string> = {
      'lun': 'lunes',
      'mar': 'martes',
      'mie': 'miercoles',
      'jue': 'jueves',
      'vie': 'viernes',
      'sab': 'sabado',
      'dom': 'domingo',
    };
    const dias: any = {};
    Object.keys(mapeoDias).forEach(key => {
      const configKey = mapeoDias[key];
      dias[key] = config[configKey]?.activo ?? false;
    });
    return dias;
  };

  useEffect(() => {
    fetchJornadas();
    fetchPuestos();
  }, []);

  // Actualizar días laborables cuando cambia la jornada seleccionada
  useEffect(() => {
    if (jornadaSeleccionadaId) {
      const jornada = jornadas.find(j => j.id === jornadaSeleccionadaId);
      if (jornada) {
        const dias = obtenerDiasLaborablesDeJornada(jornada);
        setDiasLaborables(dias);
      }
    } else {
      // Si no hay jornada, usar valores por defecto
      setDiasLaborables({ lun: true, mar: true, mie: true, jue: true, vie: true, sab: false, dom: false });
    }
  }, [jornadaSeleccionadaId, jornadas]);

  async function fetchJornadas() {
    try {
      const response = await fetch('/api/jornadas');
      if (response.ok) {
        const data = await response.json();
        setJornadas(data);
      }
    } catch (error) {
      console.error('Error fetching jornadas:', error);
    }
  }

  async function fetchPuestos() {
    try {
      const response = await fetch('/api/organizacion/puestos');
      if (response.ok) {
        const data = await response.json();
        setPuestos(data);
      }
    } catch (error) {
      console.error('Error fetching puestos:', error);
    }
  }

  // Callback cuando se complete el proceso de dar de baja
  const handleDarDeBajaSuccess = () => {
    toast.success('Proceso de baja completado correctamente');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header con botón Dar de Baja */}
      <div className="flex justify-end mb-4">
        <Button
          variant="destructive"
          onClick={() => setShowDarDeBajaModal(true)}
          disabled={empleado.estadoEmpleado === 'baja' || !empleado.activo}
          className="bg-red-600 hover:bg-red-700"
        >
          {empleado.estadoEmpleado === 'baja' ? 'Empleado dado de baja' : 'Dar de Baja'}
        </Button>
      </div>

      {/* Información básica y Jurídico y laboral - lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información básica */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información básica</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
              <div className="text-sm text-gray-900">
                {empleado.nombre} {empleado.apellidos} ({empleado.email})
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
              <input
                type="text"
                defaultValue={new Date(empleado.fechaAlta).toLocaleDateString('es-ES')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                readOnly
              />
            </div>
                        <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de contrato</label>                                                          
              <Select
                value={tipoContrato}
                onValueChange={(value) => {
                  setTipoContrato(value);
                  onFieldUpdate('tipoContrato', value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="fijo_discontinuo">Fijo discontinuo</SelectItem>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                  <SelectItem value="temporal">Temporal</SelectItem>
                  <SelectItem value="becario">Becario</SelectItem>
                  <SelectItem value="practicas">Prácticas</SelectItem>
                  <SelectItem value="obra_y_servicio">Obra y servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tipoContrato === 'temporal' && (
              <div>
                <Label htmlFor="fechaFin">Fecha de fin</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  onBlur={(e) => {
                    const newValue = e.target.value;
                    if (newValue) {
                      onFieldUpdate('fechaFin', newValue);
                    }
                  }}
                  className="w-full"
                />
              </div>
            )}
                        <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label>                                                                    
              <Select
                value={empleado.puestoId || ''}
                onValueChange={(value) => {
                  onFieldUpdate('puestoId', value || null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar puesto" />
                </SelectTrigger>
                <SelectContent>
                  {puestos.map((puesto) => (
                    <SelectItem key={puesto.id} value={puesto.id}>
                      {puesto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Jurídico y laboral */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Jurídico y laboral</h3>
          </div>

          <div className="space-y-3">
                        <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría profesional</label>                                                     
              <Select
                value={empleado.categoriaProfesional || ''}
                onValueChange={(value) => {
                  onFieldUpdate('categoriaProfesional', value || null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="directivo">Directivo</SelectItem>
                  <SelectItem value="mando_intermedio">Mando intermedio</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="trabajador_cualificado">Trabajador cualificado</SelectItem>
                  <SelectItem value="trabajador_baja_cualificacion">Trabajador con baja cualificación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grupo de cotización</label>                                                       
              <input
                type="text"
                defaultValue={empleado.grupoCotizacion || ''}
                placeholder="No informado"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                onBlur={(e) => {
                  const newValue = e.target.value;
                  if (newValue !== (empleado.grupoCotizacion || '')) {
                    onFieldUpdate('grupoCotizacion', newValue || null);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de educación</label>
              <Select
                value={empleado.nivelEducacion || ''}
                onValueChange={(value) => {
                  onFieldUpdate('nivelEducacion', value || null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nivel_basico">Nivel Básico</SelectItem>
                  <SelectItem value="eso_equivalente">ESO o Equivalente</SelectItem>
                  <SelectItem value="bachillerato_grado_medio">Bachillerato o Grado Medio</SelectItem>
                  <SelectItem value="formacion_profesional_superior">Formación Profesional Superior</SelectItem>
                  <SelectItem value="educacion_universitaria_postgrado">Educación Universitaria y Postgrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrato a distancia</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Salario y Jornada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salario */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Salario</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Salario bruto</label>                                                             
              <input
                type="number"
                defaultValue={empleado.salarioBrutoAnual || 2000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                onBlur={(e) => {
                  const newValue = parseFloat(e.target.value);
                  const currentValue = empleado.salarioBrutoAnual || 2000;
                  if (!isNaN(newValue) && newValue !== currentValue) {
                    onFieldUpdate('salarioBrutoAnual', newValue);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="anual">Anual</option>
                <option value="mensual">Mensual</option>
                <option value="por_hora">Por hora</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pagos</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="12">12</option>
                <option value="14">14</option>
              </select>
            </div>
          </div>
        </div>

        {/* Jornada */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jornada</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar jornada existente</label>
              <Select
                value={jornadaSeleccionadaId || ''}
                onValueChange={(value) => {
                  setJornadaSeleccionadaId(value || null);
                  onFieldUpdate('jornadaId', value || null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar jornada" />
                </SelectTrigger>
                <SelectContent>
                  {jornadas.map((jornada) => (
                    <SelectItem key={jornada.id} value={jornada.id}>
                      {jornada.nombre} ({jornada.horasSemanales}h/semana)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horas</label>
                <input
                  type="number"
                  defaultValue="40"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="semana">semana</option>
                  <option value="mes">mes</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Días laborables</label>
              <div className="flex gap-2">
                {[
                  { key: 'lun', label: 'Lun' },
                  { key: 'mar', label: 'Mar' },
                  { key: 'mie', label: 'Mie' },
                  { key: 'jue', label: 'Jue' },
                  { key: 'vie', label: 'Vie' },
                  { key: 'sab', label: 'Sab' },
                  { key: 'dom', label: 'Dom' },
                ].map((dia) => (
                  <button
                    key={dia.key}
                    type="button"
                    disabled
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      diasLaborables[dia.key as keyof typeof diasLaborables]
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600'
                    } opacity-60 cursor-not-allowed`}
                    title={jornadaSeleccionadaId ? 'Los días laborables se obtienen de la jornada seleccionada. Edita la jornada para modificarlos.' : 'Selecciona una jornada para ver los días laborables'}
                  >
                    {dia.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {jornadaSeleccionadaId 
                  ? 'Los días laborables se obtienen de la jornada seleccionada. Para modificarlos, edita la jornada desde Horario > Jornadas.'
                  : 'Selecciona una jornada para ver los días laborables configurados.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Aumentos de salario */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aumentos de salario</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Salario</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Fecha</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Descripción</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {aumentosSalario.map((aumento) => (
                <tr key={aumento.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      defaultValue={aumento.salario}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      defaultValue={aumento.fecha}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      defaultValue={aumento.descripcion}
                      placeholder="Descripción..."
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-red-500 hover:text-red-700">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear
        </button>
      </div>

      {/* Archivos */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Archivos</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4 hover:border-gray-400 cursor-pointer">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-gray-600">Subir archivo</p>
        </div>

        {archivos.length > 0 && (
          <div className="space-y-2">
            {archivos.map((archivo) => (
              <div key={archivo.id} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>{archivo.nombre}</span>
                <button className="ml-auto text-gray-400 hover:text-gray-600">
                  <span className="text-xs">Cursor</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Dar de Baja */}
      <DarDeBajaModal
        open={showDarDeBajaModal}
        onOpenChange={setShowDarDeBajaModal}
        empleado={{
          id: empleado.id,
          nombre: empleado.nombre,
          apellidos: empleado.apellidos,
          fechaAlta: empleado.fechaAlta,
        }}
        contratoId={contratoActual.id || null}
        onSuccess={handleDarDeBajaSuccess}
      />
    </div>
  );
}

function DocumentosTab({ empleado }: any) {
  const [activeDocTab, setActiveDocTab] = useState<'personales' | 'compartidos'>('personales');

  return (
    <div>
      {/* Toggle Personales/Compartidos */}
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setActiveDocTab('personales')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeDocTab === 'personales'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Personales
          </button>
          <button
            onClick={() => setActiveDocTab('compartidos')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeDocTab === 'compartidos'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Compartidos
          </button>
        </div>

        <Button variant="default">
          Cargar documentos
        </Button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-500">
          Cuando el administrador comparte contigo un documento, este quedará almacenado en la carpeta correspondiente.
        </p>
      </div>

      {/* Grid de carpetas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {activeDocTab === 'personales' ? (
          // Carpetas personales
          empleado.carpetas.map((carpeta: any) => (
            <div key={carpeta.id} className="flex flex-col items-center cursor-pointer group">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-2 group-hover:bg-gray-200 transition-colors">
                <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 text-center">{carpeta.nombre}</p>
              {carpeta.numeroDocumentos > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {carpeta.numeroDocumentos} documento{carpeta.numeroDocumentos !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ))
        ) : (
          // Carpetas compartidas (vacío por ahora)
          <div className="col-span-full text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-sm text-gray-500">No hay documentos compartidos</p>
          </div>
        )}
      </div>
    </div>
  );
}


