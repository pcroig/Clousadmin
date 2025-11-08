// ========================================
// Enums y constantes del sistema
// ========================================
// Este archivo centraliza todos los enums de Prisma para uso en el código
// Exporta los enums directamente desde @prisma/client para mantener type safety

import {
  UsuarioRol,
  EstadoEmpleado,
  TipoContrato,
  TipoEquipo,
  EstadoFichaje,
  TipoFichajeEvento,
  TipoAusencia,
  EstadoAusencia,
  EstadoSolicitud,
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
  pendiente_aprobacion: 'Pendiente Aprobación',
  en_curso: 'Aprobada',
  completada: 'Completada',
  auto_aprobada: 'Auto-aprobada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};

export const ESTADO_SOLICITUD_LABELS: Record<EstadoSolicitud, string> = {
  pendiente: 'Pendiente',
  requiere_revision: 'Requiere Revisión',
  auto_aprobada: 'Auto-aprobada',
  aprobada_manual: 'Aprobada',
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
  { value: EstadoAusencia.pendiente_aprobacion, label: ESTADO_AUSENCIA_LABELS.pendiente_aprobacion },
  { value: EstadoAusencia.en_curso, label: ESTADO_AUSENCIA_LABELS.en_curso },
  { value: EstadoAusencia.completada, label: ESTADO_AUSENCIA_LABELS.completada },
  { value: EstadoAusencia.auto_aprobada, label: ESTADO_AUSENCIA_LABELS.auto_aprobada },
  { value: EstadoAusencia.rechazada, label: ESTADO_AUSENCIA_LABELS.rechazada },
  { value: EstadoAusencia.cancelada, label: ESTADO_AUSENCIA_LABELS.cancelada },
];

export const ESTADOS_FICHAJE_OPTIONS = [
  { value: EstadoFichaje.en_curso, label: ESTADO_FICHAJE_LABELS.en_curso },
  { value: EstadoFichaje.pendiente, label: ESTADO_FICHAJE_LABELS.pendiente },
  { value: EstadoFichaje.finalizado, label: ESTADO_FICHAJE_LABELS.finalizado },
];

