'use client';

// ========================================
// Modal de Gestión de Jornadas - DISEÑO UNIFICADO CON ONBOARDING
// ========================================
// Usa Accordion como en onboarding, pero sin nombre/etiqueta
// Los asignados actúan como identificador

import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  type JornadaFormData,
  JornadaFormFields,
} from '@/components/shared/jornada-form-fields';
import { LoadingButton } from '@/components/shared/loading-button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogScrollableContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { type JornadaConfig, type DiaConfig } from '@/lib/calculos/fichajes-helpers';
import { useApi } from '@/lib/hooks';

type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
const DIA_KEYS: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const isDiaConfig = (value: unknown): value is DiaConfig =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDiaConfig = (config: JornadaConfig | null | undefined, dia: DiaKey): DiaConfig | undefined => {
  if (!config) return undefined;
  const value = config[dia];
  return isDiaConfig(value) ? value : undefined;
};

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
}

interface Equipo {
  id: string;
  nombre: string;
  miembros: number;
  empleadoIds?: string[]; // IDs de empleados en este equipo
}

interface Jornada {
  id: string;
  horasSemanales: number;
  config: JornadaConfig | null;
  esPredefinida: boolean;
  activa: boolean;
  asignacion?: {
    nivelAsignacion: string;
    equipoIds?: string[] | null;
  } | null;
  empleados?: Array<{
    id: string;
    nombre: string;
    apellidos?: string | null;
  }>;
  _count?: {
    empleados: number;
  };
}

interface JornadasModalProps {
  open: boolean;
  onClose: () => void;
}

type NivelAsignacion = 'empresa' | 'equipo' | 'individual';

interface JornadaLocal extends JornadaFormData {
  id?: string; // ID si es existente, undefined si es nueva
  esPredefinida?: boolean;
}

interface AsignacionPorJornada {
  nivel: NivelAsignacion;
  equipoIds?: string[]; // Array para permitir múltiples equipos
  empleadoIds?: string[];
}

function createDefaultJornada(): JornadaLocal {
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
    tieneDescanso: true,
    descansoMinutos: '60',
  };
}

function getJornadaLabel(jornada: JornadaLocal, asignacion: AsignacionPorJornada, empleados: Empleado[], equipos: Equipo[]): string {
  const tipo = jornada.tipoJornada === 'fija' ? 'Fija' : 'Flexible';
  const horas = jornada.horasSemanales || '40';

  let asignadosLabel = '';
  if (asignacion.nivel === 'empresa') {
    asignadosLabel = 'Toda la empresa';
  } else if (asignacion.nivel === 'equipo' && asignacion.equipoIds && asignacion.equipoIds.length > 0) {
    if (asignacion.equipoIds.length === 1) {
      const equipo = equipos.find(eq => eq.id === asignacion.equipoIds![0]);
      asignadosLabel = equipo ? equipo.nombre : 'Equipo';
    } else {
      const nombresEquipos = asignacion.equipoIds
        .map(id => equipos.find(eq => eq.id === id)?.nombre)
        .filter(Boolean)
        .join(', ');
      asignadosLabel = nombresEquipos || `${asignacion.equipoIds.length} equipos`;
    }
  } else if (asignacion.nivel === 'individual' && asignacion.empleadoIds && asignacion.empleadoIds.length > 0) {
    const primerEmpleado = empleados.find(emp => emp.id === asignacion.empleadoIds![0]);
    if (asignacion.empleadoIds.length === 1 && primerEmpleado) {
      asignadosLabel = `${primerEmpleado.nombre} ${primerEmpleado.apellidos}`;
    } else {
      asignadosLabel = `${asignacion.empleadoIds.length} empleados`;
    }
  } else {
    asignadosLabel = 'Sin asignar';
  }

  return `${tipo} ${horas}h - ${asignadosLabel}`;
}

