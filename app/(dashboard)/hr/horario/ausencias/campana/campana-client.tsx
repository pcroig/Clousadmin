'use client';

// ========================================
// Campaña de Vacaciones - Client Component
// ========================================

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TablaCuadrajeCampana } from '@/components/vacaciones/tabla-cuadraje-campana';

interface EmpleadoEquipo {
  equipoId: string;
  nombre: string | null;
}

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
  fotoUrl: string | null;
  email: string;
  equipos: EmpleadoEquipo[];
}

interface Preferencia {
  id: string;
  empleadoId: string;
  completada: boolean;
  aceptada: boolean;
  cambioSolicitado: boolean;
  diasIdeales: string[] | null;
  diasPrioritarios: string[] | null;
  diasAlternativos: string[] | null;
  propuestaIA: Record<string, unknown> | null;
  propuestaEmpleado: Record<string, unknown> | null;
  empleado: Empleado;
}

interface CampanaData {
  id: string;
  titulo: string;
  estado: string;
  fechaInicioObjetivo: string;
  fechaFinObjetivo: string;
  totalEmpleadosAsignados: number;
  empleadosCompletados: number;
  propuestaIA: Record<string, unknown> | null;
  preferencias: Preferencia[];
}

interface CampanaClientProps {
  campana: CampanaData;
}

