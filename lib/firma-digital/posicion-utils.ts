/**
 * Utilidades para manejo y conversión de posiciones de firma
 * Soporta conversión entre diferentes sistemas de coordenadas
 */

import { PDFDocument } from 'pdf-lib';

import type {
  PosicionFirma,
  PosicionFirmaConMetadata,
  PosicionFirmaPorcentajes,
} from './tipos';

/**
 * Convierte posición en porcentajes a coordenadas absolutas PDF
 *
 * Sistema de entrada (porcentajes):
 * - Origen: esquina superior izquierda (como HTML/CSS)
 * - xPorcentaje: 0 = izquierda, 100 = derecha
 * - yPorcentaje: 0 = arriba, 100 = abajo
 *
 * Sistema de salida (PDF):
 * - Origen: esquina inferior izquierda (estándar PDF)
 * - x: puntos desde la izquierda
 * - y: puntos desde ABAJO
 *
 * @param porcentajes - Posición en porcentajes
 * @param pdfWidth - Ancho de la página PDF en puntos
 * @param pdfHeight - Alto de la página PDF en puntos
 * @returns Posición en coordenadas absolutas PDF
 */
export function porcentajesAPDF(
  porcentajes: PosicionFirmaPorcentajes,
  pdfWidth: number,
  pdfHeight: number
): PosicionFirma {
  // Convertir porcentajes a puntos
  const xEnPuntos = (porcentajes.xPorcentaje / 100) * pdfWidth;
  const yEnPuntosDesdeArriba = (porcentajes.yPorcentaje / 100) * pdfHeight;

  // Calcular dimensiones del recuadro
  const widthPorDefecto = 30; // 30% del ancho por defecto
  const heightPorDefecto = 7; // 7% del alto por defecto
  const width = ((porcentajes.widthPorcentaje ?? widthPorDefecto) / 100) * pdfWidth;
  const height = ((porcentajes.heightPorcentaje ?? heightPorDefecto) / 100) * pdfHeight;

  // IMPORTANTE: Invertir Y para convertir de HTML (top=0) a PDF (bottom=0)
  // Y en PDF se mide desde ABAJO, no desde arriba
  let yEnPuntosDesdAbajo = pdfHeight - yEnPuntosDesdeArriba - height;

  // Validar y ajustar límites para evitar coordenadas negativas o fuera de página
  // Esto puede ocurrir si el usuario hace clic muy cerca de los bordes
  if (yEnPuntosDesdAbajo < 0) {
    console.warn('[porcentajesAPDF] Y calculado negativo, ajustando a 0. Original:', yEnPuntosDesdAbajo);
    yEnPuntosDesdAbajo = 0;
  }

  if (xEnPuntos + width > pdfWidth) {
    console.warn('[porcentajesAPDF] Firma excede ancho de página, ajustando');
  }

  if (yEnPuntosDesdAbajo + height > pdfHeight) {
    console.warn('[porcentajesAPDF] Firma excede alto de página, ajustando');
  }

  return {
    pagina: porcentajes.pagina,
    x: Math.max(0, Math.min(Math.round(xEnPuntos), pdfWidth - width)),
    y: Math.max(0, Math.min(Math.round(yEnPuntosDesdAbajo), pdfHeight - height)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Convierte coordenadas absolutas PDF a porcentajes
 * Útil para migrar posiciones antiguas al nuevo sistema
 *
 * @param posicionPDF - Posición en coordenadas absolutas PDF
 * @param pdfWidth - Ancho de la página PDF en puntos
 * @param pdfHeight - Alto de la página PDF en puntos
 * @returns Posición en porcentajes
 */
export function pdfAPorcentajes(
  posicionPDF: PosicionFirma,
  pdfWidth: number,
  pdfHeight: number
): PosicionFirmaPorcentajes {
  // Convertir puntos a porcentajes
  const xPorcentaje = (posicionPDF.x / pdfWidth) * 100;

  // Invertir Y: en PDF y=0 es abajo, en nuestro sistema 0% es arriba
  const height = posicionPDF.height ?? 60;
  const yDesdArriba = pdfHeight - posicionPDF.y - height;
  const yPorcentaje = (yDesdArriba / pdfHeight) * 100;

  const widthPorcentaje = posicionPDF.width
    ? (posicionPDF.width / pdfWidth) * 100
    : undefined;
  const heightPorcentaje = posicionPDF.height
    ? (posicionPDF.height / pdfHeight) * 100
    : undefined;

  return {
    pagina: posicionPDF.pagina,
    xPorcentaje: Math.round(xPorcentaje * 100) / 100, // 2 decimales
    yPorcentaje: Math.round(yPorcentaje * 100) / 100,
    widthPorcentaje: widthPorcentaje ? Math.round(widthPorcentaje * 100) / 100 : undefined,
    heightPorcentaje: heightPorcentaje ? Math.round(heightPorcentaje * 100) / 100 : undefined,
  };
}

/**
 * Obtiene las dimensiones de una página específica de un PDF
 *
 * @param pdfBuffer - Buffer del PDF
 * @param paginaIndex - Índice de la página (0-based), o -1 para última página
 * @returns Dimensiones de la página en puntos
 */
export async function obtenerDimensionesPagina(
  pdfBuffer: Buffer,
  paginaIndex: number
): Promise<{ width: number; height: number }> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  // Normalizar índice de página
  const index = paginaIndex === -1 ? pages.length - 1 : paginaIndex;

  if (index < 0 || index >= pages.length) {
    throw new Error(`Página ${paginaIndex} fuera de rango (PDF tiene ${pages.length} páginas)`);
  }

  const page = pages[index];
  return page.getSize();
}

/**
 * Convierte PosicionFirmaConMetadata a PosicionFirma absoluta
 * Maneja tanto formato nuevo (v2) como antiguo (v1) para retrocompatibilidad
 *
 * @param posicionMetadata - Posición guardada en DB (puede ser v1 o v2)
 * @param pdfBuffer - Buffer del PDF (necesario para obtener dimensiones)
 * @returns Posición en coordenadas absolutas PDF
 */
export async function metadataAPosicionPDF(
  posicionMetadata: PosicionFirmaConMetadata | PosicionFirma,
  pdfBuffer: Buffer
): Promise<PosicionFirma> {
  // Si es formato antiguo (v1), ya está en coordenadas PDF
  if ('x' in posicionMetadata && 'y' in posicionMetadata) {
    return posicionMetadata as PosicionFirma;
  }

  // Formato nuevo (v2): convertir de porcentajes a PDF
  const metadata = posicionMetadata as PosicionFirmaConMetadata;
  const { porcentajes } = metadata;

  // Obtener dimensiones reales de la página
  const paginaIndex = porcentajes.pagina === -1 ? -1 : porcentajes.pagina - 1;
  const { width, height } = await obtenerDimensionesPagina(pdfBuffer, paginaIndex);

  // Convertir porcentajes a coordenadas PDF
  return porcentajesAPDF(porcentajes, width, height);
}

/**
 * Crea PosicionFirmaConMetadata desde porcentajes y dimensiones PDF
 * Formato recomendado para guardar en DB
 *
 * @param porcentajes - Posición en porcentajes
 * @param pdfDimensiones - Dimensiones del PDF original (opcional pero recomendado)
 * @returns Posición con metadata completa
 */
export function crearPosicionConMetadata(
  porcentajes: PosicionFirmaPorcentajes,
  pdfDimensiones?: {
    width: number;
    height: number;
    numPaginas: number;
  }
): PosicionFirmaConMetadata {
  return {
    version: 'v2',
    porcentajes,
    pdfDimensiones,
  };
}

/**
 * Valida que una posición en porcentajes esté dentro de rangos válidos
 *
 * @param porcentajes - Posición a validar
 * @returns true si es válida, false si no
 */
export function validarPosicionPorcentajes(porcentajes: PosicionFirmaPorcentajes): boolean {
  return (
    porcentajes.xPorcentaje >= 0 &&
    porcentajes.xPorcentaje <= 100 &&
    porcentajes.yPorcentaje >= 0 &&
    porcentajes.yPorcentaje <= 100 &&
    (porcentajes.widthPorcentaje === undefined ||
      (porcentajes.widthPorcentaje > 0 && porcentajes.widthPorcentaje <= 100)) &&
    (porcentajes.heightPorcentaje === undefined ||
      (porcentajes.heightPorcentaje > 0 && porcentajes.heightPorcentaje <= 100))
  );
}

/**
 * Normaliza una posición para asegurar que esté dentro de límites válidos
 * Útil para corregir posiciones que puedan estar ligeramente fuera de rango
 *
 * @param porcentajes - Posición a normalizar
 * @returns Posición normalizada con valores entre 0-100
 */
export function normalizarPosicionPorcentajes(
  porcentajes: PosicionFirmaPorcentajes
): PosicionFirmaPorcentajes {
  return {
    ...porcentajes,
    xPorcentaje: Math.max(0, Math.min(100, porcentajes.xPorcentaje)),
    yPorcentaje: Math.max(0, Math.min(100, porcentajes.yPorcentaje)),
    widthPorcentaje: porcentajes.widthPorcentaje
      ? Math.max(1, Math.min(100, porcentajes.widthPorcentaje))
      : undefined,
    heightPorcentaje: porcentajes.heightPorcentaje
      ? Math.max(1, Math.min(100, porcentajes.heightPorcentaje))
      : undefined,
  };
}