export function JornadasModal({ open, onClose }: JornadasModalProps) {
  // Estado de jornadas locales (mezcla de existentes y nuevas)
  const [jornadas, setJornadas] = useState<JornadaLocal[]>([]);
  const [asignaciones, setAsignaciones] = useState<Record<number, AsignacionPorJornada>>({});
  const [expandedIndex, setExpandedIndex] = useState<string>('');

  // Estados auxiliares
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const [inicializado, setInicializado] = useState(false);

  // Hooks
  const { data: jornadasData, loading, execute: refetchJornadas } = useApi<Jornada[]>();
  const jornadasExistentes = jornadasData ?? [];

  useEffect(() => {
    if (open) {
      refetchJornadas('/api/jornadas');
      cargarEmpleados();
      cargarEquipos();
    }
  }, [open]);

  // Cargar jornadas existentes en el estado local
  useEffect(() => {
    if (jornadasExistentes.length > 0) {
      const jornadasLocales: JornadaLocal[] = jornadasExistentes.map((jornada) => {
        const config = jornada.config;
        const esFija = DIA_KEYS.some((dia) => {
          const diaConfig = getDiaConfig(config, dia);
          return Boolean(diaConfig?.entrada && diaConfig?.salida);
        });

        const horariosFijos: Record<DiaKey, { activo: boolean; entrada: string; salida: string }> = {
          lunes: { activo: false, entrada: '', salida: '' },
          martes: { activo: false, entrada: '', salida: '' },
          miercoles: { activo: false, entrada: '', salida: '' },
          jueves: { activo: false, entrada: '', salida: '' },
          viernes: { activo: false, entrada: '', salida: '' },
          sabado: { activo: false, entrada: '', salida: '' },
          domingo: { activo: false, entrada: '', salida: '' },
        };

        if (esFija && config) {
          DIA_KEYS.forEach((dia) => {
            const diaConfig = getDiaConfig(config, dia);
            if (diaConfig) {
              horariosFijos[dia] = {
                activo: Boolean(diaConfig.activo),
                entrada: diaConfig.entrada || '',
                salida: diaConfig.salida || '',
              };
            }
          });
        } else if (config) {
          DIA_KEYS.forEach((dia) => {
            const diaConfig = getDiaConfig(config, dia);
            if (diaConfig) {
              horariosFijos[dia] = {
                activo: Boolean(diaConfig.activo),
                entrada: '',
                salida: '',
              };
            }
          });
        }

        const descansoValue = config?.descanso;
        const tieneDescanso = descansoValue !== undefined && descansoValue !== null;
        const descansoMinutos = tieneDescanso ? String(descansoValue) : '60';

        return {
          id: jornada.id,
          esPredefinida: jornada.esPredefinida,
          tipoJornada: esFija ? 'fija' : 'flexible',
          horasSemanales: String(jornada.horasSemanales),
          horariosFijos,
          tieneDescanso,
          descansoMinutos,
        };
      });

      const asignacionesLocales: Record<number, AsignacionPorJornada> = {};
      jornadasExistentes.forEach((jornada, index) => {
        const asignacion = jornada.asignacion;
        if (asignacion) {
          const nivel = asignacion.nivelAsignacion as NivelAsignacion;
          if (nivel === 'equipo' && asignacion.equipoIds) {
            asignacionesLocales[index] = {
              nivel,
              equipoIds: Array.isArray(asignacion.equipoIds) ? asignacion.equipoIds : [],
            };
          } else if (nivel === 'individual' && jornada.empleados) {
            asignacionesLocales[index] = {
              nivel,
              empleadoIds: jornada.empleados.map(e => e.id),
            };
          } else {
            asignacionesLocales[index] = { nivel };
          }
        } else {
          asignacionesLocales[index] = { nivel: 'empresa' };
        }
      });

      setJornadas(jornadasLocales);
      setAsignaciones(asignacionesLocales);
      setInicializado(true);
    } else if (!loading && !inicializado) {
      // No hay jornadas, empezar con una vacía (solo la primera vez)
      setJornadas([createDefaultJornada()]);
      setAsignaciones({ 0: { nivel: 'empresa' } });
      setExpandedIndex('item-0');
      setInicializado(true);
    }
  }, [jornadasExistentes, loading, inicializado]);

  async function cargarEmpleados() {
    try {
      const response = await fetch('/api/empleados');
      if (response.ok) {
        const data = await response.json() as { data?: unknown[] };
        const empleadosArray = Array.isArray(data.data) ? data.data : [];
        setEmpleados(
          empleadosArray.map((empleado: unknown) => {
            const e = empleado as { id: string; nombre: string; apellidos: string };
            return {
              id: e.id,
              nombre: e.nombre,
              apellidos: e.apellidos,
            };
          })
        );
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  }

  async function cargarEquipos() {
    try {
      const response = await fetch('/api/equipos');
      if (response.ok) {
        const data = await response.json() as { data?: unknown[] };
        const equiposArray = Array.isArray(data.data) ? data.data : [];
        setEquipos(
          equiposArray.map((equipo: unknown) => {
            const e = equipo as {
              id: string;
              nombre: string;
              numeroMiembros?: number;
              miembros?: Array<{ id: string }>; // ✅ 'miembros' viene de formatEquipoResponse
            };

            // Extraer IDs de empleados desde 'miembros' (no 'empleado_equipos')
            const empleadoIds = e.miembros?.map(m => m.id) || [];

            return {
              id: e.id,
              nombre: e.nombre,
              miembros: e.numeroMiembros || empleadoIds.length,
              empleadoIds, // ✅ IDs extraídos correctamente
            };
          })
        );
      }
    } catch (error) {
      console.error('Error cargando equipos:', error);
    }
  }

  function updateJornada(index: number, data: JornadaFormData) {
    const newJornadas = [...jornadas];
    newJornadas[index] = { ...newJornadas[index], ...data };
    setJornadas(newJornadas);
  }

  function addJornada() {
    const newJornadas = [...jornadas, createDefaultJornada()];
    setJornadas(newJornadas);
    setAsignaciones({
      ...asignaciones,
      [newJornadas.length - 1]: { nivel: 'individual', empleadoIds: [] },
    });
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
      if (oldIndex === index) return; // Eliminar esta jornada
      const newIndex = oldIndex < index ? oldIndex : oldIndex - 1;
      reindexedAsignaciones[newIndex] = asignaciones[oldIndex];
    });

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

  function handleEquiposChange(jornadaIndex: number, equipoIds: string[]) {
    setAsignaciones({
      ...asignaciones,
      [jornadaIndex]: { nivel: 'equipo', equipoIds },
    });
  }

  function handleEmpleadosChange(jornadaIndex: number, empleadoIds: string[]) {
    setAsignaciones({
      ...asignaciones,
      [jornadaIndex]: { nivel: 'individual', empleadoIds },
    });
  }

  function validarJornadas(): boolean {
    const newErrors: Record<number, Record<string, string>> = {};
    let isValid = true;

    // 1. Validar campos básicos
    jornadas.forEach((jornada, index) => {
      const jornadaErrors: Record<string, string> = {};

      if (!jornada.horasSemanales || parseFloat(jornada.horasSemanales) <= 0) {
        jornadaErrors.horasSemanales = 'Las horas semanales deben ser mayores a 0';
        isValid = false;
      }

      // Validar que tenga asignación válida
      const asignacion = asignaciones[index];
      if (asignacion) {
        if (asignacion.nivel === 'equipo' && (!asignacion.equipoIds || asignacion.equipoIds.length === 0)) {
          toast.error(`Jornada ${index + 1}: Debes seleccionar al menos un equipo`);
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

    // 2. Calcular qué empleados cubre cada jornada (expandiendo equipos a empleados)
    const empleadosPorJornada: Map<number, Set<string>> = new Map();

    console.log('[VALIDACION] Total jornadas:', jornadas.length);
    console.log('[VALIDACION] Total empleados disponibles:', empleados.length);
    console.log('[VALIDACION] Total equipos disponibles:', equipos.length);
    console.log('[VALIDACION] Asignaciones:', asignaciones);

    Object.entries(asignaciones).forEach(([indexStr, asignacion]) => {
      const index = parseInt(indexStr);
      const empleadosEnJornada = new Set<string>();

      console.log(`[VALIDACION] Jornada ${index + 1} - Nivel: ${asignacion.nivel}`);

      if (asignacion.nivel === 'empresa') {
        // Toda la empresa = todos los empleados
        empleados.forEach(emp => empleadosEnJornada.add(emp.id));
        console.log(`[VALIDACION] Jornada ${index + 1} - Empresa: ${empleadosEnJornada.size} empleados`);
      } else if (asignacion.nivel === 'equipo' && asignacion.equipoIds) {
        // Expandir equipos a empleados
        asignacion.equipoIds.forEach(equipoId => {
          const equipo = equipos.find(eq => eq.id === equipoId);
          console.log(`[VALIDACION] Jornada ${index + 1} - Buscando equipo:`, equipoId, 'Encontrado:', equipo);
          if (equipo && equipo.empleadoIds) {
            console.log(`[VALIDACION] Jornada ${index + 1} - Equipo ${equipo.nombre}: ${equipo.empleadoIds.length} empleados`);
            equipo.empleadoIds.forEach(empId => empleadosEnJornada.add(empId));
          }
        });
        console.log(`[VALIDACION] Jornada ${index + 1} - Total empleados en equipos: ${empleadosEnJornada.size}`);
      } else if (asignacion.nivel === 'individual' && asignacion.empleadoIds) {
        // Empleados específicos
        asignacion.empleadoIds.forEach(empId => empleadosEnJornada.add(empId));
        console.log(`[VALIDACION] Jornada ${index + 1} - Individual: ${empleadosEnJornada.size} empleados`);
      }

      empleadosPorJornada.set(index, empleadosEnJornada);
    });

    // 3. Calcular TODOS los empleados cubiertos por TODAS las jornadas
    const empleadosCubiertos = new Set<string>();
    empleadosPorJornada.forEach(empleadosSet => {
      empleadosSet.forEach(empId => empleadosCubiertos.add(empId));
    });

    console.log('[VALIDACION] Empleados cubiertos por jornadas:', empleadosCubiertos.size);
    console.log('[VALIDACION] Total empleados activos:', empleados.length);

    // 4. Detectar solapamientos entre jornadas
    const jornadasIndices = Array.from(empleadosPorJornada.keys());
    console.log('[VALIDACION] Comparando jornadas:', jornadasIndices);

    for (let i = 0; i < jornadasIndices.length; i++) {
      for (let j = i + 1; j < jornadasIndices.length; j++) {
        const index1 = jornadasIndices[i];
        const index2 = jornadasIndices[j];
        const empleados1 = empleadosPorJornada.get(index1)!;
        const empleados2 = empleadosPorJornada.get(index2)!;

        console.log(`[VALIDACION] Comparando Jornada ${index1 + 1} (${empleados1.size} emps) vs Jornada ${index2 + 1} (${empleados2.size} emps)`);

        // Encontrar intersección
        const interseccion = Array.from(empleados1).filter(empId => empleados2.has(empId));
        console.log(`[VALIDACION] Intersección: ${interseccion.length} empleados`);

        if (interseccion.length > 0) {
          const asig1 = asignaciones[index1];
          const asig2 = asignaciones[index2];

          let mensaje = `Conflicto entre Jornada ${index1 + 1} y Jornada ${index2 + 1}: `;

          if (asig1.nivel === 'empresa' || asig2.nivel === 'empresa') {
            mensaje += 'No puede haber otra jornada cuando ya existe una asignada a toda la empresa';
          } else if (interseccion.length === empleados1.size || interseccion.length === empleados2.size) {
            mensaje += 'Hay solapamiento total de empleados';
          } else {
            mensaje += `${interseccion.length} empleado${interseccion.length > 1 ? 's están' : ' está'} en ambas jornadas`;
          }

          console.log('[VALIDACION] ERROR:', mensaje);
          toast.error(mensaje);
          isValid = false;
        }
      }
    }

    // 5. CRÍTICO: Verificar que TODOS los empleados tienen jornada asignada
    const empleadosSinJornada = empleados.filter(emp => !empleadosCubiertos.has(emp.id));

    if (empleadosSinJornada.length > 0) {
      console.log('[VALIDACION] ERROR: Empleados sin jornada:', empleadosSinJornada.map(e => `${e.nombre} ${e.apellidos}`));

      const mensaje = empleadosSinJornada.length === 1
        ? `${empleadosSinJornada[0].nombre} ${empleadosSinJornada[0].apellidos} no tiene jornada asignada`
        : `${empleadosSinJornada.length} empleados no tienen jornada asignada: ${empleadosSinJornada.slice(0, 3).map(e => `${e.nombre} ${e.apellidos}`).join(', ')}${empleadosSinJornada.length > 3 ? '...' : ''}`;

      toast.error(mensaje);
      isValid = false;
    } else {
      console.log('[VALIDACION] ✅ Todos los empleados tienen jornada asignada');
    }

    setErrors(newErrors);
    return isValid;
  }

  async function handleGuardar() {
    if (!validarJornadas()) {
      toast.error('Por favor corrige los errores');
      return;
    }

    setGuardando(true);

    try {
      const jornadasCreadas: string[] = [];
      const jornadasActualizadas: string[] = [];

      // 1. PRIMERO: Detectar y eliminar jornadas que ya no están en el modal
      const jornadasActualesIds = new Set(jornadas.filter(j => j.id).map(j => j.id!));
      const jornadasExistentesIds = jornadasExistentes.map(j => j.id);
      const jornadasAEliminar = jornadasExistentesIds.filter(id => !jornadasActualesIds.has(id));

      console.log('[GUARDAR] Jornadas actuales:', Array.from(jornadasActualesIds));
      console.log('[GUARDAR] Jornadas existentes:', jornadasExistentesIds);
      console.log('[GUARDAR] Jornadas a eliminar:', jornadasAEliminar);

      // Validar que las jornadas a eliminar no tengan empleados asignados
      for (const jornadaId of jornadasAEliminar) {
        const jornadaExistente = jornadasExistentes.find(j => j.id === jornadaId);
        if (jornadaExistente && jornadaExistente._count && jornadaExistente._count.empleados > 0) {
          setGuardando(false);
          toast.error(`No se puede eliminar una jornada con ${jornadaExistente._count.empleados} empleado(s) asignado(s). Primero reasigna los empleados.`);
          return;
        }
      }

      // Eliminar jornadas que fueron removidas del modal
      for (const jornadaId of jornadasAEliminar) {
        console.log('[GUARDAR] Eliminando jornada:', jornadaId);
        const response = await fetch(`/api/jornadas/${jornadaId}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(`Error eliminando jornada: ${errorData.error || 'Error desconocido'}`);
        }
      }

      // 2. LUEGO: Procesar cada jornada (crear o actualizar)
      for (let i = 0; i < jornadas.length; i++) {
        const jornada = jornadas[i];
        const asignacion = asignaciones[i];

        // Build config
        const config: JornadaConfig = {};
        if (jornada.tipoJornada === 'fija') {
          DIA_KEYS.forEach((dia) => {
            const horario = jornada.horariosFijos[dia];
            if (horario.activo) {
              config[dia] = {
                activo: true,
                entrada: horario.entrada,
                salida: horario.salida,
              };
            } else {
              config[dia] = { activo: false };
            }
          });
        } else {
          DIA_KEYS.forEach((dia) => {
            const horario = jornada.horariosFijos[dia];
            config[dia] = { activo: horario.activo };
          });
        }

        if (jornada.tieneDescanso && jornada.descansoMinutos) {
          const descansoNum = parseInt(jornada.descansoMinutos, 10);
          if (!isNaN(descansoNum) && descansoNum > 0) {
            const horas = Math.floor(descansoNum / 60);
            const minutos = descansoNum % 60;
            config.descansoMinimo = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
          }
        }

        config.tipo = jornada.tipoJornada;

        // Crear o actualizar jornada
        const jornadaBody = {
          tipo: jornada.tipoJornada, // ✅ Campo requerido por el schema
          horasSemanales: parseFloat(jornada.horasSemanales),
          config,
        };

        let jornadaId: string;

        if (jornada.id) {
          // Actualizar existente
          console.log(`[DEBUG] Actualizando jornada ${i + 1}:`, jornadaBody);
          const response = await fetch(`/api/jornadas/${jornada.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jornadaBody),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Error desconocido' })) as { error?: string; message?: string; details?: Array<{ path: string[]; message: string }> };

            // Si hay detalles de validación (Zod), mostrar errores específicos
            if (errorData.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
              const validationErrors = errorData.details
                .map(issue => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
              throw new Error(`Jornada ${i + 1}: ${validationErrors}`);
            }

            const errorMsg = errorData.error || errorData.message || `Error ${response.status}`;
            throw new Error(`Jornada ${i + 1}: ${errorMsg}`);
          }

          jornadaId = jornada.id;
          jornadasActualizadas.push(jornadaId);
        } else {
          // Crear nueva
          console.log(`[DEBUG] Creando jornada ${i + 1}:`, jornadaBody);
          const response = await fetch('/api/jornadas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jornadaBody),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Error desconocido' })) as { error?: string; message?: string; details?: Array<{ path: string[]; message: string }> };

            // Si hay detalles de validación (Zod), mostrar errores específicos
            if (errorData.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
              const validationErrors = errorData.details
                .map(issue => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
              throw new Error(`Jornada ${i + 1}: ${validationErrors}`);
            }

            const errorMsg = errorData.error || errorData.message || `Error ${response.status}`;
            throw new Error(`Jornada ${i + 1}: ${errorMsg}`);
          }

          const result = await response.json() as { data?: { id: string }; id?: string };
          const createdId = result.data?.id || result.id;
          if (!createdId) {
            throw new Error(`Jornada ${i + 1}: Creada pero sin ID en la respuesta`);
          }
          jornadaId = createdId;
          jornadasCreadas.push(jornadaId);
        }

        // Asignar empleados
        const asignacionBody: any = {
          jornadaId,
          nivel: asignacion.nivel,
        };

        if (asignacion.nivel === 'individual') {
          asignacionBody.empleadoIds = asignacion.empleadoIds;
        } else if (asignacion.nivel === 'equipo') {
          asignacionBody.equipoIds = asignacion.equipoIds;
        }

        const asignacionResponse = await fetch('/api/jornadas/asignar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(asignacionBody),
        });

        if (!asignacionResponse.ok) {
          const errorData = await asignacionResponse.json().catch(() => ({ error: 'Error desconocido' })) as { error?: string; message?: string; details?: Array<{ path: string[]; message: string }> };

          // Si hay detalles de validación (Zod), mostrar errores específicos
          if (errorData.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
            const validationErrors = errorData.details
              .map(issue => `${issue.path.join('.')}: ${issue.message}`)
              .join(', ');
            throw new Error(`Jornada ${i + 1} - Asignación: ${validationErrors}`);
          }

          const errorMsg = errorData.error || errorData.message || `Error ${asignacionResponse.status}`;
          throw new Error(`Jornada ${i + 1} - Asignación: ${errorMsg}`);
        }
      }

      toast.success(`Jornadas guardadas correctamente`);
      await refetchJornadas('/api/jornadas');
      onClose();
    } catch (error) {
      console.error('Error guardando jornadas:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogScrollableContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Gestión de Jornadas</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Configura las jornadas laborales y asigna empleados. Los asignados identifican cada jornada.
              </p>

              <Accordion
                type="single"
                collapsible
                value={expandedIndex}
                onValueChange={setExpandedIndex}
                className="space-y-3"
              >
                {jornadas.map((jornada, index) => {
                  const asignacion = asignaciones[index] || { nivel: 'empresa' as NivelAsignacion };
                  const label = getJornadaLabel(jornada, asignacion, empleados, equipos);

                  return (
                    <AccordionItem
                      key={jornada.id || `new-${index}`}
                      value={`item-${index}`}
                      className="border rounded-lg px-4 py-2 bg-white shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <AccordionTrigger className="flex-1 text-left font-medium hover:no-underline">
                          <div className="flex items-center gap-2">
                            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                            {label}
                          </div>
                        </AccordionTrigger>
                        {jornadas.length > 1 && !jornada.esPredefinida && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeJornada(index);
                            }}
                            disabled={guardando}
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
                          disabled={guardando || jornada.esPredefinida}
                          showAsignacion={true}
                          nivelAsignacion={asignacion.nivel}
                          onNivelAsignacionChange={(nivel) => handleNivelAsignacionChange(index, nivel)}
                          empleados={empleados}
                          empleadosSeleccionados={asignacion.empleadoIds || []}
                          onEmpleadosSeleccionChange={(ids) => handleEmpleadosChange(index, ids)}
                          equipos={equipos}
                          equiposSeleccionados={asignacion.equipoIds || []}
                          onEquiposSeleccionadosChange={(ids) => handleEquiposChange(index, ids)}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              <Button
                type="button"
                variant="outline"
                onClick={addJornada}
                disabled={guardando}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar otra jornada
              </Button>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="gap-2">
          <Button onClick={onClose} variant="outline" disabled={guardando}>
            Cancelar
          </Button>
          <LoadingButton onClick={handleGuardar} loading={guardando}>
            Guardar Cambios
          </LoadingButton>
        </DialogFooter>
      </DialogScrollableContent>
    </Dialog>
  );
}
