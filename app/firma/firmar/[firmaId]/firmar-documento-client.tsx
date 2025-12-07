'use client';

import { decodeJwt } from 'jose';
import { AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { FirmaPendiente, FirmarDocumentoDialog } from '@/components/firma/firmar-documento-dialog';
import { PdfCanvasViewer } from '@/components/shared/pdf-canvas-viewer';
import { Button } from '@/components/ui/button';
import { UsuarioRol } from '@/lib/constants/enums';
import type { PosicionFirma, PosicionFirmaConMetadata } from '@/lib/firma-digital/tipos';
import { parseJson } from '@/lib/utils/json';

interface SignaturePosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PdfDimensiones {
  width: number;
  height: number;
  numPaginas: number;
}

interface FirmaDetalle {
  id: string;
  orden: number;
  solicitudes_firma: {
    id: string;
    titulo: string;
    mensaje?: string;
    ordenFirma: boolean;
    posicionFirma?: PosicionFirmaConMetadata | PosicionFirma;
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
  const obtenerRolDesdeCookie = (): UsuarioRol | null => {
    if (typeof document === 'undefined') return null;

    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('clousadmin-session='));

    if (!cookie) return null;

    const token = cookie.split('=')[1];
    if (!token) return null;

    try {
      const decoded = decodeJwt(token) as { user?: { rol?: string } };
      const rol = decoded?.user?.rol;

      if (!rol) return null;

      const rolesValidos = new Set<UsuarioRol>([
        UsuarioRol.platform_admin,
        UsuarioRol.hr_admin,
        UsuarioRol.manager,
        UsuarioRol.empleado,
      ]);

      return rolesValidos.has(rol as UsuarioRol) ? (rol as UsuarioRol) : null;
    } catch (error) {
      // En caso de token inválido, no bloqueamos la UX; usamos fallback
      return null;
    }
  };

  const obtenerRutaPostFirma = (): string => {
    const rol = obtenerRolDesdeCookie();

    if (rol === UsuarioRol.hr_admin || rol === UsuarioRol.platform_admin) {
      return '/hr/mi-espacio';
    }

    if (rol === UsuarioRol.manager) {
      return '/manager/mi-espacio';
    }

    // Fallback para empleados o rol desconocido
    return '/empleado/mi-espacio';
  };

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firma, setFirma] = useState<FirmaDetalle | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pdfDimensiones, setPdfDimensiones] = useState<PdfDimensiones | null>(null);

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

  // Cargar dimensiones reales del PDF
  useEffect(() => {
    if (!firma?.solicitudes_firma.documento.id) return;

    fetch(`/api/documentos/${firma.solicitudes_firma.documento.id}/pdf-metadata`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Error al cargar metadata del PDF');
        return parseJson<{ metadata: { paginaPrincipal: { width: number; height: number }; numPaginas: number } }>(res);
      })
      .then((data) => {
        if (data.metadata?.paginaPrincipal) {
          setPdfDimensiones({
            width: data.metadata.paginaPrincipal.width,
            height: data.metadata.paginaPrincipal.height,
            numPaginas: data.metadata.numPaginas ?? 1,
          });
        }
      })
      .catch(() => {
        // Fallback a A4
        setPdfDimensiones({ width: 595, height: 842, numPaginas: 1 });
      });
  }, [firma]);

  const previewUrl = useMemo(
    () => (firma ? `/api/documentos/${firma.solicitudes_firma.documento.id}/preview` : ''),
    [firma]
  );

  // Convertir posición de firma del formato DB al formato del viewer
  const signaturePositions = useMemo<SignaturePosition[]>(() => {
    if (!firma?.solicitudes_firma.posicionFirma || !pdfDimensiones) return [];

    // Validar dimensiones para evitar división por cero
    if (pdfDimensiones.width <= 0 || pdfDimensiones.height <= 0) {
      console.error('[FirmarDocumentoClient] Dimensiones inválidas:', pdfDimensiones);
      return [];
    }

    const pos = firma.solicitudes_firma.posicionFirma;

    // NUEVO: Formato múltiple { multiple: true, posiciones: [...] }
    if (typeof pos === 'object' && pos !== null && 'multiple' in pos && (pos as any).multiple === true) {
      const posiciones = (pos as any).posiciones;
      if (Array.isArray(posiciones)) {
        return posiciones.map((p: any) => {
          // Convert from PDF coordinates to percentages
          const width = p.width ?? 180;
          const height = p.height ?? 60;
          const xPorcentaje = (p.x / pdfDimensiones.width) * 100;
          const yDesdeArriba = pdfDimensiones.height - p.y - height;
          const yPorcentaje = (yDesdeArriba / pdfDimensiones.height) * 100;
          const widthPorcentaje = (width / pdfDimensiones.width) * 100;
          const heightPorcentaje = (height / pdfDimensiones.height) * 100;

          return {
            page: p.pagina,
            x: xPorcentaje,
            y: yPorcentaje,
            width: widthPorcentaje,
            height: heightPorcentaje,
          };
        });
      }
    }

    // Type guard para v2: debe tener version y porcentajes
    const esFormatoV2 = (p: unknown): p is PosicionFirmaConMetadata => {
      return typeof p === 'object' && p !== null && 'version' in p && p.version === 'v2';
    };

    if (esFormatoV2(pos)) {
      // Formato v2: Ya está en porcentajes, solo extraer
      const { porcentajes } = pos;

      return [{
        page: porcentajes.pagina,
        x: porcentajes.xPorcentaje,  // Ya está en %
        y: porcentajes.yPorcentaje,  // Ya está en %
        width: porcentajes.widthPorcentaje ?? 30,
        height: porcentajes.heightPorcentaje ?? 7,
      }];
    } else {
      // Formato v1: Convertir de coordenadas absolutas a porcentajes
      const posV1 = pos as PosicionFirma;

      // Valores por defecto si no están presentes
      const width = posV1.width ?? 180;
      const height = posV1.height ?? 60;

      // Convertir de puntos PDF a porcentajes usando dimensiones REALES
      // Sistema de coordenadas PDF: origen en esquina inferior izquierda
      // Sistema de coordenadas canvas: origen en esquina superior izquierda
      // Necesitamos invertir la coordenada Y
      const xPorcentaje = (posV1.x / pdfDimensiones.width) * 100;
      const yDesdeArriba = pdfDimensiones.height - posV1.y - height;
      const yPorcentaje = (yDesdeArriba / pdfDimensiones.height) * 100;
      const widthPorcentaje = (width / pdfDimensiones.width) * 100;
      const heightPorcentaje = (height / pdfDimensiones.height) * 100;

      return [{
        page: posV1.pagina,
        x: xPorcentaje,
        y: yPorcentaje,
        width: widthPorcentaje,
        height: heightPorcentaje,
      }];
    }
  }, [firma, pdfDimensiones]);

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
    // Redirigir al espacio adecuado según rol
    setTimeout(() => {
      router.push(obtenerRutaPostFirma());
    }, 500);
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