export function CampanaClient({ campana: initialCampana }: CampanaClientProps) {
  const [campana, setCampana] = useState(initialCampana);
  const [cuadrandoIA, setCuadrandoIA] = useState(false);
  const borradorInicial = Boolean(initialCampana.propuestaIA);
  const [mostrarPropuesta, setMostrarPropuesta] = useState(borradorInicial);
  const [vistaComparacion, setVistaComparacion] = useState<'solicitado' | 'propuesto'>(
    borradorInicial ? 'propuesto' : 'solicitado'
  );
  const [enviandoPropuesta, setEnviandoPropuesta] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const recargarCampana = async () => {
    const reloadResponse = await fetch(`/api/campanas-vacaciones/${campana.id}`);
    if (!reloadResponse.ok) {
      const error = await reloadResponse.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(error.error || 'No se pudo recargar la campaña');
    }
    const updatedCampana = await reloadResponse.json();
    setCampana(updatedCampana);
    const hayBorrador = Boolean(updatedCampana.propuestaIA);
    setMostrarPropuesta(hayBorrador);
    setVistaComparacion(hayBorrador ? 'propuesto' : 'solicitado');
    return updatedCampana;
  };

  const handleCuadrarIA = async () => {
    setCuadrandoIA(true);
    try {
      const response = await fetch(`/api/campanas-vacaciones/${campana.id}/cuadrar`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || 'No se pudo cuadrar con IA');
      }

      // Reload campaign data to get updated propuestas
      await recargarCampana();

      toast.success('Vacaciones cuadradas con IA exitosamente');
    } catch (error) {
      console.error('[CuadrarIA] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cuadrar con IA');
    } finally {
      setCuadrandoIA(false);
    }
  };

  const handleReintentarIA = async () => {
    setMostrarPropuesta(false);
    await handleCuadrarIA();
  };

  const handleEnviarPropuesta = async () => {
    setEnviandoPropuesta(true);
    try {
      const response = await fetch(`/api/campanas-vacaciones/${campana.id}/enviar-propuesta`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || 'No se pudo enviar la propuesta');
      }

      toast.success('Propuesta enviada a los empleados');
      
      await recargarCampana();
    } catch (error) {
      console.error('[EnviarPropuesta] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al enviar propuesta');
    } finally {
      setEnviandoPropuesta(false);
    }
  };

  const handleFinalizarCampana = async () => {
    if (!confirm('¿Finalizar la campaña y crear las ausencias? Esta acción no se puede deshacer.')) {
      return;
    }

    setFinalizando(true);
    try {
      const response = await fetch(`/api/campanas-vacaciones/${campana.id}/finalizar`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || 'No se pudo finalizar la campaña');
      }

      toast.success('Campaña finalizada y ausencias creadas');
      
      // Redirect back to ausencias page
      window.location.href = '/hr/horario/ausencias';
    } catch (error) {
      console.error('[FinalizarCampana] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al finalizar campaña');
    } finally {
      setFinalizando(false);
    }
  };

  const handleCancelarPropuesta = async () => {
    setCancelando(true);
    try {
      const response = await fetch(
        `/api/campanas-vacaciones/${campana.id}/propuestas/cancelar`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || 'No se pudo cancelar la propuesta');
      }

      await recargarCampana();
      toast.success('Borrador cancelado correctamente');
    } catch (error) {
      console.error('[CancelarPropuesta] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cancelar propuesta');
    } finally {
      setCancelando(false);
    }
  };

  const fechaInicio = new Date(campana.fechaInicioObjetivo + 'T00:00:00');
  const fechaFin = new Date(campana.fechaFinObjetivo + 'T00:00:00');

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Campaña activa
          </p>
          <h1 className="text-2xl font-bold text-gray-900">Cuadraje de la campaña</h1>
          <p className="text-sm text-gray-600 mt-2 flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">“{campana.titulo}”</span>
            <span className="inline-flex items-center text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              {format(fechaInicio, 'dd MMM', { locale: es })} - {format(fechaFin, 'dd MMM yyyy', { locale: es })}
            </span>
            <span className="text-gray-500">
              {campana.empleadosCompletados}/{campana.totalEmpleadosAsignados} preferencias completadas
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge className="bg-yellow-100 text-yellow-800 border-0">
            En curso
          </Badge>
          <LoadingButton
            onClick={handleCuadrarIA}
            loading={cuadrandoIA}
            disabled={cuadrandoIA}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {cuadrandoIA ? 'Cuadrando...' : 'Cuadrar con IA'}
          </LoadingButton>
        </div>
      </div>

      {/* Comparison Toggle (shown after AI squaring) */}
      {mostrarPropuesta && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-gray-700 font-medium">Vista:</span>
            <p className="text-xs text-gray-500">
              “Solicitado” muestra los días ideales enviados por los empleados. “Propuesto” refleja el borrador generado (IA/ajustes manuales).
            </p>
            <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-gray-50">
              <button
                onClick={() => setVistaComparacion('solicitado')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  vistaComparacion === 'solicitado'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Solicitado (ideales)
              </button>
              <button
                onClick={() => setVistaComparacion('propuesto')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  vistaComparacion === 'propuesto'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Propuesto (IA)
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LoadingButton
              variant="outline"
              size="sm"
              onClick={handleCancelarPropuesta}
              loading={cancelando}
              disabled={cancelando}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </LoadingButton>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReintentarIA}
              disabled={cuadrandoIA}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reintentar
            </Button>
            <LoadingButton
              variant="outline"
              size="sm"
              onClick={handleEnviarPropuesta}
              loading={enviandoPropuesta}
              disabled={enviandoPropuesta}
            >
              <Send className="w-4 h-4 mr-1" />
              Enviar propuesta
            </LoadingButton>
            <LoadingButton
              size="sm"
              onClick={handleFinalizarCampana}
              loading={finalizando}
              disabled={finalizando}
            >
              Finalizar campaña
            </LoadingButton>
          </div>
        </div>
      )}

      <Separator className="mb-6" />

      {/* Calendar Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <TablaCuadrajeCampana
          campana={campana}
          vistaComparacion={mostrarPropuesta ? vistaComparacion : 'solicitado'}
          onActualizarPreferencia={async (preferenciaId, datos) => {
            try {
              const response = await fetch(`/api/campanas-vacaciones/${campana.id}/propuestas`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ajustes: [{
                    preferenciaId,
                    fechaInicio: datos.fechaInicio,
                    fechaFin: datos.fechaFin,
                  }],
                }),
              });

              if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(error.error || 'No se pudo actualizar la preferencia');
              }

              await recargarCampana();
              toast.success('Asignación actualizada correctamente');
            } catch (error) {
              console.error('[ActualizarPreferencia] Error:', error);
              toast.error(error instanceof Error ? error.message : 'Error al actualizar asignación');
              throw error;
            }
          }}
        />
      </div>
    </div>
  );
}

