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
  ListChecks,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UploadNominasModal } from '@/components/payroll/upload-nominas-modal';
import { ValidarComplementosDialog } from '@/components/payroll/validar-complementos-dialog';
import { CompensarHorasDialog } from '@/components/shared/compensar-horas-dialog';
import { AlertasSummary } from '@/components/payroll/alertas-summary';
import { Checkbox } from '@/components/ui/checkbox';
import { DetailsPanel } from '@/components/shared/details-panel';
import {
  EVENTO_ESTADOS,
  NOMINA_ESTADO_LABELS,
} from '@/lib/constants/nomina-estados';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  nominasConComplementosPendientes?: number;
  tieneComplementos?: boolean;
  horasExtra?: {
    pendientes: number;
    aprobadas: number;
    total: number;
    horasPendientes: number;
  };
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

const workflowSteps = [
  {
    key: 'pendiente',
    title: 'Pendiente',
    tooltip: 'Complementos y alertas opcionales',
  },
  {
    key: 'completada',
    title: 'Completada',
    tooltip: 'Complementos revisados (opcional)',
  },
  {
    key: 'publicada',
    title: 'Publicada',
    tooltip: 'PDF importados y notificados',
  },
];

const getStepIndexFromState = (evento: EventoNomina): number => {
  if (evento.estado === EVENTO_ESTADOS.CERRADO) {
    return 3;
  }

  const tienePendientes = (evento.nominasConComplementosPendientes ?? 0) > 0;
  if (!tienePendientes) {
    return 2;
  }

  return 1;
};

