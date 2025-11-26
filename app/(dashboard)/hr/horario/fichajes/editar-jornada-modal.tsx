'use client';

// ========================================
// Modal Editar/Crear Jornada con Asignaciones
// ========================================

import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  type JornadaFormData,
  JornadaFormFields,
} from '@/components/shared/jornada-form-fields';
import { LoadingButton } from '@/components/shared/loading-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { extractArrayFromResponse } from '@/lib/utils/api-response';

import type { DiaConfig, JornadaConfig } from '@/lib/calculos/fichajes-helpers';

type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

const DIA_KEYS: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const isDiaConfig = (value: unknown): value is DiaConfig =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDiaConfig = (
  config: JornadaConfig | null | undefined,
  dia: DiaKey
): DiaConfig | undefined => {
  if (!config) return undefined;
  const value = config[dia];
  return isDiaConfig(value) ? value : undefined;
};

export interface JornadaDetalle {
  id: string;
  nombre: string;
  horasSemanales: number;
  config: JornadaConfig | null;
  esPredefinida?: boolean;
}

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
}

interface HorarioDia {
  activo: boolean;
  entrada: string;
  salida: string;
  pausa_inicio?: string;
  pausa_fin?: string;
}

interface EditarJornadaModalProps {
  open: boolean;
  modo: 'crear' | 'editar';
  jornada: JornadaDetalle | null;
  onClose: () => void;
}

