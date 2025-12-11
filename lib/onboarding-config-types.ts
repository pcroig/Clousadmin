// ========================================
// Onboarding Config Types - Sistema de Workflow
// ========================================
// Nuevas interfaces para el sistema de onboarding basado en workflows configurables

// ===================
// NUEVAS INTERFACES (Sistema de Workflow)
// ===================

/**
 * Tipo de acción en el workflow
 */
export type TipoAccion = 'rellenar_campos' | 'compartir_docs' | 'solicitar_docs' | 'solicitar_firma';

/**
 * Acción del workflow de onboarding
 */
export interface WorkflowAccion {
  id: string; // cuid
  orden: number;
  tipo: TipoAccion;
  titulo: string;
  activo: boolean;
  config: RellenarCamposConfig | CompartirDocsConfig | SolicitarDocsConfig | SolicitarFirmaConfig;
}

/**
 * Configuración para acción tipo "rellenar_campos"
 */
export interface RellenarCamposConfig {
  campos: string[]; // IDs de campos: 'nif', 'nss', 'fechaNacimiento', 'telefono', 'iban', 'bic', etc.
}

/**
 * Configuración para acción tipo "compartir_docs"
 */
export interface CompartirDocsConfig {
  documentoIds: string[]; // IDs de documentos existentes a compartir
  carpetaId?: string; // Carpeta desde donde compartir (opcional)
}

/**
 * Documento requerido en acción "solicitar_docs"
 */
export interface DocumentoRequeridoSolicitar {
  id: string;
  nombre: string;
  requerido: boolean;
  carpetaDestinoId: string; // Carpeta personal del empleado donde se subirá
}

/**
 * Configuración para acción tipo "solicitar_docs"
 */
export interface SolicitarDocsConfig {
  documentosRequeridos: DocumentoRequeridoSolicitar[];
}

/**
 * Documento para firma en acción "solicitar_firma"
 */
export interface DocumentoFirma {
  id: string;
  nombre: string;
  tipo: 'sincrono' | 'asincrono'; // Síncrono: documento ya existe / Asíncrono: se subirá después
  documentoId?: string; // Solo para tipo 'sincrono': documento ya subido
  requiereAccionesAntes: string[]; // IDs de acciones que deben completarse antes
}

/**
 * Configuración para acción tipo "solicitar_firma"
 */
export interface SolicitarFirmaConfig {
  documentosFirma: DocumentoFirma[];
}

// ===================
// DEPRECATED (Sistema Antiguo - Mantener temporalmente)
// ===================

/**
 * @deprecated Usar WorkflowAccion en su lugar
 * Configuración de campos requeridos (sistema antiguo)
 */
export interface CamposRequeridos {
  datos_personales: {
    nif: boolean;
    nss: boolean;
    telefono: boolean;
    direccionCalle: boolean;
    direccionNumero: boolean;
    direccionPiso: boolean;
    codigoPostal: boolean;
    ciudad: boolean;
    direccionProvincia: boolean;
    estadoCivil: boolean;
    numeroHijos: boolean;
  };
  datos_bancarios: {
    iban: boolean;
    bic: boolean;
  };
}

/**
 * @deprecated Usar WorkflowAccion con tipo 'solicitar_docs' o 'compartir_docs'
 * Documento requerido (sistema antiguo)
 */
export interface DocumentoRequerido {
  id: string;
  nombre: string;
  descripcion?: string;
  requerido: boolean;
  requiereVisualizacion: boolean;
  requiereFirma: boolean;
  carpetaDestino?: string | null;
  esAsincronico?: boolean;
  asignadoA?: 'todos' | 'equipos';
  equipoIds?: string[];
  tipo?: 'visualizar' | 'solicitar' | 'firma';
  documentoId?: string;
}

/**
 * @deprecated Mantener para backward compatibility
 * Plantilla de documento (sistema antiguo)
 */
export interface PlantillaDocumento {
  id: string;
  nombre: string;
  s3Key: string;
  tipoDocumento: string;
  descripcion?: string;
}

// ===================
// HELPER FUNCTIONS
// ===================

/**
 * Filtrar acciones por equipo del empleado
 */
export function filtrarAccionesPorEquipo(
  acciones: WorkflowAccion[],
  equipoIdsEmpleado: string[]
): WorkflowAccion[] {
  // Por ahora no hay filtro por equipo en acciones
  // Todas las acciones se aplican a todos los empleados
  // Se puede extender en el futuro si se necesita
  return acciones.filter((a) => a.activo);
}

/**
 * @deprecated Usar filtrarAccionesPorEquipo
 * Filtrar documentos por equipo del empleado (sistema antiguo)
 */
export function filtrarDocumentosPorEquipo(
  documentos: DocumentoRequerido[],
  equipoIdsEmpleado: string[]
): DocumentoRequerido[] {
  return documentos.filter((doc) => {
    if (!doc.asignadoA || doc.asignadoA === 'todos') {
      return true;
    }
    if (doc.asignadoA === 'equipos' && doc.equipoIds && doc.equipoIds.length > 0) {
      return doc.equipoIds.some((equipoId) => equipoIdsEmpleado.includes(equipoId));
    }
    return false;
  });
}

/**
 * @deprecated Sistema antiguo
 * Obtener documentos de firma asíncronos
 */
export function obtenerDocumentosAsincronicos(
  documentos: DocumentoRequerido[]
): DocumentoRequerido[] {
  return documentos.filter((doc) => doc.requiereFirma && doc.esAsincronico);
}

/**
 * Obtener label legible para tipo de acción
 */
export function getTipoAccionLabel(tipo: TipoAccion): string {
  const labels: Record<TipoAccion, string> = {
    rellenar_campos: 'Rellenar campos',
    compartir_docs: 'Compartir documentos',
    solicitar_docs: 'Solicitar documentos',
    solicitar_firma: 'Solicitar firma',
  };
  return labels[tipo] || tipo;
}

/**
 * Validar estructura de WorkflowAccion
 */
export function validarWorkflowAccion(accion: unknown): accion is WorkflowAccion {
  if (typeof accion !== 'object' || accion === null) return false;

  const a = accion as WorkflowAccion;

  // Validar campos básicos
  if (
    typeof a.id !== 'string' ||
    typeof a.orden !== 'number' ||
    typeof a.tipo !== 'string' ||
    !['rellenar_campos', 'compartir_docs', 'solicitar_docs', 'solicitar_firma'].includes(a.tipo) ||
    typeof a.titulo !== 'string' ||
    typeof a.activo !== 'boolean' ||
    typeof a.config !== 'object' ||
    a.config === null ||
    Array.isArray(a.config)
  ) {
    return false;
  }

  return true;
}

/**
 * Campos disponibles para rellenar por el empleado en el onboarding
 * (salarioBaseAnual y tipoContrato se gestionan directamente por HR admin)
 */
export const CAMPOS_DISPONIBLES = [
  { id: 'nif', label: 'DNI/NIE' },
  { id: 'nss', label: 'Número de Seguridad Social' },
  { id: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
  { id: 'telefono', label: 'Teléfono' },
  { id: 'direccionCalle', label: 'Calle' },
  { id: 'direccionNumero', label: 'Número' },
  { id: 'direccionPiso', label: 'Piso/Puerta' },
  { id: 'codigoPostal', label: 'Código Postal' },
  { id: 'ciudad', label: 'Ciudad' },
  { id: 'direccionProvincia', label: 'Provincia' },
  { id: 'iban', label: 'IBAN' },
  { id: 'bic', label: 'BIC/SWIFT' },
] as const;
