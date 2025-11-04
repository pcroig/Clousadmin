// ========================================
// Documentos Onboarding - Gestión de carpetas y documentos para onboarding
// ========================================

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

/**
 * Crear carpetas automáticas para documentos de onboarding
 * - Carpeta generalizada para HR: "Onboarding - {nombreDocumento}"
 * - Carpeta individualizada para empleado: dentro de sus carpetas personales
 */
export async function crearCarpetasOnboardingDocumento(
  empresaId: string,
  empleadoId: string,
  nombreDocumento: string,
  tipoDocumento: string
) {
  try {
    // 1. Crear/obtener carpeta generalizada para HR
    const nombreCarpetaHR = `Onboarding - ${nombreDocumento}`;
    
    let carpetaHR = await prisma.carpeta.findFirst({
      where: {
        empresaId,
        nombre: nombreCarpetaHR,
        compartida: true,
        empleadoId: null,
      },
    });

    if (!carpetaHR) {
      carpetaHR = await prisma.carpeta.create({
        data: {
          empresaId,
          nombre: nombreCarpetaHR,
          compartida: true,
          asignadoA: 'hr',
          esSistema: false,
        },
      });
    }

    // 2. Crear/obtener carpeta de onboarding personalizada del empleado
    let carpetaEmpleadoOnboarding = await prisma.carpeta.findFirst({
      where: {
        empresaId,
        empleadoId,
        nombre: 'Onboarding',
        compartida: false,
      },
    });

    if (!carpetaEmpleadoOnboarding) {
      carpetaEmpleadoOnboarding = await prisma.carpeta.create({
        data: {
          empresaId,
          empleadoId,
          nombre: 'Onboarding',
          compartida: false,
          esSistema: true,
        },
      });
    }

    // 3. Crear subcarpeta específica para el tipo de documento
    let subcarpetaDocumento = await prisma.carpeta.findFirst({
      where: {
        empresaId,
        empleadoId,
        parentId: carpetaEmpleadoOnboarding.id,
        nombre: nombreDocumento,
      },
    });

    if (!subcarpetaDocumento) {
      subcarpetaDocumento = await prisma.carpeta.create({
        data: {
          empresaId,
          empleadoId,
          parentId: carpetaEmpleadoOnboarding.id,
          nombre: nombreDocumento,
          compartida: false,
          esSistema: false,
        },
      });
    }

    return {
      success: true,
      carpetaHR,
      carpetaEmpleado: subcarpetaDocumento,
    };
  } catch (error) {
    console.error('[crearCarpetasOnboardingDocumento] Error:', error);
    return {
      success: false,
      error: 'Error al crear carpetas de onboarding',
    };
  }
}

/**
 * Obtener o crear carpeta de onboarding del empleado
 */
export async function obtenerCarpetaOnboardingEmpleado(
  empresaId: string,
  empleadoId: string
) {
  try {
    let carpeta = await prisma.carpeta.findFirst({
      where: {
        empresaId,
        empleadoId,
        nombre: 'Onboarding',
        compartida: false,
      },
      include: {
        subcarpetas: true,
        documentos: true,
      },
    });

    if (!carpeta) {
      carpeta = await prisma.carpeta.create({
        data: {
          empresaId,
          empleadoId,
          nombre: 'Onboarding',
          compartida: false,
          esSistema: true,
        },
        include: {
          subcarpetas: true,
          documentos: true,
        },
      });
    }

    return {
      success: true,
      carpeta,
    };
  } catch (error) {
    console.error('[obtenerCarpetaOnboardingEmpleado] Error:', error);
    return {
      success: false,
      error: 'Error al obtener carpeta de onboarding',
    };
  }
}

/**
 * Listar documentos de onboarding de un empleado
 */
