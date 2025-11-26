/**
 * Tests unitarios para validación de archivos
 * Cobertura: 100% de funciones y casos edge
 */

import { describe, expect, it } from 'vitest';

import {
  normalizeAcceptedTypes,
  validateFile,
  validateFileCount,
  validateFileSize,
  validateFileType,
  validateMagicNumber,
} from '../file-upload';

// ========================================
// HELPERS PARA CREAR FILES MOCK
// ========================================

function createMockFile(
  name: string,
  type: string,
  size: number,
  content?: ArrayBuffer
): File {
  const buffer = content || new ArrayBuffer(size);
  const blob = new Blob([buffer], { type });

  // Cast a File con propiedades necesarias
  return Object.assign(blob, {
    name,
    lastModified: Date.now(),
    webkitRelativePath: '',
    slice: (start = 0, end = size) => {
      const slicedBuffer = buffer.slice(start, end);
      return new Blob([slicedBuffer], { type });
    },
  }) as File;
}

function createPDFFile(name = 'test.pdf', sizeMB = 1): File {
  // Magic number PDF: 25504446 (%PDF)
  const buffer = new ArrayBuffer(sizeMB * 1024 * 1024);
  const view = new Uint8Array(buffer);
  view[0] = 0x25; // %
  view[1] = 0x50; // P
  view[2] = 0x44; // D
  view[3] = 0x46; // F

  return createMockFile(name, 'application/pdf', sizeMB * 1024 * 1024, buffer);
}

function createPNGFile(name = 'test.png', sizeMB = 1): File {
  // Magic number PNG: 89504e47
  const buffer = new ArrayBuffer(sizeMB * 1024 * 1024);
  const view = new Uint8Array(buffer);
  view[0] = 0x89;
  view[1] = 0x50; // P
  view[2] = 0x4e; // N
  view[3] = 0x47; // G

  return createMockFile(name, 'image/png', sizeMB * 1024 * 1024, buffer);
}

function createJPEGFile(name = 'test.jpg', sizeMB = 1): File {
  // Magic number JPEG: ffd8ffe0
  const buffer = new ArrayBuffer(sizeMB * 1024 * 1024);
  const view = new Uint8Array(buffer);
  view[0] = 0xff;
  view[1] = 0xd8;
  view[2] = 0xff;
  view[3] = 0xe0;

  return createMockFile(name, 'image/jpeg', sizeMB * 1024 * 1024, buffer);
}

function createInvalidFile(name = 'evil.exe', type = 'application/x-msdownload', sizeMB = 1): File {
  // Archivo con tipo no permitido
  return createMockFile(name, type, sizeMB * 1024 * 1024);
}

function createSpoofedFile(name = 'fake.pdf', declaredType = 'application/pdf', actualMagic = [0x00, 0x00, 0x00, 0x00]): File {
  // Archivo que dice ser PDF pero tiene magic number diferente
  const buffer = new ArrayBuffer(1024);
  const view = new Uint8Array(buffer);
  view[0] = actualMagic[0];
  view[1] = actualMagic[1];
  view[2] = actualMagic[2];
  view[3] = actualMagic[3];

  return createMockFile(name, declaredType, 1024, buffer);
}

// ========================================
// normalizeAcceptedTypes
// ========================================

describe('normalizeAcceptedTypes', () => {
  it('should return default types when no types provided', () => {
    expect(normalizeAcceptedTypes()).toEqual([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ]);
  });

  it('should return default types when empty array provided', () => {
    expect(normalizeAcceptedTypes([])).toEqual([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ]);
  });

  it('should convert types to lowercase', () => {
    expect(normalizeAcceptedTypes(['APPLICATION/PDF', 'IMAGE/PNG'])).toEqual([
      'application/pdf',
      'image/png',
    ]);
  });

  it('should handle mixed case types', () => {
    expect(normalizeAcceptedTypes(['Image/JPEG', 'application/PDF'])).toEqual([
      'image/jpeg',
      'application/pdf',
    ]);
  });

  it('should preserve custom types', () => {
    expect(normalizeAcceptedTypes(['application/zip', 'text/plain'])).toEqual([
      'application/zip',
      'text/plain',
    ]);
  });
});

// ========================================
// validateFileType
// ========================================

