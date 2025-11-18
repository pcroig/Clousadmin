export const TIPOS_AUTO_APROBABLES = [
  'enfermedad',
  'enfermedad_familiar',
  'maternidad_paternidad',
] as const;

export type TipoAutoAprobable = (typeof TIPOS_AUTO_APROBABLES)[number];

export const TIPOS_DESCUENTAN_SALDO = ['vacaciones'] as const;

export type TipoDescuentaSaldo = (typeof TIPOS_DESCUENTAN_SALDO)[number];

