// ========================================
// File Upload Validations
// ========================================
// Centraliza validaciones de archivos para reutilizarlas tanto
// en componentes cliente como en API routes.

export interface FileValidationOptions {
  acceptedTypes?: string[];
  maxSizeMB?: number;
  maxFiles?: number;
  allowMultiple?: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

const DEFAULT_ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export function normalizeAcceptedTypes(acceptedTypes?: string[]): string[] {
  if (!acceptedTypes || acceptedTypes.length === 0) {
    return DEFAULT_ACCEPTED_TYPES;
  }
  return acceptedTypes.map((type) => type.toLowerCase());
}

export function validateFileType(file: File, acceptedTypes?: string[]): FileValidationResult {
  const allowed = normalizeAcceptedTypes(acceptedTypes);
  if (!allowed.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido (${file.type || 'desconocido'}).`,
    };
  }
  return { valid: true };
}

export function validateFileSize(file: File, maxSizeMB?: number): FileValidationResult {
  if (!maxSizeMB) return { valid: true };
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo (${maxSizeMB}MB).`,
    };
  }
  return { valid: true };
}

export function validateFileCount(currentCount: number, options?: FileValidationOptions): FileValidationResult {
  if (!options?.maxFiles) return { valid: true };
  if (currentCount >= options.maxFiles) {
    return {
      valid: false,
      error: `Solo puedes subir hasta ${options.maxFiles} archivos.`,
    };
  }
  return { valid: true };
}

export async function validateMagicNumber(file: File, acceptedTypes?: string[]): Promise<FileValidationResult> {
  const allowed = normalizeAcceptedTypes(acceptedTypes);
  if (allowed.some((type) => type.startsWith('image/'))) {
    const arrayBuffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const hexSignature = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

    // Signatures to detect JPEG/PNG/PDF quickly
    const knownSignatures: Record<string, string[]> = {
      'image/png': ['89504e47'],
      'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
      'application/pdf': ['25504446'],
    };

    const matchesAllowedType = allowed.some((type) => {
      const signatures = knownSignatures[type];
      if (!signatures) return true; // No signature registered
      return signatures.some((signature) => hexSignature.startsWith(signature));
    });

    if (!matchesAllowedType) {
      return {
        valid: false,
        error: 'El archivo parece estar corrupto o tiene un formato no soportado.',
      };
    }
  }

  return { valid: true };
}

export async function validateFile(
  file: File,
  options?: FileValidationOptions
): Promise<FileValidationResult> {
  const typeResult = validateFileType(file, options?.acceptedTypes);
  if (!typeResult.valid) return typeResult;

  const sizeResult = validateFileSize(file, options?.maxSizeMB);
  if (!sizeResult.valid) return sizeResult;

  const magicResult = await validateMagicNumber(file, options?.acceptedTypes);
  if (!magicResult.valid) return magicResult;

  return { valid: true };
}


