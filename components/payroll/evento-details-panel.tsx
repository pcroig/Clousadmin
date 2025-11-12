'use client';

// ========================================
// Evento Details Panel Component
// ========================================
// Panel lateral para mostrar detalles de un evento de nómina

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Download,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { DetailsPanel } from '@/components/shared/details-panel';

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
}

interface Complemento {
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
  complementosPendientes: boolean;
  complementosAsignados: Complemento[];
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

interface EventoDetailsPanelProps {
  eventoId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const estadosLabels: Record<string, { label: string; color: string; descripcion: string }> = {
  generando: {
    label: 'Generando',
    color: 'bg-gray-100 text-gray-700',
    descripcion: 'Pre-nóminas en generación',
  },
  complementos_pendientes: {
    label: 'Complementos Pendientes',
    color: 'bg-orange-100 text-orange-700',
    descripcion: 'Revisar complementos variables',
  },
  lista_exportar: {
    label: 'Lista para Exportar',
    color: 'bg-yellow-100 text-yellow-700',
    descripcion: 'Listo para enviar a gestoría',
  },
  exportada: {
    label: 'Exportada',
    color: 'bg-blue-100 text-blue-700',
    descripcion: 'Esperando nóminas definitivas',
  },
  definitiva: {
    label: 'Definitiva',
    color: 'bg-green-100 text-green-700',
    descripcion: 'Nóminas importadas, listas para publicar',
  },
  publicada: {
    label: 'Publicada',
    color: 'bg-gray-900 text-white',
    descripcion: 'Nóminas publicadas a empleados',
  },
};

export function EventoDetailsPanel({ eventoId, isOpen, onClose, onUpdate }: EventoDetailsPanelProps) {
  const [evento, setEvento] = useState<EventoNomina | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (eventoId && isOpen) {
      fetchEvento();
    }
  }, [eventoId, isOpen]);

  const fetchEvento = async () => {
    if (!eventoId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/nominas/eventos/${eventoId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar evento');
      }

      setEvento(data.evento);
    } catch (error) {
      console.error('Error fetching evento:', error);
      toast.error('Error al cargar detalles del evento');
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = async () => {
    if (!eventoId) return;
    
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
      onUpdate();
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error(error instanceof Error ? error.message : 'Error al exportar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImportar = async () => {
    if (!eventoId) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf,.zip';
    input.multiple = true;

    input.onchange = async (e: Event) => {
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

        toast.success(`${data.importadas} nómina(s) importada(s) correctamente`);
        
        // Preguntar si desea publicar
        if (data.eventoCompleto) {
          const shouldPublish = confirm(
            '¿Deseas publicar las nóminas y notificar a los empleados ahora?'
          );
          
          if (shouldPublish) {
            await handlePublicar();
          }
        }
        
        fetchEvento();
        onUpdate();
      } catch (error) {
        console.error('Error importing:', error);
        toast.error(error instanceof Error ? error.message : 'Error al importar');
      } finally {
        setActionLoading(null);
      }
    };

    input.click();
  };

  const handlePublicar = async () => {
    if (!eventoId) return;
    
    try {
      setActionLoading('publicar');

      const response = await fetch(`/api/nominas/eventos/${eventoId}/publicar`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al publicar');
      }

      toast.success('Nóminas publicadas y empleados notificados');
      fetchEvento();
      onUpdate();
    } catch (error) {
      console.error('Error publicando:', error);
      toast.error(error instanceof Error ? error.message : 'Error al publicar');
    } finally {
      setActionLoading(null);
    }
  };

  if (!evento && !loading) return null;

  const estadoInfo = evento ? (estadosLabels[evento.estado] || {
    label: evento.estado,
    color: 'bg-gray-100 text-gray-700',
    descripcion: 'Estado no identificado',
  }) : null;

  const canExportar = evento && ['lista_exportar', 'complementos_pendientes'].includes(evento.estado);
  const canImportar = evento && ['exportada'].includes(evento.estado);

  return (
    <DetailsPanel
      isOpen={isOpen}
      onClose={onClose}
      title={evento ? `${meses[evento.mes - 1]} ${evento.anio}` : 'Cargando...'}
      subtitle="Evento de nómina"
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : evento ? (
        <div className="space-y-6">
          {/* Estado actual */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Estado Actual</h3>
              {estadoInfo && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${estadoInfo.color}`}>
                  {estadoInfo.label}
                </span>
              )}
            </div>
            {estadoInfo && (
              <p className="text-sm text-gray-600">{estadoInfo.descripcion}</p>
            )}
          </Card>

          {/* Acciones */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Acciones</h3>
            <div className="space-y-2">
              {canExportar && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleExportar}
                  disabled={!!actionLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {actionLoading === 'exportar' ? 'Exportando...' : 'Exportar a Excel'}
                </Button>
              )}

              {canImportar && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleImportar}
                  disabled={!!actionLoading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {actionLoading === 'importar' ? 'Importando...' : 'Importar Nóminas'}
                </Button>
              )}
            </div>
          </Card>

          {/* Complementos */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Complementos</h3>
              <span className="text-xs text-gray-500">
                {evento.empleadosConComplementos} / {evento.totalEmpleados} empleados
              </span>
            </div>

            {evento.estado === 'complementos_pendientes' && (
              <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                <div className="flex items-start gap-2">
                  {evento.empleadosConComplementos === evento.totalEmpleados ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-700">
                          Complementos revisados
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Todos los empleados tienen complementos asignados
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-700">
                          Complementos pendientes
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          {evento.totalEmpleados - evento.empleadosConComplementos} empleado(s) sin complementos
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Lista de nóminas con complementos pendientes */}
            {evento.nominas && evento.nominas.length > 0 && (
              <div className="space-y-2">
                {evento.nominas
                  .filter((n) => n.complementosPendientes)
                  .slice(0, 5)
                  .map((nomina) => (
                    <div
                      key={nomina.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {nomina.empleado.nombre} {nomina.empleado.apellidos}
                        </p>
                        <p className="text-xs text-gray-500">{nomina.empleado.email}</p>
                      </div>
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    </div>
                  ))}

                {evento.nominas.filter((n) => n.complementosPendientes).length > 5 && (
                  <p className="text-xs text-gray-500 text-center">
                    + {evento.nominas.filter((n) => n.complementosPendientes).length - 5} más
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Información adicional */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Información</h3>
            <dl className="space-y-2">
              {evento.fechaGeneracion && (
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Generado:</dt>
                  <dd className="text-gray-900">
                    {new Date(evento.fechaGeneracion).toLocaleDateString('es-ES')}
                  </dd>
                </div>
              )}
              {evento.fechaExportacion && (
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Exportado:</dt>
                  <dd className="text-gray-900">
                    {new Date(evento.fechaExportacion).toLocaleDateString('es-ES')}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      ) : null}
    </DetailsPanel>
  );
}

