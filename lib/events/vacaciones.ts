import { CAMPANAS_VACACIONES_ENABLED } from '@/lib/constants/feature-flags';

const CAMPANA_URL_REGEX = /campanas\/([^/?#]+)/i;

export const VACACIONES_PREFERENCIAS_EVENT = 'vacaciones:preferencias:open';

export interface VacacionesPreferenciasEventDetail {
  campanaId: string;
  handled?: boolean;
}

export const emitPreferenciasVacacionesEvent = (campanaId: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!CAMPANAS_VACACIONES_ENABLED) {
    return false;
  }

  const detail: VacacionesPreferenciasEventDetail = {
    campanaId,
    handled: false,
  };

  window.dispatchEvent(new CustomEvent(VACACIONES_PREFERENCIAS_EVENT, { detail }));
  return detail.handled === true;
};

export const openPreferenciasModalFromUrl = (accionUrl?: string): boolean => {
  if (!accionUrl) {
    return false;
  }

  if (!CAMPANAS_VACACIONES_ENABLED) {
    return false;
  }

  const match = CAMPANA_URL_REGEX.exec(accionUrl);
  if (!match?.[1]) {
    return false;
  }

  return emitPreferenciasVacacionesEvent(match[1]);
};

