// ========================================
// Enums y constantes del sistema
// ========================================
// Este archivo centraliza todos los enums de Prisma para uso en el código
// Exporta los enums directamente desde @prisma/client para mantener type safety

import {
  EstadoAusencia,
  EstadoEmpleado,
  EstadoFichaje,
  EstadoSolicitud,
  EstadoSolicitudCorreccionFichaje,
  TipoAusencia,
  TipoContrato,
  TipoEquipo,
  TipoFichajeEvento,
  UsuarioRol,
} from '@prisma/client';

// ========================================
// EXPORTAR ENUMS DE PRISMA
// ========================================

export {
  UsuarioRol,
  EstadoEmpleado,
  TipoContrato,
  TipoEquipo,
  EstadoFichaje,
  TipoFichajeEvento,
  TipoAusencia,
  EstadoAusencia,
  EstadoSolicitud,
  EstadoSolicitudCorreccionFichaje,
};

// ========================================
// MAPEOS PARA DISPLAY (UI)
// ========================================

export const USUARIO_ROL_LABELS: Record<UsuarioRol, string> = {
  platform_admin: 'Admin Plataforma',
  hr_admin: 'Admin RR.HH.',
  manager: 'Manager',
  empleado: 'Empleado',
};

export const ESTADO_EMPLEADO_LABELS: Record<EstadoEmpleado, string> = {
  activo: 'Activo',
  baja: 'Baja',
  suspendido: 'Suspendido',
};

export const TIPO_CONTRATO_LABELS: Record<TipoContrato, string> = {
  indefinido: 'Indefinido',
  temporal: 'Temporal',
  administrador: 'Administrador',
  fijo_discontinuo: 'Fijo Discontinuo',
  becario: 'Becario',
  practicas: 'Prácticas',
  obra_y_servicio: 'Obra y Servicio',
};

export const TIPO_EQUIPO_LABELS: Record<TipoEquipo, string> = {
  proyecto: 'Proyecto',
  squad: 'Squad',
  temporal: 'Temporal',
};

export const ESTADO_FICHAJE_LABELS: Record<EstadoFichaje, string> = {
  en_curso: 'En Curso',
  pendiente: 'Pendiente Revisión',
  finalizado: 'Finalizado',
};

export const TIPO_FICHAJE_EVENTO_LABELS: Record<TipoFichajeEvento, string> = {
  entrada: 'Entrada',
  pausa_inicio: 'Inicio Pausa',
  pausa_fin: 'Fin Pausa',
  salida: 'Salida',
};

export const TIPO_AUSENCIA_LABELS: Record<TipoAusencia, string> = {
  vacaciones: 'Vacaciones',
  enfermedad: 'Enfermedad',
  enfermedad_familiar: 'Enfermedad Familiar',
  maternidad_paternidad: 'Maternidad/Paternidad',
  otro: 'Otro',
};

export const ESTADO_AUSENCIA_LABELS: Record<EstadoAusencia, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  rechazada: 'Rechazada',
};

export const PERIODO_MEDIO_DIA_VALUES = ['manana', 'tarde'] as const;
export type PeriodoMedioDiaValue = (typeof PERIODO_MEDIO_DIA_VALUES)[number];

export const PERIODO_MEDIO_DIA_LABELS: Record<PeriodoMedioDiaValue, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
};

export const ESTADO_SOLICITUD_LABELS: Record<EstadoSolicitud, string> = {
  pendiente: 'Pendiente',
  requiere_revision: 'Requiere Revisión',
  auto_aprobada: 'Aprobada automáticamente',
  aprobada_manual: 'Aprobada',
  rechazada: 'Rechazada',
};

export const ESTADO_SOLICITUD_CORRECCION_FICHAJE_LABELS: Record<EstadoSolicitudCorreccionFichaje, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

// ========================================
// HELPERS DE VALIDACIÓN
// ========================================

export function isValidEstadoAusencia(value: string): value is EstadoAusencia {
  return Object.values(EstadoAusencia).includes(value as EstadoAusencia);
}

export function isValidTipoAusencia(value: string): value is TipoAusencia {
  return Object.values(TipoAusencia).includes(value as TipoAusencia);
}

export function isValidEstadoFichaje(value: string): value is EstadoFichaje {
  return Object.values(EstadoFichaje).includes(value as EstadoFichaje);
}

export function isValidTipoFichajeEvento(value: string): value is TipoFichajeEvento {
  return Object.values(TipoFichajeEvento).includes(value as TipoFichajeEvento);
}

export function isValidEstadoSolicitud(value: string): value is EstadoSolicitud {
  return Object.values(EstadoSolicitud).includes(value as EstadoSolicitud);
}

export function isValidEstadoSolicitudCorreccionFichaje(value: string): value is EstadoSolicitudCorreccionFichaje {
  return Object.values(EstadoSolicitudCorreccionFichaje).includes(value as EstadoSolicitudCorreccionFichaje);
}

// ========================================
// ARRAYS PARA SELECT/DROPDOWN
// ========================================

export const TIPOS_AUSENCIA_OPTIONS = [
  { value: TipoAusencia.vacaciones, label: TIPO_AUSENCIA_LABELS.vacaciones },
  { value: TipoAusencia.enfermedad, label: TIPO_AUSENCIA_LABELS.enfermedad },
  { value: TipoAusencia.enfermedad_familiar, label: TIPO_AUSENCIA_LABELS.enfermedad_familiar },
  { value: TipoAusencia.maternidad_paternidad, label: TIPO_AUSENCIA_LABELS.maternidad_paternidad },
  { value: TipoAusencia.otro, label: TIPO_AUSENCIA_LABELS.otro },
];

export const ESTADOS_AUSENCIA_OPTIONS = [
  { value: EstadoAusencia.pendiente, label: ESTADO_AUSENCIA_LABELS.pendiente },
  { value: EstadoAusencia.confirmada, label: ESTADO_AUSENCIA_LABELS.confirmada },
  { value: EstadoAusencia.completada, label: ESTADO_AUSENCIA_LABELS.completada },
  { value: EstadoAusencia.rechazada, label: ESTADO_AUSENCIA_LABELS.rechazada },
];

export const PERIODOS_MEDIO_DIA_OPTIONS = [
  { value: 'manana', label: PERIODO_MEDIO_DIA_LABELS.manana },
  { value: 'tarde', label: PERIODO_MEDIO_DIA_LABELS.tarde },
] as const;

export const ESTADOS_FICHAJE_OPTIONS = [
  { value: EstadoFichaje.en_curso, label: ESTADO_FICHAJE_LABELS.en_curso },
  { value: EstadoFichaje.pendiente, label: ESTADO_FICHAJE_LABELS.pendiente },
  { value: EstadoFichaje.finalizado, label: ESTADO_FICHAJE_LABELS.finalizado },
];

