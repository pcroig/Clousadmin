// ========================================
// Onboarding Validación - Helpers de Validación
// ========================================
// Funciones para validar completitud de acciones del workflow

import type {
  WorkflowAccion,
  RellenarCamposConfig,
  SolicitarDocsConfig,
  SolicitarFirmaConfig,
} from './onboarding-config-types';
import { prisma } from './prisma';

/**
 * Validar si todos los documentos requeridos han sido subidos
 */
async function verificarDocumentosSubidos(
  empleadoId: string,
  documentosRequeridos: Array<{ id: string; nombre: string; requerido: boolean; carpetaDestinoId: string }>
): Promise<boolean> {
  // Obtener solo los documentos requeridos
  const requeridos = documentosRequeridos.filter((d) => d.requerido);

  if (requeridos.length === 0) {
    // Si no hay documentos requeridos, está completado
    return true;
  }

  try {
    // Buscar documentos del empleado en las carpetas especificadas
    const empleado = await prisma.empleados.findUnique({
      where: { id: empleadoId },
      select: {
        carpetas_a_empleados: {
          include: {
            carpeta: {
              include: {
                documentos: true,
              },
            },
          },
        },
      },
    });

    if (!empleado) return false;

    // Obtener todos los documentos del empleado
    const documentosEmpleado = empleado.carpetas_a_empleados.flatMap((ce) =>
      ce.carpeta.documentos.map((d) => ({
        ...d,
        carpetaId: ce.carpetaId,
      }))
    );

    // Verificar que cada documento requerido esté subido
    return requeridos.every((docReq) => {
      // Buscar si existe un documento en la carpeta destino
      return documentosEmpleado.some(
        (docEmp) =>
          docEmp.carpetaId === docReq.carpetaDestinoId &&
          // Verificar que el nombre sea similar o contenga el nombre requerido
          (docEmp.nombre.toLowerCase().includes(docReq.nombre.toLowerCase()) ||
            docReq.nombre.toLowerCase().includes(docEmp.nombre.toLowerCase()))
      );
    });
  } catch (error) {
    console.error('[verificarDocumentosSubidos] Error:', error);
    return false;
  }
}

/**
 * Verificar si todas las firmas están completadas
 */
async function verificarFirmasCompletadas(
  empleadoId: string,
  documentosFirma: Array<{
    id: string;
    documentoId?: string;
    plantillaId?: string;
    nombre: string;
    requiereCompletarAntes: string[];
  }>
): Promise<boolean> {
  try {
    // Obtener solicitudes de firma del empleado
    const solicitudesFirma = await prisma.solicitudes_firma.findMany({
      where: {
        firmantes: {
          some: {
            empleadoId,
          },
        },
      },
      include: {
        firmantes: {
          where: {
            empleadoId,
          },
        },
      },
    });

    // Verificar que cada documento de firma esté firmado
    return documentosFirma.every((docFirma) => {
      // Buscar solicitud correspondiente
      const solicitud = solicitudesFirma.find((s) => {
        // Buscar por documentoId o por nombre similar
        if (docFirma.documentoId) {
          return s.documentoId === docFirma.documentoId;
        }
        return s.titulo.toLowerCase().includes(docFirma.nombre.toLowerCase());
      });

      if (!solicitud) return false;

      // Verificar que el firmante haya firmado
      const firmante = solicitud.firmantes[0];
      return firmante && firmante.firmado;
    });
  } catch (error) {
    console.error('[verificarFirmasCompletadas] Error:', error);
    return false;
  }
}

/**
 * Validar si una acción está completada
 */
export async function validarAccionCompletada(
  accion: WorkflowAccion,
  progreso: Record<string, boolean>,
  datosTemporales: Record<string, unknown>,
  empleadoId?: string
): Promise<boolean> {
  // Si está marcada manualmente como completada
  if (progreso[accion.id]) return true;

  switch (accion.tipo) {
    case 'rellenar_campos': {
      const config = accion.config as RellenarCamposConfig;
      // Verificar que todos los campos requeridos estén presentes en datosTemporales
      return config.campos.every((campo) => {
        const valor = datosTemporales[campo];
        // Considerar completado si el valor existe y no está vacío
        return (
          valor !== undefined &&
          valor !== null &&
          valor !== '' &&
          !(Array.isArray(valor) && valor.length === 0)
        );
      });
    }

    case 'compartir_docs': {
      // Se marca como completada manualmente al visualizar
      // El empleado debe hacer clic en "He leído" para completar
      return progreso[accion.id] || false;
    }

    case 'solicitar_docs': {
      if (!empleadoId) return false;

      const config = accion.config as SolicitarDocsConfig;
      // Verificar que todos los documentos requeridos estén subidos
      return await verificarDocumentosSubidos(empleadoId, config.documentosRequeridos);
    }

    case 'solicitar_firma': {
      if (!empleadoId) return false;

      const config = accion.config as SolicitarFirmaConfig;
      // Verificar que todas las firmas estén completadas
      return await verificarFirmasCompletadas(empleadoId, config.documentosFirma);
    }

    default:
      return false;
  }
}

/**
 * Validar todas las acciones activas del workflow
 */
export async function validarTodasAccionesCompletadas(
  accionesActivas: WorkflowAccion[],
  progreso: Record<string, boolean>,
  datosTemporales: Record<string, unknown>,
  empleadoId: string
): Promise<{ completado: boolean; accionesPendientes: string[] }> {
  const accionesPendientes: string[] = [];

  for (const accion of accionesActivas) {
    const completada = await validarAccionCompletada(accion, progreso, datosTemporales, empleadoId);

    if (!completada) {
      accionesPendientes.push(accion.titulo);
    }
  }

  return {
    completado: accionesPendientes.length === 0,
    accionesPendientes,
  };
}

/**
 * Verificar si las acciones requeridas están completadas (para dependencias)
 */
export function verificarAccionesRequeridas(
  accionesRequeridas: string[],
  progreso: Record<string, boolean>
): boolean {
  if (accionesRequeridas.length === 0) return true;

  return accionesRequeridas.every((accionId) => progreso[accionId] === true);
}
