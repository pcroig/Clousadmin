'use client';

// ========================================
// Jornada Step - Onboarding
// ========================================

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';

import {
  JornadaFormFields,
  type JornadaFormData,
} from '@/components/shared/jornada-form-fields';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { parseJson } from '@/lib/utils/json';
import { type JornadaConfig } from '@/lib/calculos/fichajes-helpers';

// Helper types from existing code
type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
const DIA_KEYS: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const isDiaConfig = (value: unknown): value is { activo: boolean; entrada?: string; salida?: string; pausa_inicio?: string; pausa_fin?: string } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDiaConfig = (
  config: JornadaConfig | null | undefined,
  dia: DiaKey
) => {
  if (!config) return undefined;
  const value = config[dia];
  return isDiaConfig(value) ? value : undefined;
};

export interface JornadaStepHandle {
  guardar: () => Promise<boolean>;
}

interface JornadaStepProps {
  // No props needed for now
}

export const JornadaStep = forwardRef<JornadaStepHandle, JornadaStepProps>(function JornadaStep(_, ref) {
  // Form State
  const [formData, setFormData] = useState<JornadaFormData>({
    nombre: 'Jornada Estándar',
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

  // Data State
  const [empleados, setEmpleados] = useState<Array<{ id: string; nombre: string; apellidos: string }>>([]);
  const [equipos, setEquipos] = useState<Array<{ id: string; nombre: string; miembros: number }>>([]);
  
  // Assignment State
  const [nivelAsignacion, setNivelAsignacion] = useState<'empresa' | 'equipo' | 'individual'>('empresa');
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingJornadaId, setExistingJornadaId] = useState<string | null>(null);

  // Load Data
  useEffect(() => {
    async function loadData() {
      try {
        const [empRes, equipRes, jornadasRes] = await Promise.all([
          fetch('/api/empleados'),
          fetch('/api/organizacion/equipos'),
          fetch('/api/jornadas')
        ]);

        // Load Employees
        if (empRes.ok) {
          const data = await empRes.json() as Record<string, any>;
          setEmpleados(
            extractArrayFromResponse<{ id: string; nombre: string; apellidos: string }>(data, {
              key: 'empleados',
            })
          );
        }

        // Load Teams
        if (equipRes.ok) {
          const data = await equipRes.json() as Record<string, any>;
          setEquipos(
            (data || []).map((equipo: { id: string; nombre: string; _count?: { miembros?: number } }) => ({
              id: equipo.id,
              nombre: equipo.nombre,
              miembros: equipo._count?.miembros ?? 0,
            }))
          );
        }

        // Load Existing Jornada (if any, populate form)
        if (jornadasRes.ok) {
          const data = await parseJson<any[]>(jornadasRes);
          const jornadas = Array.isArray(data) ? data : [];
          // Use the first non-predefined jornada, or create new default
          const jornada = jornadas.find(j => !j.esPredefinida) || jornadas[0];

          if (jornada) {
            setExistingJornadaId(jornada.id);
            // Populate form with existing data
            const config = jornada.config || {};
            const esFija = DIA_KEYS.some((dia) => {
              const diaConfig = getDiaConfig(config, dia);
              return Boolean(diaConfig?.entrada && diaConfig?.salida);
            });

            const newHorariosFijos: Record<string, any> = {};
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

            // Calculate break minutes
            let descansoMinutos = '';
            if (esFija) {
               // ... logic similar to EditarJornadaModal
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
              horasSemanales: (jornada.horasSemanales || 40).toString(),
              limiteInferior: config?.limiteInferior || '',
              limiteSuperior: config?.limiteSuperior || '',
              horariosFijos: newHorariosFijos,
              descansoMinutos,
            });
          }
        }

      } catch (err) {
        console.error('Error loading data', err);
        toast.error('Error al cargar datos iniciales');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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

  const guardar = async (): Promise<boolean> => {
    if (!validarFormulario()) return false;
    setSaving(true);

    try {
      // Build config object
      const config: JornadaConfig = {};
      const descansoMinutos = parseInt(formData.descansoMinutos || '0', 10);
      
      if (formData.tipoJornada === 'fija') {
        DIA_KEYS.forEach((dia) => {
          const horario = formData.horariosFijos[dia];
          if (descansoMinutos > 0 && horario.activo) {
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
        DIA_KEYS.forEach((dia) => {
          const estadoDia = formData.horariosFijos[dia];
          config[dia] = { activo: estadoDia?.activo ?? false };
        });

        if (descansoMinutos > 0) {
          const horas = Math.floor(descansoMinutos / 60);
          const minutos = descansoMinutos % 60;
          config.descansoMinimo = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        }
      }

      if (formData.limiteInferior) config.limiteInferior = formData.limiteInferior;
      if (formData.limiteSuperior) config.limiteSuperior = formData.limiteSuperior;
      config.tipo = formData.tipoJornada;

      // Save Jornada
      // If we have an existing non-predefined jornada, update it. Otherwise create new.
      const url = existingJornadaId ? `/api/jornadas/${existingJornadaId}` : '/api/jornadas';
      const method = existingJornadaId ? 'PATCH' : 'POST';

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
        throw new Error('Error al guardar jornada');
      }

      const jornadaGuardada = await response.json() as { id: string };

      // Assign
      const debeAsignar = (nivelAsignacion === 'individual' && empleadosSeleccionados.length > 0) ||
                          (nivelAsignacion === 'equipo' && equipoSeleccionado) ||
                          nivelAsignacion === 'empresa';

      if (debeAsignar) {
        const body: any = { jornadaId: jornadaGuardada.id, nivel: nivelAsignacion };
        if (nivelAsignacion === 'equipo') body.equipoIds = [equipoSeleccionado];
        if (nivelAsignacion === 'individual') body.empleadoIds = empleadosSeleccionados;

        // Note: In onboarding we force assignment (skipping warning about previous assignments for simplicity, 
        // assuming this is the initial setup)
        await fetch('/api/jornadas/asignar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      toast.success('Jornada guardada correctamente');
      return true;

    } catch (error) {
      console.error('Error saving jornada', error);
      toast.error('Error al guardar la jornada');
      return false;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    guardar
  }));

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">Define la jornada laboral</h3>
        <p className="text-sm text-gray-500">
          Configura el horario base de tu empresa. Podrás crear variaciones más adelante para equipos o personas específicas.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <JornadaFormFields
          data={formData}
          onChange={setFormData}
          errors={errors}
          disabled={saving}
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
      </div>
    </div>
  );
});

