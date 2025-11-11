// ========================================
// Validation Schemas with Zod
// ========================================

import { z } from 'zod';

// ========================================
// SIGNUP & ONBOARDING
// ========================================

export const signupSchema = z.object({
  // Datos de la empresa
  nombreEmpresa: z.string().min(1, 'Nombre de empresa requerido'),
  webEmpresa: z
    .union([
      z.string().url('URL inválida'),
      z.literal(''),
      z.null(),
    ])
    .optional(),
  
  // Datos del primer HR admin
  nombre: z.string().min(1, 'Nombre requerido'),
  apellidos: z.string().min(1, 'Apellidos requeridos'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const sedeCreateSchema = z.object({
  ciudad: z.string().min(1, 'Ciudad requerida'),
  empresaId: z.string().uuid(),
});

export type SedeCreateInput = z.infer<typeof sedeCreateSchema>;

export const integracionCreateSchema = z.object({
  tipo: z.enum(['calendario', 'comunicacion', 'nominas']),
  proveedor: z.string().min(1, 'Proveedor requerido'),
  config: z.record(z.string(), z.any()).optional(),
  empresaId: z.string().uuid(),
});

export type IntegracionCreateInput = z.infer<typeof integracionCreateSchema>;

// ========================================
// EQUIPOS
// ========================================

export const equipoCreateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().optional(),
  managerId: z.string().uuid().optional(),
  empresaId: z.string().uuid(),
});

export type EquipoCreateInput = z.infer<typeof equipoCreateSchema>;

// ========================================
// EMPLEADOS
// ========================================

export const empleadoCreateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  apellidos: z.string().min(1, 'Apellidos requeridos'),
  email: z.string().email('Email inválido'),
  nif: z.string().optional(),
  telefono: z.string().optional(),
  puestoId: z.string().uuid().optional(),
  equipoIds: z.array(z.string().uuid()).optional(),
  fechaAlta: z.date().default(() => new Date()),
  empresaId: z.string().uuid(),
});

export type EmpleadoCreateInput = z.infer<typeof empleadoCreateSchema>;

// ========================================
// JORNADAS
// ========================================

export const jornadaConfigDiaSchema = z.object({
  activo: z.boolean(),
  entrada: z.string().optional(), // "09:00"
  salida: z.string().optional(), // "18:00"
  pausa: z.number().optional(), // Horas de pausa (ej: 1)
});

export const jornadaCreateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  empresaId: z.string().uuid(),
  tipo: z.enum(['fija', 'flexible']),
  horasSemanales: z.number().positive('Horas semanales deben ser positivas'),
  
  // Configuración por día (para jornadas fijas)
  config: z.record(z.string(), jornadaConfigDiaSchema).optional(),
  
  // Límites de horario
  limiteInferior: z.string().optional(), // "08:00"
  limiteSuperior: z.string().optional(), // "20:00"
});

export const jornadaUpdateSchema = jornadaCreateSchema.partial().omit({ empresaId: true });

export const jornadaAsignarSchema = z.object({
  nivel: z.enum(['empresa', 'equipo', 'individual']),
  empresaId: z.string().uuid().optional(),
  equipoId: z.string().uuid().optional(),
  empleadoId: z.string().uuid().optional(),
});

export type JornadaCreateInput = z.infer<typeof jornadaCreateSchema>;
export type JornadaUpdateInput = z.infer<typeof jornadaUpdateSchema>;
export type JornadaAsignarInput = z.infer<typeof jornadaAsignarSchema>;

// ========================================
// AUSENCIAS
// ========================================

export const ausenciaCreateSchema = z.object({
  tipo: z.enum(['vacaciones', 'enfermedad', 'enfermedad_familiar', 'maternidad_paternidad', 'otro']),
  fechaInicio: z.union([
    z.string().refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'fechaInicio debe ser una fecha válida',
    }),
    z.date(),
  ]),
  fechaFin: z.union([
    z.string().refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'fechaFin debe ser una fecha válida',
    }),
    z.date(),
  ]),
  medioDia: z.boolean().default(false),
  descripcion: z.string().optional(),
  motivo: z.string().optional(),
  justificanteUrl: z.string().url().optional(),
  documentoId: z.string().uuid().optional(), // ID del documento justificante
  diasIdeales: z.array(z.string()).optional(),
  diasPrioritarios: z.array(z.string()).optional(),
  diasAlternativos: z.array(z.string()).optional(),
  equipoId: z.string().uuid().optional(),
}).refine(
  (data) => {
    const inicio = new Date(data.fechaInicio);
    const fin = new Date(data.fechaFin);
    // Validar que las fechas sean válidas
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return false;
    }
    return fin >= inicio;
  },
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['fechaFin'],
  }
);

export const ausenciaApprovalSchema = z.object({
  accion: z.enum(['aprobar', 'rechazar']),
  motivoRechazo: z.string().optional(),
}).refine(
  (data) => {
    if (data.accion === 'rechazar' && !data.motivoRechazo) {
      return false;
    }
    return true;
  },
  {
    message: 'El motivo de rechazo es obligatorio',
    path: ['motivoRechazo'],
  }
);

