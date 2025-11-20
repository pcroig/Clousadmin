/**
 * Constantes y quick mappings para el sistema de plantillas
 */

import { VariableDefinicion } from './tipos';

/**
 * Quick Mappings - Top 20 variables más usadas (resolución instantánea <1ms)
 * Estas variables se resuelven sin llamar a IA ni cache
 */
export const QUICK_MAPPINGS: Record<string, { path: string; encrypted?: boolean; format?: string }> = {
  // Empleado (12 variables)
  'empleado_nombre': { path: 'nombre' },
  'empleado_apellidos': { path: 'apellidos' },
  'empleado_nombre_completo': { path: null }, // Computed
  'empleado_email': { path: 'email' },
  'empleado_nif': { path: 'nif', encrypted: true },
  'empleado_nss': { path: 'nss', encrypted: true },
  'empleado_telefono': { path: 'telefono' },
  'empleado_direccion_completa': { path: null }, // Computed
  'empleado_ciudad': { path: 'ciudad' },
  'empleado_codigo_postal': { path: 'codigoPostal' },
  'empleado_iban': { path: 'iban', encrypted: true },
  'empleado_fecha_alta': { path: 'fechaAlta', format: 'date' },

  // Empresa (6 variables)
  'empresa_nombre': { path: 'empresa.nombre' },
  'empresa_cif': { path: 'empresa.cif' },
  'empresa_direccion': { path: 'empresa.direccion' },
  'empresa_email': { path: 'empresa.email' },
  'empresa_telefono': { path: 'empresa.telefono' },
  'empresa_web': { path: 'empresa.web' },

  // Sistema (2 variables)
  'fecha_hoy': { path: null }, // Computed
  'ano_actual': { path: null }, // Computed
};

/**
 * Variables del sistema disponibles (categorizado)
 * Nota: Estas son las variables base. El sistema de IA puede resolver
 * cualquier campo del schema de Prisma automáticamente.
 */
