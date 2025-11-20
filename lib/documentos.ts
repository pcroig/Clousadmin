// ========================================
// Documentos - Utility Functions
// ========================================
// Helper functions for document management system

import { prisma } from './prisma';
import { deleteFromS3 } from './s3';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';

import { UsuarioRol } from '@/lib/constants/enums';

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

const CARPETAS_GLOBALES: CarpetaSistema[] = [
  'Contratos',
  'Nóminas',
  'Justificantes',
  'Otros',
];

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

/**
 * Crea las carpetas del sistema para un empleado
 * 
 * @deprecated Usa `asegurarCarpetasSistemaParaEmpleado()` en su lugar.
 * Esta función crea carpetas sin verificar si ya existen, lo que puede causar duplicados.
 * La nueva función es idempotente y más segura.
 * 
 * @param empleadoId ID del empleado
 * @param empresaId ID de la empresa
 * @returns Array de carpetas creadas
 */
export async function crearCarpetasSistemaParaEmpleado(
  empleadoId: string,
  empresaId: string
) {
  const carpetas = [];

  for (const nombreCarpeta of CARPETAS_SISTEMA) {
    const carpeta = await prisma.carpeta.create({
      data: {
        empresaId,
        empleadoId,
        nombre: nombreCarpeta,
        esSistema: true,
        compartida: false,
      },
    });
    carpetas.push(carpeta);
  }

  return carpetas;
}

/**
 * Obtiene las carpetas de un empleado
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
    // Carpetas compartidas: incluir las asignadas a "todos" o al empleado específico
    whereClause.OR.push(
      {
        compartida: true,
        asignadoA: 'todos',
      },
      {
        compartida: true,
        asignadoA: {
          contains: `empleado:${empleadoId}`,
        },
      }
    );
  }

  return prisma.carpeta.findMany({
    where: whereClause,
    include: {
      documentos: {
        orderBy: { createdAt: 'desc' },
      },
      subcarpetas: {
        include: {
          documentos: true,
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

  const carpeta = await prisma.carpeta.findUnique({
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

  // Si es carpeta compartida asignada específicamente al empleado
  if (carpeta.compartida && carpeta.asignadoA) {
    // Obtener empleado del usuario
    const empleado = await prisma.empleado.findUnique({
      where: { usuarioId },
    });

    if (empleado && carpeta.asignadoA.includes(`empleado:${empleado.id}`)) {
      return true;
    }
  }

  // TODO: Implementar permisos para managers (ver equipo)

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

  const carpeta = await prisma.carpeta.findUnique({
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
    const existente = await prisma.documento.findFirst({
      where: {
        carpetaId,
        nombre: nombreFinal,
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
    // Carpeta compartida
    return `${empresaId}/compartidos/${nombreArchivo}`;
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
  let carpeta = await prisma.carpeta.findFirst({
    where: {
      empresaId,
      empleadoId,
      nombre: nombreCarpeta,
      esSistema: true,
    },
  });

  // Si no existe, crearla
  if (!carpeta) {
    carpeta = await prisma.carpeta.create({
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
  let carpeta = await prisma.carpeta.findFirst({
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
    carpeta = await prisma.carpeta.create({
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
 * Asegura que las carpetas globales por defecto (Contratos, Nóminas, Justificantes)
 * existan para la empresa indicada. Devuelve las carpetas creadas o encontradas.
 */
export async function asegurarCarpetasGlobales(empresaId: string) {
  const carpetas = [];

  for (const nombre of CARPETAS_GLOBALES) {
    const carpeta = await obtenerOCrearCarpetaGlobal(empresaId, nombre);
    carpetas.push(carpeta);
  }

  return carpetas;
}

export async function eliminarDocumentoPorId(documentoId: string) {
  const documento = await prisma.documento.findUnique({
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

  await prisma.documento.delete({
    where: { id: documentoId },
  });
}