export function EditarJornadaModal({ open, modo, jornada, onClose }: EditarJornadaModalProps) {
  // Estados del formulario unificado
  const [formData, setFormData] = useState<JornadaFormData>({
    nombre: '',
    tipoJornada: 'flexible',
    horasSemanales: '40',
    limiteInferior: '',
    limiteSuperior: '',
    horariosFijos: {
      lunes: { activo: true, entrada: '09:00', salida: '18:00' },
      martes: { activo: true, entrada: '09:00', salida: '18:00' },
      miercoles: { activo: true, entrada: '09:00', salida: '18:00' },
      jueves: { activo: true, entrada: '09:00', salida: '18:00' },
      viernes: { activo: true, entrada: '09:00', salida: '18:00' },
      sabado: { activo: false, entrada: '', salida: '' },
      domingo: { activo: false, entrada: '', salida: '' },
    },
    descansoMinutos: '',
  });

  // Estados de asignación
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [nivelAsignacion, setNivelAsignacion] = useState<'empresa' | 'equipo' | 'individual'>('empresa');
  const [equipos, setEquipos] = useState<{ id: string; nombre: string; miembros: number }[]>([]);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<string>('');
  
  // Estados de UI
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mostrarAlertaJornadas, setMostrarAlertaJornadas] = useState(false);
  const [jornadasPreviasInfo, setJornadasPreviasInfo] = useState<{
    tieneJornadas: boolean;
    jornadas: Array<{ nombre: string; cantidad: number }>;
    nivel: 'empresa' | 'equipo' | 'individual';
    jornadaId: string;
  } | null>(null);

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (open) {
      if (modo === 'editar' && jornada) {
        // Cargar datos de la jornada
        const config = jornada.config;
        const esFija = DIA_KEYS.some((dia) => {
          const diaConfig = getDiaConfig(config, dia);
          return Boolean(diaConfig?.entrada && diaConfig?.salida);
        });

        const newHorariosFijos: Record<string, HorarioDia> = {};
        DIA_KEYS.forEach((dia) => {
          const diaConfig = getDiaConfig(config, dia);
          if (diaConfig) {
            newHorariosFijos[dia] = {
              activo: diaConfig.activo ?? true,
              entrada: diaConfig.entrada ?? '09:00',
              salida: diaConfig.salida ?? '18:00',
            };
          } else {
            newHorariosFijos[dia] = {
              activo: dia !== 'sabado' && dia !== 'domingo',
              entrada: '09:00',
              salida: '18:00',
            };
          }
        });

        // Calcular minutos de descanso desde pausa_inicio y pausa_fin
        let descansoMinutos = '';
        if (esFija) {
          const primerDiaConPausa = DIA_KEYS.find((dia) => {
            const diaConfig = getDiaConfig(config, dia);
            return Boolean(diaConfig?.pausa_inicio && diaConfig?.pausa_fin);
          });
          if (primerDiaConPausa) {
            const diaConfig = getDiaConfig(config, primerDiaConPausa);
            if (diaConfig?.pausa_inicio && diaConfig?.pausa_fin) {
              const [h1, m1] = diaConfig.pausa_inicio.split(':').map(Number);
              const [h2, m2] = diaConfig.pausa_fin.split(':').map(Number);
              const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
              descansoMinutos = minutos.toString();
            }
          }
        } else {
          const descansoMinimo = typeof config?.descansoMinimo === 'string' ? config.descansoMinimo : '';
          if (descansoMinimo) {
            const [h, m] = descansoMinimo.split(':').map(Number);
            descansoMinutos = (h * 60 + m).toString();
          }
        }

        setFormData({
          nombre: jornada.nombre,
          tipoJornada: esFija ? 'fija' : 'flexible',
          horasSemanales: jornada.horasSemanales.toString(),
          limiteInferior: config?.limiteInferior || '',
          limiteSuperior: config?.limiteSuperior || '',
          horariosFijos: newHorariosFijos,
          descansoMinutos,
        });
      } else {
        // Limpiar formulario para crear
        limpiarFormulario();
      }
      
      cargarEmpleados();
      cargarEquipos();
    }
  }, [open, modo, jornada]);

  async function cargarEmpleados() {
    try {
      const response = await fetch('/api/empleados');
      if (response.ok) {
        const data = await response.json() as Record<string, any>;
        setEmpleados(
          extractArrayFromResponse<{ id: string; nombre: string; apellidos: string }>(data, {
            key: 'empleados',
          })
        );
      }
    } catch (error: unknown) {
      console.error('Error cargando empleados:', error);
    }
  }

  async function cargarEquipos() {
    try {
      const response = await fetch('/api/organizacion/equipos');
      if (response.ok) {
        const data = await response.json() as Record<string, any>;
        setEquipos(
          (data || []).map((equipo: { id: string; nombre: string; _count?: { miembros?: number } }) => ({
            id: equipo.id,
            nombre: equipo.nombre,
            miembros: equipo._count?.miembros ?? 0,
          }))
        );
      }
    } catch (error: unknown) {
      console.error('Error cargando equipos:', error);
    }
  }

  function limpiarFormulario() {
    setFormData({
      nombre: '',
      tipoJornada: 'flexible',
      horasSemanales: '40',
      limiteInferior: '',
      limiteSuperior: '',
      horariosFijos: {
        lunes: { activo: true, entrada: '09:00', salida: '18:00' },
        martes: { activo: true, entrada: '09:00', salida: '18:00' },
        miercoles: { activo: true, entrada: '09:00', salida: '18:00' },
        jueves: { activo: true, entrada: '09:00', salida: '18:00' },
        viernes: { activo: true, entrada: '09:00', salida: '18:00' },
        sabado: { activo: false, entrada: '', salida: '' },
        domingo: { activo: false, entrada: '', salida: '' },
      },
      descansoMinutos: '',
    });
    setNivelAsignacion('empresa');
    setEmpleadosSeleccionados([]);
    setEquipoSeleccionado('');
    setErrors({});
  }

  function validarFormulario(): boolean {
    const newErrors: Record<string, string> = {};
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }
    
    if (!formData.horasSemanales || parseFloat(formData.horasSemanales) <= 0) {
      newErrors.horasSemanales = 'Las horas semanales deben ser mayores a 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

    async function verificarJornadasPrevias(_jornadaId: string) {
    try {
      let url = `/api/jornadas/verificar-previas?nivel=${nivelAsignacion}`;
      
      if (nivelAsignacion === 'equipo' && equipoSeleccionado) {
        url += `&equipoIds=${equipoSeleccionado}`;
      } else if (nivelAsignacion === 'individual' && empleadosSeleccionados.length > 0) {
        url += `&empleadoIds=${empleadosSeleccionados.join(',')}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json() as Record<string, any>;
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error verificando jornadas previas:', error);
      return null;
    }
  }

  async function realizarAsignacion(jornadaId: string) {
    try {
      if (nivelAsignacion === 'individual' && empleadosSeleccionados.length > 0) {
        await fetch('/api/jornadas/asignar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jornadaId: jornadaId,
            nivel: 'individual',
            empleadoIds: empleadosSeleccionados,
          }),
        });
      } else if (nivelAsignacion === 'equipo' && equipoSeleccionado) {
        await fetch('/api/jornadas/asignar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jornadaId: jornadaId,
            nivel: 'equipo',
            equipoIds: [equipoSeleccionado],
          }),
        });
      } else if (nivelAsignacion === 'empresa') {
        // Asignar a toda la empresa
        await fetch('/api/jornadas/asignar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jornadaId: jornadaId,
            nivel: 'empresa',
          }),
        });
      }
      return true;
    } catch (error) {
      console.error('Error asignando jornada:', error);
      return false;
    }
  }

  async function handleGuardar() {
    if (!validarFormulario()) return;

    setCargando(true);
    try {
      // Construir configuración
      const config: JornadaConfig = {};
      
      // Convertir minutos de descanso a formato de pausa
      const descansoMinutos = parseInt(formData.descansoMinutos || '0', 10);
      
      if (formData.tipoJornada === 'fija') {
        DIA_KEYS.forEach((dia) => {
          const horario = formData.horariosFijos[dia];
          if (descansoMinutos > 0 && horario.activo) {
            // Calcular pausa_inicio y pausa_fin desde descansoMinutos
            const pausaInicio = '14:00';
            const [h, m] = pausaInicio.split(':').map(Number);
            const totalMinutos = h * 60 + m + descansoMinutos;
            const pausaFin = `${Math.floor(totalMinutos / 60).toString().padStart(2, '0')}:${(totalMinutos % 60).toString().padStart(2, '0')}`;
            
            config[dia] = {
              activo: horario.activo,
              entrada: horario.entrada,
              salida: horario.salida,
              pausa_inicio: pausaInicio,
              pausa_fin: pausaFin,
            };
          } else {
            config[dia] = {
              activo: horario.activo,
              entrada: horario.entrada,
              salida: horario.salida,
            };
          }
        });
      } else {
        // Jornada flexible: todos los días activos sin horario específico
        DIA_KEYS.forEach((dia) => {
          const estadoDia = formData.horariosFijos[dia];
          config[dia] = { activo: estadoDia?.activo ?? false };
        });

        if (descansoMinutos > 0) {
          // Convertir minutos a formato HH:MM
          const horas = Math.floor(descansoMinutos / 60);
          const minutos = descansoMinutos % 60;
          config.descansoMinimo = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        }
      }

      if (formData.limiteInferior) config.limiteInferior = formData.limiteInferior;
      if (formData.limiteSuperior) config.limiteSuperior = formData.limiteSuperior;
      config.tipo = formData.tipoJornada;

      // Crear o actualizar jornada
      const url = modo === 'crear' ? '/api/jornadas' : `/api/jornadas/${jornada?.id}`;                                                                          
      const method = modo === 'crear' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          tipo: formData.tipoJornada,
          horasSemanales: parseFloat(formData.horasSemanales),
          config,
          limiteInferior: formData.limiteInferior || undefined,
          limiteSuperior: formData.limiteSuperior || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as Record<string, any>;
        toast.error(error.error || `Error al ${modo === 'crear' ? 'crear' : 'actualizar'} jornada`);                                                            
        setCargando(false);
        return;
      }

      const jornadaGuardada = await response.json() as Record<string, any>;

      // Verificar si hay asignación y si hay jornadas previas
      const debeAsignar = (nivelAsignacion === 'individual' && empleadosSeleccionados.length > 0) ||
                         (nivelAsignacion === 'equipo' && equipoSeleccionado) ||
                         nivelAsignacion === 'empresa';

      if (debeAsignar) {
        // Verificar jornadas previas antes de asignar
        const previasInfo = await verificarJornadasPrevias(jornadaGuardada.id);
        
        if (previasInfo?.tieneJornadasPrevias && previasInfo.jornadas.length > 0) {
          // Mostrar alerta de confirmación
          setJornadasPreviasInfo({
            tieneJornadas: true,
            jornadas: previasInfo.jornadas,
            nivel: nivelAsignacion,
            jornadaId: jornadaGuardada.id,
          });
          setMostrarAlertaJornadas(true);
          setCargando(false);
          return;
        } else {
          // No hay jornadas previas, asignar directamente
          const asignado = await realizarAsignacion(jornadaGuardada.id);
          if (!asignado) {
            toast.error('Error al asignar la jornada');
            setCargando(false);
            return;
          }
        }
      }

      toast.success(`Jornada ${modo === 'crear' ? 'creada' : 'actualizada'} exitosamente`);                                                                     
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Error al ${modo === 'crear' ? 'crear' : 'actualizar'} jornada`);                                                                             
    } finally {
      setCargando(false);
    }
  }

  async function handleConfirmarAsignacion() {
    if (!jornadasPreviasInfo) return;

    setCargando(true);
    try {
      const asignado = await realizarAsignacion(jornadasPreviasInfo.jornadaId);
      if (asignado) {
        toast.success(`Jornada asignada exitosamente. ${jornadasPreviasInfo.jornadas.length} jornada(s) anterior(es) fueron reemplazadas.`);
        setMostrarAlertaJornadas(false);
        setJornadasPreviasInfo(null);
        onClose();
      } else {
        toast.error('Error al asignar la jornada');
      }
    } catch (error) {
      console.error('Error asignando jornada:', error);
      toast.error('Error al asignar la jornada');
    } finally {
      setCargando(false);
    }
  }

  async function handleEliminar() {
    if (!jornada || !confirm('¿Estás seguro de eliminar esta jornada?')) return;

    setCargando(true);
    try {
      const response = await fetch(`/api/jornadas/${jornada.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Jornada eliminada exitosamente');
        onClose();
      } else {
        const error = await response.json() as Record<string, any>;
        toast.error(error.error || 'Error al eliminar jornada');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar jornada');
    } finally {
      setCargando(false);
    }
  }

  const esPredefinida = jornada?.esPredefinida;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {modo === 'crear' ? 'Nueva Jornada' : `Editar ${jornada?.nombre}`}
          </DialogTitle>
        </DialogHeader>

        <JornadaFormFields
          data={formData}
          onChange={setFormData}
          errors={errors}
          disabled={esPredefinida}
          showAsignacion={true}
          nivelAsignacion={nivelAsignacion}
          onNivelAsignacionChange={setNivelAsignacion}
          empleados={empleados}
          empleadosSeleccionados={empleadosSeleccionados}
          onEmpleadosSeleccionChange={setEmpleadosSeleccionados}
          equipos={equipos}
          equipoSeleccionado={equipoSeleccionado}
          onEquipoSeleccionadoChange={setEquipoSeleccionado}
        />

        <DialogFooter className="gap-2">
          {modo === 'editar' && !esPredefinida && (
            <Button
              variant="destructive"
              onClick={handleEliminar}
              disabled={cargando}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={cargando}>
            Cancelar
          </Button>
          {!esPredefinida && (
            <LoadingButton onClick={handleGuardar} loading={cargando}>
              {modo === 'crear' ? 'Crear Jornada' : 'Guardar Cambios'}
            </LoadingButton>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Alert Dialog para confirmar reemplazo de jornadas previas */}
      <AlertDialog open={mostrarAlertaJornadas} onOpenChange={setMostrarAlertaJornadas}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Jornadas previas detectadas</AlertDialogTitle>
            <AlertDialogDescription>
              {jornadasPreviasInfo?.nivel === 'empresa' && (
                <p className="mb-2">
                  Ya existe una jornada asignada a toda la empresa. Al asignar esta nueva jornada, se reemplazará la jornada anterior.
                </p>
              )}
              {jornadasPreviasInfo?.nivel === 'equipo' && (
                <p className="mb-2">
                  Los empleados del equipo seleccionado ya tienen jornadas asignadas. Al asignar esta nueva jornada, se reemplazarán las jornadas anteriores.
                </p>
              )}
              {jornadasPreviasInfo?.nivel === 'individual' && (
                <p className="mb-2">
                  Los empleados seleccionados ya tienen jornadas asignadas. Al asignar esta nueva jornada, se reemplazarán las jornadas anteriores.
                </p>
              )}
              
              <div className="mt-3">
                <p className="font-medium mb-2">Jornadas que serán reemplazadas:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {jornadasPreviasInfo?.jornadas.map((j, idx) => (
                    <li key={idx}>
                      <strong>{j.nombre}</strong> - {j.cantidad} empleado{j.cantidad !== 1 ? 's' : ''}
                    </li>
                  ))}
                </ul>
              </div>
              
              <p className="mt-4 text-sm font-medium">
                ¿Deseas continuar y reemplazar las jornadas anteriores?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setMostrarAlertaJornadas(false);
              setJornadasPreviasInfo(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarAsignacion} disabled={cargando}>
              {cargando ? 'Asignando...' : 'Sí, reemplazar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}



