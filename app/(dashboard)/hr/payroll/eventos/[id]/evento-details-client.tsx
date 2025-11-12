'use client';

// ========================================
// Evento Details Client Component
// ========================================
// Vista detallada de un evento mensual con lista de nóminas

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Download,
  Upload,
  Send,
  FileText,
  Search,
  Filter,
  CheckCircle,
  Clock,
  User,
  Eye,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertaList } from '@/components/payroll/alerta-list';
import { AlertaBadge } from '@/components/payroll/alerta-badge';
import { DetailsPanel } from '@/components/shared/details-panel';

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  fotoUrl?: string | null;
}

interface Alerta {
  id: string;
  tipo: 'critico' | 'advertencia' | 'info';
  categoria: string;
  codigo: string;
  mensaje: string;
  detalles?: any;
  accionUrl?: string;
  empleadoId: string;
  empleado?: Empleado;
}

interface ComplementoAsignado {
  id: string;
  importe: number;
  empleadoComplemento: {
    tipoComplemento: {
      nombre: string;
    };
  };
}

interface Nomina {
  id: string;
  empleadoId: string;
  empleado: Empleado;
  estado: string;
  salarioBase: number;
  totalComplementos: number;
  totalDeducciones: number;
  totalBruto: number;
  totalNeto: number;
  diasTrabajados: number;
  complementosPendientes: boolean;
  complementosAsignados: ComplementoAsignado[];
  alertas: Alerta[];
}

interface EventoNomina {
  id: string;
  mes: number;
  anio: number;
  estado: string;
  fechaGeneracion: string | null;
  fechaExportacion: string | null;
  totalEmpleados: number;
  empleadosConComplementos: number;
  complementosAsignados: number;
  nominas: Nomina[];
}

interface Stats {
  totalNominas: number;
  nominasConAlertas: number;
  nominasConComplementosPendientes: number;
  alertasCriticas: number;
  alertasAdvertencias: number;
  alertasInformativas: number;
}

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const estadosLabels: Record<string, { label: string; color: string; descripcion: string }> = {
  generando: {
    label: 'Generando',
    color: 'bg-gray-100 text-gray-700',
    descripcion: 'Se están generando las pre-nóminas automáticamente',
  },
  complementos_pendientes: {
    label: 'Complementos Pendientes',
    color: 'bg-orange-100 text-orange-700',
    descripcion: 'Revisa y asigna complementos variables antes de exportar',
  },
  lista_exportar: {
    label: 'Lista para Exportar',
    color: 'bg-yellow-100 text-yellow-700',
    descripcion: 'Todas las nóminas están listas para enviar a gestoría',
  },
  exportada: {
    label: 'Exportada',
    color: 'bg-gray-100 text-gray-700',
    descripcion: 'Excel enviado a gestoría. Esperando nóminas definitivas',
  },
  definitiva: {
    label: 'Definitiva',
    color: 'bg-green-100 text-green-700',
    descripcion: 'Nóminas definitivas recibidas. Listas para publicar',
  },
  publicada: {
    label: 'Publicada',
    color: 'bg-gray-900 text-white',
    descripcion: 'Nóminas publicadas y notificadas a los empleados',
  },
};

const estadosNominaLabels: Record<string, { label: string; color: string }> = {
  pre_nomina: { label: 'Pre-nómina', color: 'text-gray-600' },
  complementos_pendientes: { label: 'Complementos Pendientes', color: 'text-orange-600' },
  lista_exportar: { label: 'Lista Exportar', color: 'text-yellow-600' },
  exportada: { label: 'Exportada', color: 'text-gray-600' },
  definitiva: { label: 'Definitiva', color: 'text-green-600' },
  publicada: { label: 'Publicada', color: 'text-gray-900' },
};

