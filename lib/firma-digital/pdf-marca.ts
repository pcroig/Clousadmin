/**
 * Utilidades para añadir marcas visuales de firma en PDFs
 * Usa pdf-lib para añadir sellos/marcas de firma en documentos PDF
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

import type { OpcionesMarcaFirma } from './tipos';

/**
 * Aplana (flatten) un PDF con formularios, convirtiendo campos interactivos en contenido estático
 * CRÍTICO: Necesario para PDFs rellenables donde las firmas no se ven debido a capas de formularios
 *
 * @param pdfBuffer - Buffer del PDF original
 * @returns Buffer del PDF aplanado
 */
export async function aplanarPDFRellenable(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Obtener el formulario del PDF (si existe)
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Si no hay campos de formulario, retornar el PDF original
    if (fields.length === 0) {
      return pdfBuffer;
    }

    // Aplanar todos los campos del formulario
    form.flatten();

    // Guardar el PDF aplanado
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('[aplanarPDFRellenable] Error:', error);
    // Si falla, retornar el PDF original
    return pdfBuffer;
  }
}

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
 * Si las marcas tienen posición especificada, usa esa posición como base
 * y apila las siguientes firmas verticalmente desde ahí
 *
 * @param pdfBuffer - Buffer del PDF original
 * @param marcas - Array de opciones de marcas de firma
 * @returns Buffer del PDF con todas las marcas añadidas
 *
 * @example
 * ```ts
 * const pdfFirmado = await anadirMarcasFirmasPDF(pdfOriginal, [
 *   { nombreFirmante: 'Juan Pérez', fechaFirma: '12/11/2025 14:30', tipoFirma: 'simple', firmaImagen: {...}, posicion: {...} },
 *   { nombreFirmante: 'María López', fechaFirma: '12/11/2025 15:45', tipoFirma: 'simple', firmaImagen: {...} },
 * ]);
 * ```
 */
