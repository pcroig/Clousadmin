// ========================================
// Import de Nóminas - Upload y Matching
// ========================================
// Procesa PDFs múltiples, hace matching automático de empleados con IA
// y extrae datos financieros de los documentos

import { promises as fs } from 'fs';
import path from 'path';

import { Decimal } from '@prisma/client/runtime/library';

import { sincronizarDocumentoConCarpetasSistema } from '@/lib/documentos';
import { clasificarNomina, type EmpleadoCandidato } from '@/lib/ia/clasificador-nominas';
import { extraerDatosNomina } from '@/lib/ia/extractores/nomina-extractor';
import { prisma } from '@/lib/prisma';
import { shouldUseCloudStorage, uploadToS3 } from '@/lib/s3';


/**
 * Resultado del matching de una nómina con datos extraídos
 */
export interface MatchingResult {
  filename: string;
  buffer: Buffer;
  empleado: {
    id: string;
    nombre: string;
  } | null;
  confidence: number;
  autoAssigned: boolean;
  candidates: Array<{
    id: string;
    nombre: string;
    confidence: number;
  }>;
  extraccionIA?: {
    totalDeducciones: number | null;
    totalNeto: number | null;
    confianza: number;
    provider: string;
  };
}

/**
 * Estadísticas del proceso de upload
 */
export interface UploadStats {
  total: number;
  autoAssigned: number;
  needsReview: number;
  avgConfidence: number;
  extraccionExitosa: number;
}

/**
 * Sesión de upload temporal (en memoria para MVP)
 * En producción podría guardarse en Redis o base de datos
 */
const uploadSessions = new Map<
  string,
  {
    empresaId: string;
    mes: number;
    anio: number;
    eventoId: string;
    results: MatchingResult[];
    createdAt: Date;
  }
>();


/**
 * Procesa múltiples PDFs y hace matching + extracción IA
 */
export async function procesarNominas(
  files: Array<{ filename: string; buffer: Buffer }>,
  empresaId: string,
  mes: number,
  anio: number,
  eventoId: string
): Promise<{
  sessionId: string;
  stats: UploadStats;
  results: Omit<MatchingResult, 'buffer'>[];
}> {
  // Validar que solo sean PDFs
  for (const file of files) {
    if (!file.filename.toLowerCase().endsWith('.pdf')) {
      throw new Error(`Solo se permiten archivos PDF. Inválido: ${file.filename}`);
    }
  }

  // Obtener empleados activos de la empresa
  const empleados = await prisma.empleados.findMany({
    where: {
      empresaId,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      apellidos: true,
    },
  });

  // Preparar lista de empleados para el clasificador
  const empleadosCandidatos: EmpleadoCandidato[] = empleados.map((emp) => ({
    id: emp.id,
    nombre: emp.nombre,
    apellidos: emp.apellidos,
  }));

  // Procesar cada PDF con clasificador IA + extracción IA
  const results: MatchingResult[] = [];
  let totalConfidence = 0;
  let autoAssigned = 0;
  let extraccionExitosa = 0;

  for (const pdf of files) {
    // 1. Clasificar empleado (IA)
    const match = await clasificarNomina(pdf.filename, empleadosCandidatos);

    // 2. Extraer datos financieros (IA)
    const base64 = pdf.buffer.toString('base64');
    const documentUrl = `data:application/pdf;base64,${base64}`;
    const extraccion = await extraerDatosNomina(documentUrl);

    if (extraccion.success) {
      extraccionExitosa++;
    }

    results.push({
      filename: pdf.filename,
      buffer: pdf.buffer,
      empleado: match.empleado,
      confidence: match.confidence,
      autoAssigned: match.autoAssigned,
      candidates: match.candidates,
      extraccionIA: extraccion.success ? {
        totalDeducciones: extraccion.totalDeducciones,
        totalNeto: extraccion.totalNeto,
        confianza: extraccion.confianza,
        provider: extraccion.provider,
      } : undefined,
    });

    totalConfidence += match.confidence;
    if (match.autoAssigned) {
      autoAssigned++;
    }
  }

  // Generar session ID
  const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Guardar sesión (en memoria por ahora)
  uploadSessions.set(sessionId, {
    empresaId,
    mes,
    anio,
    eventoId,
    results,
    createdAt: new Date(),
  });

  // Limpiar sesiones antiguas (más de 1 hora)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [id, session] of uploadSessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      uploadSessions.delete(id);
    }
  }

  const stats: UploadStats = {
    total: results.length,
    autoAssigned,
    needsReview: results.length - autoAssigned,
    avgConfidence: results.length > 0 ? Math.round(totalConfidence / results.length) : 0,
    extraccionExitosa,
  };

  // No enviar buffers en la respuesta (solo en sesión)
  const resultsWithoutBuffer = results.map(({ buffer, ...rest }) => rest);

  return {
    sessionId,
    stats,
    results: resultsWithoutBuffer,
  };
}

