// ========================================
// Documentos - Utility Functions
// ========================================
// Helper functions for document management system

import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';

import { UsuarioRol } from '@/lib/constants/enums';

import { prisma } from './prisma';
import { deleteFromS3 } from './s3';

/**
 * Carpetas del sistema que se crean automáticamente para cada empleado
 */
export const CARPETAS_SISTEMA = [
  'Contratos',
  'Nóminas',
  'Justificantes',
  'Otros',
] as const;

export type CarpetaSistema = typeof CARPETAS_SISTEMA[number];

const EMPLOYEE_UPLOAD_FOLDERS = new Set([
  'Justificantes',
  'Otros',
  // Compatibilidad con nombres legados
  'Personales',
  'Médicos',
]);

/**
 * Tipos de documentos permitidos
 */
export const TIPOS_DOCUMENTO = {
  CONTRATO: 'contrato',
  NOMINA: 'nomina',
  JUSTIFICANTE: 'justificante',
  OTRO: 'otro',
} as const;

const normalizarTexto = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const TIPO_DOCUMENTO_ALIAS_MAP: Record<string, string> = {
  contrato: TIPOS_DOCUMENTO.CONTRATO,
  contratos: TIPOS_DOCUMENTO.CONTRATO,
  nomina: TIPOS_DOCUMENTO.NOMINA,
  nominas: TIPOS_DOCUMENTO.NOMINA,
  justificante: TIPOS_DOCUMENTO.JUSTIFICANTE,
  justificantes: TIPOS_DOCUMENTO.JUSTIFICANTE,
  medico: TIPOS_DOCUMENTO.JUSTIFICANTE,
  medicos: TIPOS_DOCUMENTO.JUSTIFICANTE,
  personal: TIPOS_DOCUMENTO.OTRO,
  personales: TIPOS_DOCUMENTO.OTRO,
  general: TIPOS_DOCUMENTO.OTRO,
  documento: TIPOS_DOCUMENTO.OTRO,
  documentos: TIPOS_DOCUMENTO.OTRO,
  dni: TIPOS_DOCUMENTO.OTRO,
  nie: TIPOS_DOCUMENTO.OTRO,
  identificacion: TIPOS_DOCUMENTO.OTRO,
  otro: TIPOS_DOCUMENTO.OTRO,
  otros: TIPOS_DOCUMENTO.OTRO,
};

function normalizarTipoDocumento(tipo?: string | null): string | null {
  if (!tipo) {
    return null;
  }

  const normalizado = normalizarTexto(tipo);

  return TIPO_DOCUMENTO_ALIAS_MAP[normalizado] ?? null;
}

export function obtenerTipoDocumentoDesdeCarpeta(
  nombreCarpeta?: string | null
): string | null {
  if (!nombreCarpeta) {
    return null;
  }

  return normalizarTipoDocumento(nombreCarpeta);
}

export function inferirTipoDocumento(
  nombreCarpeta: string,
  tipoDocumento?: string | null
): string {
  return (
    normalizarTipoDocumento(tipoDocumento) ||
    obtenerTipoDocumentoDesdeCarpeta(nombreCarpeta) ||
    TIPOS_DOCUMENTO.OTRO
  );
}

/**
 * Límites de tamaño por tipo de documento (en bytes)
 */
export const LIMITES_TAMANO = {
  [TIPOS_DOCUMENTO.CONTRATO]: 10 * 1024 * 1024, // 10MB
  [TIPOS_DOCUMENTO.NOMINA]: 2 * 1024 * 1024, // 2MB
  [TIPOS_DOCUMENTO.JUSTIFICANTE]: 5 * 1024 * 1024, // 5MB (incluye médicos)
  [TIPOS_DOCUMENTO.OTRO]: 10 * 1024 * 1024, // 10MB
};

/**
 * MIME types permitidos
 */