export async function listarDocumentosOnboarding(
  empresaId: string,
  empleadoId: string
) {
  try {
    const carpetaResult = await obtenerCarpetaOnboardingEmpleado(empresaId, empleadoId);
    
    if (!carpetaResult.success || !carpetaResult.carpeta) {
      return {
        success: false,
        error: 'No se pudo obtener la carpeta de onboarding',
      };
    }

    // Obtener todos los documentos de la carpeta de onboarding y sus subcarpetas
    const documentos = await prisma.documento.findMany({
      where: {
        empresaId,
        OR: [
          { carpetaId: carpetaResult.carpeta.id },
          {
            carpeta: {
              parentId: carpetaResult.carpeta.id,
            },
          },
        ],
      },
      include: {
        carpeta: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      documentos,
      carpeta: carpetaResult.carpeta,
    };
  } catch (error) {
    console.error('[listarDocumentosOnboarding] Error:', error);
    return {
      success: false,
      error: 'Error al listar documentos de onboarding',
    };
  }
}

/**
 * Subir documento a carpeta de onboarding
 */
export async function subirDocumentoOnboarding(
  empresaId: string,
  empleadoId: string,
  nombreDocumento: string,
  tipoDocumento: string,
  s3Key: string,
  s3Bucket: string,
  mimeType: string,
  tamano: number
) {
  try {
    // Crear carpetas si no existen
    const carpetasResult = await crearCarpetasOnboardingDocumento(
      empresaId,
      empleadoId,
      nombreDocumento,
      tipoDocumento
    );

    if (!carpetasResult.success) {
      return {
        success: false,
        error: carpetasResult.error,
      };
    }

    // Crear documento en carpeta del empleado
    const documento = await prisma.documento.create({
      data: {
        empresaId,
        empleadoId,
        carpetaId: carpetasResult.carpetaEmpleado!.id,
        nombre: nombreDocumento,
        tipoDocumento,
        s3Key,
        s3Bucket,
        mimeType,
        tamano,
      },
    });

    return {
      success: true,
      documento,
      carpetaHR: carpetasResult.carpetaHR,
      carpetaEmpleado: carpetasResult.carpetaEmpleado,
    };
  } catch (error) {
    console.error('[subirDocumentoOnboarding] Error:', error);
    return {
      success: false,
      error: 'Error al subir documento de onboarding',
    };
  }
}

/**
 * Validar que todos los documentos requeridos estén subidos
 */
export async function validarDocumentosRequeridosCompletos(
  empresaId: string,
  empleadoId: string,
  documentosRequeridos: Array<{ id: string; nombre: string; requerido: boolean }>
) {
  try {
    const documentosResult = await listarDocumentosOnboarding(empresaId, empleadoId);

    if (!documentosResult.success) {
      return {
        success: false,
        error: documentosResult.error,
      };
    }

    const documentosSubidos = documentosResult.documentos || [];
    // Crear un Set con los tipos de documentos subidos (puede ser tipoDocumento o nombre del documento)
    const tiposSubidos = new Set(
      documentosSubidos.map((d) => d.tipoDocumento?.toLowerCase() || d.nombre?.toLowerCase())
    );

    // Validar documentos requeridos: comparar por id (que coincide con tipoDocumento) o por nombre
    const documentosFaltantes = documentosRequeridos.filter((doc) => {
      if (!doc.requerido) return false;
      
      const docIdLower = doc.id.toLowerCase();
      const docNombreLower = doc.nombre?.toLowerCase() || '';
      
      // Verificar si existe un documento con el mismo tipo o nombre
      return !tiposSubidos.has(docIdLower) && !tiposSubidos.has(docNombreLower);
    });

    return {
      success: true,
      completo: documentosFaltantes.length === 0,
      documentosFaltantes,
      documentosSubidos: documentosSubidos.length,
    };
  } catch (error) {
    console.error('[validarDocumentosRequeridosCompletos] Error:', error);
    return {
      success: false,
      error: 'Error al validar documentos requeridos',
    };
  }
}

