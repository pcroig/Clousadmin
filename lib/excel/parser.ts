// ========================================
// Excel Parser - Read Excel files to JSON
// ========================================

import * as XLSX from 'xlsx';

type SheetAnalysis = {
  sheetName: string;
  rows: Record<string, unknown>[];
  rowCount: number;
  columnCount: number;
  keywordMatches: number;
  sensitiveMatches: number;
  score: number;
};

const EMPLOYEE_KEYWORDS = [
  'nombre',
  'name',
  'apellidos',
  'surname',
  'email',
  'correo',
  'mail',
  'telefono',
  'phone',
  'equipo',
  'department',
  'team',
  'manager',
  'puesto',
  'role',
  'hire',
  'fecha',
];

const SENSITIVE_KEYWORDS = [
  'nif',
  'dni',
  'nie',
  'iban',
  'cuenta',
  'bank',
  'ccc',
  'nss',
  'seguridad social',
  'ss',
];

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function scoreSheet(sheetName: string, rows: Record<string, unknown>[]): SheetAnalysis {
  const normalizedHeaders = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!key) return;
      normalizedHeaders.add(normalizeHeader(key));
    });
  });

  const keywordMatches = Array.from(normalizedHeaders).reduce((acc, header) => {
    return acc + (EMPLOYEE_KEYWORDS.some((keyword) => header.includes(keyword)) ? 1 : 0);
  }, 0);

  const sensitiveMatches = Array.from(normalizedHeaders).reduce((acc, header) => {
    return acc + (SENSITIVE_KEYWORDS.some((keyword) => header.includes(keyword)) ? 1 : 0);
  }, 0);

  const rowCount = rows.length;
  const columnCount = normalizedHeaders.size;
  const score =
    rowCount * 3 +
    columnCount * 2 +
    keywordMatches * 5 +
    sensitiveMatches * 8;

  return {
    sheetName,
    rows,
    rowCount,
    columnCount,
    keywordMatches,
    sensitiveMatches,
    score,
  };
}

/**
 * Parsear un archivo Excel a JSON
 * Lee la primera hoja del archivo y retorna un array de objetos
 * 
 * @param buffer - Buffer del archivo Excel
 * @returns Array de objetos con los datos del Excel
 */
export function parseExcelToJSON(buffer: Buffer): Record<string, unknown>[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const { SheetNames } = workbook;

    if (!SheetNames || SheetNames.length === 0) {
      throw new Error('El archivo Excel no contiene hojas');
    }

    const analyses: SheetAnalysis[] = [];

    SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return;

      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: null,
        blankrows: false,
      });

      if (rows.length === 0) {
        return;
      }

      analyses.push(scoreSheet(sheetName, rows));
    });

    if (analyses.length === 0) {
      throw new Error('El archivo Excel no contiene datos válidos');
    }

    analyses.sort((a, b) => b.score - a.score);
    const bestSheet = analyses[0];

    if (bestSheet.sheetName !== SheetNames[0]) {
      console.info(
        `[parseExcelToJSON] Seleccionada hoja "${bestSheet.sheetName}" (score: ${bestSheet.score}) ` +
          `en lugar de "${SheetNames[0]}"`
      );
    }

    // Log de columnas detectadas para debugging
    if (bestSheet.rows.length > 0) {
      const columnasDetectadas = Object.keys(bestSheet.rows[0] || {});
      console.info(
        `[parseExcelToJSON] Columnas detectadas (${columnasDetectadas.length}): ${columnasDetectadas.join(', ')}`
      );
    }

    return bestSheet.rows;
  } catch (error) {
    console.error('[parseExcelToJSON] Error:', error);
    throw new Error('Error al parsear el archivo Excel');
  }
}

/**
 * Parsear un archivo Excel con opciones personalizadas
 * 
 * @param buffer - Buffer del archivo Excel
 * @param options - Opciones de parseo
 * @returns Array de objetos con los datos del Excel
 */
export function parseExcelToJSONWithOptions(
  buffer: Buffer,
  options: {
    sheetIndex?: number; // Índice de la hoja (por defecto 0)
    range?: string; // Rango de celdas (ej: 'A1:D10')
    defval?: unknown; // Valor por defecto para celdas vacías
  } = {}
): Record<string, unknown>[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Obtener la hoja especificada o la primera
    const sheetIndex = options.sheetIndex || 0;
    const sheetName = workbook.SheetNames[sheetIndex];

    if (!sheetName) {
      throw new Error(`La hoja con índice ${sheetIndex} no existe`);
    }

    const worksheet = workbook.Sheets[sheetName];

    // Opciones de conversión
    const sheetToJsonOptions: XLSX.Sheet2JSONOpts = {};
    
    if (options.range) {
      sheetToJsonOptions.range = options.range;
    }
    
    if (options.defval !== undefined) {
      sheetToJsonOptions.defval = options.defval;
    }

    const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, sheetToJsonOptions);

    return jsonData;
  } catch (error) {
    console.error('[parseExcelToJSONWithOptions] Error:', error);
    throw new Error('Error al parsear el archivo Excel');
  }
}

/**
 * Obtener los nombres de las hojas de un archivo Excel
 * 
 * @param buffer - Buffer del archivo Excel
 * @returns Array con los nombres de las hojas
 */
export function getExcelSheetNames(buffer: Buffer): string[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook.SheetNames;
  } catch (error) {
    console.error('[getExcelSheetNames] Error:', error);
    throw new Error('Error al leer el archivo Excel');
  }
}

/**
 * Validar que un buffer es un archivo Excel válido
 * 
 * @param buffer - Buffer del archivo
 * @returns true si es un archivo Excel válido
 */
export function isValidExcelFile(buffer: Buffer): boolean {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook.SheetNames.length > 0;
  } catch {
    return false;
  }
}