export const VARIABLES_DISPONIBLES: VariableDefinicion[] = [
  // ========================================
  // EMPLEADO (22 variables)
  // ========================================
  {
    key: 'empleado_nombre',
    label: 'Nombre del empleado',
    tipo: 'string',
    ejemplo: 'Juan',
    categoria: 'empleado',
  },
  {
    key: 'empleado_apellidos',
    label: 'Apellidos del empleado',
    tipo: 'string',
    ejemplo: 'García López',
    categoria: 'empleado',
  },
  {
    key: 'empleado_nombre_completo',
    label: 'Nombre completo del empleado',
    tipo: 'string',
    ejemplo: 'Juan García López',
    categoria: 'empleado',
  },
  {
    key: 'empleado_email',
    label: 'Email del empleado',
    tipo: 'string',
    ejemplo: 'juan.garcia@empresa.com',
    categoria: 'empleado',
  },
  {
    key: 'empleado_nif',
    label: 'NIF/DNI del empleado',
    tipo: 'string',
    ejemplo: '12345678A',
    categoria: 'empleado',
    encriptado: true,
  },
  {
    key: 'empleado_nss',
    label: 'Número de Seguridad Social',
    tipo: 'string',
    ejemplo: '12/34567890/12',
    categoria: 'empleado',
    encriptado: true,
  },
  {
    key: 'empleado_telefono',
    label: 'Teléfono del empleado',
    tipo: 'string',
    ejemplo: '+34 600 123 456',
    categoria: 'empleado',
  },
  {
    key: 'empleado_fecha_nacimiento',
    label: 'Fecha de nacimiento',
    tipo: 'date',
    ejemplo: '15/03/1990',
    categoria: 'empleado',
  },
  {
    key: 'empleado_edad',
    label: 'Edad del empleado',
    tipo: 'number',
    ejemplo: '33',
    categoria: 'empleado',
  },
  {
    key: 'empleado_direccion_calle',
    label: 'Calle de la dirección',
    tipo: 'string',
    ejemplo: 'Calle Gran Vía',
    categoria: 'empleado',
  },
  {
    key: 'empleado_direccion_numero',
    label: 'Número de la dirección',
    tipo: 'string',
    ejemplo: '123',
    categoria: 'empleado',
  },
  {
    key: 'empleado_direccion_piso',
    label: 'Piso de la dirección',
    tipo: 'string',
    ejemplo: '3º A',
    categoria: 'empleado',
  },
  {
    key: 'empleado_codigo_postal',
    label: 'Código postal',
    tipo: 'string',
    ejemplo: '28013',
    categoria: 'empleado',
  },
  {
    key: 'empleado_ciudad',
    label: 'Ciudad',
    tipo: 'string',
    ejemplo: 'Madrid',
    categoria: 'empleado',
  },
  {
    key: 'empleado_provincia',
    label: 'Provincia',
    tipo: 'string',
    ejemplo: 'Madrid',
    categoria: 'empleado',
  },
  {
    key: 'empleado_direccion_completa',
    label: 'Dirección completa',
    tipo: 'string',
    ejemplo: 'Calle Gran Vía, 123, 3º A, 28013 Madrid',
    categoria: 'empleado',
  },
  {
    key: 'empleado_estado_civil',
    label: 'Estado civil',
    tipo: 'string',
    ejemplo: 'Casado',
    categoria: 'empleado',
  },
  {
    key: 'empleado_numero_hijos',
    label: 'Número de hijos',
    tipo: 'number',
    ejemplo: '2',
    categoria: 'empleado',
  },
  {
    key: 'empleado_iban',
    label: 'IBAN',
    tipo: 'string',
    ejemplo: 'ES12 1234 5678 9012 3456 7890',
    categoria: 'empleado',
    encriptado: true,
  },
  {
    key: 'empleado_titular_cuenta',
    label: 'Titular de la cuenta bancaria',
    tipo: 'string',
    ejemplo: 'Juan García López',
    categoria: 'empleado',
  },
  {
    key: 'empleado_fecha_alta',
    label: 'Fecha de alta en la empresa',
    tipo: 'date',
    ejemplo: '01/01/2023',
    categoria: 'empleado',
  },
  {
    key: 'empleado_puesto',
    label: 'Puesto de trabajo',
    tipo: 'string',
    ejemplo: 'Desarrollador Senior',
    categoria: 'empleado',
  },

  // ========================================
  // EMPRESA (7 variables)
  // ========================================
  {
    key: 'empresa_nombre',
    label: 'Nombre de la empresa',
    tipo: 'string',
    ejemplo: 'Clousadmin S.L.',
    categoria: 'empresa',
  },
  {
    key: 'empresa_cif',
    label: 'CIF de la empresa',
    tipo: 'string',
    ejemplo: 'B12345678',
    categoria: 'empresa',
  },
  {
    key: 'empresa_direccion',
    label: 'Dirección de la empresa',
    tipo: 'string',
    ejemplo: 'Calle Serrano, 45, 28006 Madrid',
    categoria: 'empresa',
  },
  {
    key: 'empresa_email',
    label: 'Email de la empresa',
    tipo: 'string',
    ejemplo: 'contacto@empresa.com',
    categoria: 'empresa',
  },
  {
    key: 'empresa_telefono',
    label: 'Teléfono de la empresa',
    tipo: 'string',
    ejemplo: '+34 91 123 45 67',
    categoria: 'empresa',
  },
  {
    key: 'empresa_web',
    label: 'Sitio web de la empresa',
    tipo: 'string',
    ejemplo: 'www.empresa.com',
    categoria: 'empresa',
  },
  {
    key: 'empresa_logo',
    label: 'URL del logo de la empresa',
    tipo: 'string',
    ejemplo: 'https://s3.amazonaws.com/...',
    categoria: 'empresa',
  },

  // ========================================
  // CONTRATO (9 variables)
  // ========================================
  {
    key: 'contrato_tipo',
    label: 'Tipo de contrato',
    tipo: 'string',
    ejemplo: 'Indefinido',
    categoria: 'contrato',
  },
  {
    key: 'contrato_fecha_inicio',
    label: 'Fecha de inicio del contrato',
    tipo: 'date',
    ejemplo: '01/01/2023',
    categoria: 'contrato',
  },
  {
    key: 'contrato_fecha_fin',
    label: 'Fecha de fin del contrato',
    tipo: 'date',
    ejemplo: '31/12/2025',
    categoria: 'contrato',
  },
  {
    key: 'contrato_duracion_meses',
    label: 'Duración del contrato en meses',
    tipo: 'number',
    ejemplo: '36',
    categoria: 'contrato',
  },
  {
    key: 'contrato_salario_bruto_anual',
    label: 'Salario bruto anual',
    tipo: 'currency',
    ejemplo: '45.000,00 €',
    categoria: 'contrato',
  },
  {
    key: 'contrato_salario_bruto_mensual',
    label: 'Salario bruto mensual',
    tipo: 'currency',
    ejemplo: '3.000,00 €',
    categoria: 'contrato',
  },
  {
    key: 'contrato_salario_bruto_mensual_palabras',
    label: 'Salario bruto mensual en palabras',
    tipo: 'string',
    ejemplo: 'tres mil euros',
    categoria: 'contrato',
  },
  {
    key: 'contrato_categoria_profesional',
    label: 'Categoría profesional',
    tipo: 'string',
    ejemplo: 'Técnico',
    categoria: 'contrato',
  },
  {
    key: 'contrato_puesto',
    label: 'Puesto según contrato',
    tipo: 'string',
    ejemplo: 'Desarrollador Senior',
    categoria: 'contrato',
  },

  // ========================================
  // JORNADA (3 variables)
  // ========================================
  {
    key: 'jornada_nombre',
    label: 'Nombre de la jornada',
    tipo: 'string',
    ejemplo: 'Jornada completa 40h',
    categoria: 'jornada',
  },
  {
    key: 'jornada_horas_semanales',
    label: 'Horas semanales',
    tipo: 'number',
    ejemplo: '40',
    categoria: 'jornada',
  },
  {
    key: 'jornada_horas_diarias',
    label: 'Horas diarias',
    tipo: 'number',
    ejemplo: '8',
    categoria: 'jornada',
  },

  // ========================================
  // MANAGER (3 variables)
  // ========================================
  {
    key: 'manager_nombre',
    label: 'Nombre del manager',
    tipo: 'string',
    ejemplo: 'María Rodríguez',
    categoria: 'manager',
  },
  {
    key: 'manager_email',
    label: 'Email del manager',
    tipo: 'string',
    ejemplo: 'maria.rodriguez@empresa.com',
    categoria: 'manager',
  },
  {
    key: 'manager_puesto',
    label: 'Puesto del manager',
    tipo: 'string',
    ejemplo: 'CTO',
    categoria: 'manager',
  },

  // ========================================
  // AUSENCIA (6 variables) - Para justificantes
  // ========================================
  {
    key: 'ausencia_tipo',
    label: 'Tipo de ausencia',
    tipo: 'string',
    ejemplo: 'Vacaciones',
    categoria: 'ausencia',
  },
  {
    key: 'ausencia_fecha_inicio',
    label: 'Fecha de inicio de la ausencia',
    tipo: 'date',
    ejemplo: '15/08/2024',
    categoria: 'ausencia',
  },
  {
    key: 'ausencia_fecha_fin',
    label: 'Fecha de fin de la ausencia',
    tipo: 'date',
    ejemplo: '25/08/2024',
    categoria: 'ausencia',
  },
  {
    key: 'ausencia_dias_solicitados',
    label: 'Días solicitados',
    tipo: 'number',
    ejemplo: '10',
    categoria: 'ausencia',
  },
  {
    key: 'ausencia_aprobador_nombre',
    label: 'Nombre del aprobador',
    tipo: 'string',
    ejemplo: 'María Rodríguez',
    categoria: 'ausencia',
  },
  {
    key: 'ausencia_fecha_aprobacion',
    label: 'Fecha de aprobación',
    tipo: 'date',
    ejemplo: '10/07/2024',
    categoria: 'ausencia',
  },

  // ========================================
  // SISTEMA (3 variables)
  // ========================================
  {
    key: 'fecha_hoy',
    label: 'Fecha actual',
    tipo: 'date',
    ejemplo: '13/11/2024',
    categoria: 'sistema',
  },
  {
    key: 'ano_actual',
    label: 'Año actual',
    tipo: 'number',
    ejemplo: '2024',
    categoria: 'sistema',
  },
  {
    key: 'mes_actual',
    label: 'Mes actual',
    tipo: 'string',
    ejemplo: 'Noviembre',
    categoria: 'sistema',
  },
];

/**
 * Campos que requieren encriptación
 */
export const CAMPOS_ENCRIPTADOS = ['nif', 'nss', 'iban'];

/**
 * Formatos de fecha comunes en España
 */
export const FORMATO_FECHA_ES = 'dd/MM/yyyy';
export const FORMATO_FECHA_LARGO_ES = "dd 'de' MMMM 'de' yyyy";

/**
 * Extensiones de archivo soportadas
 */
export const EXTENSIONES_SOPORTADAS = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
} as const;

/**
 * Límites de generación
 */
export const LIMITES = {
  MAX_EMPLEADOS_POR_JOB: 500, // Máximo 500 empleados por job
  TIMEOUT_GENERACION_MS: 30000, // 30 segundos timeout por documento
  MAX_REINTENTOS: 3, // Máximo 3 reintentos por documento fallido
} as const;
