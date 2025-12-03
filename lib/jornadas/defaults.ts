import type { CalendarioJornadaOnboardingInput } from '@/lib/validaciones/schemas';

// NOTE: 'nombre' field has been removed from jornadas
// NOTE: limiteInferior/Superior are now global per company, not per jornada
export const DEFAULT_JORNADA_FORM_VALUES = {
  tipo: 'flexible' as const,
  horasSemanales: 40,
  horaEntrada: '09:00',
  horaSalida: '18:00',
};

export const DEFAULT_LIMITES_FICHAJE = {
  limiteInferiorFichaje: '07:00',
  limiteSuperiorFichaje: '21:00',
};

export function buildDefaultJornadaItem(): CalendarioJornadaOnboardingInput['jornadas'][0] {
  return {
    tipo: DEFAULT_JORNADA_FORM_VALUES.tipo,
    horasSemanales: DEFAULT_JORNADA_FORM_VALUES.horasSemanales,
    horaEntrada: DEFAULT_JORNADA_FORM_VALUES.horaEntrada,
    horaSalida: DEFAULT_JORNADA_FORM_VALUES.horaSalida,
  };
}


