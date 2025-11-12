// ========================================
// Import de Nóminas - Upload y Matching
// ========================================
// Procesa ZIPs, hace matching automático de empleados con IA

import AdmZip from 'adm-zip';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { clasificarNomina, type EmpleadoCandidato } from '@/lib/ia/clasificador-nominas';
import { obtenerOCrearCarpetaSistema } from '@/lib/documentos';

/**
 * Resultado del matching de una nómina
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
}

/**
 * Estadísticas del proceso de upload
 */
export interface UploadStats {
  total: number;
  autoAssigned: number;
  needsReview: number;
  avgConfidence: number;
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
    results: MatchingResult[];
    createdAt: Date;
  }
>();


/**
 * Procesa un archivo ZIP y extrae todos los PDFs
 */
export function procesarZip(buffer: Buffer): Array<{
  filename: string;
  buffer: Buffer;
}> {
  console.log('[procesarZip] Extrayendo PDFs del ZIP');

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  const pdfs = entries
    .filter((entry) => {
      return (
        entry.entryName.toLowerCase().endsWith('.pdf') &&
        !entry.isDirectory &&
        !entry.entryName.includes('__MACOSX') // Ignorar archivos del sistema macOS
      );
    })
    .map((entry) => ({
      filename: entry.entryName.split('/').pop() || entry.entryName, // Solo el nombre, sin path
      buffer: entry.getData(),
    }));

  console.log(`[procesarZip] ${pdfs.length} PDFs extraídos`);

  return pdfs;
}

/**
 * Procesa múltiples archivos (PDFs o ZIP) y hace matching con empleados
 */
