'use client';

import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Send,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
  _count: { nominas: number };
}

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const estadosLabels: Record<string, { label: string; color: string }> = {
  generando: { label: 'Generando', color: 'bg-blue-100 text-blue-700' },
  complementos_pendientes: { label: 'Complementos Pendientes', color: 'bg-orange-100 text-orange-700' },
  lista_exportar: { label: 'Lista para Exportar', color: 'bg-purple-100 text-purple-700' },
  exportada: { label: 'Exportada', color: 'bg-indigo-100 text-indigo-700' },
  definitiva: { label: 'Definitiva', color: 'bg-green-100 text-green-700' },
  publicada: { label: 'Publicada', color: 'bg-gray-900 text-white' },
};

export function EventosClient() {
  const router = useRouter();
  const [eventos, setEventos] = useState<EventoNomina[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    try {
      const response = await fetch('/api/nominas/eventos');
      const data = await response.json() as Record<string, any>;
      setEventos(data.eventos || []);
    } catch (error) {
      console.error('Error fetching eventos:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = async (eventoId: string) => {
    try {
      setActionLoading(eventoId);

      const response = await fetch(`/api/nominas/eventos/${eventoId}/exportar`);

      if (!response.ok) {
        const data = await response.json() as Record<string, any>;
        throw new Error(data.error || 'Error al exportar');
      }

      // Descargar el archivo Excel
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extraer nombre del archivo del header Content-Disposition
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
      fetchEventos(); // Refrescar lista
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
        formData.append('mode', 'auto'); // Auto-match por nombre de archivo

        const response = await fetch(`/api/nominas/eventos/${eventoId}/importar`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json() as Record<string, any>;

        if (!response.ok) {
          throw new Error(data.error || 'Error al importar');
        }

        toast.success(`${data.importadas} nóminas importadas correctamente`, {
          description: data.errores > 0 ? `${data.errores} archivos con errores` : undefined,
        });

        if (data.errores > 0) {
          console.warn('Errores de importación:', data.errores);
        }

        fetchEventos(); // Refrescar lista
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

      const data = await response.json() as Record<string, any>;

      if (!response.ok) {
        throw new Error(data.error || 'Error al publicar');
      }

      toast.success(`${data.nominasPublicadas} nóminas publicadas`, {
        description: `${data.empleadosNotificados} empleados notificados`,
      });

      fetchEventos(); // Refrescar lista
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
          <p className="text-gray-600">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between">
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
              <h1 className="text-2xl font-bold text-gray-900">Eventos de Nómina</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona el ciclo completo de cada mes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {eventos.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Calendar className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay eventos creados
              </h3>
              <p className="text-gray-600 mb-6">
                Crea tu primer evento mensual desde la página principal
              </p>
              <Button onClick={() => router.push('/hr/payroll')}>
                Ir a Nóminas
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {eventos.map((evento) => {
              const estadoInfo = estadosLabels[evento.estado] || { label: evento.estado, color: 'bg-gray-100 text-gray-700' };
              const isProcessing = actionLoading === evento.id;

              return (
                <Card key={evento.id} className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {meses[evento.mes - 1]} {evento.anio}
                        </h3>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${estadoInfo.color}`}>
                          {estadoInfo.label}
                        </span>
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
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      {/* Exportar */}
                      {['lista_exportar', 'exportada', 'definitiva', 'publicada'].includes(evento.estado) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportar(evento.id)}
                          disabled={isProcessing}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {evento.estado === 'lista_exportar' ? 'Exportar' : 'Re-exportar'}
                        </Button>
                      )}

                      {/* Importar */}
                      {['exportada', 'definitiva'].includes(evento.estado) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleImportar(evento.id)}
                          disabled={isProcessing}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Importar PDFs
                        </Button>
                      )}

                      {/* Publicar */}
                      {evento.estado === 'definitiva' && (
                        <Button
                          size="sm"
                          className="btn-primary"
                          onClick={() => handlePublicar(evento.id)}
                          disabled={isProcessing}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Publicar
                        </Button>
                      )}

                      {/* Publicado badge */}
                      {evento.estado === 'publicada' && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            Publicado
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
