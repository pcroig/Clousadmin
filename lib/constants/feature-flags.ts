// ========================================
// Feature Flags - Centralized toggles
// ========================================

export const PLANTILLAS_ENABLED = process.env.NEXT_PUBLIC_PLANTILLAS_ENABLED === 'true';

export const CAMPANAS_VACACIONES_ENABLED =
  process.env.NEXT_PUBLIC_CAMPANAS_VACACIONES_ENABLED === 'true';

export const CAMPANAS_VACACIONES_FEATURE_NAME = 'Campañas de vacaciones';



