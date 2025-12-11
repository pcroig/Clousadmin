'use client';

// ========================================
// Jornada Display - Componente de Visualización de Jornada
// ========================================
// Muestra la información de una jornada usando JornadaFormFields en modo solo lectura

import { JornadaFormFields, type JornadaFormData } from '@/components/shared/jornada-form-fields';
import type { JornadaConfig, DiaConfig } from '@/lib/calculos/fichajes-helpers';

type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

const DIA_KEYS: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const isDiaConfig = (value: unknown): value is DiaConfig =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDiaConfig = (config: JornadaConfig | null | undefined, dia: DiaKey): DiaConfig | undefined => {
  if (!config) return undefined;
  const value = config[dia];
  return isDiaConfig(value) ? value : undefined;
};

interface JornadaDisplayProps {
  jornada: {
    horasSemanales: number;
    config: JornadaConfig | null;
  } | null;
  origen?: 'individual' | 'equipo' | 'empresa' | null;
  equipoNombre?: string;
  loading?: boolean;
}

function convertToFormData(jornada: { horasSemanales: number; config: JornadaConfig | null }): JornadaFormData {
  const config = jornada.config;

  // Detectar si es fija o flexible
  const esFija = DIA_KEYS.some((dia) => {
    const diaConfig = getDiaConfig(config, dia);
    return Boolean(diaConfig?.entrada && diaConfig?.salida);
  });

  // Construir horariosFijos
  const horariosFijos: Record<string, { activo: boolean; entrada: string; salida: string; pausa_inicio?: string; pausa_fin?: string }> = {};
  DIA_KEYS.forEach((dia) => {
    const diaConfig = getDiaConfig(config, dia);
    horariosFijos[dia] = {
      activo: diaConfig?.activo ?? Boolean(diaConfig?.entrada || diaConfig?.salida) ?? false,
      entrada: diaConfig?.entrada || '',
      salida: diaConfig?.salida || '',
      pausa_inicio: diaConfig?.pausa_inicio,
      pausa_fin: diaConfig?.pausa_fin,
    };
  });

  // Obtener descanso
  const descansoValue = config?.descanso;
  const tieneDescanso = typeof descansoValue === 'number' && descansoValue > 0;

  return {
    tipoJornada: esFija ? 'fija' : 'flexible',
    horasSemanales: jornada.horasSemanales.toString(),
    horariosFijos,
    tieneDescanso,
    descansoMinutos: tieneDescanso && typeof descansoValue === 'number' ? descansoValue.toString() : '0',
  };
}

export function JornadaDisplay({ jornada, origen, equipoNombre, loading }: JornadaDisplayProps) {
  if (loading) {
    return (
      <div className="text-sm text-gray-500">
        Cargando información de jornada...
      </div>
    );
  }

  if (!jornada) {
    return (
      <div className="text-sm text-gray-500">
        No hay jornada asignada
      </div>
    );
  }

  const formData = convertToFormData(jornada);

  return (
    <div className="space-y-4">
      <JornadaFormFields
        data={formData}
        onChange={() => {}} // No-op en modo solo lectura
        disabled={true}
        showAsignacion={false}
      />
    </div>
  );
}
