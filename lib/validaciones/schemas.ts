// ========================================
// Validation Schemas with Zod
// ========================================

import { z } from 'zod';

const HORA_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ========================================
// SIGNUP & ONBOARDING
// ========================================

export const signupSchema = z.object({
  // Datos de la empresa
  nombreEmpresa: z.string().min(1, 'Nombre de empresa requerido'),
  webEmpresa: z
    .union([
      z.string(),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((val) => {
      if (!val || val === '') return null;
      // Normalizar URL: agregar https:// si no tiene protocolo
      let url = val.trim();
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      return url;
    }),

  // Datos del primer HR admin
  nombre: z.string().min(1, 'Nombre requerido'),
  apellidos: z.string().min(1, 'Apellidos requeridos'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  consentimientoTratamiento: z
    .boolean()
    .refine((value) => value === true, {
      message: 'Debes aceptar el tratamiento de datos para continuar',
    }),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const sedeCreateSchema = z.object({
  ciudad: z.string().min(1, 'Ciudad requerida'),
  empresaId: z.string().uuid(),
  asignacion: z
    .object({
      tipo: z.enum(['empresa', 'equipo']),
      equipoId: z.string().uuid().optional(),
    })
    .optional(),
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
  activo: z.boolean().optional(),
  entrada: z.string().optional(), // "09:00"
  salida: z.string().optional(), // "18:00"
  pausa: z.number().optional(), // Horas de pausa (ej: 1)
  pausa_inicio: z.string().optional(), // "14:00"
  pausa_fin: z.string().optional(), // "15:00"
});

const jornadaConfigSchema = z
  .object({
    tipo: z.enum(['fija', 'flexible']).optional(),
    descansoMinimo: z.string().optional(),
    limiteInferior: z.string().optional(),
    limiteSuperior: z.string().optional(),
  })
  .catchall(jornadaConfigDiaSchema);

export const jornadaCreateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  empresaId: z.string().uuid(),
  tipo: z.enum(['fija', 'flexible']),
  horasSemanales: z.number().positive('Horas semanales deben ser positivas'),
  
  // Configuración por día (para jornadas fijas)
  config: jornadaConfigSchema.optional(),
  
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
  empleadoId: z.string().uuid().optional(),
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
  periodo: z.enum(['manana', 'tarde']).optional(), // Solo cuando medioDia=true
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
).refine(
  (data) => {
    if (data.medioDia && !data.periodo) {
      return false;
    }
    return true;
  },
  {
    message: 'Debe especificar el periodo (mañana o tarde) cuando es medio día',
    path: ['periodo'],
  }
).refine(
  (data) => {
    if (data.tipo === 'otro') {
      return Boolean(data.motivo && data.motivo.trim().length > 0);
    }
    return true;
  },
  {
    message: 'El motivo es obligatorio para ausencias de tipo "Otro"',
    path: ['motivo'],
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
  periodo: z.enum(['manana', 'tarde']).optional().nullable(), // Solo cuando medioDia=true
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
// FESTIVOS PERSONALIZADOS POR EMPLEADO
// ========================================

export const empleadoFestivoCreateSchema = z.object({
  empleadoId: z.string().uuid(),
  fecha: z.string().or(z.date()),
  nombre: z.string().min(1, 'Nombre requerido').max(200),
  activo: z.boolean().default(true),
});

export const empleadoFestivoUpdateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(200).optional(),
  fecha: z.string().or(z.date()).optional(),
  activo: z.boolean().optional(),
});

export type EmpleadoFestivoCreateInput = z.infer<typeof empleadoFestivoCreateSchema>;
export type EmpleadoFestivoUpdateInput = z.infer<typeof empleadoFestivoUpdateSchema>;

// ========================================
// DÍAS PERSONALIZADOS DE AUSENCIAS
// ========================================

export const empleadoDiasAusenciasUpdateSchema = z.object({
  diasAusenciasPersonalizados: z.number().int().min(0).max(365).nullable(),
}).refine(
  (data) => {
    // Si es null, es válido (usa el mínimo global)
    if (data.diasAusenciasPersonalizados === null) {
      return true;
    }
    // Si es un número, debe ser al menos el mínimo (validación adicional en API)
    return data.diasAusenciasPersonalizados >= 0;
  },
  {
    message: 'Los días personalizados deben ser un número positivo o null para usar el mínimo global',
  }
);

export type EmpleadoDiasAusenciasUpdateInput = z.infer<typeof empleadoDiasAusenciasUpdateSchema>;

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

export const calendarioJornadaOnboardingSchema = z
  .object({
    diasLaborables: calendarioLaboralUpdateSchema,
    jornada: z.object({
      nombre: z.string().min(3, 'El nombre de la jornada es obligatorio').max(100),
      tipo: z.enum(['flexible', 'fija']),
      horasSemanales: z
        .number()
        .min(1, 'Las horas semanales deben ser mayores que 0')
        .max(168, 'Las horas semanales no pueden superar las 168 horas'),
      limiteInferior: z
        .string()
        .regex(HORA_24H_REGEX, 'Hora inválida (formato HH:MM)')
        .optional(),
      limiteSuperior: z
        .string()
        .regex(HORA_24H_REGEX, 'Hora inválida (formato HH:MM)')
        .optional(),
      horaEntrada: z
        .string()
        .regex(HORA_24H_REGEX, 'Hora inválida (formato HH:MM)')
        .optional(),
      horaSalida: z
        .string()
        .regex(HORA_24H_REGEX, 'Hora inválida (formato HH:MM)')
        .optional(),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.jornada.tipo === 'flexible') {
      if (!data.jornada.limiteInferior || !data.jornada.limiteSuperior) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Define un rango horario para la jornada flexible',
          path: ['jornada', 'limites'],
        });
      }
    } else {
      if (!data.jornada.horaEntrada || !data.jornada.horaSalida) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Define hora de entrada y salida para la jornada fija',
          path: ['jornada', 'horario'],
        });
      }
    }
  });

export type CalendarioJornadaOnboardingInput = z.infer<typeof calendarioJornadaOnboardingSchema>;

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
  solapamientoMaximoPct: z.number().int().min(0).max(100).optional(),
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
).superRefine((data, ctx) => {
  if (data.solapamientoMaximoPct !== undefined && data.alcance !== 'equipos') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El solapamiento sólo aplica cuando la campaña es por equipos',
      path: ['solapamientoMaximoPct'],
    });
  }
});

export type CampanaVacacionesCreateInput = z.infer<typeof campanaVacacionesCreateSchema>;

export const preferenciaVacacionesCreateSchema = z.object({
  campanaId: z.string().uuid(),
  diasIdeales: z.array(z.string().datetime()).min(1, 'Debe incluir al menos un día ideal'),
  diasPrioritarios: z.array(z.string().datetime()).optional(),
  diasAlternativos: z.array(z.string().datetime()).optional(),
});

export type PreferenciaVacacionesCreateInput = z.infer<typeof preferenciaVacacionesCreateSchema>;
