'use client';

// ========================================
// Jornada Step - Onboarding (Múltiples Jornadas)
// ========================================

import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { toast } from 'sonner';

import {
  type JornadaFormData,
  JornadaFormFields,
} from '@/components/shared/jornada-form-fields';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { type JornadaConfig } from '@/lib/calculos/fichajes-helpers';

// Helper types
type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
const DIA_KEYS: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export interface JornadaStepHandle {
  guardar: () => Promise<boolean>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface JornadaStepProps {}

// Default jornada configuration
function createDefaultJornada(): JornadaFormData {
  return {
    tipoJornada: 'flexible',
    horasSemanales: '40',
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
  };
}

export const JornadaStep = forwardRef<JornadaStepHandle, JornadaStepProps>(function JornadaStep(_, ref) {
  // Multiple jornadas state
  const [jornadas, setJornadas] = useState<JornadaFormData[]>([createDefaultJornada()]);
  const [expandedIndex, setExpandedIndex] = useState<string>('item-0');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});

  function updateJornada(index: number, data: JornadaFormData) {
    const newJornadas = [...jornadas];
    newJornadas[index] = data;
    setJornadas(newJornadas);
  }

  function addJornada() {
    const newJornadas = [...jornadas, createDefaultJornada()];
    setJornadas(newJornadas);
    setExpandedIndex(`item-${newJornadas.length - 1}`);
  }

  function removeJornada(index: number) {
    if (jornadas.length <= 1) {
      toast.error('Debe haber al menos una jornada');
      return;
    }
    const newJornadas = jornadas.filter((_, i) => i !== index);
    setJornadas(newJornadas);
    // If we removed the expanded item, expand the first one
    if (expandedIndex === `item-${index}`) {
      setExpandedIndex('item-0');
    }
  }

  function getJornadaLabel(jornada: JornadaFormData, index: number): string {
    const tipo = jornada.tipoJornada === 'fija' ? 'Fija' : 'Flexible';
    const horas = jornada.horasSemanales || '40';
    return `Jornada ${index + 1} - ${tipo} ${horas}h`;
  }

  function validarJornadas(): boolean {
    const newErrors: Record<number, Record<string, string>> = {};
    let isValid = true;

    jornadas.forEach((jornada, index) => {
      const jornadaErrors: Record<string, string> = {};

      if (!jornada.horasSemanales || parseFloat(jornada.horasSemanales) <= 0) {
        jornadaErrors.horasSemanales = 'Las horas semanales deben ser mayores a 0';
        isValid = false;
      }

      if (Object.keys(jornadaErrors).length > 0) {
        newErrors[index] = jornadaErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  }

  const guardar = async (): Promise<boolean> => {
    if (!validarJornadas()) {
      toast.error('Por favor corrige los errores en las jornadas');
      return false;
    }

    setSaving(true);

    try {
      // Create all jornadas
      const createdJornadaIds: string[] = [];

      for (let i = 0; i < jornadas.length; i++) {
        const jornada = jornadas[i];

        // Build config object
        const config: JornadaConfig = {};
        const descansoMinutos = parseInt(jornada.descansoMinutos || '0', 10);

        if (jornada.tipoJornada === 'fija') {
          DIA_KEYS.forEach((dia) => {
            const horario = jornada.horariosFijos[dia];
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
            const estadoDia = jornada.horariosFijos[dia];
            config[dia] = { activo: estadoDia?.activo ?? false };
          });

          if (descansoMinutos > 0) {
            const horas = Math.floor(descansoMinutos / 60);
            const minutos = descansoMinutos % 60;
            config.descansoMinimo = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
          }
        }

        // NOTE: limiteInferior/Superior are now global, not per-jornada
        config.tipo = jornada.tipoJornada;

        // Create jornada (without 'nombre' field)
        const response = await fetch('/api/jornadas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: jornada.tipoJornada,
            horasSemanales: parseFloat(jornada.horasSemanales),
            config,
          }),
        });

        if (!response.ok) {
          throw new Error(`Error al guardar jornada ${i + 1}`);
        }

        const jornadaGuardada = await response.json() as { id: string };
        createdJornadaIds.push(jornadaGuardada.id);
      }

      // Assign first jornada to entire company by default
      // (HR can reassign employees to other jornadas later)
      if (createdJornadaIds.length > 0) {
        const asignacionResponse = await fetch('/api/jornadas/asignar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jornadaId: createdJornadaIds[0],
            nivel: 'empresa',
          }),
        });
        if (!asignacionResponse.ok) {
          console.warn('No se pudo asignar la jornada por defecto a la empresa.');
        }
      }

      toast.success(`${jornadas.length} jornada${jornadas.length > 1 ? 's' : ''} guardada${jornadas.length > 1 ? 's' : ''} correctamente`);
      return true;

    } catch (error) {
      console.error('Error saving jornadas', error);
      toast.error('Error al guardar las jornadas');
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
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">Define las jornadas laborales</h3>
        <p className="text-sm text-gray-500">
          Configura las jornadas de tu empresa. Puedes crear varias jornadas para diferentes equipos o roles.
        </p>
      </div>

      <Accordion
        type="single"
        collapsible
        value={expandedIndex}
        onValueChange={setExpandedIndex}
        className="space-y-3"
      >
        {jornadas.map((jornada, index) => (
          <AccordionItem
            key={`item-${index}`}
            value={`item-${index}`}
            className="border rounded-lg px-4 py-2 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between">
              <AccordionTrigger className="flex-1 text-left font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                  {getJornadaLabel(jornada, index)}
                </div>
              </AccordionTrigger>
              {jornadas.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeJornada(index);
                  }}
                  disabled={saving}
                  className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <AccordionContent className="pt-4">
              <JornadaFormFields
                data={jornada}
                onChange={(data) => updateJornada(index, data)}
                errors={errors[index] || {}}
                disabled={saving}
                showAsignacion={false}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Button
        type="button"
        variant="outline"
        onClick={addJornada}
        disabled={saving}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Agregar otra jornada
      </Button>
    </div>
  );
});
