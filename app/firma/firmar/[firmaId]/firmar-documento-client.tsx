'use client';

import { AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { FirmaPendiente, FirmarDocumentoDialog } from '@/components/firma/firmar-documento-dialog';
import { PdfCanvasViewer } from '@/components/shared/pdf-canvas-viewer';
import { Button } from '@/components/ui/button';
import { parseJson } from '@/lib/utils/json';

interface SignaturePosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FirmaDetalle {
  id: string;
  orden: number;
  solicitudes_firma: {
    id: string;
    titulo: string;
    mensaje?: string;
    ordenFirma: boolean;
    posicionFirma?: {
      pagina: number;
      x: number;
      y: number;
      width: number;
      height: number;
    };
    documento: {
      id: string;
      nombre: string;
    };
  };
}

interface FirmarDocumentoClientProps {
  firmaId: string;
}

export function FirmarDocumentoClient({ firmaId }: FirmarDocumentoClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firma, setFirma] = useState<FirmaDetalle | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Cargar detalles de la firma
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/firma/pendientes?firmaId=${firmaId}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('No se pudo cargar la firma');
        }
        return parseJson<{ firma: FirmaDetalle }>(res);
      })
      .then((data) => {
        if (!data.firma) {
          throw new Error('Firma no encontrada');
        }
        setFirma(data.firma);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al cargar firma');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [firmaId]);

  const previewUrl = useMemo(
    () => (firma ? `/api/documentos/${firma.solicitudes_firma.documento.id}/preview` : ''),
    [firma]
  );

  // Convertir posición de firma del formato DB al formato del viewer
  const signaturePositions = useMemo<SignaturePosition[]>(() => {
    if (!firma?.solicitudes_firma.posicionFirma) return [];

    const pos = firma.solicitudes_firma.posicionFirma;

    // Convertir de coordenadas PDF (puntos) a porcentajes para el canvas
    const PDF_WIDTH = 595; // Ancho A4 en puntos
    const PDF_HEIGHT = 842; // Alto A4 en puntos

    // Valores por defecto si no están presentes en la BD
    const width = pos.width ?? 180; // Default width
    const height = pos.height ?? 60; // Default height

    // Sistema de coordenadas PDF: origen en esquina inferior izquierda
    // Sistema de coordenadas canvas: origen en esquina superior izquierda
    // Necesitamos invertir la coordenada Y
    return [{
      page: pos.pagina,
      x: (pos.x / PDF_WIDTH) * 100, // Convertir a porcentaje
      y: ((PDF_HEIGHT - pos.y - height) / PDF_HEIGHT) * 100, // Invertir Y y convertir a porcentaje
      width: (width / PDF_WIDTH) * 100,
      height: (height / PDF_HEIGHT) * 100,
    }];
  }, [firma]);

  const firmaPendiente: FirmaPendiente | null = firma
    ? {
        id: firma.id,
        solicitudId: firma.solicitudes_firma.id,
        orden: firma.orden,
        requiereOrden: firma.solicitudes_firma.ordenFirma,
        solicitudTitulo: firma.solicitudes_firma.titulo,
        solicitudMensaje: firma.solicitudes_firma.mensaje,
        documento: {
          id: firma.solicitudes_firma.documento.id,
          nombre: firma.solicitudes_firma.documento.nombre,
        },
      }
    : null;

  const handleFirmado = () => {
    toast.success('Documento firmado correctamente');
    router.back();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
          <p className="text-sm text-gray-600">Cargando documento...</p>
        </div>
      </div>
    );
  }

  if (error || !firma) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-base font-medium text-gray-900 mb-2">Error al cargar documento</p>
          <p className="text-sm text-gray-600 mb-4">{error || 'Firma no encontrada'}</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Firmar documento</h1>
              <p className="text-sm text-gray-500">{firma.solicitudes_firma.documento.nombre}</p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Check className="w-4 h-4 mr-2" />
            Firmar
          </Button>
        </div>
      </div>

      {/* Body - Visor de PDF */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 bg-gray-100 relative">
          <PdfCanvasViewer
            pdfUrl={previewUrl}
            signaturePositions={signaturePositions}
            readOnly={true}
          />
        </div>

        {/* Panel lateral con información */}
        <div className="w-96 bg-white border-l flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de la firma</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Documento</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {firma.solicitudes_firma.documento.nombre}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Título de solicitud</label>
                  <p className="text-sm text-gray-900 mt-1">{firma.solicitudes_firma.titulo}</p>
                </div>

                {firma.solicitudes_firma.mensaje && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mensaje</label>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                      {firma.solicitudes_firma.mensaje}
                    </p>
                  </div>
                )}

                {firma.solicitudes_firma.ordenFirma && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-900">Orden de firma</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Este documento requiere firmas en orden secuencial. Tu turno es #{firma.orden}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    Revisa el documento antes de firmarlo. Al hacer clic en "Firmar", se abrirá un
                    diálogo para capturar tu firma digital.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de firma */}
      <FirmarDocumentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        firma={firmaPendiente}
        onSigned={handleFirmado}
      />
    </div>
  );
}
