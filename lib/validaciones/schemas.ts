// ========================================
// Validation Schemas with Zod
// ========================================

import { z } from 'zod';

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
  puesto: z.string().optional(),
  departamento: z.string().optional(),
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
  fechaInicio: z.string().or(z.date()),
  fechaFin: z.string().or(z.date()),
  medioDia: z.boolean().default(false),
  descripcion: z.string().optional(),
  motivo: z.string().optional(),
  justificanteUrl: z.string().optional(),
  diasIdeales: z.array(z.string()).optional(),
  diasPrioritarios: z.array(z.string()).optional(),
  diasAlternativos: z.array(z.string()).optional(),
  equipoId: z.string().uuid().optional(),
}).refine(
  (data) => {
    const inicio = new Date(data.fechaInicio);
    const fin = new Date(data.fechaFin);
    return fin >= inicio;
  },
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['fechaFin'],
  }
).refine(
  (data) => {
    if (data.tipo === 'otro' && !data.motivo) {
      return false;
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

export type AusenciaCreateInput = z.infer<typeof ausenciaCreateSchema>;
export type AusenciaApprovalInput = z.infer<typeof ausenciaApprovalSchema>;

// ========================================
// FESTIVOS
// ========================================

export const festivoCreateSchema = z.object({
  fecha: z.date(),
  nombre: z.string().min(1, 'Nombre requerido'),
  tipo: z.enum(['nacional', 'autonomico', 'local', 'empresa']),
  comunidadAutonoma: z.string().optional(),
  origen: z.enum(['api', 'manual']).default('manual'),
  activo: z.boolean().default(true),
  empresaId: z.string().uuid(),
});

export const festivoUpdateSchema = festivoCreateSchema.partial().omit({ empresaId: true });

export type FestivoCreateInput = z.infer<typeof festivoCreateSchema>;
export type FestivoUpdateInput = z.infer<typeof festivoUpdateSchema>;

// ========================================
// SALDO AUSENCIAS
// ========================================

export const saldoAusenciasUpdateSchema = z.object({
  año: z.number().int().positive(),
  diasTotales: z.number().int().nonnegative(),
});

export type SaldoAusenciasUpdateInput = z.infer<typeof saldoAusenciasUpdateSchema>;
