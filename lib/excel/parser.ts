// ========================================
// Excel Parser - Read Excel files to JSON
// ========================================

import * as XLSX from 'xlsx';

/**
 * Parsear un archivo Excel a JSON
 * Lee la primera hoja del archivo y retorna un array de objetos
 * 
 * @param buffer - Buffer del archivo Excel
 * @returns Array de objetos con los datos del Excel
 */
export function parseExcelToJSON(buffer: Buffer): Record<string, any>[] {
  try {
    // Leer el archivo Excel desde el buffer
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Obtener el nombre de la primera hoja
    const firstSheetName = workbook.SheetNames[0];
    
    if (!firstSheetName) {
      throw new Error('El archivo Excel no contiene hojas');
    }

    // Obtener la primera hoja
    const worksheet = workbook.Sheets[firstSheetName];

    // Convertir la hoja a JSON
    // header: 1 = array de arrays, sin header: objeto con headers
    const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

    return jsonData;
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
    defval?: any; // Valor por defecto para celdas vacías
  } = {}
): Record<string, any>[] {
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

    const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, sheetToJsonOptions);

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
  } catch (error) {
    return false;
  }
}














