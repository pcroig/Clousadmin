// ========================================
// Documentos Onboarding - Gestión de carpetas y documentos para onboarding
// ========================================

import {
  CARPETAS_SISTEMA,
  CarpetaSistema,
  inferirTipoDocumento,
  obtenerOCrearCarpetaGlobal,
  obtenerOCrearCarpetaSistema,
  TIPOS_DOCUMENTO,
} from '@/lib/documentos';
import { prisma } from '@/lib/prisma';

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
 * @param carpetaId - ID de carpeta destino (opcional). Si no se provee, se crea automáticamente.
 * @param esCompartida - Si true, también crea referencia en carpeta compartida de HR
 */
const CARPETA_SISTEMA_POR_TIPO: Record<string, CarpetaSistema> = {
  [TIPOS_DOCUMENTO.CONTRATO]: 'Contratos',
  [TIPOS_DOCUMENTO.NOMINA]: 'Nóminas',
  [TIPOS_DOCUMENTO.JUSTIFICANTE]: 'Justificantes',
  [TIPOS_DOCUMENTO.OTRO]: 'Otros',
};

const NORMALIZED_CARPETAS_SISTEMA = new Map<string, CarpetaSistema>(
  CARPETAS_SISTEMA.map((nombre) => [
    nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
    nombre,
  ])
);

function normalizarNombreCarpeta(nombre?: string | null): string | null {
  if (!nombre) return null;
  const trimmed = nombre.trim();
  if (!trimmed) return null;
  return trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function resolverCarpetaSistema(nombre?: string | null): CarpetaSistema | null {
  const normalizado = normalizarNombreCarpeta(nombre);
  if (!normalizado) return null;

  if (NORMALIZED_CARPETAS_SISTEMA.has(normalizado)) {
    return NORMALIZED_CARPETAS_SISTEMA.get(normalizado)!;
  }

  if (normalizado === 'medicos' || normalizado === 'medico') {
    return 'Justificantes';
  }

  if (normalizado === 'personales' || normalizado === 'personal') {
    return 'Otros';
  }

  return null;
}

function obtenerCarpetaPorTipo(tipoNormalizado: string): CarpetaSistema {
  return CARPETA_SISTEMA_POR_TIPO[tipoNormalizado] ?? 'Otros';
}

export async function subirDocumentoOnboarding(
  empresaId: string,
  empleadoId: string,
  nombreDocumento: string,
  tipoDocumento: string,
  s3Key: string,
  s3Bucket: string,
  mimeType: string,
  tamano: number,
  carpetaId?: string,
  esCompartida?: boolean,
  carpetaNombreDestino?: string
) {
  try {
    let carpetaDestino;
    let carpetaHR;
    const carpetaNombreNormalizado = carpetaNombreDestino?.trim();

    if (carpetaId) {
      // Verificar que la carpeta existe y pertenece al empleado o es compartida
      carpetaDestino = await prisma.carpeta.findFirst({
        where: {
          id: carpetaId,
          empresaId,
          OR: [
            { empleadoId }, // Carpeta personal del empleado
            { empleadoId: null, compartida: true }, // Carpeta compartida
          ],
        },
      });

      if (!carpetaDestino) {
        return {
          success: false,
          error: 'Carpeta no encontrada o no autorizada',
        };
      }
    } else if (carpetaNombreNormalizado) {
      const carpetaSistema = resolverCarpetaSistema(carpetaNombreNormalizado);
      if (carpetaSistema) {
        carpetaDestino = await obtenerOCrearCarpetaSistema(
          empleadoId,
          empresaId,
          carpetaSistema
        );
      } else {
        carpetaDestino = await prisma.carpeta.findFirst({
          where: {
            empresaId,
            empleadoId,
            nombre: carpetaNombreNormalizado,
          },
        });

        if (!carpetaDestino) {
          carpetaDestino = await prisma.carpeta.create({
            data: {
              empresaId,
              empleadoId,
              nombre: carpetaNombreNormalizado,
              esSistema: false,
              compartida: false,
            },
          });
        }
      }
    } else {
      // Usar carpeta del sistema "Otros" por defecto
      carpetaDestino = await obtenerOCrearCarpetaSistema(
        empleadoId,
        empresaId,
        'Otros'
      );
    }

    if (!carpetaDestino) {
      return {
        success: false,
        error: 'No se pudo determinar la carpeta destino',
      };
    }

    const tipoNormalizado = inferirTipoDocumento(
      carpetaDestino.nombre,
      tipoDocumento
    );

    if (esCompartida) {
      const nombreCarpetaHR = obtenerCarpetaPorTipo(tipoNormalizado);
      carpetaHR = await obtenerOCrearCarpetaGlobal(
        empresaId,
        nombreCarpetaHR
      );
    }

    // Crear documento en carpeta del empleado
    const documento = await prisma.documento.create({
      data: {
        empresaId,
        empleadoId,
        carpetaId: carpetaDestino!.id,
        nombre: nombreDocumento,
        tipoDocumento: tipoNormalizado,
        s3Key,
        s3Bucket,
        mimeType,
        tamano,
      },
    });

    return {
      success: true,
      documento,
      carpetaHR,
      carpetaEmpleado: carpetaDestino,
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
    // Crear un Set con los identificadores disponibles (tipoDocumento, nombre o slug del archivo)
    const identificadoresSubidos = new Set<string>();

    for (const documento of documentosSubidos) {
      if (documento.tipoDocumento) {
        identificadoresSubidos.add(documento.tipoDocumento.toLowerCase());
      }

      if (documento.nombre) {
        identificadoresSubidos.add(documento.nombre.toLowerCase());
      }

      if (documento.s3Key) {
        const keySegment = documento.s3Key.split('/').pop() || '';
        const slug = keySegment.split('-')[0]?.toLowerCase();
        if (slug) {
          identificadoresSubidos.add(slug);
        }
      }
    }

    // Validar documentos requeridos: comparar por id (que coincide con tipoDocumento) o por nombre
    const documentosFaltantes = documentosRequeridos.filter((doc) => {
      if (!doc.requerido) return false;
      
      const docIdLower = doc.id.toLowerCase();
      const docNombreLower = doc.nombre?.toLowerCase() || '';
      
      // Verificar si existe un documento con el mismo tipo o nombre
      return (
        !identificadoresSubidos.has(docIdLower) && !identificadoresSubidos.has(docNombreLower)
      );
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