export const MIME_TYPES_PERMITIDOS = [
  // PDFs
  'application/pdf',
  // Imágenes
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  // Office
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
];

// ========================================
// FUNCIONES AUXILIARES PARA RELACIÓN M:N DOCUMENTO-CARPETA
// ========================================

/**
 * Asigna un documento a una carpeta (crea relación en tabla intermedia)
 * @param documentoId ID del documento
 * @param carpetaId ID de la carpeta
 */
export async function asignarDocumentoACarpeta(
  documentoId: string,
  carpetaId: string
) {
  return await prisma.documento_carpetas.create({
    data: {
      documentoId,
      carpetaId,
    },
  });
}

/**
 * Asigna un documento a múltiples carpetas de una vez
 * @param documentoId ID del documento
 * @param carpetaIds Array de IDs de carpetas
 */
export async function asignarDocumentoAMultiplesCarpetas(
  documentoId: string,
  carpetaIds: string[]
) {
  const relaciones = carpetaIds.map(carpetaId => ({
    documentoId,
    carpetaId,
  }));

  return await prisma.documento_carpetas.createMany({
    data: relaciones,
    skipDuplicates: true,
  });
}

/**
 * Sincroniza un documento con carpetas del sistema:
 * - Carpeta personal del empleado (si existe)
 * - Carpeta master correspondiente (para HRadmins)
 *
 * Esta es la función clave para la sincronización automática.
 *
 * @param documentoId ID del documento
 * @param empleadoId ID del empleado propietario
 * @param empresaId ID de la empresa
 * @param nombreCarpeta Nombre de la carpeta del sistema ('Contratos', 'Nóminas', etc.)
 */
export async function sincronizarDocumentoConCarpetasSistema(
  documentoId: string,
  empleadoId: string,
  empresaId: string,
  nombreCarpeta: CarpetaSistema
) {
  const carpetasIds: string[] = [];

  // 1. Buscar o crear carpeta del empleado
  let carpetaEmpleado = await obtenerOCrearCarpetaSistema(
    empleadoId,
    empresaId,
    nombreCarpeta
  );
  carpetasIds.push(carpetaEmpleado.id);

  // 2. Buscar carpeta master correspondiente
  const carpetaMaster = await prisma.carpetas.findFirst({
    where: {
      empresaId,
      empleadoId: null,
      nombre: nombreCarpeta,
      esSistema: true,
    },
  });

  if (carpetaMaster) {
    carpetasIds.push(carpetaMaster.id);
  } else {
    console.warn(
      `Carpeta master "${nombreCarpeta}" no encontrada para empresa ${empresaId}. Solo asignando a carpeta del empleado.`
    );
  }

  // 3. Crear todas las relaciones
  await asignarDocumentoAMultiplesCarpetas(documentoId, carpetasIds);

  return {
    carpetaEmpleadoId: carpetaEmpleado.id,
    carpetaMasterId: carpetaMaster?.id,
    carpetasAsignadas: carpetasIds.length,
  };
}

/**
 * Obtiene todas las carpetas en las que está un documento
 * @param documentoId ID del documento
 */
export async function obtenerCarpetasDeDocumento(documentoId: string) {
  const relaciones = await prisma.documento_carpetas.findMany({
    where: { documentoId },
    include: {
      carpeta: true,
    },
  });

  return relaciones.map(r => r.carpeta);
}

/**
 * Obtiene todos los documentos de una carpeta (usando tabla intermedia)
 * @param carpetaId ID de la carpeta
 * @param incluirDetalles Si true, incluye datos completos del documento
 */
export async function obtenerDocumentosDeCarpeta(
  carpetaId: string,
  incluirDetalles = true
) {
  const relaciones = await prisma.documento_carpetas.findMany({
    where: { carpetaId },
    include: {
      documento: incluirDetalles
        ? {
            include: {
              empleado: {
                select: {
                  id: true,
                  nombre: true,
                  apellidos: true,
                  email: true,
                },
              },
            },
          }
        : true,
    },
    orderBy: {
      documento: {
        createdAt: 'desc',
      },
    },
  });

  return relaciones.map(r => r.documento);
}

