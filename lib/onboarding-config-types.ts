// ========================================
// Onboarding Config Types - Solo tipos e interfaces
// ========================================
// Archivo separado para evitar imports de Prisma en el cliente

/**
 * Configuración de campos requeridos
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
 * Documento requerido
 */
export interface DocumentoRequerido {
  id: string;
  nombre: string;
  descripcion?: string;
  requerido: boolean;
  requiereVisualizacion: boolean;
  requiereFirma: boolean;
  carpetaDestino?: string | null;
  esAsincronico?: boolean; // Para firmas asíncronas
  asignadoA?: 'todos' | 'equipos'; // Alcance del documento
  equipoIds?: string[]; // IDs de equipos si asignadoA='equipos'
  
  // Nuevos campos para diferenciar tipos de documentos
  tipo?: 'visualizar' | 'solicitar' | 'firma'; // Tipo de documento
  documentoId?: string; // ID del documento existente (solo para tipo 'visualizar')
}

/**
 * Plantilla de documento
 */
export interface PlantillaDocumento {
  id: string;
  nombre: string;
  s3Key: string;
  tipoDocumento: string;
  descripcion?: string;
}

/**
 * Filtrar documentos por equipo del empleado
 */
export function filtrarDocumentosPorEquipo(
  documentos: DocumentoRequerido[],
  equipoIdsEmpleado: string[]
): DocumentoRequerido[] {
  return documentos.filter((doc) => {
    // Si está asignado a todos, siempre se incluye
    if (!doc.asignadoA || doc.asignadoA === 'todos') {
      return true;
    }

    // Si está asignado a equipos específicos, verificar si el empleado está en alguno
    if (doc.asignadoA === 'equipos' && doc.equipoIds && doc.equipoIds.length > 0) {
      return doc.equipoIds.some((equipoId) => equipoIdsEmpleado.includes(equipoId));
    }

    return false;
  });
}

/**
 * Obtener documentos de firma asíncronos
 */
export function obtenerDocumentosAsincronicos(
  documentos: DocumentoRequerido[]
): DocumentoRequerido[] {
  return documentos.filter((doc) => doc.requiereFirma && doc.esAsincronico);
}

