'use client';

// ========================================
// Campaña de Vacaciones - Client Component
// ========================================

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Calendar, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TablaCuadrajeCampana } from '@/components/vacaciones/tabla-cuadraje-campana';
import { parseJson } from '@/lib/utils/json';
import Link from 'next/link';

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
  const [enviandoPropuesta, setEnviandoPropuesta] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const hayPropuestaIA = Boolean(campana.propuestaIA);

  const recargarCampana = async () => {
    const reloadResponse = await fetch(`/api/campanas-vacaciones/${campana.id}`);
    if (!reloadResponse.ok) {
      const error = await parseJson<{ error?: string }>(reloadResponse).catch(() => ({
        error: 'Error desconocido',
      }));
      throw new Error(error.error || 'No se pudo recargar la campaña');
    }

    const updatedCampana = await parseJson<CampanaData>(reloadResponse);
    setCampana(updatedCampana);
    return updatedCampana;
  };

  const handleCuadrarIA = async () => {
    setCuadrandoIA(true);
    try {
      const response = await fetch(`/api/campanas-vacaciones/${campana.id}/cuadrar`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => ({
          error: 'Error desconocido',
        }));
        throw new Error(error.error || 'No se pudo cuadrar con IA');
      }

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
    if (!confirm('¿Estás seguro de que quieres reintentar el cuadraje? Se perderán los ajustes manuales actuales.')) {
      return;
    }
    await handleCuadrarIA();
  };

  const handleEnviarPropuesta = async () => {
    setEnviandoPropuesta(true);
    try {
      const response = await fetch(`/api/campanas-vacaciones/${campana.id}/enviar-propuesta`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => ({
          error: 'Error desconocido',
        }));
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
        const error = await parseJson<{ error?: string }>(response).catch(() => ({
          error: 'Error desconocido',
        }));
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
    if (!confirm('¿Estás seguro de que quieres cancelar la propuesta actual?')) {
      return;
    }
    
    setCancelando(true);
    try {
      const response = await fetch(
        `/api/campanas-vacaciones/${campana.id}/propuestas/cancelar`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => ({
          error: 'Error desconocido',
        }));
        throw new Error(error.error || 'No se pudo cancelar la propuesta');
      }

      await recargarCampana();
      toast.success('Propuesta cancelada correctamente');
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
      {/* Header simplificado */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 px-2">
            <Link href="/hr/horario/ausencias" className="inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a ausencias
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campana.titulo}</h1>
            <p className="text-sm text-gray-600 mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                {format(fechaInicio, 'dd MMM', { locale: es })} - {format(fechaFin, 'dd MMM yyyy', { locale: es })}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">
                {campana.empleadosCompletados}/{campana.totalEmpleadosAsignados} preferencias completadas
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hayPropuestaIA ? (
            <>
              <LoadingButton
                variant="outline"
                size="sm"
                onClick={handleCancelarPropuesta}
                loading={cancelando}
                disabled={cancelando}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar propuesta
              </LoadingButton>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReintentarIA}
                disabled={cuadrandoIA}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar IA
              </Button>
            </>
          ) : (
             <LoadingButton
                onClick={handleCuadrarIA}
                loading={cuadrandoIA}
                disabled={cuadrandoIA}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {cuadrandoIA ? 'Cuadrando...' : 'Cuadrar con IA'}
              </LoadingButton>
          )}

          <div className="h-6 w-px bg-gray-300 mx-2" />

          <LoadingButton
            variant="outline"
            size="sm"
            onClick={handleEnviarPropuesta}
            loading={enviandoPropuesta}
            disabled={enviandoPropuesta}
          >
            <Send className="w-4 h-4 mr-2" />
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

      <Separator className="mb-6" />

      {/* Tabla Unificada */}
      <div className="flex-1 min-h-0 overflow-auto">
        <TablaCuadrajeCampana
          campana={campana}
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
                const error = await parseJson<{ error?: string }>(response).catch(() => ({
                  error: 'Error desconocido',
                }));
                throw new Error(error.error || 'No se pudo actualizar la preferencia');
              }

              await recargarCampana();
              toast.success('Asignación actualizada');
            } catch (error) {
              console.error('[ActualizarPreferencia] Error:', error);
              toast.error(error instanceof Error ? error.message : 'Error al actualizar asignación');
              throw error; // Propagate to component to revert local change if needed
            }
          }}
        />
      </div>
    </div>
  );
}
