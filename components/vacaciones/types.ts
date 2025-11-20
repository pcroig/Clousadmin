// TipoPropuesta kept for internal API use but not displayed in UI
export type TipoPropuesta = 'ideal' | 'alternativo' | 'ajustado';

// Simplified payload - removed tipo and motivo (not displayed/used in UI)
export interface VacacionesAjustePayload {
  preferenciaId: string;
  fechaInicio: string;
  fechaFin: string;
}



