'use client';

// ========================================
// Jornada Step - Onboarding (Múltiples Jornadas)
// ========================================

import { AlertCircle, ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

interface Equipo {
  id: string;
  nombre: string;
  miembros: number;
}

type NivelAsignacion = 'empresa' | 'equipo' | 'individual';

interface AsignacionPorJornada {
  nivel: NivelAsignacion;
  equipoId?: string;
  empleadoIds?: string[];
}

export const JornadaStep = forwardRef<JornadaStepHandle, JornadaStepProps>(function JornadaStep(_, ref) {
  // Multiple jornadas state
  const [jornadas, setJornadas] = useState<JornadaFormData[]>([createDefaultJornada()]);
  const [expandedIndex, setExpandedIndex] = useState<string>('item-0');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});

  // Empleados, equipos y asignación
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [asignaciones, setAsignaciones] = useState<Record<number, AsignacionPorJornada>>({
    0: { nivel: 'empresa' } // Por defecto: toda la empresa a la primera jornada
  });

  // Validación de jornadas completas
  const [empleadosSinJornada, setEmpleadosSinJornada] = useState<Empleado[]>([]);
  const [validacionCompleta, setValidacionCompleta] = useState<boolean>(true);

  // Cargar empleados y equipos de la empresa
  useEffect(() => {
    const abortController = new AbortController();

    async function cargarDatos() {
      try {
        // Cargar empleados y equipos en paralelo
        const [empleadosResponse, equiposResponse] = await Promise.all([
          fetch('/api/empleados?activos=true&limit=1000', {
            signal: abortController.signal,
          }),
          fetch('/api/equipos?limit=1000', {
            signal: abortController.signal,
          }),
        ]);

        if (!empleadosResponse.ok || !equiposResponse.ok) {
          throw new Error('Error al cargar datos');
        }

        const [empleadosData, equiposData] = await Promise.all([
          empleadosResponse.json() as Promise<{ data?: Empleado[] }>,
          equiposResponse.json() as Promise<{ data?: unknown[] }>,
        ]);

        const empleadosArray = Array.isArray(empleadosData.data) ? empleadosData.data : [];
        const equiposArray = Array.isArray(equiposData.data)
          ? equiposData.data.map((eq: any) => ({
              id: eq.id,
              nombre: eq.nombre,
              miembros: eq._count?.miembros || 0,
            }))
          : [];

        // Solo actualizar estado si no se abortó
        if (!abortController.signal.aborted) {
          setEmpleados(empleadosArray);
          setEquipos(equiposArray);
        }
      } catch (error) {
        // No mostrar error si fue abortado (componente desmontado)
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error cargando datos:', error);
        toast.error('Error al cargar empleados y equipos');
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    }

    cargarDatos();

    return () => {
      abortController.abort();
    };
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

    // Re-indexar asignaciones
    const reindexedAsignaciones: Record<number, AsignacionPorJornada> = {};

    Object.keys(asignaciones).forEach(key => {
      const oldIndex = parseInt(key);

      if (oldIndex === index) {
        return; // Eliminar esta jornada
      }

      const newIndex = oldIndex < index ? oldIndex : oldIndex - 1;
      reindexedAsignaciones[newIndex] = asignaciones[oldIndex];
    });

    // Si no existe asignación para jornada 0 después de re-indexar, crearla
    if (!reindexedAsignaciones[0]) {
      reindexedAsignaciones[0] = { nivel: 'empresa' };
    }

    setAsignaciones(reindexedAsignaciones);
    const newJornadas = jornadas.filter((_, i) => i !== index);
    setJornadas(newJornadas);

    if (expandedIndex === `item-${index}`) {
      setExpandedIndex('item-0');
    }
  }

  function handleNivelAsignacionChange(jornadaIndex: number, nivel: NivelAsignacion) {
    setAsignaciones({
      ...asignaciones,
      [jornadaIndex]: { nivel },
    });
  }

  function handleEquipoChange(jornadaIndex: number, equipoId: string) {
    setAsignaciones({
      ...asignaciones,
      [jornadaIndex]: { nivel: 'equipo', equipoId },
    });
  }

  function handleEmpleadosChange(jornadaIndex: number, empleadoIds: string[]) {
    setAsignaciones({
      ...asignaciones,
      [jornadaIndex]: { nivel: 'individual', empleadoIds },
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

      // Validar asignación por jornada
      const asignacion = asignaciones[index];
      if (asignacion) {
        if (asignacion.nivel === 'equipo' && !asignacion.equipoId) {
          toast.error(`Jornada ${index + 1}: Debes seleccionar un equipo`);
          isValid = false;
        }
        if (asignacion.nivel === 'individual' && (!asignacion.empleadoIds || asignacion.empleadoIds.length === 0)) {
          toast.error(`Jornada ${index + 1}: Debes seleccionar al menos un empleado`);
          isValid = false;
        }
      }

      if (Object.keys(jornadaErrors).length > 0) {
        newErrors[index] = jornadaErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  }

  async function validarJornadasCompletas(): Promise<boolean> {
    try {
      const response = await fetch('/api/empleados/validar-jornadas-completas');
      if (!response.ok) {
        throw new Error('Error al validar jornadas');
      }

      const data = await response.json() as {
        completo: boolean;
        totalEmpleados: number;
        empleadosConJornada: number;
        empleadosSinJornada: Empleado[];
      };

      setValidacionCompleta(data.completo);
      setEmpleadosSinJornada(data.empleadosSinJornada);

      return data.completo;
    } catch (error) {
      console.error('Error validando jornadas completas:', error);
      // En caso de error, asumir que no está completo
      return false;
    }
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

      // Asignar jornadas según configuración
      const asignacionesFallidas: number[] = [];

      for (let i = 0; i < createdJornadaIds.length; i++) {
        const jornadaId = createdJornadaIds[i];
        const asignacion = asignaciones[i];

        if (!asignacion) continue;

        try {
          const payload: any = {
            jornadaId,
            nivel: asignacion.nivel,
          };

          if (asignacion.nivel === 'equipo' && asignacion.equipoId) {
            payload.equipoIds = [asignacion.equipoId];
          } else if (asignacion.nivel === 'individual' && asignacion.empleadoIds) {
            payload.empleadoIds = asignacion.empleadoIds;
          }

          const asignacionResponse = await fetch('/api/jornadas/asignar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!asignacionResponse.ok) {
            const errorData = await asignacionResponse.json().catch(() => ({}));
            console.error(`Error al asignar jornada ${i + 1}:`, errorData);
            asignacionesFallidas.push(i + 1);
          }
        } catch (error) {
          console.error(`Excepción al asignar jornada ${i + 1}:`, error);
          asignacionesFallidas.push(i + 1);
        }
      }

      // Informar resultado de asignaciones
      if (asignacionesFallidas.length > 0) {
        toast.warning(
          `${jornadas.length} jornada${jornadas.length > 1 ? 's' : ''} creada${jornadas.length > 1 ? 's' : ''}, pero hubo errores asignando empleados a ${asignacionesFallidas.length} jornada${asignacionesFallidas.length > 1 ? 's' : ''}. Verifica las asignaciones.`,
          { duration: 5000 }
        );
      } else {
        toast.success(`${jornadas.length} jornada${jornadas.length > 1 ? 's' : ''} guardada${jornadas.length > 1 ? 's' : ''} y empleados asignados correctamente`);
      }

      // Validar que todos los empleados tengan jornada asignada
      const validacionOk = await validarJornadasCompletas();

      if (!validacionOk) {
        toast.error(
          `No se puede continuar: ${empleadosSinJornada.length} empleado${empleadosSinJornada.length !== 1 ? 's' : ''} sin jornada asignada. Por favor, asigna una jornada a todos los empleados.`,
          { duration: 10000 }
        );
        return false; // BLOQUEAR progresión
      }

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
        <h3 className="text-lg font-semibold text-gray-900">Configura las jornadas laborales</h3>
        <p className="text-sm text-gray-500">
          Crea los diferentes horarios de trabajo y asigna cada empleado a la jornada que le corresponda.
        </p>
      </div>

      {/* Alerta de empleados sin jornada */}
      {!validacionCompleta && empleadosSinJornada.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Empleados sin jornada asignada</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">
              Los siguientes {empleadosSinJornada.length} empleado{empleadosSinJornada.length !== 1 ? 's' : ''} no tienen jornada asignada.
              Todos los empleados deben tener una jornada para poder continuar.
            </p>
            <div className="mt-3 max-h-32 overflow-y-auto border border-red-200 rounded bg-red-50 p-2">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {empleadosSinJornada.map(emp => (
                  <li key={emp.id}>{emp.nombre} {emp.apellidos}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
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
                disabled={saving || loadingData}
                showAsignacion={!loadingData}
                nivelAsignacion={asignaciones[index]?.nivel || 'empresa'}
                onNivelAsignacionChange={(nivel) => handleNivelAsignacionChange(index, nivel)}
                empleados={empleados}
                empleadosSeleccionados={asignaciones[index]?.empleadoIds || []}
                onEmpleadosSeleccionChange={(ids) => handleEmpleadosChange(index, ids)}
                equipos={equipos}
                equipoSeleccionado={asignaciones[index]?.equipoId || ''}
                onEquipoSeleccionadoChange={(id) => handleEquipoChange(index, id)}
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
