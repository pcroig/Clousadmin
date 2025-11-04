// ========================================
// Onboarding Validation Schemas (Zod)
// ========================================
// Validación de datos del onboarding de empleados

import { z } from 'zod';
import { validarIBAN } from './iban';
import { validarNIFoNIE, obtenerInfoValidacionNIF } from './nif';

/**
 * Validar NSS (Número de Seguridad Social) español
 * Formato: 12 dígitos
 */
function validarNSS(nss: string): boolean {
  if (!nss) return false;
  
  // Limpiar espacios
  const nssLimpio = nss.trim().replace(/\s/g, '');
  
  // Validar formato: exactamente 12 dígitos
  const regexNSS = /^\d{12}$/;
  
  return regexNSS.test(nssLimpio);
}

/**
 * Schema para datos personales (Paso 1)
 */
export const datosPersonalesSchema = z.object({
  // Identificación (obligatorios)
  nif: z
    .string()
    .min(1, 'El NIF/NIE es obligatorio')
    .refine(
      (val) => {
        const info = obtenerInfoValidacionNIF(val);
        return info.valido;
      },
      {
        message: 'NIF/NIE inválido',
      }
    ),
  
  nss: z
    .string()
    .min(1, 'El NSS es obligatorio')
    .refine((val) => validarNSS(val), {
      message: 'NSS inválido (debe tener 12 dígitos)',
    }),

  // Contacto (obligatorio)
  telefono: z
    .string()
    .min(1, 'El teléfono es obligatorio')
    .regex(/^(\+34|0034)?[6-9]\d{8}$/, 'Formato de teléfono inválido (ej: +34612345678 o 612345678)'),

  // Dirección (obligatorios)
  direccionCalle: z
    .string()
    .min(1, 'La calle es obligatoria')
    .max(200, 'La calle no puede tener más de 200 caracteres'),
  
  direccionNumero: z
    .string()
    .min(1, 'El número es obligatorio')
    .max(10, 'El número no puede tener más de 10 caracteres'),
  
  direccionPiso: z
    .string()
    .max(10, 'El piso no puede tener más de 10 caracteres')
    .optional()
    .or(z.literal('')),
  
  codigoPostal: z
    .string()
    .min(1, 'El código postal es obligatorio')
    .regex(/^\d{5}$/, 'Código postal inválido (debe tener 5 dígitos)'),
  
  ciudad: z
    .string()
    .min(1, 'La ciudad es obligatoria')
    .max(100, 'La ciudad no puede tener más de 100 caracteres'),
  
  direccionProvincia: z
    .string()
    .min(1, 'La provincia es obligatoria')
    .max(100, 'La provincia no puede tener más de 100 caracteres'),

  // Información familiar (opcional)
  estadoCivil: z
    .enum(['soltero', 'casado', 'divorciado', 'viudo', 'pareja_hecho', ''])
    .optional()
    .or(z.literal('')),
  
  numeroHijos: z
    .number()
    .int()
    .min(0, 'El número de hijos no puede ser negativo')
    .max(20, 'El número de hijos parece incorrecto')
    .optional()
    .or(z.literal(0)),
});

/**
 * Schema para datos bancarios (Paso 2)
 */
export const datosBancariosSchema = z.object({
  iban: z
    .string()
    .min(1, 'El IBAN es obligatorio')
    .refine((val) => validarIBAN(val), {
      message: 'IBAN inválido (formato español requerido: ES + 22 dígitos)',
    }),
  
  titularCuenta: z
    .string()
    .min(1, 'El titular de la cuenta es obligatorio')
    .max(200, 'El titular no puede tener más de 200 caracteres'),
});

/**
 * Tipos inferidos de los schemas
 */
export type DatosPersonalesInput = z.infer<typeof datosPersonalesSchema>;
export type DatosBancariosInput = z.infer<typeof datosBancariosSchema>;


