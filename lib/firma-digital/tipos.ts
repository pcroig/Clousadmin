/**
 * Tipos y interfaces para firma digital
 * Fase 1 (MVP): Firma simple interna
 */

// ========================================
// ENUMS
// ========================================

export const EstadoSolicitudFirma = {
  PENDIENTE: 'pendiente',
  EN_PROCESO: 'en_proceso',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
} as const;

export type EstadoSolicitudFirma = typeof EstadoSolicitudFirma[keyof typeof EstadoSolicitudFirma];

export const ProveedorFirma = {
  INTERNO: 'interno',
  LLEIDANETWORKS: 'lleidanetworks', // Fase 2
} as const;

export type ProveedorFirma = typeof ProveedorFirma[keyof typeof ProveedorFirma];

export const TipoFirma = {
  SIMPLE: 'simple',        // MVP: Click + IP + timestamp
  AVANZADA: 'avanzada',    // Fase 2: Con certificado
  CUALIFICADA: 'cualificada', // Fase 3: Con Lleidanetworks
} as const;

export type TipoFirma = typeof TipoFirma[keyof typeof TipoFirma];

export const MetodoCaptura = {
  CLICK: 'click',          // MVP: Simple click confirmación
  MANUSCRITA: 'manuscrita', // Fase 2: Firma dibujada en canvas
  CERTIFICADO: 'certificado', // Fase 3: Certificado digital
} as const;

export type MetodoCaptura = typeof MetodoCaptura[keyof typeof MetodoCaptura];

// ========================================
// INTERFACES
// ========================================

/**
 * Configuración para crear una solicitud de firma
 */
export interface CrearSolicitudFirmaInput {
  documentoId: string;
  empresaId: string;
  titulo: string;
  mensaje?: string;
  firmantes: FirmanteInput[];
  ordenFirma?: boolean;
  proveedor?: ProveedorFirma;
  recordatorioAutomatico?: boolean;
  diasRecordatorio?: number;
  creadoPor?: string;
  posicionFirma?: PosicionFirma;
}

/**
 * Datos de un firmante
 */
export interface FirmanteInput {
  empleadoId: string;
  orden?: number; // Solo si ordenFirma=true
  tipo?: TipoFirma;
}

/**
 * Datos capturados al firmar (MVP: Click simple)
 */
export interface DatosCapturadosFirma {
  tipo: MetodoCaptura;
  ip: string;
  userAgent: string;
  timestamp: string;
  coords?: number[]; // Para firma manuscrita (Fase 2)
  certificadoData?: string; // Para certificado digital (Fase 3)
  firmaGuardadaUsada?: boolean; // Si se usó la firma guardada del empleado
  firmaGuardadaS3Key?: string; // S3 key de la firma usada (si aplica)
  firmaImagenS3Key?: string; // Imagen capturada al firmar (canvas)
  firmaImagenWidth?: number;
  firmaImagenHeight?: number;
  firmaImagenContentType?: string;
}

export interface PosicionFirma {
  pagina: number;
  x: number;
  y: number;
}

/**
 * Resultado de una firma
 */
export interface ResultadoFirma {
  firmaId: string;
  empleadoId: string;
  empleadoNombre: string;
  firmado: boolean;
  firmadoEn?: Date;
  certificadoHash?: string;
}

/**
 * Estado de una solicitud de firma con firmantes
 */
export interface EstadoSolicitudFirmaDetallado {
  solicitudId: string;
  documentoId: string;
  documentoNombre: string;
  estado: EstadoSolicitudFirma;
  totalFirmantes: number;
  firmantesCompletados: number;
  porcentajeCompletado: number;
  firmas: ResultadoFirma[];
  creadoPor?: string;
  createdAt: Date;
  completadaEn?: Date;
  pdfFirmadoS3Key?: string; // S3 key del PDF con marcas de firma (disponible cuando completada)
}

/**
 * Certificado de firma simple (MVP)
 */
export interface CertificadoFirmaSimple {
  solicitudFirmaId: string;
  firmaId: string;
  empleadoId: string;
  empleadoNombre: string;
  empleadoEmail: string;
  documentoId: string;
  documentoNombre: string;
  documentoHash: string;
  firmadoEn: string; // ISO string
  ipAddress: string;
  userAgent: string;
  certificadoHash: string; // SHA-256 del certificado
  version: string; // Versión del certificado
}

/**
 * Opciones para generar PDF con marcas de firma
 */
export interface OpcionesMarcaFirma {
  nombreFirmante: string;
  fechaFirma: string;
  tipoFirma: TipoFirma;
  certificadoHash?: string;
  posicion?: PosicionFirma;
  firmaImagen?: {
    buffer: Buffer;
    width?: number;
    height?: number;
    contentType?: string;
  };
}

/**
 * Resultado de validación de firma
 */
export interface ResultadoValidacionFirma {
  valida: boolean;
  motivo?: string;
  documentoHashActual?: string;
  documentoHashOriginal?: string;
  certificadoValido?: boolean;
  firmantesValidos?: boolean;
}
