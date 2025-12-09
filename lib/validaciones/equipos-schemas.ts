// ========================================
// Equipos - Validation Schemas
// ========================================

import { z } from 'zod';
import { idSchema, nullishIdSchema, nullableIdSchema } from './schemas';

/**
 * Schema para crear un equipo
 */
export const createEquipoSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  descripcion: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
  sedeId: nullishIdSchema,
});

export type CreateEquipoInput = z.infer<typeof createEquipoSchema>;

/**
 * Schema para actualizar un equipo
 */
export const updateEquipoSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  descripcion: z.string().max(500, 'La descripción no puede exceder 500 caracteres').nullish(),
  sedeId: nullishIdSchema,
});

export type UpdateEquipoInput = z.infer<typeof updateEquipoSchema>;

/**
 * Schema para añadir miembro a equipo
 */
export const addMemberSchema = z.object({
  empleadoId: idSchema,
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

/**
 * Schema para cambiar manager de equipo
 */
export const changeManagerSchema = z.object({
  managerId: nullableIdSchema,
});

export type ChangeManagerInput = z.infer<typeof changeManagerSchema>;

/**
 * Schema para política de ausencias de equipo
 */
export const politicaAusenciasSchema = z.object({
  maxSolapamientoPct: z
    .number()
    .int('Debe ser un número entero')
    .min(0, 'No puede ser negativo')
    .max(100, 'No puede ser mayor a 100'),
  requiereAntelacionDias: z
    .number()
    .int('Debe ser un número entero')
    .min(0, 'No puede ser negativo')
    .max(365, 'No puede ser mayor a 365 días'),
});

export type PoliticaAusenciasInput = z.infer<typeof politicaAusenciasSchema>;







