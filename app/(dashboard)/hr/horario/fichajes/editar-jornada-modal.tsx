'use client';

// ========================================
// Modal Editar/Crear Jornada con Asignaciones
// ========================================

import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';


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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  // Estados del formulario de jornada
  const [nombre, setNombre] = useState('');
  const [tipoJornada, setTipoJornada] = useState<'fija' | 'flexible'>('flexible');
  const [horasSemanales, setHorasSemanales] = useState('40');
  const [limiteInferior, setLimiteInferior] = useState('');
  const [limiteSuperior, setLimiteSuperior] = useState('');
  const [horariosFijos, setHorariosFijos] = useState<Record<string, HorarioDia>>({
    lunes: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '', pausa_fin: '' },
    martes: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '', pausa_fin: '' },
    miercoles: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '', pausa_fin: '' },
    jueves: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '', pausa_fin: '' },
    viernes: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '', pausa_fin: '' },
    sabado: { activo: false, entrada: '', salida: '', pausa_inicio: '', pausa_fin: '' },
    domingo: { activo: false, entrada: '', salida: '', pausa_inicio: '', pausa_fin: '' },
  });
  const [usarDescanso, setUsarDescanso] = useState(false);
  const [descansoFlexible, setDescansoFlexible] = useState<string>('');

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
        setNombre(jornada.nombre);
        setHorasSemanales(jornada.horasSemanales.toString());
        
        const config = jornada.config;
        const esFija = DIA_KEYS.some((dia) => {
          const diaConfig = getDiaConfig(config, dia);
          return Boolean(diaConfig?.entrada && diaConfig?.salida);
        });
        setTipoJornada(esFija ? 'fija' : 'flexible');

        setHorariosFijos(prevState => {
          const newState = { ...prevState };

          DIA_KEYS.forEach((dia) => {
            const diaConfig = getDiaConfig(config, dia);
            if (diaConfig) {
              if (esFija) {
                newState[dia] = {
                  ...newState[dia],
                  activo: diaConfig.activo ?? true,
                  entrada: diaConfig.entrada ?? newState[dia].entrada,
                  salida: diaConfig.salida ?? newState[dia].salida,
                  pausa_inicio: diaConfig.pausa_inicio,
                  pausa_fin: diaConfig.pausa_fin,
                };
              } else {
                newState[dia] = {
                  ...newState[dia],
                  activo: Boolean(diaConfig.activo),
                };
              }
            } else {
              newState[dia] = {
                ...newState[dia],
                activo: dia !== 'sabado' && dia !== 'domingo',
              };
            }
          });

          return newState;
        });

        if (esFija) {
          const algunDiaConPausa = DIA_KEYS.some((dia) => {
            const diaConfig = getDiaConfig(config, dia);
            return Boolean(diaConfig?.pausa_inicio && diaConfig?.pausa_fin);
          });
          setUsarDescanso(Boolean(algunDiaConPausa));
          setDescansoFlexible('');
        } else {
          setUsarDescanso(false);
          const descansoMinimo =
            typeof config?.descansoMinimo === 'string' ? config.descansoMinimo : '';
          setDescansoFlexible(descansoMinimo);
        }
        
        setLimiteInferior(config?.limiteInferior || '');
        setLimiteSuperior(config?.limiteSuperior || '');
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
        const data = await response.json();
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
        const data = await response.json();
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
    setNombre('');
    setTipoJornada('flexible');
    setHorasSemanales('40');
    setLimiteInferior('');
    setLimiteSuperior('');
    setUsarDescanso(false);
    setDescansoFlexible('');
    setNivelAsignacion('empresa');
    setEmpleadosSeleccionados([]);
    setErrors({});
  }

  function validarFormulario(): boolean {
    const newErrors: Record<string, string> = {};
    
    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }
    
    if (!horasSemanales || parseFloat(horasSemanales) <= 0) {
      newErrors.horasSemanales = 'Las horas semanales deben ser mayores a 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

    async function verificarJornadasPrevias(jornadaId: string) {
    try {
      let url = `/api/jornadas/verificar-previas?nivel=${nivelAsignacion}`;
      
      if (nivelAsignacion === 'equipo' && equipoSeleccionado) {
        url += `&equipoIds=${equipoSeleccionado}`;
      } else if (nivelAsignacion === 'individual' && empleadosSeleccionados.length > 0) {
        url += `&empleadoIds=${empleadosSeleccionados.join(',')}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
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
      
      if (tipoJornada === 'fija') {
        DIA_KEYS.forEach((dia) => {
          const horario = horariosFijos[dia];
          config[dia] = usarDescanso
            ? horario
            : { activo: horario.activo, entrada: horario.entrada, salida: horario.salida };
        });
      } else {
        // Jornada flexible: todos los días activos sin horario específico
        DIA_KEYS.forEach((dia) => {
          const estadoDia = horariosFijos[dia];
          config[dia] = { activo: estadoDia?.activo ?? false };
        });

        if (descansoFlexible) {
          config.descansoMinimo = descansoFlexible;
        }
      }

      if (limiteInferior) config.limiteInferior = limiteInferior;
      if (limiteSuperior) config.limiteSuperior = limiteSuperior;
      config.tipo = tipoJornada;

      // Crear o actualizar jornada
      const url = modo === 'crear' ? '/api/jornadas' : `/api/jornadas/${jornada?.id}`;                                                                          
      const method = modo === 'crear' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          tipo: tipoJornada,
          horasSemanales: parseFloat(horasSemanales),
          config,
          limiteInferior: limiteInferior || undefined,
          limiteSuperior: limiteSuperior || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || `Error al ${modo === 'crear' ? 'crear' : 'actualizar'} jornada`);                                                            
        setCargando(false);
        return;
      }

      const jornadaGuardada = await response.json();

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
        const error = await response.json();
        toast.error(error.error || 'Error al eliminar jornada');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar jornada');
    } finally {
      setCargando(false);
    }
  }

  function toggleEmpleado(empleadoId: string) {
    setEmpleadosSeleccionados(prev =>
      prev.includes(empleadoId)
        ? prev.filter(id => id !== empleadoId)
        : [...prev, empleadoId]
    );
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

        <FieldGroup className="space-y-3">
          {/* Información de la jornada */}
          <Field>
            <FieldLabel htmlFor="nombre">Nombre de la jornada *</FieldLabel>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Jornada Completa 40h"
              aria-invalid={!!errors.nombre}
              disabled={esPredefinida}
            />
            {errors.nombre && <FieldError>{errors.nombre}</FieldError>}
            <FieldDescription>Nombre identificativo de la jornada laboral</FieldDescription>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="tipo">Tipo de jornada</FieldLabel>
              <Select
                value={tipoJornada}
                onValueChange={(v) => {
                  setTipoJornada(v as 'fija' | 'flexible');
                  if (v === 'fija') {
                    setDescansoFlexible('');
                  }
                }}
                disabled={esPredefinida}
              >
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="fija">Fija</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {tipoJornada === 'fija' ? 'Horarios específicos por día' : 'Solo cuenta horas semanales'}
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="horas">Horas semanales *</FieldLabel>
              <Input
                id="horas"
                type="number"
                value={horasSemanales}
                onChange={(e) => setHorasSemanales(e.target.value)}
                placeholder="40"
                aria-invalid={!!errors.horasSemanales}
                disabled={esPredefinida}
              />
              {errors.horasSemanales && <FieldError>{errors.horasSemanales}</FieldError>}
            </Field>
          </div>

          {/* Asignación */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-base font-semibold text-gray-900 mb-3">¿A quién aplicar esta jornada?</h3>
            
            <Field>
              <Select 
                value={nivelAsignacion} 
                onValueChange={(v) => setNivelAsignacion(v as 'empresa' | 'equipo' | 'individual')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Toda la empresa</SelectItem>
                  <SelectItem value="equipo">Un equipo concreto</SelectItem>
                  <SelectItem value="individual">Empleados específicos</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {nivelAsignacion === 'empresa' 
                  ? 'Se asignará a todos los empleados de la empresa' 
                  : nivelAsignacion === 'equipo'
                  ? 'Selecciona un equipo para asignar su jornada a todos sus miembros'
                  : 'Selecciona empleados específicos'}
              </FieldDescription>
            </Field>

            {nivelAsignacion === 'equipo' && (
              <Field className="mt-3">
                <FieldLabel>Seleccionar equipo</FieldLabel>
                <Select value={equipoSeleccionado} onValueChange={setEquipoSeleccionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipos.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.nombre} ({eq.miembros})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {nivelAsignacion === 'individual' && (
              <Field className="mt-3">
                <FieldLabel>Seleccionar empleados</FieldLabel>
                <div className="border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto mt-2">
                  {empleados.map(empleado => (
                    <div key={empleado.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={empleadosSeleccionados.includes(empleado.id)}
                        onCheckedChange={() => toggleEmpleado(empleado.id)}
                      />
                      <span className="text-sm">{empleado.nombre} {empleado.apellidos}</span>
                    </div>
                  ))}
                </div>
                <FieldDescription>
                  {empleadosSeleccionados.length} empleado{empleadosSeleccionados.length !== 1 ? 's' : ''} seleccionado{empleadosSeleccionados.length !== 1 ? 's' : ''}
                </FieldDescription>
              </Field>
            )}
          </div>

          {/* Días de la semana - SIEMPRE VISIBLE */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Días laborables</h3>
            <FieldLabel>Días de la semana</FieldLabel>
            <div className="flex gap-2 mt-3">
              {[
                { key: 'lunes', label: 'Lun', configKey: 'lunes' },
                { key: 'martes', label: 'Mar', configKey: 'martes' },
                { key: 'miercoles', label: 'Mie', configKey: 'miercoles' },
                { key: 'jueves', label: 'Jue', configKey: 'jueves' },
                { key: 'viernes', label: 'Vie', configKey: 'viernes' },
                { key: 'sabado', label: 'Sab', configKey: 'sabado' },
                { key: 'domingo', label: 'Dom', configKey: 'domingo' },
              ].map((dia) => {
                const horarioDia = horariosFijos[dia.configKey as keyof typeof horariosFijos];
                const activo = horarioDia?.activo ?? false;
                
                return (
                  <button
                    key={dia.key}
                    type="button"
                    onClick={() => {
                      if (!esPredefinida) {
                        setHorariosFijos(prev => ({
                          ...prev,
                          [dia.configKey]: { 
                            ...prev[dia.configKey as keyof typeof prev], 
                            activo: !activo 
                          },
                        }));
                      }
                    }}
                    disabled={esPredefinida}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activo
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${esPredefinida ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {dia.label}
                  </button>
                );
              })}
            </div>
            {tipoJornada === 'flexible' && (
              <FieldDescription className="mt-2">
                Los días marcados son laborables. El empleado distribuirá las horas semanales libremente en estos días.
              </FieldDescription>
            )}
          </div>

          {/* Pausa mínima - UNIFICADO para ambos tipos */}
          {!esPredefinida && (
            <Field className="mt-3">
              <FieldLabel htmlFor="descanso">Tiempo de descanso (opcional)</FieldLabel>
              <Input
                id="descanso"
                type="time"
                step={60}
                value={tipoJornada === 'flexible' ? descansoFlexible : (usarDescanso && horariosFijos.lunes?.pausa_inicio) || ''}
                onChange={(e) => {
                  if (tipoJornada === 'flexible') {
                    setDescansoFlexible(e.target.value);
                  } else {
                    // Para jornadas fijas, aplicar el mismo descanso a todos los días
                    setUsarDescanso(!!e.target.value);
                    if (e.target.value) {
                      const [h, m] = e.target.value.split(':');
                      const pausaInicio = '14:00'; // Hora por defecto para inicio de pausa
                      const pausaFin = `${(parseInt(h) + 14).toString().padStart(2, '0')}:${m}`;
                      
                      Object.keys(horariosFijos).forEach(dia => {
                        if (horariosFijos[dia as keyof typeof horariosFijos]?.activo) {
                          setHorariosFijos(prev => ({
                            ...prev,
                            [dia]: {
                              ...prev[dia as keyof typeof prev],
                              pausa_inicio: pausaInicio,
                              pausa_fin: pausaFin,
                            },
                          }));
                        }
                      });
                    }
                  }
                }}
                placeholder="00:30"
              />
              <FieldDescription>
                {tipoJornada === 'flexible' 
                  ? 'Descanso mínimo obligatorio que se tendrá en cuenta al cuadrar fichajes y calcular balances.'
                  : 'Tiempo de descanso que se aplicará a todos los días laborables (de 14:00 a la hora correspondiente).'}
              </FieldDescription>
            </Field>
          )}

          {/* Horarios específicos (solo si es tipo fija) */}
          {tipoJornada === 'fija' && !esPredefinida && (
            <div className="mt-3">
              <FieldLabel>Horarios por día</FieldLabel>
                <div className="space-y-3 mt-3">
                  {Object.entries(horariosFijos)
                    .filter(([_, horario]) => horario.activo)
                    .map(([dia, horario]) => (
                    <div key={dia} className="flex items-center gap-4">
                      <span className="w-24 capitalize text-sm">{dia}</span>
                      <Input
                        type="time"
                        value={horario.entrada}
                        onChange={(e) => {
                          setHorariosFijos(prev => ({
                            ...prev,
                            [dia]: { ...prev[dia as keyof typeof prev], entrada: e.target.value },
                          }));
                        }}
                        className="w-32"
                      />
                      <span className="text-gray-400">-</span>
                      <Input
                        type="time"
                        value={horario.salida}
                        onChange={(e) => {
                          setHorariosFijos(prev => ({
                            ...prev,
                            [dia]: { ...prev[dia as keyof typeof prev], salida: e.target.value },
                          }));
                        }}
                        className="w-32"
                      />
                    </div>
                  ))}
                </div>
            </div>
          )}

          {/* Límites de fichaje */}
          {!esPredefinida && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="limiteInferior">Límite inferior</FieldLabel>
                  <Input
                    id="limiteInferior"
                    type="time"
                    value={limiteInferior}
                    onChange={(e) => setLimiteInferior(e.target.value)}
                    placeholder="08:00"
                  />
                  <FieldDescription>Hora mínima de fichaje</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="limiteSuperior">Límite superior</FieldLabel>
                  <Input
                    id="limiteSuperior"
                    type="time"
                    value={limiteSuperior}
                    onChange={(e) => setLimiteSuperior(e.target.value)}
                    placeholder="20:00"
                  />
                  <FieldDescription>Hora máxima de fichaje</FieldDescription>
                </Field>
              </div>
            </div>
          )}
        </FieldGroup>

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



