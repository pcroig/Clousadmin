/**
 * Utilidades para añadir marcas visuales de firma en PDFs
 * Usa pdf-lib para añadir sellos/marcas de firma en documentos PDF
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { OpcionesMarcaFirma } from './tipos';

/**
 * Añade una marca visual de firma a un PDF
 * La marca incluye: nombre del firmante, fecha, y hash del certificado
 *
 * @param pdfBuffer - Buffer del PDF original
 * @param marca - Opciones de la marca de firma
 * @returns Buffer del PDF con la marca de firma añadida
 *
 * @example
 * ```ts
 * const pdfOriginal = await downloadFromS3(documento.s3Key);
 * const pdfFirmado = await anadirMarcaFirmaPDF(pdfOriginal, {
 *   nombreFirmante: 'Juan Pérez',
 *   fechaFirma: '12/11/2025 14:30',
 *   tipoFirma: 'simple',
 *   certificadoHash: 'a3b2c1...',
 * });
 * ```
 */
export async function anadirMarcaFirmaPDF(
  pdfBuffer: Buffer,
  marca: OpcionesMarcaFirma
): Promise<Buffer> {
  try {
    // Cargar el PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Determinar en qué página añadir la marca
    const paginas = pdfDoc.getPages();
    const paginaIndex = marca.posicion?.pagina
      ? Math.min(marca.posicion.pagina - 1, paginas.length - 1)
      : paginas.length - 1; // Por defecto última página

    const pagina = paginas[paginaIndex];
    const { width, height } = pagina.getSize();

    // Cargar fuente
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Posición de la marca (por defecto abajo a la derecha)
    const x = marca.posicion?.x ?? width - 250;
    const y = marca.posicion?.y ?? 50;

    const fontSize = 9;
    const lineHeight = 12;

    // Dibujar fondo semi-transparente (opcional)
    pagina.drawRectangle({
      x: x - 5,
      y: y - 5,
      width: 240,
      height: 80,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
      opacity: 0.1,
    });

    // Título de la marca
    let currentY = y + 65;
    pagina.drawText('FIRMADO DIGITALMENTE', {
      x,
      y: currentY,
      size: fontSize + 1,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Nombre del firmante
    currentY -= lineHeight + 3;
    pagina.drawText(`Firmante: ${marca.nombreFirmante}`, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Fecha de firma
    currentY -= lineHeight;
    pagina.drawText(`Fecha: ${marca.fechaFirma}`, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Tipo de firma
    currentY -= lineHeight;
    const tipoFirmaLabel = marca.tipoFirma === 'simple' ? 'Firma Simple' : marca.tipoFirma;
    pagina.drawText(`Tipo: ${tipoFirmaLabel}`, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Hash del certificado (primeros 32 caracteres)
    if (marca.certificadoHash) {
      currentY -= lineHeight;
      const hashCorto = marca.certificadoHash.substring(0, 32);
      pagina.drawText(`Hash: ${hashCorto}...`, {
        x,
        y: currentY,
        size: fontSize - 1,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // Guardar el PDF modificado
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('[anadirMarcaFirmaPDF] Error:', error);
    throw new Error('Error añadiendo marca de firma al PDF');
  }
}

/**
 * Añade múltiples marcas de firma a un PDF (para múltiples firmantes)
 * Las marcas se apilan verticalmente
 *
 * @param pdfBuffer - Buffer del PDF original
 * @param marcas - Array de opciones de marcas de firma
 * @returns Buffer del PDF con todas las marcas añadidas
 *
 * @example
 * ```ts
 * const pdfFirmado = await anadirMarcasFirmasPDF(pdfOriginal, [
 *   { nombreFirmante: 'Juan Pérez', fechaFirma: '12/11/2025 14:30', tipoFirma: 'simple' },
 *   { nombreFirmante: 'María López', fechaFirma: '12/11/2025 15:45', tipoFirma: 'simple' },
 * ]);
 * ```
 */
export async function anadirMarcasFirmasPDF(
  pdfBuffer: Buffer,
  marcas: OpcionesMarcaFirma[]
): Promise<Buffer> {
  let pdfActual = pdfBuffer;

  // Apilar marcas verticalmente (80px de altura cada una + 10px de separación)
  for (let i = 0; i < marcas.length; i++) {
    const marca = marcas[i];

    // Calcular posición Y para apilar marcas
    const offsetY = 50 + (i * 90); // 80px altura + 10px separación

    const marcaConPosicion: OpcionesMarcaFirma = {
      ...marca,
      posicion: marca.posicion ?? {
        pagina: -1, // Última página
        x: 0, // Se calculará automáticamente
        y: offsetY,
      },
    };

    pdfActual = await anadirMarcaFirmaPDF(pdfActual, marcaConPosicion);
  }

  return pdfActual;
}

/**
 * Verifica si un archivo es un PDF válido
 *
 * @param buffer - Buffer del archivo
 * @returns true si es PDF válido, false si no
 *
 * @example
 * ```ts
 * const esPDF = await esPDFValido(buffer);
 * if (!esPDF) {
 *   throw new Error('El archivo no es un PDF válido');
 * }
 * ```
 */
export async function esPDFValido(buffer: Buffer): Promise<boolean> {
  try {
    await PDFDocument.load(buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene metadata de un PDF (número de páginas, tamaño, etc.)
 *
 * @param buffer - Buffer del PDF
 * @returns Metadata del PDF
 *
 * @example
 * ```ts
 * const metadata = await obtenerMetadataPDF(buffer);
 * console.log(`PDF con ${metadata.numPaginas} páginas`);
 * ```
 */
export async function obtenerMetadataPDF(buffer: Buffer): Promise<{
  numPaginas: number;
  tamanoPaginas: Array<{ width: number; height: number }>;
}> {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const paginas = pdfDoc.getPages();

    return {
      numPaginas: paginas.length,
      tamanoPaginas: paginas.map((p) => p.getSize()),
    };
  } catch (error) {
    console.error('[obtenerMetadataPDF] Error:', error);
    throw new Error('Error obteniendo metadata del PDF');
  }
}
