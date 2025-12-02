'use client';

/**
 * PdfCanvasViewer
 *
 * Componente para visualizar PDFs renderizados en canvas.
 * Permite scroll natural y captura de clicks para colocar marcadores de firma.
 *
 * ARQUITECTURA:
 * - Usa react-pdf para cargar y parsear el PDF
 * - Renderiza cada página como un <canvas> element
 * - Maneja clicks en el documento para colocar posiciones de firma
 * - Coordenadas se calculan relativamente a la página clickeada
 *
 * @version 1.0.0
 */

import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import '@/styles/react-pdf.css';

// Importar configuración del worker
import '@/lib/pdf-config';

interface SignaturePosition {
  /** Número de página (1-indexed) */
  page: number;
  /** Coordenada X en porcentaje de la página (0-100) */
  x: number;
  /** Coordenada Y en porcentaje de la página (0-100) */
  y: number;
  /** Ancho del recuadro en porcentaje (0-100) */
  width: number;
  /** Alto del recuadro en porcentaje (0-100) */
  height: number;
}

interface PdfCanvasViewerProps {
  /** URL del PDF a visualizar */
  pdfUrl: string;
  /** Posiciones de firma a renderizar */
  signaturePositions?: SignaturePosition[];
  /** Callback cuando se hace click en el documento */
  onDocumentClick?: (position: SignaturePosition) => void;
  /** Ancho fijo del recuadro de firma en pixels */
  signatureBoxWidth?: number;
  /** Alto fijo del recuadro de firma en pixels */
  signatureBoxHeight?: number;
  /** Callback cuando eliminar una posición */
  onRemovePosition?: (index: number) => void;
  /** Si true, solo muestra las posiciones sin permitir interacción */
  readOnly?: boolean;
}

export function PdfCanvasViewer({
  pdfUrl,
  signaturePositions = [],
  onDocumentClick,
  signatureBoxWidth = 180,
  signatureBoxHeight = 60,
  onRemovePosition,
  readOnly = false,
}: PdfCanvasViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Referencias a los contenedores de cada página para calcular coordenadas
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  /**
   * Callback cuando el PDF se carga correctamente
   * Extrae el número total de páginas
   */
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoadError(null);
  }, []);

  /**
   * Callback cuando falla la carga del PDF
   */
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error al cargar PDF:', error);
    setLoadError('No se pudo cargar el documento PDF');
  }, []);

  /**
   * Maneja el click en una página del documento
   * Calcula la posición relativa y la convierte a porcentaje
   */
  const handlePageClick = useCallback(
    (pageNumber: number, event: React.MouseEvent<HTMLDivElement>) => {
      if (!onDocumentClick || readOnly) return;

      const pageContainer = pageRefs.current.get(pageNumber);
      if (!pageContainer) return;

      // Obtener las dimensiones del contenedor de la página
      const rect = pageContainer.getBoundingClientRect();

      // Calcular coordenadas relativas al contenedor (en pixels)
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Convertir a porcentajes
      const percentX = (clickX / rect.width) * 100;
      const percentY = (clickY / rect.height) * 100;

      // Calcular el tamaño del recuadro en porcentaje
      const boxWidthPercent = (signatureBoxWidth / rect.width) * 100;
      const boxHeightPercent = (signatureBoxHeight / rect.height) * 100;

      // Centrar el recuadro en el punto de click y asegurar que no se salga de los bordes
      const x = Math.max(0, Math.min(percentX - boxWidthPercent / 2, 100 - boxWidthPercent));
      const y = Math.max(0, Math.min(percentY - boxHeightPercent / 2, 100 - boxHeightPercent));

      // Crear la posición de firma
      const position: SignaturePosition = {
        page: pageNumber,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        width: Number(boxWidthPercent.toFixed(2)),
        height: Number(boxHeightPercent.toFixed(2)),
      };

      onDocumentClick(position);
    },
    [onDocumentClick, signatureBoxWidth, signatureBoxHeight, readOnly]
  );

  /**
   * Registra la referencia de un contenedor de página
   */
  const setPageRef = useCallback((pageNumber: number, element: HTMLDivElement | null) => {
    if (element) {
      pageRefs.current.set(pageNumber, element);
    } else {
      pageRefs.current.delete(pageNumber);
    }
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-100">
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
            <p className="text-sm text-gray-600">Cargando documento...</p>
          </div>
        }
        error={
          <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-base font-medium text-gray-900 mb-2">Error al cargar documento</p>
            <p className="text-sm text-gray-600">
              {loadError || 'No se pudo generar la vista previa del PDF.'}
            </p>
          </div>
        }
      >
        {/* Renderizar todas las páginas */}
        {numPages &&
          Array.from({ length: numPages }, (_, index) => {
            const pageNumber = index + 1;

            return (
              <div
                key={`page_${pageNumber}`}
                className="relative mb-4 mx-auto shadow-lg"
                style={{ width: 'fit-content' }}
                ref={(el) => setPageRef(pageNumber, el)}
              >
                {/* Capa de la página (canvas renderizado por react-pdf) */}
                <Page
                  pageNumber={pageNumber}
                  width={800} // Ancho fijo para consistencia
                  renderTextLayer={false} // Desactivar capa de texto (mejora performance)
                  renderAnnotationLayer={false} // Desactivar anotaciones del PDF original
                />

                {/* Overlay clickeable para capturar clicks - solo en modo edición */}
                {!readOnly && (
                  <div
                    className="absolute inset-0 cursor-crosshair"
                    onClick={(e) => handlePageClick(pageNumber, e)}
                  />
                )}

                {/* Recuadros de firma para esta página */}
                {signaturePositions.map((pos, globalIndex) => {
                  // Solo renderizar firmas de la página actual
                  if (pos.page !== pageNumber) return null;

                  return (
                    <div
                      key={`sig_${globalIndex}`}
                      className="absolute border-2 border-blue-500 bg-blue-500/10 backdrop-blur-sm rounded group pointer-events-none"
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        width: `${pos.width}%`,
                        height: `${pos.height}%`,
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-blue-700 font-medium">
                        Firma {globalIndex + 1}
                      </div>
                      {onRemovePosition && !readOnly && (
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto flex items-center justify-center text-xs font-bold hover:bg-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemovePosition(globalIndex);
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
      </Document>
    </div>
  );
}