/**
 * Obtiene una sesión de upload
 */
export function obtenerSesion(sessionId: string): {
  empresaId: string;
  mes: number;
  anio: number;
  eventoId: string;
  results: MatchingResult[];
} | null {
  return uploadSessions.get(sessionId) || null;
}

/**
 * Confirma un upload y actualiza las nóminas existentes con PDFs y datos IA
 */
export async function confirmarUpload(
  sessionId: string,
  confirmaciones: Array<{
    filename: string;
    empleadoId: string;
    descartado?: boolean;
  }>,
  uploadDir: string,
  empresaId: string,
  subidoPor: string
): Promise<{
  success: boolean;
  imported: number;
  descartados: number;
  errors: string[];
}> {
  const session = uploadSessions.get(sessionId);
  if (!session) {
    return {
      success: false,
      imported: 0,
      descartados: 0,
      errors: ['Sesión no encontrada o expirada'],
    };
  }

  const errors: string[] = [];
  let imported = 0;
  let descartados = 0;

  const useCloudStorage = shouldUseCloudStorage();
  const bucketName = process.env.STORAGE_BUCKET;

  // Procesar cada resultado
  for (const result of session.results) {
    try {
      const confirmacion = confirmaciones.find(c => c.filename === result.filename);

      // Opción "Descartar"
      if (confirmacion?.descartado) {
        descartados++;
        continue;
      }

      // Determinar empleado (confirmación manual o auto-asignado)
      const empleadoId = confirmacion?.empleadoId ||
        (result.autoAssigned && result.empleado ? result.empleado.id : null);

      if (!empleadoId) {
        errors.push(`${result.filename}: No se asignó empleado`);
        continue;
      }

      // ✅ VALIDACIÓN CRÍTICA: Verificar que existe pre-nómina generada
      const nominaExistente = await prisma.nominas.findUnique({
        where: {
          empleadoId_mes_anio: {
            empleadoId,
            mes: session.mes,
            anio: session.anio,
          },
        },
      });

      if (!nominaExistente) {
        errors.push(
          `${result.filename}: No existe pre-nómina para este empleado. Genera las pre-nóminas primero.`
        );
        continue;
      }

      // Generar ruta de archivo
      const timestamp = Date.now();
      const nombreArchivo = `${session.anio}_${String(session.mes).padStart(2, '0')}_${timestamp}.pdf`;
      const rutaArchivo = `${session.empresaId}/${empleadoId}/nominas/${nombreArchivo}`;

      let storageKey = rutaArchivo;
      let storageBucket = 'local';

      // Subir archivo
      if (useCloudStorage) {
        if (!bucketName) {
          throw new Error('STORAGE_BUCKET no configurado');
        }
        storageKey = `nominas/${rutaArchivo}`;
        await uploadToS3(result.buffer, storageKey, 'application/pdf');
        storageBucket = bucketName;
      } else {
        const fullPath = path.join(uploadDir, rutaArchivo);
        const dirPath = path.dirname(fullPath);
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(fullPath, result.buffer);
      }

      // Crear documento
      const documento = await prisma.documentos.create({
        data: {
          empresaId: session.empresaId,
          empleadoId,
          nombre: nombreArchivo,
          tipoDocumento: 'nomina',
          mimeType: 'application/pdf',
          tamano: result.buffer.length,
          s3Key: storageKey,
          s3Bucket: storageBucket,
          procesadoIA: !!result.extraccionIA,
        },
      });

      // ✅ Sincronizar con carpetas master + individuales
      await sincronizarDocumentoConCarpetasSistema(
        documento.id,
        empleadoId,
        session.empresaId,
        'Nóminas'
      );

      // ✅ Actualizar nómina existente con documento y datos IA
      await prisma.nominas.update({
        where: { id: nominaExistente.id },
        data: {
          documentoId: documento.id,
          estado: 'completada',
          subidoPor,
          // Campos extraídos por IA
          totalDeduccionesExtraido: result.extraccionIA?.totalDeducciones
            ? new Decimal(result.extraccionIA.totalDeducciones)
            : null,
          totalNetoExtraido: result.extraccionIA?.totalNeto
            ? new Decimal(result.extraccionIA.totalNeto)
            : null,
          confianzaExtraccion: result.extraccionIA?.confianza
            ? new Decimal(result.extraccionIA.confianza / 100)
            : null,
          metodoExtraccion: result.extraccionIA?.provider || 'manual',
        },
      });

      imported++;
    } catch (error) {
      console.error(
        `[confirmarUpload] Error procesando ${result.filename}:`,
        error
      );
      errors.push(
        `${result.filename}: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  // Limpiar sesión
  uploadSessions.delete(sessionId);

  return {
    success: imported > 0,
    imported,
    descartados,
    errors,
  };
}