describe('validateFileType', () => {
  describe('Valid file types', () => {
    it('should validate PDF files', () => {
      const file = createPDFFile();
      const result = validateFileType(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate PNG files', () => {
      const file = createPNGFile();
      const result = validateFileType(file);

      expect(result.valid).toBe(true);
    });

    it('should validate JPEG files', () => {
      const file = createJPEGFile();
      const result = validateFileType(file);

      expect(result.valid).toBe(true);
    });

    it('should validate custom accepted types', () => {
      const file = createMockFile('test.txt', 'text/plain', 100);
      const result = validateFileType(file, ['text/plain']);

      expect(result.valid).toBe(true);
    });

    it('should be case insensitive', () => {
      const file = createMockFile('test.pdf', 'APPLICATION/PDF', 100);
      const result = validateFileType(file, ['application/pdf']);

      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid file types', () => {
    it('should reject .exe files', () => {
      const file = createInvalidFile('virus.exe', 'application/x-msdownload');
      const result = validateFileType(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tipo de archivo no permitido');
    });

    it('should reject .zip files by default', () => {
      const file = createMockFile('archive.zip', 'application/zip', 1000);
      const result = validateFileType(file);

      expect(result.valid).toBe(false);
    });

    it('should reject files not in accepted types', () => {
      const file = createMockFile('video.mp4', 'video/mp4', 1000);
      const result = validateFileType(file, ['image/png', 'image/jpeg']);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Tipo de archivo no permitido (video/mp4).');
    });

    it('should handle files with unknown type', () => {
      const file = createMockFile('unknown', '', 100);
      const result = validateFileType(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('desconocido');
    });
  });
});

// ========================================
// validateFileSize
// ========================================

describe('validateFileSize', () => {
  describe('Valid file sizes', () => {
    it('should validate file within size limit', () => {
      const file = createPDFFile('small.pdf', 0.5); // 0.5 MB
      const result = validateFileSize(file, 1); // Max 1 MB

      expect(result.valid).toBe(true);
    });

    it('should validate file at exact size limit', () => {
      const file = createPDFFile('exact.pdf', 5); // 5 MB
      const result = validateFileSize(file, 5); // Max 5 MB

      expect(result.valid).toBe(true);
    });

    it('should allow any size when no limit specified', () => {
      const file = createPDFFile('large.pdf', 100); // 100 MB (no crear 1GB, causa timeout)
      const result = validateFileSize(file);

      expect(result.valid).toBe(true);
    });

    it('should handle very small files', () => {
      const file = createMockFile('tiny.txt', 'text/plain', 10); // 10 bytes
      const result = validateFileSize(file, 1);

      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid file sizes', () => {
    it('should reject file exceeding size limit', () => {
      const file = createPDFFile('large.pdf', 10); // 10 MB
      const result = validateFileSize(file, 5); // Max 5 MB

      expect(result.valid).toBe(false);
      expect(result.error).toBe('El archivo supera el tamaño máximo (5MB).');
    });

    it('should reject file slightly over limit', () => {
      const file = createMockFile('over.pdf', 'application/pdf', 5 * 1024 * 1024 + 1); // 5MB + 1 byte
      const result = validateFileSize(file, 5);

      expect(result.valid).toBe(false);
    });

    it('should show correct limit in error message', () => {
      const file = createPDFFile('huge.pdf', 100);
      const result = validateFileSize(file, 50);

      expect(result.error).toContain('50MB');
    });
  });
});

// ========================================
// validateFileCount
// ========================================

describe('validateFileCount', () => {
  it('should allow upload when under file limit', () => {
    const result = validateFileCount(2, { maxFiles: 5 });

    expect(result.valid).toBe(true);
  });

  it('should allow upload when at file limit minus one', () => {
    const result = validateFileCount(4, { maxFiles: 5 });

    expect(result.valid).toBe(true);
  });

  it('should reject when at file limit', () => {
    const result = validateFileCount(5, { maxFiles: 5 });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Solo puedes subir hasta 5 archivos.');
  });

  it('should reject when over file limit', () => {
    const result = validateFileCount(10, { maxFiles: 5 });

    expect(result.valid).toBe(false);
  });

  it('should allow unlimited files when no maxFiles specified', () => {
    const result = validateFileCount(1000);

    expect(result.valid).toBe(true);
  });

  it('should allow unlimited files when options not provided', () => {
    const result = validateFileCount(9999, {});

    expect(result.valid).toBe(true);
  });

  it('should show correct limit in error message', () => {
    const result = validateFileCount(3, { maxFiles: 3 });

    expect(result.error).toContain('3 archivos');
  });
});

// ========================================
// validateMagicNumber
// ========================================

describe('validateMagicNumber', () => {
  describe('Valid magic numbers', () => {
    it('should validate PNG with correct magic number', async () => {
      const file = createPNGFile();
      const result = await validateMagicNumber(file, ['image/png']);

      expect(result.valid).toBe(true);
    });

    it('should validate JPEG with correct magic number', async () => {
      const file = createJPEGFile();
      const result = await validateMagicNumber(file, ['image/jpeg']);

      expect(result.valid).toBe(true);
    });

    it('should skip validation for PDFs (only images are validated)', async () => {
      // La implementación solo valida magic numbers para tipos que empiezan con 'image/'
      const file = createPDFFile();
      const result = await validateMagicNumber(file, ['application/pdf']);

      expect(result.valid).toBe(true);
    });

    it('should skip validation for non-image types', async () => {
      const file = createMockFile('test.txt', 'text/plain', 100);
      const result = await validateMagicNumber(file, ['text/plain']);

      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid magic numbers (spoofed files)', () => {
    it('should reject file claiming to be PNG with JPEG magic number', async () => {
      const file = createSpoofedFile('fake.png', 'image/png', [0xff, 0xd8, 0xff, 0xe0]);
      const result = await validateMagicNumber(file, ['image/png']);

      expect(result.valid).toBe(false);
    });

    it('should reject file claiming to be image with text content', async () => {
      const file = createSpoofedFile('fake.jpg', 'image/jpeg', [0x48, 0x65, 0x6c, 0x6c]); // "Hell"
      const result = await validateMagicNumber(file, ['image/jpeg']);

      expect(result.valid).toBe(false);
    });

    it('should reject PNG with wrong magic number', async () => {
      const file = createSpoofedFile('fake.png', 'image/png', [0x00, 0x00, 0x00, 0x00]);
      const result = await validateMagicNumber(file, ['image/png']);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('corrupto');
    });
  });

  describe('Edge cases', () => {
    it('should skip magic number check for non-image files (even if empty)', async () => {
      // PDFs y otros tipos no-imagen no tienen validación de magic number
      const file = createMockFile('empty.pdf', 'application/pdf', 0, new ArrayBuffer(0));
      const result = await validateMagicNumber(file, ['application/pdf']);

      expect(result.valid).toBe(true);
    });

    it('should handle empty image files', async () => {
      const file = createMockFile('empty.png', 'image/png', 0, new ArrayBuffer(0));
      const result = await validateMagicNumber(file, ['image/png']);

      // Empty image file should fail magic number check
      expect(result.valid).toBe(false);
    });

    it('should handle image files smaller than 4 bytes', async () => {
      const buffer = new ArrayBuffer(2);
      const file = createMockFile('tiny.png', 'image/png', 2, buffer);
      const result = await validateMagicNumber(file, ['image/png']);

      expect(result.valid).toBe(false);
    });
  });
});

// ========================================
// validateFile (integración)
// ========================================

describe('validateFile', () => {
  describe('Valid files', () => {
    it('should validate correct PDF file', async () => {
      const file = createPDFFile('document.pdf', 2);
      const result = await validateFile(file, { maxSizeMB: 5 });

      expect(result.valid).toBe(true);
    });

    it('should validate correct PNG file', async () => {
      const file = createPNGFile('image.png', 1);
      const result = await validateFile(file, { maxSizeMB: 10 });

      expect(result.valid).toBe(true);
    });

    it('should validate with custom options', async () => {
      const file = createJPEGFile('photo.jpg', 3);
      const result = await validateFile(file, {
        acceptedTypes: ['image/jpeg', 'image/png'],
        maxSizeMB: 5,
      });

      expect(result.valid).toBe(true);
    });

    it('should validate without any options', async () => {
      const file = createPDFFile();
      const result = await validateFile(file);

      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid files - early return on first error', () => {
    it('should reject wrong file type before checking size', async () => {
      const file = createInvalidFile('virus.exe', 'application/x-msdownload', 0.1);
      const result = await validateFile(file, { maxSizeMB: 10 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tipo de archivo no permitido');
    });

    it('should reject oversized file before checking magic number', async () => {
      const file = createPDFFile('huge.pdf', 100);
      const result = await validateFile(file, { maxSizeMB: 5 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('supera el tamaño máximo');
    });

    it('should reject spoofed image file after passing type and size checks', async () => {
      // Solo imágenes tienen validación de magic number, no PDFs
      const file = createSpoofedFile('fake.png', 'image/png', [0x00, 0x00, 0x00, 0x00]);
      const result = await validateFile(file, {
        acceptedTypes: ['image/png'],
        maxSizeMB: 10,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('corrupto');
    });
  });

  describe('Integration scenarios', () => {
    it('should validate multiple checks in sequence', async () => {
      const file = createPNGFile('valid.png', 2);

      const result = await validateFile(file, {
        acceptedTypes: ['image/png', 'image/jpeg'],
        maxSizeMB: 5,
      });

      expect(result.valid).toBe(true);
    });

    it('should handle real-world upload scenario', async () => {
      const files = [
        createPDFFile('contract.pdf', 1),
        createPNGFile('signature.png', 0.5),
        createJPEGFile('id-photo.jpg', 2),
      ];

      const results = await Promise.all(
        files.map((file) => validateFile(file, { maxSizeMB: 10 }))
      );

      expect(results.every((r) => r.valid)).toBe(true);
    });

    it('should reject mixed valid and invalid files', async () => {
      const files = [
        createPDFFile('valid.pdf', 1),
        createInvalidFile('malware.exe'),
      ];

      const results = await Promise.all(
        files.map((file) => validateFile(file, { maxSizeMB: 10 }))
      );

      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
    });
  });
});
