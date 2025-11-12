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
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KpiCard } from '@/components/analytics/kpi-card';
import { UploadNominasModal } from '@/components/payroll/upload-nominas-modal';
import { DetailsPanel } from '@/components/shared/details-panel';

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

const estadosLabels: Record<
  string,
  { label: string; color: string; descripcion: string }
> = {
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedNominaId, setSelectedNominaId] = useState<string | null>(null);

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

  const handleGenerarPrenominas = async (eventoId: string) => {
    const actionKey = `${eventoId}:generar`;
    try {
      setActionLoading(actionKey);

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
          : 'Las pre-nóminas ya estaban generadas',
        {
          description: data.alertasGeneradas
            ? `${data.alertasGeneradas} alerta(s) detectada(s)`
            : undefined,
        }
      );

      fetchEventos();
    } catch (error) {
      console.error('Error generando pre-nóminas:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar pre-nóminas');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportar = async (eventoId: string) => {
    const actionKey = `${eventoId}:exportar`;
    try {
      setActionLoading(actionKey);

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
    const actionKey = `${eventoId}:importar`;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'application/pdf,.pdf,.zip';

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      try {
        setActionLoading(actionKey);

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

        // Preguntar si desea publicar
        if (data.eventoCompleto) {
          const shouldPublish = confirm(
            '¿Deseas publicar las nóminas y notificar a los empleados ahora?'
          );
          if (shouldPublish) {
            await handlePublicar(eventoId);
          }
        }
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
    if (
      !confirm(
        '¿Estás seguro de publicar las nóminas? Los empleados recibirán notificaciones.'
      )
    ) {
      return;
    }

    const actionKey = `${eventoId}:publicar`;

    try {
      setActionLoading(actionKey);

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

  const handleAvanzarEstado = async (eventoId: string, estadoActual: string) => {
    const nextEstadoMap: Record<string, string> = {
      complementos_pendientes: 'lista_exportar',
    };

    const siguienteEstado = nextEstadoMap[estadoActual];
    if (!siguienteEstado) {
      return;
    }

    const actionKey = `${eventoId}:avanzar`;

    try {
      setActionLoading(actionKey);

      const response = await fetch(`/api/nominas/eventos/${eventoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: siguienteEstado }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo avanzar al siguiente estado');
      }

      toast.success(
        `Evento actualizado a ${
          estadosLabels[siguienteEstado]?.label ?? siguienteEstado
        }`
      );
      fetchEventos();
    } catch (error) {
      console.error('Error avanzando estado:', error);
      toast.error(error instanceof Error ? error.message : 'Error al avanzar de estado');
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
              variant="outline"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Subir Nóminas
            </Button>
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
                  onClick={() => setShowUploadModal(true)}
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
                color: 'bg-gray-100 text-gray-700',
                descripcion: 'Estado no identificado',
              };
              const isExpanded = expandedEventos.has(evento.id);
              const isProcessing = actionLoading?.startsWith(`${evento.id}:`) ?? false;
              const isLoadingDetails = loadingEventoId === evento.id;

              const canGenerarPrenominas = ['generando', 'complementos_pendientes'].includes(
                evento.estado
              );
              const canExportar = ['lista_exportar', 'exportada', 'definitiva', 'publicada'].includes(
                evento.estado
              );
              const canImportar = ['exportada', 'definitiva'].includes(evento.estado);
              const canPublicar = evento.estado === 'definitiva';

              return (
                <Card key={evento.id} className="overflow-hidden">
                  {/* Evento Header - Card compacta */}
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleEvento(evento.id)}
                        className="flex items-center gap-3 hover:opacity-70 transition-opacity flex-1"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {meses[evento.mes - 1]} {evento.anio}
                          </h3>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div className="group relative">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${estadoInfo.color} cursor-help`}>
                            {estadoInfo.label}
                          </span>
                          <div className="absolute left-0 top-full mt-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            {estadoInfo.descripcion}
                          </div>
                        </div>
                      </button>

                      {/* Botones de acción en la card */}
                      <div className="flex items-center gap-2">
                        {canGenerarPrenominas && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerarPrenominas(evento.id);
                            }}
                            disabled={isProcessing}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Generar
                          </Button>
                        )}
                        
                        {canExportar && evento.estado === 'lista_exportar' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportar(evento.id);
                            }}
                            disabled={isProcessing}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                          </Button>
                        )}
                        
                        {canImportar && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImportar(evento.id);
                            }}
                            disabled={isProcessing}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Alertas en la card */}
                  {evento.alertas && evento.alertas.total > 0 && (
                    <div className="px-5 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {evento.alertas.criticas > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded text-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                            <span className="text-red-700 font-medium">
                              {evento.alertas.criticas} crítica{evento.alertas.criticas !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {evento.alertas.advertencias > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 rounded text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                            <span className="text-orange-700 font-medium">
                              {evento.alertas.advertencias} advertencia{evento.alertas.advertencias !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {evento.alertas.informativas > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded text-xs">
                            <Info className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-blue-700 font-medium">
                              {evento.alertas.informativas} info
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                                    onClick={() => setSelectedNominaId(nomina.id)}
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

      {/* Upload Modal */}
      <UploadNominasModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          fetchEventos();
          fetchAnalytics();
        }}
      />

      {/* Nomina Details Panel */}
      {selectedNominaId && (
        <NominaDetailsPanel
          nominaId={selectedNominaId}
          isOpen={!!selectedNominaId}
          onClose={() => setSelectedNominaId(null)}
        />
      )}
    </div>
  );
}

// Componente de panel de detalles de nómina
function NominaDetailsPanel({ 
  nominaId, 
  isOpen, 
  onClose 
}: { 
  nominaId: string; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const router = useRouter();
  const [nomina, setNomina] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (nominaId && isOpen) {
      fetchNomina();
    }
  }, [nominaId, isOpen]);

  const fetchNomina = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/nominas/${nominaId}`);
      const data = await response.json();
      if (response.ok) {
        setNomina(data);
      }
    } catch (error) {
      console.error('Error fetching nomina:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!nomina && !loading) return null;

  return (
    <DetailsPanel
      isOpen={isOpen}
      onClose={onClose}
      title={nomina ? `${nomina.empleado.nombre} ${nomina.empleado.apellidos}` : 'Cargando...'}
      subtitle={nomina ? `Nómina ${meses[nomina.mes - 1]} ${nomina.anio}` : ''}
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Clock className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : nomina ? (
        <div className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Resumen</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-600">Salario Base</dt>
                  <dd className="font-medium text-gray-900">
                    €{Number(nomina.salarioBase).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-600">Complementos</dt>
                  <dd className="font-medium text-gray-900">
                    €{Number(nomina.totalComplementos).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-600">Deducciones</dt>
                  <dd className="font-medium text-gray-900">
                    €{Number(nomina.totalDeducciones).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-600">Total Bruto</dt>
                  <dd className="font-medium text-gray-900">
                    €{Number(nomina.totalBruto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-600">Total Neto</dt>
                  <dd className="font-medium text-lg text-green-600">
                    €{Number(nomina.totalNeto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-600">Días Trabajados</dt>
                  <dd className="font-medium text-gray-900">{nomina.diasTrabajados}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">Días Ausencias</dt>
                  <dd className="font-medium text-gray-900">{nomina.diasAusencias || 0}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Complementos */}
          {nomina.complementosAsignados && nomina.complementosAsignados.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Complementos</h3>
              <div className="space-y-2">
                {nomina.complementosAsignados.map((comp: any) => (
                  <div key={comp.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                    <span className="text-gray-700">{comp.empleadoComplemento.tipoComplemento.nombre}</span>
                    <span className="font-medium text-gray-900">
                      €{Number(comp.importe).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alertas */}
          {nomina.alertas && nomina.alertas.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Alertas</h3>
              <div className="space-y-2">
                {nomina.alertas.map((alerta: any) => (
                  <div key={alerta.id} className="p-3 bg-red-50 rounded text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900">{alerta.mensaje}</p>
                        {alerta.detalles && (
                          <p className="text-xs text-red-700 mt-1">{JSON.stringify(alerta.detalles)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón para ver perfil completo */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                router.push(`/hr/organizacion/personas/${nomina.empleadoId}`);
                onClose();
              }}
            >
              <User className="w-4 h-4 mr-2" />
              Ver perfil completo del empleado
            </Button>
          </div>
        </div>
      ) : null}
    </DetailsPanel>
  );
}
