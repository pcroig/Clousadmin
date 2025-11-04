// ========================================
// Documentos - Utility Functions
// ========================================
// Helper functions for document management system

import { prisma } from './prisma';

/**
 * Carpetas del sistema que se crean automáticamente para cada empleado
 */
export const CARPETAS_SISTEMA = [
  'Contratos',
  'Nóminas',
  'Personales',
  'Médicos',
] as const;

export type CarpetaSistema = typeof CARPETAS_SISTEMA[number];

/**
 * Tipos de documentos permitidos
 */
export const TIPOS_DOCUMENTO = {
  CONTRATO: 'contrato',
  NOMINA: 'nomina',
  MEDICO: 'medico',
  PERSONAL: 'personal',
  OTRO: 'otro',
} as const;

/**
 * Límites de tamaño por tipo de documento (en bytes)
 */
export const LIMITES_TAMANO = {
  [TIPOS_DOCUMENTO.CONTRATO]: 10 * 1024 * 1024, // 10MB
  [TIPOS_DOCUMENTO.NOMINA]: 2 * 1024 * 1024, // 2MB
  [TIPOS_DOCUMENTO.MEDICO]: 5 * 1024 * 1024, // 5MB
  [TIPOS_DOCUMENTO.PERSONAL]: 5 * 1024 * 1024, // 5MB
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
 * Se ejecuta automáticamente al crear un nuevo empleado
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
export async function obtenerCarpetasEmpleado(
  empleadoId: string,
  incluirCompartidas = true
) {
  const whereClause: any = {
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
  if (rol === 'hr_admin') {
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
  if (rol === 'hr_admin') {
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

  // Los empleados solo pueden subir a carpetas Personales y Médicos
  if (carpeta.empleado?.usuarioId === usuarioId) {
    return (
      carpeta.nombre === 'Personales' || carpeta.nombre === 'Médicos'
    );
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