export async function procesarNominas(
  files: Array<{ filename: string; buffer: Buffer }>,
  empresaId: string,
  mes: number,
  anio: number
): Promise<{
  sessionId: string;
  stats: UploadStats;
  results: MatchingResult[];
}> {
  console.log(
    `[procesarNominas] Procesando ${files.length} archivo(s) para ${mes}/${anio}`
  );

  // Extraer PDFs de los archivos
  const allPdfs: Array<{ filename: string; buffer: Buffer }> = [];

  for (const file of files) {
    if (file.filename.toLowerCase().endsWith('.zip')) {
      // Es ZIP, extraer PDFs
      const pdfs = procesarZip(file.buffer);
      allPdfs.push(...pdfs);
    } else if (file.filename.toLowerCase().endsWith('.pdf')) {
      // Es PDF directo
      allPdfs.push(file);
    }
  }

  console.log(`[procesarNominas] Total PDFs a procesar: ${allPdfs.length}`);

  // Obtener empleados activos de la empresa
  const empleados = await prisma.empleado.findMany({
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

  console.log(`[procesarNominas] ${empleados.length} empleados activos`);

  // Preparar lista de empleados para el clasificador
  const empleadosCandidatos: EmpleadoCandidato[] = empleados.map((emp) => ({
    id: emp.id,
    nombre: emp.nombre,
    apellidos: emp.apellidos,
  }));

  // Procesar cada PDF con clasificador de IA
  const results: MatchingResult[] = [];
  let totalConfidence = 0;
  let autoAssigned = 0;

  for (const pdf of allPdfs) {
    console.log(`[procesarNominas] Clasificando: ${pdf.filename}`);
    
    const match = await clasificarNomina(pdf.filename, empleadosCandidatos);

    results.push({
      filename: pdf.filename,
      buffer: pdf.buffer,
      empleado: match.empleado,
      confidence: match.confidence,
      autoAssigned: match.autoAssigned,
      candidates: match.candidates,
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
  };

  console.log(
    `[procesarNominas] Stats: ${stats.total} total, ${stats.autoAssigned} auto-asignados, ${stats.needsReview} requieren revisión`
  );

  return {
    sessionId,
    stats,
    results,
  };
}

/**
 * Obtiene una sesión de upload
 */
export function obtenerSesion(sessionId: string): {
  empresaId: string;
  mes: number;
  anio: number;
  results: MatchingResult[];
} | null {
  return uploadSessions.get(sessionId) || null;
}

/**
 * Confirma un upload y crea las nóminas y documentos
 */
export async function confirmarUpload(
  sessionId: string,
  confirmaciones: Array<{ filename: string; empleadoId: string }>,
  uploadDir: string,
  empresaId: string,
  subidoPor: string
): Promise<{
  success: boolean;
  imported: number;
  errors: string[];
}> {
  console.log(`[confirmarUpload] Confirmando sesión ${sessionId}`);

  const session = uploadSessions.get(sessionId);
  if (!session) {
    return {
      success: false,
      imported: 0,
      errors: ['Sesión no encontrada o expirada'],
    };
  }

  const errors: string[] = [];
  let imported = 0;

  // Crear map de confirmaciones
  const confirmacionesMap = new Map(
    confirmaciones.map((c) => [c.filename, c.empleadoId])
  );

  // Procesar cada resultado
  for (const result of session.results) {
    try {
      // Determinar empleado (confirmación manual o auto-asignado)
      let empleadoId = confirmacionesMap.get(result.filename);
      if (!empleadoId && result.autoAssigned && result.empleado) {
        empleadoId = result.empleado.id;
      }

      if (!empleadoId) {
        errors.push(`${result.filename}: No se asignó empleado`);
        continue;
      }

      // Verificar que no existe ya nómina para este empleado/mes
      const nominaExistente = await prisma.nomina.findUnique({
        where: {
          empleadoId_mes_anio: {
            empleadoId,
            mes: session.mes,
            anio: session.anio,
          },
        },
      });

      if (nominaExistente) {
        errors.push(
          `${result.filename}: Ya existe nómina para este empleado en ${session.mes}/${session.anio}`
        );
        continue;
      }

      // Obtener o crear carpeta "Nóminas" del empleado usando función centralizada
      const carpetaNominas = await obtenerOCrearCarpetaSistema(
        empleadoId,
        session.empresaId,
        'Nóminas'
      );

      // Generar ruta de archivo
      const timestamp = Date.now();
      const nombreArchivo = `${session.anio}_${String(session.mes).padStart(2, '0')}_${timestamp}.pdf`;
      const rutaArchivo = `${session.empresaId}/${empleadoId}/nominas/${nombreArchivo}`;

      // Guardar archivo en filesystem
      const fs = require('fs').promises;
      const path = require('path');
      const fullPath = path.join(uploadDir, rutaArchivo);
      const dirPath = path.dirname(fullPath);

      // Crear directorios si no existen
      await fs.mkdir(dirPath, { recursive: true });

      // Escribir archivo
      await fs.writeFile(fullPath, result.buffer);

      // Crear documento
      const documento = await prisma.documento.create({
        data: {
          empresaId: session.empresaId,
          empleadoId,
          carpetaId: carpetaNominas.id,
          nombre: nombreArchivo,
          tipoDocumento: 'nomina',
          mimeType: 'application/pdf',
          tamano: result.buffer.length,
          s3Key: rutaArchivo,
          s3Bucket: 'local',
        },
      });

      // Crear nómina
      await prisma.nomina.create({
        data: {
          empleadoId,
          mes: session.mes,
          anio: session.anio,
          salarioBase: new Decimal(0), // Se actualizará con extracción IA o manualmente
          totalComplementos: new Decimal(0),
          totalDeducciones: new Decimal(0),
          totalBruto: new Decimal(0),
          totalNeto: new Decimal(0),
          diasTrabajados: 0,
          diasAusencias: 0,
          documentoId: documento.id,
          estado: 'definitiva', // Upload directo va a estado definitiva (listo para publicar)
          subidoPor,
        },
      });

      imported++;
      console.log(
        `[confirmarUpload] Nómina importada: ${result.filename} → ${empleadoId}`
      );
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

  console.log(
    `[confirmarUpload] Completado: ${imported} importadas, ${errors.length} errores`
  );

  return {
    success: imported > 0,
    imported,
    errors,
  };
}

