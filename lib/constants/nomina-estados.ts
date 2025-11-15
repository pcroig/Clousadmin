// ========================================
// Constantes de Estados de Nóminas
// ========================================

export const NOMINA_ESTADOS = {
  PENDIENTE: 'pendiente',
  COMPLETADA: 'completada',
  PUBLICADA: 'publicada',
} as const;

export const EVENTO_ESTADOS = {
  ABIERTO: 'abierto',
  CERRADO: 'cerrado',
} as const;

export type NominaEstado = typeof NOMINA_ESTADOS[keyof typeof NOMINA_ESTADOS];
export type EventoEstado = typeof EVENTO_ESTADOS[keyof typeof EVENTO_ESTADOS];

// Labels para UI
export const NOMINA_ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  [NOMINA_ESTADOS.PENDIENTE]: { 
    label: 'Pendiente', 
    color: 'text-orange-600' 
  },
  [NOMINA_ESTADOS.COMPLETADA]: { 
    label: 'Completada', 
    color: 'text-green-600' 
  },
  [NOMINA_ESTADOS.PUBLICADA]: { 
    label: 'Publicada', 
    color: 'text-gray-900' 
  },
};

export const EVENTO_ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  [EVENTO_ESTADOS.ABIERTO]: { 
    label: 'Abierto', 
    color: 'text-blue-600' 
  },
  [EVENTO_ESTADOS.CERRADO]: { 
    label: 'Cerrado', 
    color: 'text-gray-600' 
  },
};

