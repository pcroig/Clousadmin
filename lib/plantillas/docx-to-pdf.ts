/**
 * Conversión DOCX → PDF
 *
 * - Usa LibreOffice (soffice) en modo headless para convertir DOCX a PDF.
 * - Funciona tanto con buffers en memoria como con archivos almacenados en S3.
 * - Se utiliza como fachada única para todos los flujos que necesiten PDF “oficial”.
 *
 * NOTAS:
 * - Requiere tener LibreOffice instalado en el host donde se ejecuta la conversión.
 * - Puedes especificar la ruta mediante la variable de entorno LIBREOFFICE_PATH.
 */

import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import { descargarDocumento, subirDocumento } from '@/lib/s3';

const execFileAsync = promisify(execFile);

export interface ConvertDocxToPdfOptions {
  libreOfficePath?: string;
  targetS3Key?: string;
}

/**
 * Convierte un buffer DOCX a un buffer PDF utilizando LibreOffice.
 */
export async function convertDocxBufferToPdf(
  docxBuffer: Buffer,
  options: ConvertDocxToPdfOptions = {}
): Promise<Buffer> {
  const libreOfficePath = options.libreOfficePath || process.env.LIBREOFFICE_PATH || 'soffice';
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clousadmin-docx-'));
  const inputPath = path.join(tmpDir, `${randomUUID()}.docx`);
  const outputPath = inputPath.replace(/\.docx$/, '.pdf');

  try {
    await fs.writeFile(inputPath, docxBuffer);

    try {
      await execFileAsync(libreOfficePath, [
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        tmpDir,
        inputPath,
      ]);
    } catch (commandError) {
      const message =
        commandError instanceof Error ? commandError.message : 'Error desconocido ejecutando LibreOffice';

      if ((commandError as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(
          '[DOCX→PDF] LibreOffice no está disponible. Instala `soffice` o configura LIBREOFFICE_PATH antes de continuar.'
        );
      }

      throw new Error(`[DOCX→PDF] Error durante la conversión con LibreOffice: ${message}`);
    }

    const pdfExists = await fs
      .access(outputPath)
      .then(() => true)
      .catch(() => false);

    if (!pdfExists) {
      throw new Error('[DOCX→PDF] No se generó el archivo PDF esperado');
    }

    const pdfBuffer = await fs.readFile(outputPath);
    return pdfBuffer;
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn('[DOCX→PDF] No se pudo limpiar el directorio temporal:', cleanupError);
    }
  }
}

/**
 * Convierte un DOCX almacenado en S3 a PDF y sube el resultado al mismo bucket.
 * @returns La clave S3 del PDF generado.
 */
export interface ConvertDocxFromS3ToPdfResult {
  pdfS3Key: string;
  pdfSize: number;
}

export async function convertDocxFromS3ToPdf(
  docxS3Key: string,
  options: ConvertDocxToPdfOptions = {}
): Promise<ConvertDocxFromS3ToPdfResult> {
  const docxBuffer = await descargarDocumento(docxS3Key);
  const pdfBuffer = await convertDocxBufferToPdf(docxBuffer, options);

  const targetS3Key = options.targetS3Key ?? docxS3Key.replace(/\.docx$/i, '.pdf');
  await subirDocumento(pdfBuffer, targetS3Key, 'application/pdf');

  return {
    pdfS3Key: targetS3Key,
    pdfSize: pdfBuffer.length,
  };
}

