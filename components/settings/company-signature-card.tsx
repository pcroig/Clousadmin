'use client';

import { Check, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { SignatureCanvas, SignatureCanvasHandle } from '@/components/firma/signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { parseJson } from '@/lib/utils/json';

interface CompanySignatureCardProps {
  initialData: {
    firmaGuardada: boolean;
    firmaUrl?: string | null;
    firmaGuardadaEn?: string | null;
  };
}

interface FirmaGuardarResponse {
  success?: boolean;
  error?: string;
  mensaje?: string;
}

export function CompanySignatureCard({ initialData }: CompanySignatureCardProps) {
  const [firmaGuardada, setFirmaGuardada] = useState(initialData.firmaGuardada);
  const [firmaUrl, setFirmaUrl] = useState<string | null>(initialData.firmaUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasHasDrawing, setCanvasHasDrawing] = useState(false);
  const [guardarComoPredeterminada, setGuardarComoPredeterminada] = useState(true);
  const signatureRef = useRef<SignatureCanvasHandle | null>(null);

  const handleGuardarFirma = async () => {
    try {
      const dataUrl = signatureRef.current?.getDataURL();
      if (!dataUrl) {
        toast.error('Dibuja tu firma antes de guardar');
        return;
      }

      setLoading(true);

      const formData = new FormData();
      const file = await dataUrlToFile(dataUrl, 'firma-empresa.png');
      formData.append('file', file);
      formData.append('data', JSON.stringify({ source: 'configuracion', predeterminada: guardarComoPredeterminada }));

      const res = await fetch('/api/empresa/firma', {
        method: 'POST',
        body: formData,
      });

      const data = await parseJson<FirmaGuardarResponse>(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo guardar la firma');
      }

      toast.success(data.mensaje || 'Firma de empresa guardada correctamente');
      setFirmaGuardada(true);
      setFirmaUrl(dataUrl);
      setShowCanvas(false);
      setCanvasHasDrawing(false);
      signatureRef.current?.clear?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar la firma');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarFirma = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar la firma de la empresa?')) {
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('/api/empresa/firma', {
        method: 'DELETE',
      });

      const data = await parseJson<FirmaGuardarResponse>(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo eliminar la firma');
      }

      toast.success(data.mensaje || 'Firma eliminada correctamente');
      setFirmaGuardada(false);
      setFirmaUrl(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la firma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firma de la empresa</CardTitle>
        <CardDescription>
          Configura la firma que se usará en los documentos de la empresa. Esta firma aparecerá automáticamente
          cuando solicites firmas de documentos a empleados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {firmaGuardada && firmaUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Firma guardada
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Esta firma se aplicará automáticamente en documentos
                  </p>
                  {initialData.firmaGuardadaEn && (
                    <p className="text-xs text-gray-400 mt-1">
                      Guardada el {new Date(initialData.firmaGuardadaEn).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEliminarFirma}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element -- Firma dinámica de usuario */}
              <img
                src={firmaUrl}
                alt="Firma de empresa"
                className="h-20 object-contain border border-gray-200 rounded-md bg-white px-4 w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowCanvas(true)}
              disabled={loading}
            >
              Actualizar firma
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {!showCanvas ? (
              <Button
                onClick={() => setShowCanvas(true)}
                disabled={loading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Añadir firma de empresa
              </Button>
            ) : null}
          </div>
        )}

        {showCanvas && (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Dibuja la firma de la empresa</Label>
              <SignatureCanvas
                ref={signatureRef}
                className="mt-2"
                onChange={setCanvasHasDrawing}
              />
              <p className="text-xs text-gray-500">
                Esta firma se incrustará automáticamente en los documentos que solicites firmar a tus empleados.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="guardar-predeterminada"
                checked={guardarComoPredeterminada}
                onCheckedChange={(value) => setGuardarComoPredeterminada(Boolean(value))}
                disabled={loading}
              />
              <Label htmlFor="guardar-predeterminada" className="text-sm font-normal">
                Usar como firma predeterminada de la empresa
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGuardarFirma}
                disabled={loading || !canvasHasDrawing}
              >
                {loading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Guardar firma
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCanvas(false);
                  setCanvasHasDrawing(false);
                  signatureRef.current?.clear?.();
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function dataUrlToFile(dataUrl: string, filename: string) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: 'image/png' });
}