/**
 * Obtiene las carpetas de un empleado
 *
 * ⚠️ NOTA: Esta función actualmente NO se usa en el código.
 * Si decides usarla en el futuro, considera añadir `empleadoId: null` a las condiciones
 * de carpetas compartidas para ser explícito, ya que las carpetas compartidas siempre
 * tienen empleadoId = null según el diseño del sistema.
 */
interface CarpetaWhereClause {
  OR: Array<Record<string, unknown>>;
}

export async function obtenerCarpetasEmpleado(
  empleadoId: string,
  incluirCompartidas = true
) {
  const whereClause: CarpetaWhereClause = {
    OR: [
      // Carpetas personales del empleado
      { empleadoId },
    ],
  };

  if (incluirCompartidas) {
    // Carpetas compartidas: incluir las asignadas a "todos"
    whereClause.OR.push({
      empleadoId: null,
      compartida: true,
      asignadoA: 'todos',
    });

    // Obtener equipos del empleado para agregar carpetas de esos equipos
    const empleado = await prisma.empleados.findUnique({
      where: { id: empleadoId },
      include: {
        equipos: true,
      },
    });

    if (empleado) {
      // Agregar condiciones para cada equipo del empleado
      for (const ee of empleado.equipos) {
        whereClause.OR.push({
          empleadoId: null,
          compartida: true,
          asignadoA: `equipo:${ee.equipoId}`,
        });
      }
    }
  }

  return prisma.carpetas.findMany({
    where: whereClause,
    include: {
      documento_carpetas: {
        include: {
          documento: true,
        },
        orderBy: {
          documento: {
            createdAt: 'desc',
          },
        },
      },
      subcarpetas: {
        include: {
          documento_carpetas: {
            include: {
              documento: true,
            },
          },
        },
      },
    },
    orderBy: [
      { esSistema: 'desc' }, // Carpetas del sistema primero
      { nombre: 'asc' },
    ],
  });
}

/**
 * Valida si un usuario puede acceder a una carpeta
 */
