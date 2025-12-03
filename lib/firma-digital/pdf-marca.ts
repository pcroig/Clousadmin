/**
 * Utilidades para añadir marcas visuales de firma en PDFs
 * Usa pdf-lib para añadir sellos/marcas de firma en documentos PDF
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

import type { OpcionesMarcaFirma } from './tipos';

/**
 * Añade una marca visual LIMPIA de firma a un PDF
 * La marca muestra SOLO la imagen de firma y opcionalmente el nombre del firmante
 * 
 * NUEVA VERSIÓN: Sin bordes, sin cuadros, sin etiquetas innecesarias
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
 *   firmaImagen: { buffer, width: 180, height: 60 }
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
    const paginaSolicitada = marca.posicion?.pagina ?? -1;
    const paginaIndex =
      paginaSolicitada <= 0
        ? paginas.length - 1
        : Math.min(paginaSolicitada - 1, paginas.length - 1);

    const pagina = paginas[paginaIndex];
    const { width, height: _height } = pagina.getSize();

    // Si no hay imagen de firma, no añadir nada (firma simple por click)
    if (!marca.firmaImagen?.buffer) {
      console.warn('[anadirMarcaFirmaPDF] No hay imagen de firma, saltando marca visual');
      return pdfBuffer;
    }

    // Cargar y calcular dimensiones de la imagen de firma
    const isJpg = marca.firmaImagen.contentType?.includes('jpeg') || marca.firmaImagen.contentType?.includes('jpg');
    const firmaImagen = isJpg
      ? await pdfDoc.embedJpg(marca.firmaImagen.buffer)
      : await pdfDoc.embedPng(marca.firmaImagen.buffer);

    // Dimensiones de la imagen (respetar las originales proporcionadas)
    const firmaWidth = marca.firmaImagen.width ?? 180;
    const firmaHeight = marca.firmaImagen.height ?? 60;
    
    // Posición de la firma
    // Si se proporciona posición explícita, usarla; sino, posicionar abajo a la derecha
    const x = marca.posicion?.x ?? Math.max(40, width - firmaWidth - 40);
    const y = marca.posicion?.y ?? 50;

    // Dibujar SOLO la imagen de firma
    pagina.drawImage(firmaImagen, {
      x,
      y,
      width: firmaWidth,
      height: firmaHeight,
    });

    // Opcionalmente añadir nombre del firmante debajo en texto pequeño y discreto
    // Solo si hay espacio suficiente (y > 30)
    if (y > 30) {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const nombreTexto = marca.nombreFirmante;
      const fontSize = 7;
      const textWidth = font.widthOfTextAtSize(nombreTexto, fontSize);
      
      // Centrar el texto bajo la firma
      const textX = x + (firmaWidth - textWidth) / 2;
      const textY = y - 10;

      pagina.drawText(nombreTexto, {
        x: textX,
        y: textY,
        size: fontSize,
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
 * Las marcas se apilan verticalmente de forma limpia
 *
 * @param pdfBuffer - Buffer del PDF original
 * @param marcas - Array de opciones de marcas de firma
 * @returns Buffer del PDF con todas las marcas añadidas
 *
 * @example
 * ```ts
 * const pdfFirmado = await anadirMarcasFirmasPDF(pdfOriginal, [
 *   { nombreFirmante: 'Juan Pérez', fechaFirma: '12/11/2025 14:30', tipoFirma: 'simple', firmaImagen: {...} },
 *   { nombreFirmante: 'María López', fechaFirma: '12/11/2025 15:45', tipoFirma: 'simple', firmaImagen: {...} },
 * ]);
 * ```
 */
export async function anadirMarcasFirmasPDF(
  pdfBuffer: Buffer,
  marcas: OpcionesMarcaFirma[]
): Promise<Buffer> {
  try {
    // Cargar el PDF una sola vez
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Determinar página donde se añadirán las firmas
    const paginas = pdfDoc.getPages();
    const paginaIndex = paginas.length - 1; // Última página
    const pagina = paginas[paginaIndex];
    const { width, height } = pagina.getSize();

    // Filtrar marcas que tienen imagen de firma
    const marcasConImagen = marcas.filter(m => m.firmaImagen?.buffer);
    
    if (marcasConImagen.length === 0) {
      console.warn('[anadirMarcasFirmasPDF] No hay firmas con imagen para añadir');
      return pdfBuffer;
    }

    // Cargar fuente para nombres
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Calcular posicionamiento para apilar firmas verticalmente
    const firmaHeight = 70; // Altura aproximada por firma (60px imagen + 10px nombre)
    const spacing = 15; // Espacio entre firmas
    const startY = 60; // Margen inferior

    for (let i = 0; i < marcasConImagen.length; i++) {
      const marca = marcasConImagen[i];
      
      if (!marca.firmaImagen?.buffer) continue;

      // Calcular posición Y para esta firma (apilar de abajo hacia arriba)
      const yPosition = startY + i * (firmaHeight + spacing);
      
      // Verificar que no nos salimos de la página
      if (yPosition + firmaHeight > height - 40) {
        console.warn(`[anadirMarcasFirmasPDF] Firma ${i + 1} excede límites de página, omitiendo`);
        continue;
      }

      // Cargar imagen de firma
      const isJpg = marca.firmaImagen.contentType?.includes('jpeg') || marca.firmaImagen.contentType?.includes('jpg');
      const firmaImagen = isJpg
        ? await pdfDoc.embedJpg(marca.firmaImagen.buffer)
        : await pdfDoc.embedPng(marca.firmaImagen.buffer);

      // Dimensiones de la firma
      const firmaWidth = marca.firmaImagen.width ?? 180;
      const firmaHeightReal = marca.firmaImagen.height ?? 60;
      
      // Calcular posición X (alinear a la derecha o usar posición proporcionada)
      const xPosition = marca.posicion?.x ?? Math.max(40, width - firmaWidth - 40);

      // Dibujar imagen de firma
      pagina.drawImage(firmaImagen, {
        x: xPosition,
        y: yPosition,
        width: firmaWidth,
        height: firmaHeightReal,
      });

      // Añadir nombre del firmante debajo (si hay espacio)
      if (yPosition > 30) {
        const nombreTexto = marca.nombreFirmante;
        const fontSize = 7;
        const textWidth = font.widthOfTextAtSize(nombreTexto, fontSize);
        
        // Centrar el texto bajo la firma
        const textX = xPosition + (firmaWidth - textWidth) / 2;
        const textY = yPosition - 10;

        pagina.drawText(nombreTexto, {
          x: textX,
          y: textY,
          size: fontSize,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
    }

    // Guardar el PDF final
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('[anadirMarcasFirmasPDF] Error:', error);
    throw new Error('Error añadiendo múltiples marcas de firma al PDF');
  }
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
