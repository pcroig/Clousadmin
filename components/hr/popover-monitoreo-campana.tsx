'use client';

// ========================================
// Popover de Monitoreo de Campaña
// ========================================

import { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
// ScrollArea no disponible, usando div con overflow
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Eye, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Sparkles,
  Settings,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useApi } from '@/lib/hooks';
import { getAvatarPlaceholderClasses } from '@/lib/design-system';
import { cn } from '@/lib/utils';

interface Preferencia {
  id: string;
  completada: boolean;
  aceptada: boolean;
  diasIdeales: string[];
  diasPrioritarios: string[];
  diasAlternativos: string[];
  empleado: {
    id: string;
    nombre: string;
    apellidos: string;
    fotoUrl: string | null;
    email: string;
  };
}

interface CampanaDetalle {
  id: string;
  titulo: string;
  estado: string;
  fechaInicioObjetivo: string;
  fechaFinObjetivo: string;
  totalEmpleadosAsignados: number;
  empleadosCompletados: number;
  preferencias: Preferencia[];
  estadisticas: {
    totalEmpleados: number;
    completados: number;
    pendientes: number;
    porcentajeCompletado: number;
  };
}

interface PopoverMonitoreoCampanaProps {
  campanaId: string;
  onCuadrarIA?: (campanaId: string) => void;
  onCuadrarManual?: (campanaId: string) => void;
}

