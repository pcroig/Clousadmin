'use client';

// ========================================
// Jornada Step - Onboarding
// ========================================

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { toast } from 'sonner';

import {
  type JornadaFormData,
  JornadaFormFields,
} from '@/components/shared/jornada-form-fields';
import { type JornadaConfig } from '@/lib/calculos/fichajes-helpers';
import { parseJson } from '@/lib/utils/json';

// Tipo para las jornadas que vienen del API
interface JornadaAPI {
  id: string;
  nombre: string;
  horasSemanales: number;
  config?: JornadaConfig | null;
  esPredefinida?: boolean;
}

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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface JornadaStepProps {}

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
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingJornadaId, setExistingJornadaId] = useState<string | null>(null);

  // Load Data
  useEffect(() => {
    async function loadData() {
      try {
        const jornadasRes = await fetch('/api/jornadas');

        if (jornadasRes.ok) {
          const data = await parseJson<JornadaAPI[]>(jornadasRes);
          const jornadas = Array.isArray(data) ? data : [];
          // Use the first non-predefined jornada, or create new default
          const jornada: JornadaAPI | undefined = jornadas.find((j) => !j.esPredefinida) || jornadas[0];

          if (jornada) {
            setExistingJornadaId(jornada.id);
            // Populate form with existing data
            const config = jornada.config || {};
            const esFija = DIA_KEYS.some((dia) => {
              const diaConfig = getDiaConfig(config, dia);
              return Boolean(diaConfig?.entrada && diaConfig?.salida);
            });

            const newHorariosFijos: Record<string, { activo: boolean; entrada: string; salida: string }> = {};
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
      }
    }

    loadData();
  }, []);

  function validarFormulario(): boolean {
    const newErrors: Record<string, string> = {};
    
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
      const url = existingJornadaId ? `/api/jornadas/${existingJornadaId}` : '/api/jornadas';
      const method = existingJornadaId ? 'PATCH' : 'POST';

      const nombreNormalizado = formData.nombre.trim() || 'Jornada base';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreNormalizado,
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
      setExistingJornadaId(jornadaGuardada.id);

      // Assign jornada to entire company by default
      const asignacionResponse = await fetch('/api/jornadas/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jornadaId: jornadaGuardada.id,
          nivel: 'empresa',
        }),
      });
      if (!asignacionResponse.ok) {
        console.warn('No se pudo asignar la jornada a la empresa en onboarding.');
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

  return (
    <div className="space-y-6">
      <JornadaFormFields
        data={formData}
        onChange={setFormData}
        errors={errors}
        disabled={saving}
        showNombre={false}
        showAsignacion={true}
        nivelAsignacion="empresa"
      />
      <p className="text-sm text-gray-500">
        Esta jornada se aplicará automáticamente a toda la empresa. Podrás crear variaciones específicas para equipos o empleados desde el panel de administración.
      </p>
    </div>
  );
});

