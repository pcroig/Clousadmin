// ========================================
// Onboarding Config - Gestión de configuración de onboarding por empresa
// ========================================
// Funciones para gestionar la configuración de onboarding de HR admins

import { prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';

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
 * Configuración completa de onboarding
 */
export interface OnboardingConfigData {
  camposRequeridos: CamposRequeridos;
  documentosRequeridos: DocumentoRequerido[];
  plantillasDocumentos: PlantillaDocumento[];
}

/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG: OnboardingConfigData = {
  camposRequeridos: {
    datos_personales: {
      nif: true,
      nss: true,
      telefono: true,
      direccionCalle: true,
      direccionNumero: true,
      direccionPiso: false,
      codigoPostal: true,
      ciudad: true,
      direccionProvincia: true,
      estadoCivil: false,
      numeroHijos: false,
    },
    datos_bancarios: {
      iban: true,
      bic: true,
    },
  },
  documentosRequeridos: [],
  plantillasDocumentos: [],
};

/**
 * Helper para convertir a JSON válido de Prisma
 */
/**
 * Obtener configuración de onboarding de una empresa
 */
export async function obtenerOnboardingConfig(empresaId: string) {
  try {
    let config = await prisma.onboardingConfig.findUnique({
      where: { empresaId },
    });

    // Si no existe configuración, crear una con valores por defecto
    if (!config) {
      config = await prisma.onboardingConfig.create({
        data: {
          empresaId,
          camposRequeridos: asJsonValue(DEFAULT_CONFIG.camposRequeridos),
          documentosRequeridos: asJsonValue(DEFAULT_CONFIG.documentosRequeridos),
          plantillasDocumentos: asJsonValue(DEFAULT_CONFIG.plantillasDocumentos),
        },
      });
    }

    return {
      success: true,
      config: {
        id: config.id,
        empresaId: config.empresaId,
        camposRequeridos: config.camposRequeridos as unknown as CamposRequeridos,
        documentosRequeridos: config.documentosRequeridos as unknown as DocumentoRequerido[],
        plantillasDocumentos: config.plantillasDocumentos as unknown as PlantillaDocumento[],
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    };
  } catch (error) {
    console.error('[obtenerOnboardingConfig] Error:', error);
    return {
      success: false,
      error: 'Error al obtener configuración de onboarding',
    };
  }
}

/**
 * Actualizar campos requeridos
 */
export async function actualizarCamposRequeridos(
  empresaId: string,
  camposRequeridos: CamposRequeridos
) {
  try {
    // Obtener o crear configuración
    const configResult = await obtenerOnboardingConfig(empresaId);
    if (!configResult.success || !configResult.config) {
      return {
        success: false,
        error: 'Error al obtener configuración',
      };
    }

    // Actualizar campos requeridos
    const updated = await prisma.onboardingConfig.update({
      where: { empresaId },
      data: {
        camposRequeridos: asJsonValue(camposRequeridos),
      },
    });

    return {
      success: true,
      config: updated,
    };
  } catch (error) {
    console.error('[actualizarCamposRequeridos] Error:', error);
    return {
      success: false,
      error: 'Error al actualizar campos requeridos',
    };
  }
}

/**
 * Actualizar documentos requeridos
 */
export async function actualizarDocumentosRequeridos(
  empresaId: string,
  documentosRequeridos: DocumentoRequerido[]
) {
  try {
    // Obtener o crear configuración
    const configResult = await obtenerOnboardingConfig(empresaId);
    if (!configResult.success || !configResult.config) {
      return {
        success: false,
        error: 'Error al obtener configuración',
      };
    }

    // Actualizar documentos requeridos
    const updated = await prisma.onboardingConfig.update({
      where: { empresaId },
      data: {
        documentosRequeridos: asJsonValue(documentosRequeridos),
      },
    });

    return {
      success: true,
      config: updated,
    };
  } catch (error) {
    console.error('[actualizarDocumentosRequeridos] Error:', error);
    return {
      success: false,
      error: 'Error al actualizar documentos requeridos',
    };
  }
}

/**
 * Actualizar plantillas de documentos
 */
export async function actualizarPlantillasDocumentos(
  empresaId: string,
  plantillasDocumentos: PlantillaDocumento[]
) {
  try {
    // Obtener o crear configuración
    const configResult = await obtenerOnboardingConfig(empresaId);
    if (!configResult.success || !configResult.config) {
      return {
        success: false,
        error: 'Error al obtener configuración',
      };
    }

    // Actualizar plantillas
    const updated = await prisma.onboardingConfig.update({
      where: { empresaId },
      data: {
        plantillasDocumentos: asJsonValue(plantillasDocumentos),
      },
    });

    return {
      success: true,
      config: updated,
    };
  } catch (error) {
    console.error('[actualizarPlantillasDocumentos] Error:', error);
    return {
      success: false,
      error: 'Error al actualizar plantillas de documentos',
    };
  }
}

/**
 * Validar que campos requeridos estén completos
 */
export function validarCamposRequeridos(
  datos: Record<string, unknown>,
  camposRequeridos: Record<string, boolean>
): { valido: boolean; camposFaltantes: string[] } {
  const camposFaltantes: string[] = [];

  for (const [campo, requerido] of Object.entries(camposRequeridos)) {
    if (requerido && (!datos[campo] || datos[campo] === '')) {
      camposFaltantes.push(campo);
    }
  }

  return {
    valido: camposFaltantes.length === 0,
    camposFaltantes,
  };
}

/**
 * Validar que documentos requeridos estén completos
 */
export function validarDocumentosRequeridos(
  documentosSubidos: string[],
  documentosRequeridos: DocumentoRequerido[]
): { valido: boolean; documentosFaltantes: DocumentoRequerido[] } {
  const documentosFaltantes = documentosRequeridos.filter(
    (doc) => doc.requerido && !documentosSubidos.includes(doc.id)
  );

  return {
    valido: documentosFaltantes.length === 0,
    documentosFaltantes,
  };
}












