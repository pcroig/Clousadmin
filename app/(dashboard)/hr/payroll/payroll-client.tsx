'use client';

// ========================================
// Payroll - Client Component
// ========================================
// Vista consolidada: Eventos expandibles con sus nóminas

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  FileText,
  Upload,
  Download,
  Plus,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  Eye,
  User,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KpiCard } from '@/components/analytics/kpi-card';

interface Nomina {
  id: string;
  empleadoId: string;
  empleado: {
    id: string;
    nombre: string;
    apellidos: string;
    email: string;
  };
  estado: string;
  salarioBase: number;
  totalComplementos: number;
  totalDeducciones: number;
  totalBruto: number;
  totalNeto: number;
  diasTrabajados: number;
  complementosAsignados: Array<{
    id: string;
    importe: number;
    empleadoComplemento: {
      tipoComplemento: {
        nombre: string;
      };
    };
  }>;
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
  nominas?: Nomina[];
  _count: { nominas: number };
  alertas?: {
    criticas: number;
    advertencias: number;
    informativas: number;
    total: number;
  };
}

interface PayrollClientProps {
  mesActual: number;
  anioActual: number;
}

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const estadosLabels: Record<string, { label: string; color: string; descripcion: string }> = {
  generando: {
    label: 'Generando',
    color: 'bg-blue-100 text-blue-700',
    descripcion: 'Se están generando las pre-nóminas automáticamente',
  },
  complementos_pendientes: {
    label: 'Complementos Pendientes',
    color: 'bg-orange-100 text-orange-700',
    descripcion: 'Revisa y asigna complementos variables antes de exportar',
  },
  lista_exportar: {
    label: 'Lista para Exportar',
    color: 'bg-purple-100 text-purple-700',
    descripcion: 'Todas las nóminas están listas para enviar a gestoría',
  },
  exportada: {
    label: 'Exportada',
    color: 'bg-indigo-100 text-indigo-700',
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
  pre_nomina: { label: 'Pre-nómina', color: 'text-blue-600' },
  complementos_pendientes: { label: 'Complementos Pendientes', color: 'text-orange-600' },
  lista_exportar: { label: 'Lista Exportar', color: 'text-purple-600' },
  exportada: { label: 'Exportada', color: 'text-indigo-600' },
  definitiva: { label: 'Definitiva', color: 'text-green-600' },
  publicada: { label: 'Publicada', color: 'text-gray-900' },
};

export function PayrollClient({ mesActual, anioActual }: PayrollClientProps) {
  const router = useRouter();
  const [eventos, setEventos] = useState<EventoNomina[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEventos, setExpandedEventos] = useState<Set<string>>(new Set());
  const [loadingEventoId, setLoadingEventoId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<{
    totalNeto: number;
    empleadosUnicos: number;
    promedioNeto: number;
    variacionAnioAnterior: number;
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const nombreMes = meses[mesActual - 1];

  useEffect(() => {
    fetchEventos();
    fetchAnalytics();
  }, [anioActual]);

  const fetchEventos = async () => {
    try {
      const response = await fetch('/api/nominas/eventos');
      const data = await response.json();
      setEventos(data.eventos || []);
    } catch (error) {
      console.error('Error fetching eventos:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const response = await fetch(`/api/nominas/analytics?anio=${anioActual}`);
      const data = await response.json();
      setAnalytics(data.resumen);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // No mostrar error, analytics es opcional
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchEventoDetails = async (eventoId: string) => {
    try {
      setLoadingEventoId(eventoId);
      const response = await fetch(`/api/nominas/eventos/${eventoId}`);
      const data = await response.json();

      // Actualizar el evento con sus nóminas
      setEventos(prev => prev.map(e =>
        e.id === eventoId ? { ...e, nominas: data.evento.nominas } : e
      ));
    } catch (error) {
      console.error('Error fetching evento details:', error);
      toast.error('Error al cargar detalles del evento');
    } finally {
      setLoadingEventoId(null);
    }
  };

  const toggleEvento = async (eventoId: string) => {
    const isExpanded = expandedEventos.has(eventoId);

    if (isExpanded) {
      // Contraer
      setExpandedEventos(prev => {
        const next = new Set(prev);
        next.delete(eventoId);
        return next;
      });
    } else {
      // Expandir - cargar nóminas si no están cargadas
      const evento = eventos.find(e => e.id === eventoId);
      if (!evento?.nominas) {
        await fetchEventoDetails(eventoId);
      }

      setExpandedEventos(prev => new Set(prev).add(eventoId));
    }
  };

  const handleGenerarEvento = async () => {
    try {
      setIsGenerating(true);

      const response = await fetch('/api/nominas/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mes: mesActual,
          anio: anioActual,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar evento');
      }

      toast.success(`Pre-nóminas generadas: ${data.nominasGeneradas} nóminas`, {
        description: `${data.notificacionesEnviadas} managers notificados`,
      });

      fetchEventos();
    } catch (error) {
      console.error('Error generando evento:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar evento');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportar = async (eventoId: string) => {
    try {
      setActionLoading(eventoId);

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
      fetchEventos();
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error(error instanceof Error ? error.message : 'Error al exportar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImportar = async (eventoId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'application/pdf';

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      try {
        setActionLoading(eventoId);

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

        fetchEventos();
      } catch (error) {
        console.error('Error importando:', error);
        toast.error(error instanceof Error ? error.message : 'Error al importar');
      } finally {
        setActionLoading(null);
      }
    };

    input.click();
  };

  const handlePublicar = async (eventoId: string) => {
    if (!confirm('¿Estás seguro de publicar las nóminas? Los empleados recibirán notificaciones.')) {
      return;
    }

    try {
      setActionLoading(eventoId);

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

      fetchEventos();
    } catch (error) {
      console.error('Error publicando:', error);
      toast.error(error instanceof Error ? error.message : 'Error al publicar');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Cargando nóminas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nóminas</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona el ciclo completo de nóminas mensuales
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              className="btn-primary"
              onClick={handleGenerarEvento}
              disabled={isGenerating}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generando...' : 'Generar Evento Mensual'}
            </Button>
          </div>
        </div>
      </div>

      {/* Analytics KPIs */}
      {analytics && eventos.length > 0 && (
        <div className="flex-shrink-0 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard
              title="Coste Total Año"
              value={`€${analytics.totalNeto.toLocaleString('es-ES', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}`}
              subtitle={`${anioActual}`}
              trend={
                analytics.variacionAnioAnterior !== 0
                  ? {
                      value: Math.abs(analytics.variacionAnioAnterior),
                      isPositive: analytics.variacionAnioAnterior < 0, // Menos coste es positivo
                    }
                  : undefined
              }
            />

            <KpiCard
              title="Empleados"
              value={analytics.empleadosUnicos}
              subtitle="Empleados activos"
            />

            <KpiCard
              title="Coste Promedio"
              value={`€${analytics.promedioNeto.toLocaleString('es-ES', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}`}
              subtitle="Por empleado/año"
            />

            <KpiCard
              title="Eventos Procesados"
              value={eventos.length}
              subtitle={`${anioActual}`}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        {eventos.length === 0 ? (
          /* Empty State */
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-[#d97757]" />
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay nóminas registradas
              </h3>

              <p className="text-gray-600 max-w-md mb-8">
                Genera un evento mensual para crear automáticamente las pre-nóminas
                de todos los empleados activos, o sube nóminas directamente.
              </p>

              <div className="flex gap-4">
                <Button
                  className="btn-primary"
                  onClick={handleGenerarEvento}
                  disabled={isGenerating}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generando...' : 'Generar Evento'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'application/pdf';
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        toast.info('Función de subida directa en desarrollo');
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Nóminas
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* Lista de Eventos */
          <div className="space-y-4">
            {eventos.map((evento) => {
              const estadoInfo = estadosLabels[evento.estado] || {
                label: evento.estado,
                color: 'bg-gray-100 text-gray-700'
              };
              const isExpanded = expandedEventos.has(evento.id);
              const isProcessing = actionLoading === evento.id;
              const isLoadingDetails = loadingEventoId === evento.id;

              return (
                <Card key={evento.id} className="overflow-hidden">
                  {/* Evento Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => toggleEvento(evento.id)}
                            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                          >
                            <h3 className="text-lg font-semibold text-gray-900">
                              {meses[evento.mes - 1]} {evento.anio}
                            </h3>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            )}
                          </button>
                          <div className="group relative">
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${estadoInfo.color} cursor-help`}>
                              {estadoInfo.label}
                            </span>
                            <div className="absolute left-0 top-full mt-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              {estadoInfo.descripcion}
                            </div>
                          </div>
                        </div>

                        {/* Indicador de progreso visual */}
                        <div className="mb-4">
                          <div className="flex items-center gap-2 text-xs">
                            {['complementos_pendientes', 'lista_exportar', 'exportada', 'definitiva', 'publicada'].map((estado, idx) => {
                              const estadoActual = evento.estado;
                              const estadosOrden = ['generando', 'complementos_pendientes', 'lista_exportar', 'exportada', 'definitiva', 'publicada'];
                              const indexActual = estadosOrden.indexOf(estadoActual);
                              const indexEtapa = estadosOrden.indexOf(estado);
                              const completado = indexActual >= indexEtapa;
                              const activo = indexActual === indexEtapa;

                              return (
                                <div key={estado} className="flex items-center flex-1">
                                  <div
                                    className={`h-1 flex-1 rounded-full transition-colors ${
                                      completado ? 'bg-green-500' : activo ? 'bg-orange-400' : 'bg-gray-200'
                                    }`}
                                  />
                                  {idx < 4 && <div className="w-1" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                          <div>
                            <div className="text-gray-600">Empleados</div>
                            <div className="font-medium text-gray-900">
                              {evento.totalEmpleados}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Con Complementos</div>
                            <div className="font-medium text-gray-900">
                              {evento.empleadosConComplementos}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Nóminas</div>
                            <div className="font-medium text-gray-900">
                              {evento._count.nominas}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Generación</div>
                            <div className="font-medium text-gray-900">
                              {evento.fechaGeneracion
                                ? new Date(evento.fechaGeneracion).toLocaleDateString('es-ES')
                                : '-'}
                            </div>
                          </div>
                        </div>

                        {/* Alertas */}
                        {evento.alertas && evento.alertas.total > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-3 flex-wrap">
                              {evento.alertas.criticas > 0 && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
                                  <AlertCircle className="w-4 h-4 text-red-600" />
                                  <span className="text-sm font-medium text-red-700">
                                    {evento.alertas.criticas} crítica{evento.alertas.criticas !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                              {evento.alertas.advertencias > 0 && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-lg">
                                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                                  <span className="text-sm font-medium text-orange-700">
                                    {evento.alertas.advertencias} advertencia{evento.alertas.advertencias !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                              {evento.alertas.informativas > 0 && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                                  <Info className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-700">
                                    {evento.alertas.informativas} info
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-4">
                        {/* Exportar */}
                        {['lista_exportar', 'exportada', 'definitiva', 'publicada'].includes(evento.estado) && (
                          <div className="group relative">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExportar(evento.id)}
                              disabled={isProcessing}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {evento.estado === 'lista_exportar' ? 'Exportar Excel' : 'Re-exportar'}
                            </Button>
                            {evento.estado === 'lista_exportar' && (
                              <div className="absolute right-0 top-full mt-2 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                Descarga Excel con todas las nóminas para enviar a gestoría
                              </div>
                            )}
                          </div>
                        )}

                        {/* Importar */}
                        {['exportada', 'definitiva'].includes(evento.estado) && (
                          <div className="group relative">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImportar(evento.id)}
                              disabled={isProcessing}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Importar PDFs
                            </Button>
                            <div className="absolute right-0 top-full mt-2 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              Sube los PDFs de nóminas definitivas recibidas de gestoría
                            </div>
                          </div>
                        )}

                        {/* Publicar */}
                        {evento.estado === 'definitiva' && (
                          <div className="group relative">
                            <Button
                              size="sm"
                              className="btn-primary"
                              onClick={() => handlePublicar(evento.id)}
                              disabled={isProcessing}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Publicar y Notificar
                            </Button>
                            <div className="absolute right-0 top-full mt-2 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              Publica las nóminas y envía notificaciones a todos los empleados
                            </div>
                          </div>
                        )}

                        {/* Publicado badge */}
                        {evento.estado === 'publicada' && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              Publicado {evento.fechaExportacion && `el ${new Date(evento.fechaExportacion).toLocaleDateString('es-ES')}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nóminas Expandidas */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50">
                      {isLoadingDetails ? (
                        <div className="p-8 text-center">
                          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                          <p className="text-sm text-gray-600">Cargando nóminas...</p>
                        </div>
                      ) : evento.nominas && evento.nominas.length > 0 ? (
                        <div className="p-6 space-y-3">
                          {evento.nominas.map((nomina) => {
                            const estadoNominaInfo = estadosNominaLabels[nomina.estado] || {
                              label: nomina.estado,
                              color: 'text-gray-700'
                            };

                            return (
                              <div
                                key={nomina.id}
                                className="bg-white p-4 rounded-lg border hover:border-gray-300 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                      <User className="w-5 h-5 text-gray-600" />
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
                                    </div>

                                    <div className="grid grid-cols-3 gap-6 text-sm">
                                      <div>
                                        <div className="text-gray-600">Base</div>
                                        <div className="font-medium text-gray-900">
                                          €{nomina.salarioBase.toLocaleString('es-ES')}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-gray-600">Complementos</div>
                                        <div className="font-medium text-gray-900">
                                          €{nomina.totalComplementos.toLocaleString('es-ES')}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-gray-600">Total Neto</div>
                                        <div className="font-medium text-green-600">
                                          €{nomina.totalNeto.toLocaleString('es-ES')}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => router.push(`/hr/payroll/nominas/${nomina.id}`)}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Detalles
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-sm text-gray-600">No hay nóminas en este evento</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
