'use client';

import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Download, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPostFirmaRedirect } from '@/lib/firma-digital/get-post-firma-redirect';
import { parseJson } from '@/lib/utils/json';

interface SolicitudDetalle {
  id: string;
  titulo: string;
  mensaje?: string;
  estado: string;
  ordenFirma: boolean;
  pdfFirmadoS3Key?: string;
  documentos: {
    id: string;
    nombre: string;
  };
  firmas: Array<{
    id: string;
    orden: number;
    firmado: boolean;
    firmadoEn?: string;
    empleado: {
      nombre: string;
      apellidos: string;
      email: string;
    };
  }>;
}

interface VerSolicitudClientProps {
  solicitudId: string;
}

export function VerSolicitudClient({ solicitudId }: VerSolicitudClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [solicitud, setSolicitud] = useState<SolicitudDetalle | null>(null);

  // Cargar detalles de la solicitud
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/firma/solicitudes/${solicitudId}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('No se pudo cargar la solicitud');
        }
        return parseJson<{ solicitud: SolicitudDetalle }>(res);
      })
      .then((data) => {
        if (!data.solicitud) {
          throw new Error('Solicitud no encontrada');
        }
        setSolicitud(data.solicitud);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al cargar solicitud');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [solicitudId]);

  const documentoFirmadoUrl = useMemo(
    () => solicitud?.pdfFirmadoS3Key ? `/api/firma/solicitudes/${solicitudId}/documento-firmado` : null,
    [solicitud, solicitudId]
  );

  // URL del documento original (para mostrar mientras está en proceso)
  const documentoOriginalUrl = useMemo(
    () => solicitud ? `/api/documentos/${solicitud.documentos.id}/preview` : null,
    [solicitud]
  );

  const handleDescargar = async () => {
    if (!documentoFirmadoUrl) return;

    try {
      // Descargar el archivo
      const response = await fetch(documentoFirmadoUrl);
      if (!response.ok) {
        throw new Error('Error al descargar el documento');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = solicitud?.documentos.nombre.endsWith('.pdf')
        ? solicitud.documentos.nombre.replace('.pdf', '_firmado.pdf')
        : `${solicitud?.documentos.nombre}_firmado.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Documento descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar el documento');
      console.error('Error downloading:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
          <p className="text-sm text-gray-600">Cargando solicitud...</p>
        </div>
      </div>
    );
  }

  if (error || !solicitud) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-base font-medium text-gray-900 mb-2">Error al cargar solicitud</p>
          <p className="text-sm text-gray-600 mb-4">{error || 'Solicitud no encontrada'}</p>
          <Button variant="outline" onClick={() => router.push(getPostFirmaRedirect())}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const firmasPendientes = solicitud.firmas.filter(f => !f.firmado).length;
  const firmasCompletadas = solicitud.firmas.filter(f => f.firmado).length;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push(getPostFirmaRedirect())}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Solicitud de Firma</h1>
              <p className="text-sm text-gray-500">{solicitud.documentos.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={solicitud.estado === 'completada' ? 'default' : 'secondary'}>
              {solicitud.estado}
            </Badge>
            {documentoFirmadoUrl && (
              <Button onClick={handleDescargar}>
                <Download className="w-4 h-4 mr-2" />
                Descargar firmado
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Columna izquierda - Documento firmado o documento original */}
        <div className="flex-1 bg-gray-100 relative">
          {documentoFirmadoUrl ? (
            // Mostrar documento firmado cuando todas las firmas están completadas
            <iframe
              src={`${documentoFirmadoUrl}?inline=1`}
              className="w-full h-full"
              title="Documento firmado"
            />
          ) : documentoOriginalUrl ? (
            // Mostrar documento original mientras está en proceso
            <iframe
              src={documentoOriginalUrl}
              className="w-full h-full"
              title="Documento original"
            />
          ) : (
            // Fallback si no hay documento disponible
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Documento no disponible
                </p>
                <p className="text-sm text-gray-500">
                  No se pudo cargar el documento
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha - Estado de firmas */}
        <div className="w-96 bg-white border-l flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Firmas</h2>

              {solicitud.mensaje && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 whitespace-pre-line">{solicitud.mensaje}</p>
                </div>
              )}

              <div className="space-y-3">
                {solicitud.firmas.map((firma) => (
                  <div
                    key={firma.id}
                    className="border rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {firma.empleado.nombre} {firma.empleado.apellidos}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {firma.empleado.email}
                        </p>
                        {firma.firmado && firma.firmadoEn && (
                          <p className="text-xs text-gray-400 mt-1">
                            Firmado: {new Date(firma.firmadoEn).toLocaleDateString()}
                          </p>
                        )}
                        {solicitud.ordenFirma && (
                          <p className="text-xs text-amber-600 mt-1">
                            Orden #{firma.orden}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {firma.firmado ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {firmasPendientes > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    {firmasPendientes} firma{firmasPendientes === 1 ? '' : 's'} pendiente{firmasPendientes === 1 ? '' : 's'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