export function PopoverMonitoreoCampana({
  campanaId,
  onCuadrarIA,
  onCuadrarManual,
}: PopoverMonitoreoCampanaProps) {
  const [open, setOpen] = useState(false);
  const { data: campana, loading, execute: refetch } = useApi<CampanaDetalle>();

  useEffect(() => {
    if (open && campanaId) {
      refetch(`/api/campanas-vacaciones/${campanaId}`);
    }
  }, [open, campanaId, refetch]);

  const handleCuadrarIA = async () => {
    if (!campanaId || !onCuadrarIA) return;
    
    try {
      // Llamar a la API para cuadrar
      const response = await fetch(`/api/campanas-vacaciones/${campanaId}/cuadrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cuadrar vacaciones');
      }

      const resultado = await response.json();
      
      // Cerrar popover y notificar al padre
      setOpen(false);
      
      // Mostrar mensaje de éxito
      alert(`✅ Vacaciones cuadradas exitosamente!\n\n${resultado.propuestas?.length || 0} propuestas creadas y notificaciones enviadas a los empleados.`);
      
      if (onCuadrarIA) {
        onCuadrarIA(campanaId);
      }
    } catch (error) {
      console.error('[Monitoreo] Error al cuadrar con IA:', error);
      alert('❌ Error al cuadrar vacaciones: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  const handleCuadrarManual = () => {
    setOpen(false);
    if (onCuadrarManual) {
      onCuadrarManual(campanaId);
    }
  };

  const preferenciasCompletadas = campana?.preferencias.filter(p => p.completada) || [];
  const preferenciasPendientes = campana?.preferencias.filter(p => !p.completada) || [];

  const formatFecha = (fechaStr: string) => {
    try {
      return format(new Date(fechaStr), 'dd MMM yyyy', { locale: es });
    } catch {
      return fechaStr;
    }
  };

  const getIniciales = (nombre: string, apellidos: string) => {
    return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  };

  const formatDias = (dias: string[] | null | undefined) => {
    if (!dias || dias.length === 0) return 'Sin fechas';
    
    if (dias.length <= 3) {
      return dias.map(f => formatFecha(f)).join(', ');
    }
    
    return `${dias.slice(0, 3).map(f => formatFecha(f)).join(', ')} (+${dias.length - 3} más)`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="w-4 h-4" />
          Monitorear
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[520px] p-0 shadow-lg border border-gray-200" align="end">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-600">Cargando...</span>
          </div>
        ) : !campana ? (
          <div className="flex items-center justify-center p-8 text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="text-sm">Error al cargar la campaña</span>
          </div>
        ) : (
          <div className="flex flex-col max-h-[600px]">
            {/* Header */}
            <div className="p-5 border-b border-gray-200 bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">{campana.titulo}</h3>
                  <p className="text-sm text-gray-600">
                    <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                    {formatFecha(campana.fechaInicioObjetivo)} - {formatFecha(campana.fechaFinObjetivo)}
                  </p>
                </div>
                <Badge 
                  className={
                    campana.estado === 'abierta' 
                      ? 'bg-blue-100 text-blue-800 border-0'
                      : campana.estado === 'cuadrada'
                      ? 'bg-green-100 text-green-800 border-0'
                      : 'bg-gray-100 text-gray-800 border-0'
                  }
                >
                  {campana.estado === 'abierta' ? 'En curso' : campana.estado}
                </Badge>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-2.5 mt-3">
                <div className="text-center p-2.5 bg-white rounded-lg border border-gray-200">
                  <div className="text-xl font-semibold text-gray-900">
                    {campana.estadisticas.totalEmpleados}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Total</div>
                </div>
                <div className="text-center p-2.5 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xl font-semibold text-green-700">
                    {campana.estadisticas.completados}
                  </div>
                  <div className="text-xs text-green-600 mt-0.5">Completados</div>
                </div>
                <div className="text-center p-2.5 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-xl font-semibold text-yellow-700">
                    {campana.estadisticas.pendientes}
                  </div>
                  <div className="text-xs text-yellow-600 mt-0.5">Pendientes</div>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${campana.estadisticas.porcentajeCompletado}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1.5 text-center font-medium">
                  {campana.estadisticas.porcentajeCompletado}% completado
                </p>
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto max-h-[300px]">
              <div className="p-5 space-y-4">
                {/* Completados */}
                {preferenciasCompletadas.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <h4 className="font-medium text-sm text-gray-900">
                          Completados ({preferenciasCompletadas.length})
                        </h4>
                      </div>
                      <div className="space-y-2.5">
                        {preferenciasCompletadas.map((pref) => (
                          <div
                            key={pref.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                          >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={pref.empleado.fotoUrl || undefined} />
                            <AvatarFallback
                              className={cn(
                                getAvatarPlaceholderClasses(
                                  `${pref.empleado.nombre} ${pref.empleado.apellidos}`
                                ),
                                'text-xs font-medium'
                              )}
                            >
                              {getIniciales(pref.empleado.nombre, pref.empleado.apellidos)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {pref.empleado.nombre} {pref.empleado.apellidos}
                            </p>
                            <div className="mt-1 space-y-1">
                              {pref.diasIdeales && pref.diasIdeales.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <Calendar className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs text-gray-600">
                                    <strong>Ideales:</strong> {formatDias(pref.diasIdeales as string[])}
                                  </span>
                                </div>
                              )}
                              {pref.diasPrioritarios && pref.diasPrioritarios.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <Calendar className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs text-gray-600">
                                    <strong>Prioritarios:</strong> {formatDias(pref.diasPrioritarios as string[])}
                                  </span>
                                </div>
                              )}
                              {pref.diasAlternativos && pref.diasAlternativos.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <Calendar className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs text-gray-600">
                                    <strong>Alternativos:</strong> {formatDias(pref.diasAlternativos as string[])}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pendientes */}
                {preferenciasPendientes.length > 0 && (
                    <div>
                      {preferenciasCompletadas.length > 0 && <Separator className="my-4 bg-gray-200" />}
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <h4 className="font-medium text-sm text-gray-900">
                          Pendientes ({preferenciasPendientes.length})
                        </h4>
                      </div>
                      <div className="space-y-2.5">
                        {preferenciasPendientes.map((pref) => (
                          <div
                            key={pref.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-colors"
                          >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={pref.empleado.fotoUrl || undefined} />
                            <AvatarFallback
                              className={cn(
                                getAvatarPlaceholderClasses(
                                  `${pref.empleado.nombre} ${pref.empleado.apellidos}`
                                ),
                                'text-xs font-medium'
                              )}
                            >
                              {getIniciales(pref.empleado.nombre, pref.empleado.apellidos)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {pref.empleado.nombre} {pref.empleado.apellidos}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Esperando respuesta...
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="p-5 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2.5">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={handleCuadrarIA}
                  disabled={preferenciasPendientes.length > 0 || campana.estado !== 'abierta'}
                >
                  <Sparkles className="w-4 h-4" />
                  Cuadrar con IA
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-2 border-gray-300"
                  onClick={handleCuadrarManual}
                  disabled={preferenciasPendientes.length > 0 || campana.estado !== 'abierta'}
                >
                  <Settings className="w-4 h-4" />
                  Cuadrar Manual
                </Button>
              </div>
              {preferenciasPendientes.length > 0 ? (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  ⏳ Espera a que todos completen sus preferencias
                </p>
              ) : campana.estado === 'abierta' ? (
                <p className="text-xs text-green-600 mt-3 text-center font-medium">
                  ✓ Todos completaron. Ya puedes cuadrar las vacaciones
                </p>
              ) : null}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

