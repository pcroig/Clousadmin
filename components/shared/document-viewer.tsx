'use client';

/**
 * DocumentViewerModal
 *
 * Universal document viewer component for in-app preview of PDFs and Word documents.
 * - Uses the /api/documentos/[id]/preview endpoint for rendering.
 * - Supports custom actions in the header (e.g., "Sign", "Download").
 * - Handles loading and error states.
 * 
 * @version 1.5.0 (2025-11-28)
 * - Enhanced iframe sandbox: allow-downloads, allow-modals, allow-presentation
 * - Enables full native PDF viewer functionality (download, print, fullscreen)
 * - Compatible with Chrome, Firefox, Safari, Edge PDF viewers
 */

import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface DocumentViewerProps {
  /** Whether the viewer is open */
  open: boolean;
  /** Callback when the viewer is closed */
  onClose: () => void;
  /** Document ID to preview (used to build default URL) */
  documentId: string;
  /** Document title to display in the header */
  title: string;
  /** Optional custom preview URL (overrides documentId-based URL) */
  previewUrl?: string;
  /** MIME type of the original document (for displaying info) */
  mimeType?: string;
  /** Custom actions to display in the header */
  actions?: React.ReactNode;
  /** Callback for download action */
  onDownload?: () => void;
}

type ViewerState = 'loading' | 'ready' | 'error';

export function DocumentViewerModal({
  open,
  onClose,
  documentId,
  title,
  previewUrl: customPreviewUrl,
  mimeType,
  actions,
  onDownload,
}: DocumentViewerProps) {
  const [state, setState] = useState<ViewerState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Build the preview URL (use custom URL if provided, otherwise default to document preview)
  const previewUrl = customPreviewUrl || `/api/documentos/${documentId}/preview`;

  // Reset state when dialog opens or document changes
  // This is intentional - we need to reset loading state when props change
  useEffect(() => {
    if (open) {
      // Resetting state on prop change is a valid pattern for derived state
      setState('loading');
      setErrorMessage(null);
    }
  }, [open, documentId]); // eslint-disable-line react-hooks/set-state-in-effect

  const handleIframeLoad = useCallback(() => {
    setState('ready');
  }, []);

  const handleIframeError = useCallback(() => {
    setState('error');
    setErrorMessage('No se pudo cargar la vista previa del documento.');
  }, []);

  const handleOpenExternal = useCallback(() => {
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  }, [previewUrl]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Check if the document is a Word file
  const normalizedMime = mimeType?.toLowerCase() ?? null;
  const isWordDocument =
    normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isPdfDocument = normalizedMime === 'application/pdf';

  const iframeSandbox = isPdfDocument
    ? undefined
    : 'allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-modals allow-presentation';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          'flex flex-col p-0 gap-0',
          isFullscreen
            ? 'fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none translate-x-0 translate-y-0 top-0 left-0'
            : 'sm:max-w-5xl h-[90vh] max-h-[900px]'
        )}
        showCloseButton={false}
        aria-describedby={undefined}
      >
        {/* Header */}
        <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between gap-4 px-4 py-3 border-b bg-gray-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-gray-900 truncate">
                {title}
              </DialogTitle>
              {isWordDocument && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Convertido a PDF para visualización
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Custom actions */}
            {actions}

            {/* Download button */}
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
                title="Descargar documento original"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            )}

            {/* Open in new tab */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenExternal}
              title="Abrir en nueva pestaña"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>

            {/* Fullscreen toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 relative bg-gray-100 min-h-0">
          {/* Loading state */}
          {state === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-3" />
              <p className="text-sm text-gray-600">
                {isWordDocument ? 'Convirtiendo documento...' : 'Cargando vista previa...'}
              </p>
            </div>
          )}

          {/* Error state */}
          {state === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10 px-6">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-base font-medium text-gray-900 mb-2 text-center">
                No se pudo mostrar el documento
              </p>
              <p className="text-sm text-gray-600 text-center mb-4 max-w-md">
                {errorMessage ||
                  'Ha ocurrido un error al cargar la vista previa. Intenta descargarlo directamente.'}
              </p>
              <div className="flex gap-2">
                {onDownload && (
                  <Button variant="outline" onClick={onDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                )}
                <Button variant="ghost" onClick={handleOpenExternal}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir en nueva pestaña
                </Button>
              </div>
            </div>
          )}

          {/* PDF iframe */}
          <iframe
            key={documentId}
            src={previewUrl}
            className={cn(
              'w-full h-full border-0',
              state !== 'ready' && 'opacity-0'
            )}
            title={`Vista previa de ${title}`}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox={iframeSandbox}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Simplified hook for document viewer state management
 */
export interface UseDocumentViewerReturn {
  isOpen: boolean;
  documentId: string | null;
  documentTitle: string;
  documentMimeType: string | null;
  openViewer: (id: string, title: string, mimeType?: string) => void;
  closeViewer: () => void;
}

export function useDocumentViewer(): UseDocumentViewerReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentMimeType, setDocumentMimeType] = useState<string | null>(null);

  const openViewer = useCallback((id: string, title: string, mimeType?: string) => {
    setDocumentId(id);
    setDocumentTitle(title);
    setDocumentMimeType(mimeType ?? null);
    setIsOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setIsOpen(false);
    // Don't clear documentId immediately to prevent flickering during close animation
    setTimeout(() => {
      setDocumentId(null);
      setDocumentTitle('');
      setDocumentMimeType(null);
    }, 200);
  }, []);

  return {
    isOpen,
    documentId,
    documentTitle,
    documentMimeType,
    openViewer,
    closeViewer,
  };
}