export function PayrollClient({ mesActual, anioActual }: PayrollClientProps) {
  const router = useRouter();
  const [eventos, setEventos] = useState<EventoNomina[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateEventDialog, setShowCreateEventDialog] = useState(false);
  const [showValidarComplementosDialog, setShowValidarComplementosDialog] = useState(false);
  const [eventoIdParaValidar, setEventoIdParaValidar] = useState<string | null>(null);
  const [showCompensarHorasDialog, setShowCompensarHorasDialog] = useState(false);
  const [eventoCompensarContext, setEventoCompensarContext] = useState<{
    eventoId: string;
    mes: number;
    anio: number;
  } | null>(null);
  const [selectedNominaId, setSelectedNominaId] = useState<string | null>(null);
  const [selectedEventoId, setSelectedEventoId] = useState<string | null>(null);
  const [abrirCompensarTrasCreacion, setAbrirCompensarTrasCreacion] = useState(false);
  const [abrirValidarTrasCreacion, setAbrirValidarTrasCreacion] = useState(false);

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

      if (data.evento?.id) {
        if (abrirCompensarTrasCreacion) {
          setEventoCompensarContext({
            eventoId: data.evento.id,
            mes: mesActual,
            anio: anioActual,
          });
          setShowCompensarHorasDialog(true);
        }

        if (abrirValidarTrasCreacion) {
          setEventoIdParaValidar(data.evento.id);
          setShowValidarComplementosDialog(true);
        }
      }

      toast.success('Evento generado correctamente', {
        description: `${data.nominasGeneradas ?? 0} pre-nómina(s) creadas`,
      });

      setShowCreateEventDialog(false);
      if (data.evento?.id) {
        setSelectedEventoId(data.evento.id);
        setSelectedNominaId(null);
      }
      fetchEventos();
    } catch (error) {
      console.error('Error generando evento:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar evento');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportar = async (evento: EventoNomina) => {
    const alertasCriticas = evento.alertas?.criticas ?? 0;
    if (alertasCriticas > 0) {
      const confirmed = window.confirm(
        `Hay ${alertasCriticas} alerta(s) crítica(s) pendientes.\n` +
          '¿Deseas exportar igualmente?'
      );
      if (!confirmed) {
        return;
      }
    }

    const actionKey = `${evento.id}:exportar`;
    try {
      setActionLoading(actionKey);

      const response = await fetch(`/api/nominas/eventos/${evento.id}/exportar`);

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

        // Mostrar sonner/toast con la información de importación
        if (data.errores > 0) {
          toast.warning(`${data.importadas} nóminas importadas`, {
            description: `${data.errores} archivo(s) con errores. Revisa los detalles.`,
            duration: 5000,
          });
        } else {
        toast.success(`${data.importadas} nóminas importadas correctamente`, {
            description: data.eventoCompleto 
              ? 'Todas las nóminas han sido importadas. Ya puedes publicarlas.'
              : `${data.importadas} de ${data.importadas + (data.faltantes || 0)} nóminas importadas.`,
            duration: 5000,
        });
        }

        fetchEventos();

        // Preguntar si desea publicar (solo si todas fueron importadas correctamente)
        if (data.eventoCompleto && data.errores === 0) {
          const shouldPublish = window.confirm(
            '✅ Todas las nóminas han sido importadas correctamente.\n\n¿Deseas publicarlas y notificar a los empleados ahora?'
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
              onClick={() => setShowCreateEventDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Generar Evento Mensual
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
                  onClick={() => setShowCreateEventDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generar Evento
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
              const stepIndex = getStepIndexFromState(evento.estado, evento);
              const isProcessing = actionLoading?.startsWith(`${evento.id}:`) ?? false;
              const complementosPendientesNominas = evento.nominasConComplementosPendientes ?? 0;
              const horasExtraInfo = evento.horasExtra ?? {
                pendientes: 0,
                aprobadas: 0,
                total: 0,
                horasPendientes: 0,
              };
              const tieneComplementos =
                evento.tieneComplementos ?? evento.empleadosConComplementos > 0;

              const eventoAbierto = evento.estado !== EVENTO_ESTADOS.CERRADO;

              const mostrarRevisarComplementos = eventoAbierto && tieneComplementos;
              const puedeRevisarComplementos = mostrarRevisarComplementos;

              const mostrarCompensarHoras = eventoAbierto;
              const puedeCompensarHoras = eventoAbierto;

              const mostrarExportarPrenominas = eventoAbierto;
              const puedeExportarPrenominas = eventoAbierto;

              const mostrarImportarNominas = eventoAbierto;
              const puedeImportarNominas = eventoAbierto && evento._count.nominas > 0;

              // Calcular información contextual según el paso actual
              const enPasoPendiente = stepIndex === 1;
              const fechaPasoTres = evento.fechaPublicacion ?? evento.fechaImportacion;
              const labelPasoTres = evento.fechaPublicacion ? 'Publicada' : 'Importada';
              const primaryActionClass =
                'bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-gray-900 focus-visible:ring-offset-2';

              const complementosInfo = {
                tieneComplementos,
                empleadosConComplementos: evento.empleadosConComplementos || 0,
                totalEmpleados: evento.totalEmpleados || 0,
                nominasPendientes: evento.nominasConComplementosPendientes ?? 0,
                totalNominas: evento._count.nominas || 0,
              };

              return (
                <Card key={evento.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div 
                    className="p-6 cursor-pointer" 
                    onClick={() => setSelectedEventoId(evento.id)}
                  >
                    {/* Primera fila: Período e información del estado actual */}
                    <div className="flex items-start justify-between gap-4 mb-3">
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

                      {/* Información contextual según el estado */}
                      <div className="flex-1 flex flex-col items-end gap-1">
                        {/* Paso "Pendiente": Mostrar estado de complementos, horas extra y alertas */}
                        {enPasoPendiente && (
                          <div className="flex flex-col gap-1 items-end text-right">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              {complementosInfo.tieneComplementos ? (
                                complementosInfo.nominasPendientes > 0 ? (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                                    <span className="text-orange-700">
                                      {complementosInfo.nominasPendientes} nómina
                                      {complementosInfo.nominasPendientes !== 1 ? 's' : ''} con complementos pendientes
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                    <span className="text-green-700">
                                      Complementos revisados para {complementosInfo.totalNominas} nómina
                                      {complementosInfo.totalNominas !== 1 ? 's' : ''}
                                    </span>
                                  </>
                                )
                              ) : (
                                <span className="text-gray-500">Sin complementos configurados</span>
                              )}
                        </div>

                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Clock className="w-3.5 h-3.5" />
                              {horasExtraInfo.pendientes > 0 ? (
                                <span className="text-orange-700">
                                  {horasExtraInfo.pendientes} compensacion
                                  {horasExtraInfo.pendientes !== 1 ? 'es' : ''} pendientes (
                                  {horasExtraInfo.horasPendientes.toFixed(1)}h)
                            </span>
                              ) : (
                                <span className="text-green-700">Horas extra compensadas</span>
                              )}
                        </div>

                        {evento.alertas && evento.alertas.total > 0 && (
                              <AlertasSummary alertas={evento.alertas} compact />
                            )}
                                </div>
                              )}

                        {/* Paso "Pre-nómina": Mostrar si está exportada/importada */}
                        {stepIndex === 2 && (
                          <div className="flex flex-col gap-1 items-end">
                            {evento.fechaExportacion && (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <Download className="w-3.5 h-3.5" />
                                <span>Exportada el {new Date(evento.fechaExportacion).toLocaleDateString('es-ES')}</span>
                            </div>
                              )}
                            {evento.fechaImportacion && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Importada el {new Date(evento.fechaImportacion).toLocaleDateString('es-ES')}</span>
                          </div>
                            )}
                        {evento.alertas && evento.alertas.total > 0 && (
                              <AlertasSummary alertas={evento.alertas} compact />
                            )}
                                </div>
                              )}

                        {/* Paso "Publicada": Mostrar cierre del ciclo */}
                        {stepIndex === 3 && fechaPasoTres && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>
                              {labelPasoTres} el {new Date(fechaPasoTres).toLocaleDateString('es-ES')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                    {/* Segunda fila: Stepper */}
                    <div className="mt-4">
                      <Stepper value={stepIndex} className="w-full">
                        <StepperNav className="gap-2">
                          {workflowSteps.map((step, index) => (
                            <StepperItem key={index} step={index + 1} className="relative flex-1">
                              <StepperTrigger className="flex flex-col items-start justify-center w-full">
                                <StepperIndicator className="bg-gray-200 rounded-full h-1 w-full data-[state=active]:bg-[#d97757] data-[state=complete]:bg-[#f4c2b3]" />
                                <div className="mt-2 flex items-center gap-1">
                                  <StepperTitle className="text-xs font-medium group-data-[state=inactive]/step:text-gray-400">
                                    {step.title}
                                  </StepperTitle>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="w-3 h-3 text-gray-400 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">{step.tooltip}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </StepperTrigger>
                            </StepperItem>
                          ))}
                        </StepperNav>
                      </Stepper>
                      </div>

                    {eventoAbierto && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {mostrarRevisarComplementos && (
                        <Button
                          size="sm"
                          variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEventoIdParaValidar(evento.id);
                              setShowValidarComplementosDialog(true);
                            }}
                            disabled={!puedeRevisarComplementos || isProcessing}
                            className="flex-1 min-w-[190px] justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <ListChecks className="w-4 h-4" />
                              <span>Validar complementos</span>
                            </div>
                            {complementosPendientesNominas > 0 && (
                              <span className="text-xs text-orange-600 font-medium">
                                {complementosPendientesNominas} pendientes
                              </span>
                            )}
                        </Button>
                        )}

                        {mostrarCompensarHoras && (
                        <Button
                          size="sm"
                          variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEventoCompensarContext({
                                eventoId: evento.id,
                                mes: evento.mes,
                                anio: evento.anio,
                              });
                              setShowCompensarHorasDialog(true);
                            }}
                            disabled={!puedeCompensarHoras || isProcessing}
                            className="flex-1 min-w-[190px] justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>Compensar horas</span>
                            </div>
                            {horasExtraInfo.horasPendientes > 0 && (
                              <span className="text-xs text-orange-600 font-medium">
                                {horasExtraInfo.horasPendientes.toFixed(1)}h pendientes
                              </span>
                            )}
                        </Button>
                        )}

                        {mostrarExportarPrenominas && (
                        <Button
                          size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportar(evento);
                            }}
                            disabled={!puedeExportarPrenominas || isProcessing}
                            className={`flex-1 min-w-[200px] justify-center ${primaryActionClass}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                            Exportar Pre-nóminas
                        </Button>
                        )}

                        {mostrarImportarNominas && (
                        <Button
                          size="sm"
                          variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImportar(evento.id);
                            }}
                            disabled={!puedeImportarNominas || isProcessing}
                            className="flex-1 min-w-[190px] justify-center"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                            Importar Nóminas
                        </Button>
                        )}
                      </div>
                    )}
                      </div>
                </Card>
              );
            })}
                    </div>
        )}
                  </div>

      {/* Dialog de Crear Evento */}
      <Dialog open={showCreateEventDialog} onOpenChange={setShowCreateEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generar Evento de Nóminas - {nombreMes} {anioActual}</DialogTitle>
            <DialogDescription>
              Configura las opciones para generar el evento mensual de nóminas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              Las pre-nóminas se generan automáticamente para todos los empleados activos.
              Puedes completar complementos, compensar horas o importar PDFs cuando quieras.
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="compensar-horas-modal"
                checked={abrirCompensarTrasCreacion}
                onCheckedChange={(checked) =>
                  setAbrirCompensarTrasCreacion(Boolean(checked))
                }
              />
              <div className="flex-1">
                <label
                  htmlFor="compensar-horas-modal"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Abrir compensación de horas extra al crear el evento
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Abre automáticamente el diálogo para revisar la bolsa de horas del mes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="validar-complementos-modal"
                checked={abrirValidarTrasCreacion}
                onCheckedChange={(checked) =>
                  setAbrirValidarTrasCreacion(Boolean(checked))
                }
              />
              <div className="flex-1">
                <label
                  htmlFor="validar-complementos-modal"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Abrir validación de complementos tras crear el evento
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Accede directamente al flujo de revisión de complementos.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateEventDialog(false)}
              disabled={isGenerating}
            >
              Cancelar
                        </Button>
            <Button onClick={handleGenerarEvento} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Generar Evento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Compensar Horas Dialog */}
      {eventoCompensarContext && (
        <CompensarHorasDialog
          context="nominas"
          eventoId={eventoCompensarContext.eventoId}
          mes={eventoCompensarContext.mes}
          anio={eventoCompensarContext.anio}
          isOpen={showCompensarHorasDialog}
          onClose={() => {
            setShowCompensarHorasDialog(false);
            setEventoCompensarContext(null);
            fetchEventos();
          }}
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
  const [incidencias, setIncidencias] = useState<{
    ausencias: Array<{
      id: string;
      tipo: string;
      estado: string;
      fechaInicio: string;
      fechaFin: string;
      diasSolicitados: number | null;
    }>;
    contratos: Array<{
      id: string;
      fechaInicio: string | null;
      fechaFin: string | null;
      tipoContrato: string;
    }>;
    fichajes: {
      diasRegistrados: number;
      diasPendientes: number;
      horasTrabajadas: number;
    };
  } | null>(null);
  const [loadingIncidencias, setLoadingIncidencias] = useState(false);

  useEffect(() => {
    if (nominaId && isOpen) {
      fetchNomina();
      fetchIncidencias();
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

  const fetchIncidencias = async () => {
    setLoadingIncidencias(true);
    try {
      const response = await fetch(`/api/nominas/${nominaId}/incidencias`);
      const data = await response.json();
      if (response.ok) {
        setIncidencias(data.incidencias || null);
      }
    } catch (error) {
      console.error('Error fetching incidencias:', error);
    } finally {
      setLoadingIncidencias(false);
    }
  };

  const handleDescargarPdf = () => {
    window.open(`/api/nominas/${nominaId}/pdf`, '_blank');
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

          {/* Documento */}
                                      <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Documento</h3>
            {nomina.documento ? (
              <div className="flex items-center justify-between rounded border border-gray-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {nomina.documento.nombre || 'Nómina PDF'}
                  </p>
                  <p className="text-xs text-gray-500">Disponible para descarga</p>
                      </div>
                <Button size="sm" variant="outline" onClick={handleDescargarPdf}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                    </div>
            ) : (
              <p className="text-sm text-gray-500">Aún no se ha importado el PDF de esta nómina.</p>
            )}
                  </div>

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

          {/* Incidencias */}
                                      <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Incidencias</h3>
            {loadingIncidencias ? (
              <div className="text-sm text-gray-500">Cargando incidencias...</div>
            ) : incidencias ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs uppercase text-gray-500 mb-2">
                    Ausencias ({incidencias.ausencias.length})
                  </h4>
                  {incidencias.ausencias.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin ausencias registradas.</p>
                  ) : (
                    <div className="space-y-2">
                      {incidencias.ausencias.map((ausencia) => (
                        <div
                          key={ausencia.id}
                          className="p-2 bg-gray-50 rounded text-xs text-gray-700 flex justify-between"
                        >
                          <span>
                            {ausencia.tipo} ({ausencia.estado})
                          </span>
                          <span>
                            {new Date(ausencia.fechaInicio).toLocaleDateString('es-ES')} -{' '}
                            {new Date(ausencia.fechaFin).toLocaleDateString('es-ES')}
                                  </span>
                                        </div>
                      ))}
                                      </div>
                              )}
                                    </div>

                                      <div>
                  <h4 className="text-xs uppercase text-gray-500 mb-2">
                    Cambios de contrato ({incidencias.contratos.length})
                                        </h4>
                  {incidencias.contratos.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin altas/bajas de contrato.</p>
                  ) : (
                    <div className="space-y-2 text-xs text-gray-700">
                      {incidencias.contratos.map((contrato) => (
                        <div key={contrato.id} className="p-2 bg-gray-50 rounded">
                          <div className="font-medium">{contrato.tipoContrato}</div>
                          {contrato.fechaInicio && (
                            <div>
                              Alta: {new Date(contrato.fechaInicio).toLocaleDateString('es-ES')}
                                      </div>
                              )}
                          {contrato.fechaFin && (
                            <div>
                              Baja: {new Date(contrato.fechaFin).toLocaleDateString('es-ES')}
                                      </div>
                          )}
                                    </div>
                      ))}
                          </div>
                        )}
                                    </div>

                                      <div>
                  <h4 className="text-xs uppercase text-gray-500 mb-2">Resumen de fichajes</h4>
                  {incidencias.fichajes ? (
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-700">
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="text-xl font-semibold">{incidencias.fichajes.diasRegistrados}</div>
                        <div className="text-gray-500">Días registrados</div>
                                        </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="text-xl font-semibold text-orange-600">
                          {incidencias.fichajes.diasPendientes}
                                      </div>
                        <div className="text-gray-500">Días pendientes</div>
                                        </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <div className="text-xl font-semibold">
                          {incidencias.fichajes.horasTrabajadas.toFixed(1)}h
                                      </div>
                        <div className="text-gray-500">Horas trabajadas</div>
                                        </div>
                                      </div>
                  ) : (
                    <p className="text-sm text-gray-500">Sin datos de fichajes.</p>
                  )}
                                    </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sin incidencias registradas.</p>
            )}
                                  </div>

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
              <AlertasSummary alertas={evento.alertas} />
                        </div>
          )}

          {/* Lista de nóminas */}
          {evento.nominas && evento.nominas.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Nóminas ({evento.nominas.length})</h3>
              <div className="space-y-2">
                {evento.nominas.map((nomina: any) => {
                            const estadoNominaInfo = NOMINA_ESTADO_LABELS[nomina.estado] || {
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
