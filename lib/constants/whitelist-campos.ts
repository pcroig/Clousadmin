// ========================================
// Whitelist de Campos Permitidos
// ========================================
// Define qué campos de empleado pueden ser modificados mediante solicitudes

/**
 * Campos permitidos para solicitudes de cambio de datos personales
 * Solo estos campos pueden ser modificados por empleados vía solicitudes
 */
export const CAMPOS_EMPLEADO_PERMITIDOS = [
  'nombre',
  'apellidos',
  'telefono',
  'telefonoEmergencia',
  'direccionCalle',
  'direccionNumero',
  'direccionPiso',
  'codigoPostal',
  'ciudad',
  'direccionProvincia',
  'emailPersonal',
  'contactoEmergenciaNombre',
  'contactoEmergenciaRelacion',
  'contactoEmergenciaTelefono',
  'iban',
] as const;

/**
 * Type helper para campos permitidos
 */
export type CampoEmpleadoPermitido = (typeof CAMPOS_EMPLEADO_PERMITIDOS)[number];

/**
 * Verifica si un campo es permitido
 */
export function esCampoPermitido(campo: string): campo is CampoEmpleadoPermitido {
  return CAMPOS_EMPLEADO_PERMITIDOS.includes(campo as CampoEmpleadoPermitido);
}