export const ausenciaUpdateSchema = z.object({
  tipo: z.enum(['vacaciones', 'enfermedad', 'enfermedad_familiar', 'maternidad_paternidad', 'otro']).optional(),
  fechaInicio: z.string().or(z.date()).optional(),
  fechaFin: z.string().or(z.date()).optional(),
  medioDia: z.boolean().optional(),
  descripcion: z.string().optional().nullable(),
  motivo: z.string().optional().nullable(),
  justificanteUrl: z.string().url().optional().nullable(),
  documentoId: z.string().uuid().optional().nullable(), // ID del documento justificante
  estado: z.enum(['pendiente', 'confirmada', 'completada', 'rechazada']).optional(),
  // Para mantener compatibilidad con aprobar/rechazar
  accion: z.enum(['aprobar', 'rechazar']).optional(),
  motivoRechazo: z.string().optional(),
}).refine(
  (data) => {
    // Si hay fechas, validar que fechaFin >= fechaInicio
    if (data.fechaInicio && data.fechaFin) {
      const inicio = new Date(data.fechaInicio);
      const fin = new Date(data.fechaFin);
      return fin >= inicio;
    }
    return true;
  },
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['fechaFin'],
  }
);

export type AusenciaCreateInput = z.infer<typeof ausenciaCreateSchema>;
export type AusenciaApprovalInput = z.infer<typeof ausenciaApprovalSchema>;
export type AusenciaUpdateInput = z.infer<typeof ausenciaUpdateSchema>;

// ========================================
// FESTIVOS
// ========================================

export const festivoCreateSchema = z.object({
  fecha: z.string().or(z.date()),
  nombre: z.string().min(1, 'Nombre requerido').max(100),
  activo: z.boolean().default(true),
});

export const festivoUpdateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(100).optional(),
  fecha: z.string().or(z.date()).optional(),
  activo: z.boolean().optional(),
});

export const importarFestivosSchema = z.object({
  añoInicio: z.number().int().optional(),
  añoFin: z.number().int().optional(),
}).refine(
  (data) => {
    if (data.añoInicio && data.añoFin) {
      return data.añoFin >= data.añoInicio;
    }
    return true;
  },
  {
    message: 'El año fin debe ser posterior o igual al año inicio',
    path: ['añoFin'],
  }
).refine(
  (data) => {
    const añoActual = new Date().getFullYear();
    if (data.añoInicio && Math.abs(data.añoInicio - añoActual) > 5) {
      return false;
    }
    if (data.añoFin && Math.abs(data.añoFin - añoActual) > 5) {
      return false;
    }
    return true;
  },
  {
    message: 'Los años deben estar dentro del rango de ±5 años del año actual',
    path: ['añoInicio'],
  }
);

export type FestivoCreateInput = z.infer<typeof festivoCreateSchema>;
export type FestivoUpdateInput = z.infer<typeof festivoUpdateSchema>;
export type ImportarFestivosInput = z.infer<typeof importarFestivosSchema>;

// ========================================
// CALENDARIO LABORAL
// ========================================

export const calendarioLaboralUpdateSchema = z.object({
  lunes: z.boolean(),
  martes: z.boolean(),
  miercoles: z.boolean(),
  jueves: z.boolean(),
  viernes: z.boolean(),
  sabado: z.boolean(),
  domingo: z.boolean(),
}).refine(
  (data) => {
    // Al menos un día debe estar activo
    return Object.values(data).some((dia) => dia === true);
  },
  {
    message: 'Debe haber al menos un día laborable activo',
  }
);

export type CalendarioLaboralUpdateInput = z.infer<typeof calendarioLaboralUpdateSchema>;

// ========================================
// SALDO AUSENCIAS
// ========================================

export const saldoAusenciasUpdateSchema = z.object({
  año: z.number().int().positive(),
  diasTotales: z.number().int().nonnegative(),
});

export type SaldoAusenciasUpdateInput = z.infer<typeof saldoAusenciasUpdateSchema>;

// ========================================
// CAMPAÑAS DE VACACIONES
// ========================================

export const campanaVacacionesCreateSchema = z.object({
  titulo: z.string().min(1, 'Título requerido').max(200),
  alcance: z.enum(['todos', 'equipos']).default('todos'),
  equipoIds: z.array(z.string().uuid()).optional(),
  solapamientoMaximoPct: z.number().int().min(0).max(100).default(30),
  fechaInicioObjetivo: z.string().or(z.date()),
  fechaFinObjetivo: z.string().or(z.date()),
}).refine(
  (data) => {
    const inicio = new Date(data.fechaInicioObjetivo);
    const fin = new Date(data.fechaFinObjetivo);
    return fin >= inicio;
  },
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['fechaFinObjetivo'],
  }
);

export type CampanaVacacionesCreateInput = z.infer<typeof campanaVacacionesCreateSchema>;

export const preferenciaVacacionesCreateSchema = z.object({
  campanaId: z.string().uuid(),
  diasIdeales: z.array(z.string().datetime()).min(1, 'Debe incluir al menos un día ideal'),
  diasPrioritarios: z.array(z.string().datetime()).optional(),
  diasAlternativos: z.array(z.string().datetime()).optional(),
});

export type PreferenciaVacacionesCreateInput = z.infer<typeof preferenciaVacacionesCreateSchema>;
