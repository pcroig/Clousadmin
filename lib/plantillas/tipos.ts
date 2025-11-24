/**
 * Tipos para el sistema de plantillas de documentos
 */

export interface VariableDefinicion {
  key: string; // "empleado_nombre"
  label: string; // "Nombre del empleado"
  tipo: 'string' | 'number' | 'date' | 'currency' | 'boolean';
  ejemplo: string;
  categoria: 'empleado' | 'empresa' | 'contrato' | 'jornada' | 'manager' | 'sistema' | 'ausencia';
  encriptado?: boolean;
  descripcion?: string;
}

export interface VariableMapping {
  variableName: string;
  jsonPath: string;
  requiresDecryption: boolean;
  requiresFormatting: boolean;
  formatType: 'date' | 'currency' | 'number' | null;
  formatPattern?: string;
  confianza?: number;
}

export interface ConfiguracionGeneracion {
  nombreDocumento?: string; // Template: "Contrato_{{empleado_apellidos}}_{{fecha}}"
  carpetaDestino?: string; // "Contratos", "Personales", etc.
  notificarEmpleado?: boolean;
  requiereFirma?: boolean;
  fechaLimiteFirma?: Date;
  mensajeFirma?: string;
}

export interface ResultadoGeneracion {
  success: boolean;
  empleadoId: string;
  empleadoNombre?: string;
  documentoId?: string;
  documentoNombre?: string;
  s3Key?: string;
  error?: string;
  tiempoMs?: number;
}

export interface DatosEmpleado {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  nif?: string;
  nss?: string;
  telefono?: string;
  fechaNacimiento?: Date;
  direccionCalle?: string;
  direccionNumero?: string;
  direccionPiso?: string;
  codigoPostal?: string;
  ciudad?: string;
  direccionProvincia?: string;
  estadoCivil?: string;
  numeroHijos?: number;
  genero?: string;
  iban?: string;
  titularCuenta?: string;
  puesto?: string;
  fechaAlta: Date;
  fechaBaja?: Date;
  tipoContrato?: string;
  salarioBrutoAnual?: number;
  salarioBrutoMensual?: number;
  diasVacaciones?: number;
  empresa: {
    id: string;
    nombre: string;
    cif?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    web?: string;
  };
  jornada?: {
    nombre: string;
    horasSemanales: number;
  };
  manager?: {
    nombre: string;
    apellidos: string;
    email: string;
  };
  puestoRelacion?: {
    nombre: string;
    descripcion?: string;
  };
  contratos?: Array<{
    id: string;
    tipoContrato: string;
    fechaInicio: Date;
    fechaFin?: Date;
    salarioBrutoAnual: number;
  }>;
  ausencias?: Array<{
    id: string;
    tipo: string;
    fechaInicio: Date;
    fechaFin: Date;
    diasSolicitados: number;
    estado: string;
  }>;
}

export interface JobConfig {
  plantillaId: string;
  empleadoIds: string[];
  configuracion: ConfiguracionGeneracion;
  solicitadoPor: string;
  empresaId: string;
}

export interface JobProgress {
  jobId: string;
  estado: 'en_cola' | 'procesando' | 'completado' | 'fallido';
  progreso: number; // 0-100
  totalEmpleados: number;
  procesados: number;
  exitosos: number;
  fallidos: number;
  resultados?: ResultadoGeneracion[];
  error?: string;
  tiempoTotal?: number;
}

export interface ExtractedVariables {
  variables: string[]; // Lista de variables únicas encontradas
  total: number;
  porCategoria: Record<string, number>;
}

export type PlantillaFormato = 'docx' | 'pdf_rellenable';

export interface PlantillaMetadata {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  tipo: 'oficial' | 'personalizada';
  formato: PlantillaFormato;
  variablesUsadas: string[];
  requiereFirma: boolean;
  requiereContrato: boolean;
  carpetaDestinoDefault?: string;
  s3Key: string;
  activa: boolean;
}