export async function anadirMarcasFirmasPDF(
  pdfBuffer: Buffer,
  marcas: OpcionesMarcaFirma[]
): Promise<Buffer> {
  try {
    // CRÍTICO: Aplanar PDF antes de añadir firmas (para PDFs rellenables)
    const pdfAplanado = await aplanarPDFRellenable(pdfBuffer);

    // Cargar el PDF aplanado
    const pdfDoc = await PDFDocument.load(pdfAplanado);

    // IMPORTANTE: NO filtrar marcas - procesar TODAS (con o sin imagen)
    if (marcas.length === 0) {
      console.warn('[anadirMarcasFirmasPDF] No hay marcas de firma para añadir');
      return pdfBuffer;
    }

    // Determinar página donde se añadirán las firmas
    // Si la primera marca tiene posición específica, usar su página
    const paginas = pdfDoc.getPages();
    const primeraPos = marcas[0]?.posicion;
    let paginaIndex: number;

    if (primeraPos?.pagina) {
      paginaIndex = primeraPos.pagina === -1 ? paginas.length - 1 : primeraPos.pagina - 1;
      paginaIndex = Math.max(0, Math.min(paginaIndex, paginas.length - 1));
    } else {
      paginaIndex = paginas.length - 1; // Última página por defecto
    }

    const pagina = paginas[paginaIndex];
    const { width, height } = pagina.getSize();

    // Cargar fuente para nombres
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Dimensiones y espaciado
    const firmaHeightDefault = 60; // Altura de imagen de firma por defecto
    const firmaWidthDefault = 180; // Ancho de imagen de firma por defecto
    const spacing = 15; // Espacio entre firmas apiladas

    // Determinar posición inicial
    // Si la primera marca tiene posición, usarla como base
    // Si no, usar posición por defecto (abajo a la derecha)
    const posicionBase = primeraPos ?? {
      pagina: -1,
      x: Math.max(40, width - firmaWidthDefault - 40),
      y: 60,
      width: firmaWidthDefault,
      height: firmaHeightDefault,
    };

    for (let i = 0; i < marcas.length; i++) {
      const marca = marcas[i];

      // Determinar dimensiones según si hay imagen o no
      const tieneImagen = !!marca.firmaImagen?.buffer;

      // IMPORTANTE: Usar las dimensiones de la posición si están disponibles
      // Esto asegura que la firma se dibuje exactamente donde se calculó que debería estar
      // Si marca.posicion tiene width/height, usar esos valores (son los que se usaron para calcular Y)
      // De lo contrario, usar las dimensiones de la imagen o valores por defecto
      const firmaWidth = marca.posicion?.width ?? (tieneImagen
        ? (marca.firmaImagen?.width ?? firmaWidthDefault)
        : firmaWidthDefault);
      const firmaHeight = marca.posicion?.height ?? (tieneImagen
        ? (marca.firmaImagen?.height ?? firmaHeightDefault)
        : firmaHeightDefault);

      // Calcular posición Y para esta firma (apilar verticalmente)
      // Primera firma usa posicionBase.y, las siguientes se apilan hacia arriba
      const offsetY = i * (firmaHeight + spacing);
      const yPosition = posicionBase.y + offsetY;

      // Verificar que no nos salimos de la página
      if (yPosition + firmaHeight > height - 40) {
        console.warn(`[anadirMarcasFirmasPDF] Firma ${i + 1} excede límites de página, omitiendo`);
        continue;
      }

      // Posición X: usar la de la marca individual si existe, o la posición base
      const xPosition = marca.posicion?.x ?? posicionBase.x;

      if (tieneImagen) {
        // CON IMAGEN: Dibujar imagen de firma manuscrita
        const isJpg = marca.firmaImagen!.contentType?.includes('jpeg') || marca.firmaImagen!.contentType?.includes('jpg');
        const firmaImagen = isJpg
          ? await pdfDoc.embedJpg(marca.firmaImagen!.buffer)
          : await pdfDoc.embedPng(marca.firmaImagen!.buffer);

        pagina.drawImage(firmaImagen, {
          x: xPosition,
          y: yPosition,
          width: firmaWidth,
          height: firmaHeight,
        });
      } else {
        // SIN IMAGEN: Dibujar rectángulo con texto "Firmado digitalmente"
        const rectX = xPosition;
        const rectY = yPosition;
        const rectWidth = firmaWidth;
        const rectHeight = firmaHeight;

        // Fondo azul muy claro
        pagina.drawRectangle({
          x: rectX,
          y: rectY,
          width: rectWidth,
          height: rectHeight,
          color: rgb(0.9, 0.95, 1.0),
          borderColor: rgb(0.2, 0.4, 0.8),
          borderWidth: 1,
        });

        // Texto "Firmado digitalmente"
        const textoFirmado = 'Firmado digitalmente';
        const fontSizeTitulo = 10;
        const tituloWidth = font.widthOfTextAtSize(textoFirmado, fontSizeTitulo);
        const tituloX = rectX + (rectWidth - tituloWidth) / 2;
        const tituloY = rectY + rectHeight - 18;

        pagina.drawText(textoFirmado, {
          x: tituloX,
          y: tituloY,
          size: fontSizeTitulo,
          font,
          color: rgb(0.2, 0.4, 0.8),
        });

        // Nombre del firmante
        const nombreTexto = marca.nombreFirmante;
        const fontSizeNombre = 8;
        const nombreWidth = font.widthOfTextAtSize(nombreTexto, fontSizeNombre);
        const nombreX = rectX + (rectWidth - nombreWidth) / 2;
        const nombreY = rectY + (rectHeight / 2) - 2;

        pagina.drawText(nombreTexto, {
          x: nombreX,
          y: nombreY,
          size: fontSizeNombre,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });

        // Fecha
        const fechaTexto = marca.fechaFirma;
        const fontSizeFecha = 7;
        const fechaWidth = font.widthOfTextAtSize(fechaTexto, fontSizeFecha);
        const fechaX = rectX + (rectWidth - fechaWidth) / 2;
        const fechaY = rectY + 10;

        pagina.drawText(fechaTexto, {
          x: fechaX,
          y: fechaY,
          size: fontSizeFecha,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      // NO añadir nombre del firmante debajo de la firma manuscrita
      // La firma visual es suficiente, no necesitamos texto adicional
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
