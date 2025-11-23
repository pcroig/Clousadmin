import type { CalendarioJornadaOnboardingInput } from '@/lib/validaciones/schemas';

export const DEFAULT_JORNADA_FORM_VALUES = {
  nombre: 'Jornada estándar (40h)',
  tipo: 'flexible' as const,
  horasSemanales: 40,
  limiteInferior: '07:00',
  limiteSuperior: '21:00',
  horaEntrada: '09:00',
  horaSalida: '18:00',
};

export function buildDefaultJornadaPayload(): CalendarioJornadaOnboardingInput['jornada'] {
  return {
    nombre: DEFAULT_JORNADA_FORM_VALUES.nombre,
    tipo: DEFAULT_JORNADA_FORM_VALUES.tipo,
    horasSemanales: DEFAULT_JORNADA_FORM_VALUES.horasSemanales,
    limiteInferior: DEFAULT_JORNADA_FORM_VALUES.limiteInferior,
    limiteSuperior: DEFAULT_JORNADA_FORM_VALUES.limiteSuperior,
    horaEntrada: DEFAULT_JORNADA_FORM_VALUES.horaEntrada,
    horaSalida: DEFAULT_JORNADA_FORM_VALUES.horaSalida,
  };
}


