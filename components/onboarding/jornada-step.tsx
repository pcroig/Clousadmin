'use client';

// ========================================
// Jornada Step - Onboarding (Múltiples Jornadas)
// ========================================

import { AlertCircle, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
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

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
}

export const JornadaStep = forwardRef<JornadaStepHandle, JornadaStepProps>(function JornadaStep(_, ref) {
  // Multiple jornadas state
  const [jornadas, setJornadas] = useState<JornadaFormData[]>([createDefaultJornada()]);
  const [expandedIndex, setExpandedIndex] = useState<string>('item-0');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});

  // Empleados y asignación
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(true);
  const [asignaciones, setAsignaciones] = useState<Record<number, string[]>>({}); // jornadaIndex -> empleadoIds[]

  // Cargar empleados de la empresa
  useEffect(() => {
    async function cargarEmpleados() {
      try {
        const response = await fetch('/api/empleados?soloActivos=true');
        if (!response.ok) throw new Error('Error al cargar empleados');

        const data = await response.json() as Empleado[];
        setEmpleados(data);

        // Asignar todos los empleados a la primera jornada por defecto
        if (data.length > 0) {
          setAsignaciones({
            0: data.map(e => e.id)
          });
        }
      } catch (error) {
        console.error('Error cargando empleados:', error);
        toast.error('Error al cargar los empleados');
      } finally {
        setLoadingEmpleados(false);
      }
    }
    cargarEmpleados();
  }, []);

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

    // Reasignar empleados de la jornada eliminada a la primera jornada
    const empleadosDeJornadaEliminada = asignaciones[index] || [];
    const newAsignaciones = { ...asignaciones };
    delete newAsignaciones[index];

    // Agregar empleados de jornada eliminada a la primera jornada
    if (empleadosDeJornadaEliminada.length > 0) {
      newAsignaciones[0] = [...(newAsignaciones[0] || []), ...empleadosDeJornadaEliminada]];
    }

    // Re-indexar asignaciones
    const reindexedAsignaciones: Record<number, string[]> = {};
    Object.keys(newAsignaciones).forEach(key => {
      const oldIndex = parseInt(key);
      if (oldIndex < index) {
        reindexedAsignaciones[oldIndex] = newAsignaciones[oldIndex];
      } else if (oldIndex > index) {
        reindexedAsignaciones[oldIndex - 1] = newAsignaciones[oldIndex];
      }
    });

    setAsignaciones(reindexedAsignaciones);
    const newJornadas = jornadas.filter((_, i) => i !== index);
    setJornadas(newJornadas);

    // If we removed the expanded item, expand the first one
    if (expandedIndex === `item-${index}`) {
      setExpandedIndex('item-0');
    }
  }

  function handleAsignacionChange(jornadaIndex: number, empleadoIds: string[]) {
    setAsignaciones({
      ...asignaciones,
      [jornadaIndex]: empleadoIds,
    });
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

    // Validar que TODOS los empleados tengan jornada asignada
    if (empleados.length > 0) {
      const todosLosEmpleadosAsignados = new Set<string>();
      Object.values(asignaciones).forEach(empleadoIds => {
        empleadoIds.forEach(id => todosLosEmpleadosAsignados.add(id));
      });

      const empleadosSinJornada = empleados.filter(e => !todosLosEmpleadosAsignados.has(e.id));

      if (empleadosSinJornada.length > 0) {
        toast.error(`${empleadosSinJornada.length} empleado(s) sin jornada asignada. Todos los empleados deben tener una jornada.`);
        isValid = false;
      }
    }

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

      // Asignar empleados a jornadas según las asignaciones configuradas
      for (let i = 0; i < createdJornadaIds.length; i++) {
        const jornadaId = createdJornadaIds[i];
        const empleadosAsignados = asignaciones[i] || [];

        if (empleadosAsignados.length > 0) {
          const asignacionResponse = await fetch('/api/jornadas/asignar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jornadaId,
              nivel: 'individual',
              empleadoIds: empleadosAsignados,
            }),
          });

          if (!asignacionResponse.ok) {
            console.warn(`No se pudo asignar empleados a jornada ${i + 1}`);
          }
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

  // Calcular empleados sin asignar
  const empleadosAsignadosSet = new Set<string>();
  Object.values(asignaciones).forEach(empleadoIds => {
    empleadoIds.forEach(id => empleadosAsignadosSet.add(id));
  });
  const empleadosSinAsignar = empleados.filter(e => !empleadosAsignadosSet.has(e.id));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">Define las jornadas laborales</h3>
        <p className="text-sm text-gray-500">
          Configura las jornadas de tu empresa y asigna empleados. Todos los empleados deben tener una jornada asignada.
        </p>
      </div>

      {/* Alerta si hay empleados sin asignar */}
      {empleadosSinAsignar.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              {empleadosSinAsignar.length} empleado(s) sin jornada asignada
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Todos los empleados deben tener una jornada. Asígnalos a una de las jornadas antes de continuar.
            </p>
          </div>
        </div>
      )}

      {/* Info de empleados totales */}
      {empleados.length > 0 && (
        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <strong>{empleados.length}</strong> empleado(s) importado(s) •
          <strong className="ml-1 text-green-700">{empleadosAsignadosSet.size}</strong> asignado(s) •
          {empleadosSinAsignar.length > 0 && (
            <strong className="ml-1 text-amber-700">{empleadosSinAsignar.length}</strong>
          )}
          {empleadosSinAsignar.length > 0 && ' sin asignar'}
        </div>
      )}

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
                disabled={saving || loadingEmpleados}
                showAsignacion={empleados.length > 0}
                nivelAsignacion="individual"
                empleados={empleados}
                empleadosSeleccionados={asignaciones[index] || []}
                onEmpleadosSeleccionChange={(empleadoIds) => handleAsignacionChange(index, empleadoIds)}
              />
              {/* Mostrar contador de empleados asignados */}
              {empleados.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>{(asignaciones[index] || []).length}</strong> de <strong>{empleados.length}</strong> empleado(s) asignados a esta jornada
                  </p>
                </div>
              )}
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