export async function puedeAccederACarpeta(
  carpetaId: string,
  usuarioId: string,
  rol: string
): Promise<boolean> {
  // HR Admin puede ver todo
  if (rol === UsuarioRol.hr_admin) {
    return true;
  }

  const carpeta = await prisma.carpetas.findUnique({
    where: { id: carpetaId },
    include: {
      empleado: {
        include: {
          usuario: true,
        },
      },
    },
  });

  if (!carpeta) {
    return false;
  }

  // Si es carpeta compartida con "todos"
  if (carpeta.compartida && carpeta.asignadoA === 'todos') {
    return true;
  }

  // Si es carpeta personal del empleado
  if (carpeta.empleado?.usuarioId === usuarioId) {
    return true;
  }

  // Si es carpeta compartida asignada específicamente
  // IMPORTANTE: Las carpetas compartidas SOLO se asignan a equipos, NO a empleados individuales
  if (carpeta.compartida && carpeta.asignadoA) {
    // Obtener empleado del usuario
    const empleado = await prisma.empleados.findUnique({
      where: { usuarioId },
      include: {
        equipos: {
          include: {
            equipo: true,
          },
        },
      },
    });

    if (!empleado) {
      return false;
    }

    const asignadoAString = carpeta.asignadoA;

    // Verificar si está asignado a un equipo del empleado
    if (asignadoAString.startsWith('equipo:')) {
      const equipoId = asignadoAString.replace('equipo:', '');
      const perteneceAlEquipo = empleado.equipos.some((ee) => ee.equipoId === equipoId);
      if (perteneceAlEquipo) {
        return true;
      }
    }
  }

  // Permisos para managers: pueden ver carpetas de empleados de su equipo
  if (rol === UsuarioRol.manager) {
    const manager = await prisma.empleados.findUnique({
      where: { usuarioId },
      select: { id: true },
    });

    if (manager && carpeta.empleadoId) {
      // Verificar si el empleado de la carpeta está en algún equipo donde este usuario es manager
      const equiposComoManager = await prisma.equipos.findFirst({
        where: {
          managerId: manager.id,
          empleado_equipos: {
            some: {
              empleadoId: carpeta.empleadoId,
            },
          },
        },
      });

      if (equiposComoManager) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Valida si un usuario puede subir documentos a una carpeta
 */
export async function puedeSubirACarpeta(
  carpetaId: string,
  usuarioId: string,
  rol: string
): Promise<boolean> {
  // HR Admin puede subir a cualquier carpeta
  if (rol === UsuarioRol.hr_admin) {
    return true;
  }

  const carpeta = await prisma.carpetas.findUnique({
    where: { id: carpetaId },
    include: {
      empleado: {
        include: {
          usuario: true,
        },
      },
    },
  });

  if (!carpeta) {
    return false;
  }

  if (carpeta.empleado?.usuarioId === usuarioId) {
    return EMPLOYEE_UPLOAD_FOLDERS.has(carpeta.nombre);
  }

  return false;
}

/**
 * Valida el tamaño de un archivo según su tipo
 */
export function validarTamanoArchivo(
  tamano: number,
  tipoDocumento: string
): boolean {
  const limiteKey = tipoDocumento as keyof typeof LIMITES_TAMANO;
  const limite = LIMITES_TAMANO[limiteKey] || LIMITES_TAMANO.otro;
  return tamano <= limite;
}

/**
 * Valida el MIME type de un archivo
 */
export function validarMimeType(mimeType: string): boolean {
  return MIME_TYPES_PERMITIDOS.includes(mimeType);
}

/**
 * Genera un nombre de archivo único si ya existe
 */
export async function generarNombreUnico(
  nombre: string,
  carpetaId: string
): Promise<string> {
  const extension = nombre.substring(nombre.lastIndexOf('.'));
  const nombreBase = nombre.substring(0, nombre.lastIndexOf('.'));

  let nombreFinal = nombre;
  let contador = 1;

  while (true) {
    // Buscar documento en la carpeta usando tabla intermedia
    const existente = await prisma.documento_carpetas.findFirst({
      where: {
        carpetaId,
        documento: {
          nombre: nombreFinal,
        },
      },
    });

    if (!existente) {
      return nombreFinal;
    }

    nombreFinal = `${nombreBase} (${contador})${extension}`;
    contador++;
  }
}

/**
 * Obtiene la ruta de storage para un documento
 * En MVP: filesystem local
 * En Fase 2: S3
 */
export function generarRutaStorage(
  empresaId: string,
  empleadoId: string | null,
  carpetaNombre: string,
  nombreArchivo: string
): string {
  if (empleadoId) {
    return `${empresaId}/${empleadoId}/${carpetaNombre.toLowerCase()}/${nombreArchivo}`;
  } else {
    // Carpeta compartida - incluir nombre de carpeta para evitar colisiones de s3Key
    return `${empresaId}/compartidos/${carpetaNombre.toLowerCase()}/${nombreArchivo}`;
  }
}

/**
 * Valida caracteres especiales en nombre de archivo
 */
export function validarNombreArchivo(nombre: string): {
  valido: boolean;
  error?: string;
} {
  // Caracteres no permitidos
  const caracteresProhibidos = /[\/\\<>:"|?*]/;

  if (caracteresProhibidos.test(nombre)) {
    return {
      valido: false,
      error: 'El nombre contiene caracteres no permitidos',
    };
  }

  if (nombre.length > 255) {
    return {
      valido: false,
      error: 'El nombre es demasiado largo (máximo 255 caracteres)',
    };
  }

  return { valido: true };
}

/**
 * Obtiene o crea una carpeta del sistema para un empleado
 * @param empleadoId ID del empleado
 * @param empresaId ID de la empresa
 * @param nombreCarpeta Nombre de la carpeta (debe ser una de CARPETAS_SISTEMA)
 * @returns La carpeta existente o recién creada
 */
export async function obtenerOCrearCarpetaSistema(
  empleadoId: string,
  empresaId: string,
  nombreCarpeta: CarpetaSistema
) {
  // Buscar carpeta existente
  let carpeta = await prisma.carpetas.findFirst({
    where: {
      empresaId,
      empleadoId,
      nombre: nombreCarpeta,
      esSistema: true,
    },
  });

  // Si no existe, crearla
  if (!carpeta) {
    carpeta = await prisma.carpetas.create({
      data: {
        empresaId,
        empleadoId,
        nombre: nombreCarpeta,
        esSistema: true,
        compartida: false,
      },
    });
  }

  return carpeta;
}

/**
 * Asegura que todas las carpetas del sistema existan para un empleado
 * Esta función es idempotente: puede llamarse múltiples veces sin duplicar carpetas
 * 
 * @param empleadoId ID del empleado
 * @param empresaId ID de la empresa
 * @returns Array con todas las carpetas del sistema del empleado
 */
export async function asegurarCarpetasSistemaParaEmpleado(
  empleadoId: string,
  empresaId: string
) {
  const carpetas = [];

  for (const nombreCarpeta of CARPETAS_SISTEMA) {
    const carpeta = await obtenerOCrearCarpetaSistema(
      empleadoId,
      empresaId,
      nombreCarpeta
    );
    carpetas.push(carpeta);
  }

  return carpetas;
}

/**
 * Obtiene o crea una carpeta global (sin empleadoId) para HR
 * Usada para agregaciones de documentos de todos los empleados
 * @param empresaId ID de la empresa
 * @param nombreCarpeta Nombre de la carpeta (Nóminas, Contratos, Justificantes)
 * @returns La carpeta global existente o recién creada
 */
export async function obtenerOCrearCarpetaGlobal(
  empresaId: string,
  nombreCarpeta: string
) {
  // Buscar carpeta global existente
  let carpeta = await prisma.carpetas.findFirst({
    where: {
      empresaId,
      empleadoId: null,
      nombre: nombreCarpeta,
      esSistema: true,
      compartida: true,
    },
  });

  // Si no existe, crearla
  if (!carpeta) {
    carpeta = await prisma.carpetas.create({
      data: {
        empresaId,
        empleadoId: null,
        nombre: nombreCarpeta,
        esSistema: true,
        compartida: true,
        asignadoA: 'todos',
      },
    });
  }

  return carpeta;
}

/**
 * Asegura que las carpetas master/globales por defecto existan para la empresa.
 * Estas son carpetas sin empleadoId que agregan documentos de todos los empleados.
 * Devuelve las carpetas creadas o encontradas.
 */
export async function asegurarCarpetasGlobales(empresaId: string) {
  const carpetas = [];

  for (const nombre of CARPETAS_SISTEMA) {
    const carpeta = await obtenerOCrearCarpetaGlobal(empresaId, nombre);
    carpetas.push(carpeta);
  }

  return carpetas;
}

export async function eliminarDocumentoPorId(documentoId: string) {
  const documento = await prisma.documentos.findUnique({
    where: { id: documentoId },
  });

  if (!documento) {
    return;
  }

  if (documento.s3Key) {
    const isCloudDocument = documento.s3Bucket && documento.s3Bucket !== 'local';
    if (isCloudDocument) {
      await deleteFromS3(documento.s3Key);
    } else {
      const filePath = join(process.cwd(), 'uploads', documento.s3Key);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    }
  }

  await prisma.documentos.delete({
    where: { id: documentoId },
  });
}
