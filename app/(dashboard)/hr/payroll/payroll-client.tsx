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
  User,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UploadNominasModal } from '@/components/payroll/upload-nominas-modal';
import { ValidarComplementosDialog } from '@/components/payroll/validar-complementos-dialog';
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
  fechaImportacion: string | null;
  fechaPublicacion: string | null;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showValidarComplementosDialog, setShowValidarComplementosDialog] = useState(false);
  const [eventoIdParaValidar, setEventoIdParaValidar] = useState<string | null>(null);
  const [selectedNominaId, setSelectedNominaId] = useState<string | null>(null);
  const [selectedEventoId, setSelectedEventoId] = useState<string | null>(null);

  const nombreMes = meses[mesActual - 1];

  useEffect(() => {
    fetchEventos();
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
              const isProcessing = actionLoading?.startsWith(`${evento.id}:`) ?? false;

              // Lógica de botones según flujo:
              // - Si NO has generado pre-nóminas: "Generar Pre-nóminas"
              // - Si YA generaste pre-nóminas pero NO has importado: "Importar Nóminas" + "Validar Complementos"
              const mostrarGenerarPrenominas = !evento.fechaGeneracion;
              const mostrarImportarNominas = evento.fechaGeneracion && !evento.fechaImportacion;
              const mostrarRellenarComplementos = evento.fechaGeneracion && !evento.fechaImportacion;

              return (
                <Card key={evento.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div 
                    className="p-5 cursor-pointer" 
                    onClick={() => setSelectedEventoId(evento.id)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Información del evento - PREVIEW */}
                      <div className="flex items-center gap-6 flex-1 min-w-0">
                        {/* Período */}
                        <div className="flex-shrink-0">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {meses[evento.mes - 1]} {evento.anio}
                            </h3>
                          {evento._count.nominas > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {evento._count.nominas} nómina{evento._count.nominas !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>

                        {/* Estado */}
                        <div className="flex-shrink-0">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${estadoInfo.color}`}>
                              {estadoInfo.label}
                            </span>
                            </div>

                        {/* Preview de alertas */}
                        {evento.alertas && evento.alertas.total > 0 && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {evento.alertas.criticas > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded text-xs">
                                <AlertCircle className="w-3 h-3 text-red-600" />
                                <span className="text-red-700 font-medium">{evento.alertas.criticas}</span>
                          </div>
                            )}
                            {evento.alertas.advertencias > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 rounded text-xs">
                                <AlertTriangle className="w-3 h-3 text-orange-600" />
                                <span className="text-orange-700 font-medium">{evento.alertas.advertencias}</span>
                              </div>
                            )}
                            {evento.alertas.informativas > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-xs">
                                <Info className="w-3 h-3 text-blue-600" />
                                <span className="text-blue-700 font-medium">{evento.alertas.informativas}</span>
                              </div>
                            )}
                          </div>
                        )}
                        </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {mostrarGenerarPrenominas && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerarPrenominas(evento.id);
                            }}
                            disabled={isProcessing}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Generar Pre-nóminas
                          </Button>
                        )}

                        {mostrarImportarNominas && (
                          <>
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
                              Importar Nóminas
                            </Button>

                            {mostrarRellenarComplementos && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEventoIdParaValidar(evento.id);
                                  setShowValidarComplementosDialog(true);
                                }}
                                disabled={isProcessing}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Validar Complementos
                              </Button>
                            )}
                          </>
                        )}
                                </div>
                    </div>
                  </div>
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
        }}
      />

      {/* Validar Complementos Dialog */}
      {eventoIdParaValidar && (
        <ValidarComplementosDialog
          isOpen={showValidarComplementosDialog}
          onClose={() => {
            setShowValidarComplementosDialog(false);
            setEventoIdParaValidar(null);
            fetchEventos(); // Refrescar para actualizar badges/stats
          }}
          eventoId={eventoIdParaValidar}
        />
      )}

      {/* Evento Details Panel */}
      {selectedEventoId && (
        <EventoDetailsPanel
          eventoId={selectedEventoId}
          isOpen={!!selectedEventoId}
          onClose={() => setSelectedEventoId(null)}
          onSelectNomina={(nominaId) => setSelectedNominaId(nominaId)}
        />
      )}

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

// Componente de panel de detalles de evento
function EventoDetailsPanel({
  eventoId,
  isOpen,
  onClose,
  onSelectNomina,
}: {
  eventoId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectNomina: (nominaId: string) => void;
}) {
  const [evento, setEvento] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (eventoId && isOpen) {
      fetchEvento();
    }
  }, [eventoId, isOpen]);

  const fetchEvento = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/nominas/eventos/${eventoId}`);
      const data = await response.json();
      if (response.ok) {
        // El endpoint devuelve { evento, stats }
        const eventoData = data.evento || data;
        // Calcular alertas agregadas desde las nóminas si no vienen en el formato esperado
        if (eventoData.nominas && !eventoData.alertas) {
          const alertas = eventoData.nominas.flatMap((n: any) => n.alertas || []);
          eventoData.alertas = {
            criticas: alertas.filter((a: any) => a.tipo === 'critico').length,
            advertencias: alertas.filter((a: any) => a.tipo === 'advertencia').length,
            informativas: alertas.filter((a: any) => a.tipo === 'info').length,
            total: alertas.length,
          };
        }
        setEvento(eventoData);
      }
    } catch (error) {
      console.error('Error fetching evento:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!evento && !loading) return null;

  const estadosNominaLabels: Record<string, { label: string; color: string }> = {
    pre_nomina: { label: 'Pre-nómina', color: 'text-blue-600' },
    revisando: { label: 'Revisando', color: 'text-yellow-600' },
    lista_exportar: { label: 'Lista Exportar', color: 'text-purple-600' },
    exportada: { label: 'Exportada', color: 'text-indigo-600' },
    definitiva: { label: 'Definitiva', color: 'text-green-600' },
    publicada: { label: 'Publicada', color: 'text-gray-600' },
  };

  return (
    <DetailsPanel
      isOpen={isOpen}
      onClose={onClose}
      title={evento ? `Evento de Nóminas - ${meses[evento.mes - 1]} ${evento.anio}` : 'Cargando...'}
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Clock className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : evento ? (
        <div className="space-y-6">
          {/* Información básica del evento */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Información del Evento</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-600">Estado</dt>
                <dd className="font-medium text-gray-900">
                  {estadosLabels[evento.estado]?.label || evento.estado}
                </dd>
              </div>
              <div>
                <dt className="text-gray-600">Total Nóminas</dt>
                <dd className="font-medium text-gray-900">{evento.nominas?.length || 0}</dd>
              </div>
              {evento.fechaGeneracion && (
                <div>
                  <dt className="text-gray-600">Generado</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(evento.fechaGeneracion).toLocaleDateString('es-ES')}
                  </dd>
                          </div>
                        )}
              {evento.fechaImportacion && (
                <div>
                  <dt className="text-gray-600">Importado</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(evento.fechaImportacion).toLocaleDateString('es-ES')}
                  </dd>
                      </div>
              )}
              {evento.fechaPublicacion && (
                <div>
                  <dt className="text-gray-600">Publicado</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(evento.fechaPublicacion).toLocaleDateString('es-ES')}
                  </dd>
                    </div>
              )}
            </dl>
                  </div>

          {/* Alertas del evento */}
          {evento.alertas && evento.alertas.total > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Alertas</h3>
              <div className="space-y-2 text-sm">
                {evento.alertas.criticas > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-900">{evento.alertas.criticas} alerta{evento.alertas.criticas !== 1 ? 's' : ''} crítica{evento.alertas.criticas !== 1 ? 's' : ''}</span>
                        </div>
                )}
                {evento.alertas.advertencias > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-orange-900">{evento.alertas.advertencias} advertencia{evento.alertas.advertencias !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {evento.alertas.informativas > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-900">{evento.alertas.informativas} informativa{evento.alertas.informativas !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lista de nóminas */}
          {evento.nominas && evento.nominas.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Nóminas ({evento.nominas.length})</h3>
              <div className="space-y-2">
                {evento.nominas.map((nomina: any) => {
                            const estadoNominaInfo = estadosNominaLabels[nomina.estado] || {
                              label: nomina.estado,
                    color: 'text-gray-700',
                            };

                            return (
                    <button
                                key={nomina.id}
                      onClick={() => onSelectNomina(nomina.id)}
                      className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                              >
                                <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-600" />
                                    </div>
                          <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 text-sm truncate">
                                          {nomina.empleado.nombre} {nomina.empleado.apellidos}
                                        </h4>
                                        <span className={`text-xs font-medium ${estadoNominaInfo.color}`}>
                                          {estadoNominaInfo.label}
                                        </span>
                                      </div>
                            <p className="text-xs text-gray-600 truncate">{nomina.empleado.email}</p>
                                    </div>
                                        </div>
                        <div className="text-sm font-medium text-gray-900 ml-2">
                          €{Number(nomina.totalNeto).toLocaleString('es-ES')}
                                      </div>
                                        </div>
                    </button>
                            );
                          })}
                        </div>
                        </div>
                      )}

          {/* No hay nóminas */}
          {(!evento.nominas || evento.nominas.length === 0) && (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No hay nóminas generadas para este evento.</p>
                    </div>
                  )}
          </div>
      ) : null}
    </DetailsPanel>
  );
}
