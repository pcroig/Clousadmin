'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { DocumentViewerModal } from '@/components/shared/document-viewer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { parseJson } from '@/lib/utils/json';

import { SignatureCanvas, SignatureCanvasHandle } from './signature-canvas';
interface FirmaInfoResponse {
  firmaGuardada?: boolean;
  firmaUrl?: string | null;
}

interface FirmaGuardarResponse {
  success?: boolean;
  error?: string;
}

interface FirmarSolicitudResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
}


export interface FirmaPendiente {
  id: string;
  orden?: number;
  solicitudTitulo: string;
  solicitudMensaje?: string;
  requiereOrden: boolean;
  documento: {
    id: string;
    nombre: string;
  };
}

interface FirmarDocumentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firma: FirmaPendiente | null;
  onSigned?: () => void;
}

export function FirmarDocumentoDialog({
  open,
  onOpenChange,
  firma,
  onSigned,
}: FirmarDocumentoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [firmaGuardadaDisponible, setFirmaGuardadaDisponible] = useState(false);
  const [firmaGuardadaUrl, setFirmaGuardadaUrl] = useState<string | null>(null);
  const [usarFirmaGuardada, setUsarFirmaGuardada] = useState(false);
  const [guardarFirmaEnPerfil, setGuardarFirmaEnPerfil] = useState(false);
  const [canvasHasDrawing, setCanvasHasDrawing] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const signatureRef = useRef<SignatureCanvasHandle | null>(null);

  useEffect(() => {
    if (!open) {
      setCanvasHasDrawing(false);
      setGuardarFirmaEnPerfil(false);
      setUsarFirmaGuardada(false);
      setViewerOpen(false);
      signatureRef.current?.clear?.();
      return;
    }

    fetch('/api/empleados/firma')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Error al cargar firma guardada');
        }
        return parseJson<FirmaInfoResponse>(res);
      })
      .then((data) => {
        setFirmaGuardadaDisponible(Boolean(data?.firmaGuardada));
        setFirmaGuardadaUrl(data?.firmaUrl ?? null);
      })
      .catch(() => {
        // Silenciar
      });
  }, [open]);

  const handleGuardarFirma = async (dataUrl: string) => {
    const formData = new FormData();
    formData.append('file', await dataUrlToFile(dataUrl, 'firma.png'));
    formData.append('data', JSON.stringify({ source: 'dashboard' }));

    const res = await fetch('/api/empleados/firma', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await parseJson<FirmaGuardarResponse>(res).catch(() => ({ error: '' }));
      throw new Error(data.error || 'No se pudo guardar la firma');
    }

    setFirmaGuardadaDisponible(true);
    setFirmaGuardadaUrl(dataUrl);
  };

  const handleFirmar = async () => {
    if (!firma) return;

    setLoading(true);
    try {
      let firmaImagenDataUrl: string | undefined;

      if (!usarFirmaGuardada) {
        const dataUrl = signatureRef.current?.getDataURL();
        if (!dataUrl) {
          throw new Error('Dibuja tu firma antes de firmar el documento');
        }
        firmaImagenDataUrl = dataUrl;

        if (guardarFirmaEnPerfil) {
          await handleGuardarFirma(dataUrl);
        }
      }

      const body = {
        tipo: usarFirmaGuardada ? 'click' : 'manuscrita',
        usarFirmaGuardada,
        firmaImagen: firmaImagenDataUrl,
        firmaImagenWidth: 500,
        firmaImagenHeight: 180,
      };

      const res = await fetch(`/api/firma/solicitudes/${firma.id}/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await parseJson<FirmarSolicitudResponse>(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo firmar el documento');
      }

      toast.success(data.mensaje || 'Documento firmado correctamente');
      onSigned?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al firmar documento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Firmar documento</DialogTitle>
        </DialogHeader>

        {firma ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900">{firma.documento.nombre}</p>
                  <p className="text-sm text-gray-500">{firma.solicitudTitulo}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setViewerOpen(true)}>
                  Ver documento
                </Button>
              </div>
              {firma.solicitudMensaje && (
                <p className="text-sm text-gray-500 whitespace-pre-line">{firma.solicitudMensaje}</p>
              )}
              {firma.requiereOrden && (
                <p className="text-xs text-amber-600">
                  Este documento requiere orden secuencial. Tu turno es #{firma.orden}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Revisa el documento en otra pestaña si lo necesitas. Esta ventana permanecerá abierta para capturar tu firma.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-700">Dibuja tu firma</Label>
                <SignatureCanvas
                  ref={signatureRef}
                  className={`mt-2 ${usarFirmaGuardada ? 'opacity-60 pointer-events-none' : ''}`}
                  onChange={setCanvasHasDrawing}
                />
                <p className="text-xs text-gray-500">
                  Este trazo se incrustará dentro del PDF como evidencia visual. Si usas tu firma guardada, el espacio permanece
                  disponible por si necesitas actualizarla.
                </p>
              </div>

              {firmaGuardadaDisponible && (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Firma guardada disponible</p>
                      <p className="text-xs text-gray-500">
                        Puedes reutilizar tu firma almacenada o dibujar una nueva en el lienzo superior.
                      </p>
                    </div>
                    <Checkbox
                      id="usar-firma-guardada"
                      checked={usarFirmaGuardada}
                      onCheckedChange={(value) => {
                        setUsarFirmaGuardada(Boolean(value));
                        if (value) {
                          setCanvasHasDrawing(false);
                        }
                      }}
                      disabled={loading}
                    />
                  </div>
                  {firmaGuardadaUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- Imagen dinámica (data URL de firma) no compatible con next/image
                    <img
                      src={firmaGuardadaUrl}
                      alt="Firma guardada"
                      className="h-16 object-contain border border-gray-200 rounded-md bg-white px-4"
                    />
                  )}
                </div>
              )}

              {!usarFirmaGuardada && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="guardar-firma-perfil"
                    checked={guardarFirmaEnPerfil}
                    onCheckedChange={(value) => setGuardarFirmaEnPerfil(Boolean(value))}
                    disabled={loading}
                  />
                  <Label htmlFor="guardar-firma-perfil" className="text-sm font-normal">
                    Guardar esta firma en mi perfil para próximos documentos
                  </Label>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-gray-500">No hay documento seleccionado.</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleFirmar}
            disabled={
              loading ||
              !firma ||
              (!usarFirmaGuardada && !canvasHasDrawing)
            }
          >
            {loading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Firmando...
              </>
            ) : (
              'Firmar documento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {firma && (
        <DocumentViewerModal
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          documentId={firma.documento.id}
          title={firma.documento.nombre}
          onDownload={() =>
            window.open(`/api/documentos/${firma.documento.id}`, '_blank', 'noopener,noreferrer')
          }
        />
      )}
    </Dialog>
  );
}

async function dataUrlToFile(dataUrl: string, filename: string) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: 'image/png' });
}