export function EventoDetailsClient({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [evento, setEvento] = useState<EventoNomina | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'nominas');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterAlertas, setFilterAlertas] = useState<string>('todos');
  const [filterComplementos, setFilterComplementos] = useState<string>('todos');
  const [selectedNomina, setSelectedNomina] = useState<Nomina | null>(null);

  useEffect(() => {
    fetchEvento();
  }, [eventoId]);

  useEffect(() => {
    // Si viene con parámetro de tab en la URL, cambiar la tab activa
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchEvento = async () => {
    try {
      const response = await fetch(`/api/nominas/eventos/${eventoId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar evento');
      }

      setEvento(data.evento);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching evento:', error);
      toast.error('Error al cargar detalles del evento');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarPrenominas = async () => {
    try {
      setActionLoading('generar');

      const response = await fetch(`/api/nominas/eventos/${eventoId}/generar-prenominas`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar pre-nóminas');
      }

      toast.success(
        data.nominasGeneradas > 0
          ? `${data.nominasGeneradas} pre-nómina(s) generada(s)`
          : 'Las pre-nóminas ya estaban generadas'
      );

      fetchEvento();
    } catch (error) {
      console.error('Error generando pre-nóminas:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar pre-nóminas');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportar = async () => {
    try {
      setActionLoading('exportar');

      const response = await fetch(`/api/nominas/eventos/${eventoId}/exportar`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al exportar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : 'nominas.xlsx';

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Excel exportado correctamente');
      fetchEvento();
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error(error instanceof Error ? error.message : 'Error al exportar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImportar = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'application/pdf';

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      try {
        setActionLoading('importar');

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
          formData.append('files', files[i]);
        }
        formData.append('mode', 'auto');

        const response = await fetch(`/api/nominas/eventos/${eventoId}/importar`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al importar');
        }

        toast.success(`${data.importadas} nóminas importadas correctamente`, {
          description: data.errores > 0 ? `${data.errores} archivos con errores` : undefined,
        });

        fetchEvento();
      } catch (error) {
        console.error('Error importando:', error);
        toast.error(error instanceof Error ? error.message : 'Error al importar');
      } finally {
        setActionLoading(null);
      }
    };

    input.click();
  };

  const handlePublicar = async () => {
    if (
      !confirm(
        '¿Estás seguro de publicar las nóminas? Los empleados recibirán notificaciones.'
      )
    ) {
      return;
    }

    try {
      setActionLoading('publicar');

      const response = await fetch(`/api/nominas/eventos/${eventoId}/publicar`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al publicar');
      }

      toast.success(`${data.nominasPublicadas} nóminas publicadas`, {
        description: `${data.empleadosNotificados} empleados notificados`,
      });

      fetchEvento();
    } catch (error) {
      console.error('Error publicando:', error);
      toast.error(error instanceof Error ? error.message : 'Error al publicar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolverAlerta = async (alertaId: string) => {
    try {
      const response = await fetch(`/api/nominas/alertas/${alertaId}/resolver`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Error al resolver alerta');
      }

      // Refrescar evento para actualizar alertas
      fetchEvento();
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (!evento || !stats) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">Evento no encontrado</p>
          <Button
            variant="outline"
            onClick={() => router.push('/hr/payroll')}
            className="mt-4"
          >
            Volver a Nóminas
          </Button>
        </div>
      </div>
    );
  }

  const estadoInfo = estadosLabels[evento.estado] || {
    label: evento.estado,
    color: 'bg-gray-100 text-gray-700',
    descripcion: 'Estado no identificado',
  };

  const canGenerarPrenominas = ['generando', 'complementos_pendientes'].includes(evento.estado);
  const canExportar = ['lista_exportar', 'exportada', 'definitiva', 'publicada'].includes(
    evento.estado
  );
  const canImportar = ['exportada', 'definitiva'].includes(evento.estado);
  const canPublicar = evento.estado === 'definitiva';

  // Filtrar nóminas (memoizado para performance)
  const nominasFiltradas = useMemo(() => {
    return evento.nominas.filter((nomina) => {
      const matchesSearch =
        searchTerm === '' ||
        nomina.empleado.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nomina.empleado.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nomina.empleado.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEstado =
        filterEstado === 'todos' || nomina.estado === filterEstado;

      const matchesAlertas =
        filterAlertas === 'todos' ||
        (filterAlertas === 'con_alertas' && nomina.alertas.length > 0) ||
        (filterAlertas === 'sin_alertas' && nomina.alertas.length === 0);

      const matchesComplementos =
        filterComplementos === 'todos' ||
        (filterComplementos === 'pendientes' && nomina.complementosPendientes) ||
        (filterComplementos === 'completos' && !nomina.complementosPendientes);

      return matchesSearch && matchesEstado && matchesAlertas && matchesComplementos;
    });
  }, [evento.nominas, searchTerm, filterEstado, filterAlertas, filterComplementos]);

  // Obtener todas las alertas del evento (memoizado)
  const { todasLasAlertas, alertasCriticas, alertasAdvertencias, alertasInformativas } = useMemo(() => {
    const todas = evento.nominas.flatMap((nomina) =>
      nomina.alertas.map((alerta) => ({
        ...alerta,
        empleado: nomina.empleado,
      }))
    );

    return {
      todasLasAlertas: todas,
      alertasCriticas: todas.filter((a) => a.tipo === 'critico'),
      alertasAdvertencias: todas.filter((a) => a.tipo === 'advertencia'),
      alertasInformativas: todas.filter((a) => a.tipo === 'info'),
    };
  }, [evento.nominas]);

  const tabs = [
    { id: 'nominas', label: 'Nóminas', count: nominasFiltradas.length },
    { id: 'alertas', label: 'Alertas', count: todasLasAlertas.length },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/hr/payroll')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {meses[evento.mes - 1]} {evento.anio}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Detalles del evento de nómina
              </p>
            </div>
          </div>

          <div className="group relative">
            <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${estadoInfo.color} cursor-help`}>
              {estadoInfo.label}
            </span>
            <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {estadoInfo.descripcion}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs">
            {['generando', 'complementos_pendientes', 'lista_exportar', 'exportada', 'definitiva', 'publicada'].map((estado, idx) => {
              const estadosOrden = ['generando', 'complementos_pendientes', 'lista_exportar', 'exportada', 'definitiva', 'publicada'];
              const indexActual = estadosOrden.indexOf(evento.estado);
              const indexEtapa = estadosOrden.indexOf(estado);
              const completado = indexActual >= indexEtapa;
              const activo = indexActual === indexEtapa;

              return (
                <div key={estado} className="flex items-center flex-1">
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      completado ? 'bg-green-500' : activo ? 'bg-orange-400' : 'bg-gray-200'
                    }`}
                  />
                  {idx < 5 && <div className="w-1" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-gray-600">Total Nóminas</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {stats.totalNominas}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Empleados</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {evento.totalEmpleados}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Con Alertas</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              {stats.nominasConAlertas}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Complementos</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {evento.complementosAsignados}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Pendientes</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">
              {stats.nominasConComplementosPendientes}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Críticas</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {stats.alertasCriticas}
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerarPrenominas}
            disabled={!canGenerarPrenominas || actionLoading === 'generar'}
          >
            <FileText className="w-4 h-4 mr-2" />
            {actionLoading === 'generar' ? 'Generando...' : 'Generar pre-nóminas'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportar}
            disabled={!canExportar || actionLoading === 'exportar'}
          >
            <Download className="w-4 h-4 mr-2" />
            {actionLoading === 'exportar' ? 'Exportando...' : evento.estado === 'lista_exportar' ? 'Exportar Excel' : 'Re-exportar'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleImportar}
            disabled={!canImportar || actionLoading === 'importar'}
          >
            <Upload className="w-4 h-4 mr-2" />
            {actionLoading === 'importar' ? 'Importando...' : 'Importar PDFs'}
          </Button>

          <Button
            size="sm"
            className="btn-primary"
            onClick={handlePublicar}
            disabled={!canPublicar || actionLoading === 'publicar'}
          >
            <Send className="w-4 h-4 mr-2" />
            {actionLoading === 'publicar' ? 'Publicando...' : 'Publicar y Notificar'}
          </Button>

          {evento.estado === 'publicada' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Publicado
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'nominas' && (
          <div className="space-y-4">
            {/* Filters */}
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Buscar empleado
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Nombre o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Estado
                  </label>
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="todos">Todos</option>
                    <option value="pre_nomina">Pre-nómina</option>
                    <option value="complementos_pendientes">Complementos Pendientes</option>
                    <option value="lista_exportar">Lista Exportar</option>
                    <option value="exportada">Exportada</option>
                    <option value="definitiva">Definitiva</option>
                    <option value="publicada">Publicada</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Alertas
                  </label>
                  <select
                    value={filterAlertas}
                    onChange={(e) => setFilterAlertas(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="todos">Todos</option>
                    <option value="con_alertas">Con alertas</option>
                    <option value="sin_alertas">Sin alertas</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Complementos
                  </label>
                  <select
                    value={filterComplementos}
                    onChange={(e) => setFilterComplementos(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="todos">Todos</option>
                    <option value="pendientes">Pendientes</option>
                    <option value="completos">Completos</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Nóminas List */}
            {nominasFiltradas.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No se encontraron nóminas con los filtros seleccionados</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {nominasFiltradas.map((nomina) => {
                  const estadoNominaInfo = estadosNominaLabels[nomina.estado] || {
                    label: nomina.estado,
                    color: 'text-gray-700'
                  };

                  return (
                    <Card key={nomina.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            {nomina.empleado.fotoUrl ? (
                              <img
                                src={nomina.empleado.fotoUrl}
                                alt={nomina.empleado.nombre}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-gray-600" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">
                                {nomina.empleado.nombre} {nomina.empleado.apellidos}
                              </h4>
                              <span className={`text-xs font-medium ${estadoNominaInfo.color}`}>
                                {estadoNominaInfo.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{nomina.empleado.email}</p>

                            {/* Indicators */}
                            <div className="flex items-center gap-2 mt-2">
                              {nomina.alertas.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {nomina.alertas.some((a) => a.tipo === 'critico') && (
                                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                  )}
                                  {nomina.alertas.some((a) => a.tipo === 'advertencia') && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                                  )}
                                  {nomina.alertas.some((a) => a.tipo === 'info') && (
                                    <Info className="w-3.5 h-3.5 text-blue-600" />
                                  )}
                                  <span className="text-xs text-gray-600">
                                    {nomina.alertas.length} alerta{nomina.alertas.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                              {nomina.complementosPendientes && (
                                <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded">
                                  Complementos pendientes
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-6 text-sm">
                            <div>
                              <div className="text-gray-600">Base</div>
                              <div className="font-medium text-gray-900">
                                €{Number(nomina.salarioBase).toLocaleString('es-ES')}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Complementos</div>
                              <div className="font-medium text-gray-900">
                                €{Number(nomina.totalComplementos).toLocaleString('es-ES')}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Total Neto</div>
                              <div className="font-medium text-green-600">
                                €{Number(nomina.totalNeto).toLocaleString('es-ES')}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedNomina(nomina)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalles
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'alertas' && (
          <div className="space-y-6">
            {todasLasAlertas.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">No hay alertas pendientes</p>
              </Card>
            ) : (
              <>
                {alertasCriticas.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      Alertas Críticas ({alertasCriticas.length})
                    </h3>
                    <AlertaList alertas={alertasCriticas} onResolve={handleResolverAlerta} />
                  </div>
                )}

                {alertasAdvertencias.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      Advertencias ({alertasAdvertencias.length})
                    </h3>
                    <AlertaList alertas={alertasAdvertencias} onResolve={handleResolverAlerta} />
                  </div>
                )}

                {alertasInformativas.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      Informativas ({alertasInformativas.length})
                    </h3>
                    <AlertaList alertas={alertasInformativas} onResolve={handleResolverAlerta} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Details Panel for Nomina */}
      <DetailsPanel
        isOpen={!!selectedNomina}
        onClose={() => setSelectedNomina(null)}
        title={selectedNomina ? `${selectedNomina.empleado.nombre} ${selectedNomina.empleado.apellidos}` : ''}
      >
        {selectedNomina && (
          <div className="space-y-6">
            {/* Resumen */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Resumen</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Estado</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {estadosNominaLabels[selectedNomina.estado]?.label || selectedNomina.estado}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Salario Base</p>
                  <p className="mt-1 text-sm text-gray-900">
                    €{Number(selectedNomina.salarioBase).toLocaleString('es-ES')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Complementos</p>
                  <p className="mt-1 text-sm text-gray-900">
                    €{Number(selectedNomina.totalComplementos).toLocaleString('es-ES')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Bruto</p>
                  <p className="mt-1 text-sm text-gray-900">
                    €{Number(selectedNomina.totalBruto).toLocaleString('es-ES')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Neto</p>
                  <p className="mt-1 text-sm font-semibold text-green-600">
                    €{Number(selectedNomina.totalNeto).toLocaleString('es-ES')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Días Trabajados</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedNomina.diasTrabajados} días
                  </p>
                </div>
              </div>
            </div>

            {/* Complementos */}
            {selectedNomina.complementosAsignados.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Complementos Asignados</h3>
                <div className="space-y-2">
                  {selectedNomina.complementosAsignados.map((comp) => (
                    <div key={comp.id} className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-700">
                        {comp.empleadoComplemento.tipoComplemento.nombre}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        €{Number(comp.importe).toLocaleString('es-ES')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alertas */}
            {selectedNomina.alertas.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Alertas</h3>
                <div className="space-y-2">
                  {selectedNomina.alertas.map((alerta) => (
                    <div key={alerta.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="mb-2">
                        <AlertaBadge tipo={alerta.tipo} mensaje={alerta.mensaje} showTooltip={false} />
                      </div>
                      <p className="text-sm text-gray-700">{alerta.mensaje}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/hr/organizacion/personas/${selectedNomina.empleadoId}`)}
              >
                Ver perfil completo del empleado
              </Button>
            </div>
          </div>
        )}
      </DetailsPanel>
    </div>
  );
}

