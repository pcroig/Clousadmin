'use client';

import { ArrowLeft, Check, CheckCircle2, Clock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { PdfCanvasViewer } from '@/components/shared/pdf-canvas-viewer';
import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { parseJson } from '@/lib/utils/json';

interface EmpleadoItem {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
}

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
  firmado: boolean;
  firmadoEn?: string;
  empleado?: {
    nombre: string;
    apellidos: string;
    email: string;
  };
}

interface SolicitudExistente {
  id: string;
  titulo: string;
  mensaje?: string;
  estado: string;
  ordenFirma: boolean;
  firmas?: FirmaDetalle[];
}

interface SolicitarFirmaClientProps {
  documentoId: string;
}

export function SolicitarFirmaClient({ documentoId }: SolicitarFirmaClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState<EmpleadoItem[]>([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
  const [posicionesFirma, setPosicionesFirma] = useState<SignaturePosition[]>([]);
  const [documentoNombre, setDocumentoNombre] = useState('');
  const [carpetaId, setCarpetaId] = useState<string | null>(null);
  const [solicitudExistente, setSolicitudExistente] = useState<SolicitudExistente | null>(null);
  const [cargandoSolicitud, setCargandoSolicitud] = useState(true);

  // Constantes para el tamaño del recuadro de firma
  const SIGNATURE_RECT_WIDTH = 180;
  const SIGNATURE_RECT_HEIGHT = 60;

  // Cargar documento y sus detalles
  useEffect(() => {
    fetch(`/api/documentos/${documentoId}?meta=1`)
      .then((res) => parseJson<{ documento?: { nombre?: string; carpetaId?: string } }>(res))
      .then((data) => {
        const info = data.documento;
        if (info?.nombre) {
          setDocumentoNombre(info.nombre);
        }
        if (info?.carpetaId) {
          setCarpetaId(info.carpetaId);
        }
      })
      .catch(() => {
        // Silenciar error
      });
  }, [documentoId]);

  // Cargar solicitud existente si ya hay una para este documento
  useEffect(() => {
    setCargandoSolicitud(true);
    fetch(`/api/firma/solicitudes?documentoId=${documentoId}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Error al cargar solicitud');
        }
        return parseJson<{ solicitudes: SolicitudExistente[] }>(res);
      })
      .then((data) => {
        if (data.solicitudes && data.solicitudes.length > 0) {
          setSolicitudExistente(data.solicitudes[0]);
        }
      })
      .catch(() => {
        // Silenciar error - es normal que no exista solicitud aún
      })
      .finally(() => setCargandoSolicitud(false));
  }, [documentoId]);

  // Cargar empleados con acceso a la carpeta
  useEffect(() => {
    if (!carpetaId) return;

    setCargandoEmpleados(true);
    // Obtener empleados con acceso a esta carpeta
    fetch(`/api/carpetas/${carpetaId}/empleados-con-acceso`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Error al cargar empleados');
        }
        return parseJson<{ empleados: EmpleadoItem[] }>(res);
      })
      .then((data) => {
        setEmpleados(data.empleados || []);
      })
      .catch(() => {
        toast.error('No se pudieron cargar los empleados con acceso al documento');
      })
      .finally(() => setCargandoEmpleados(false));
  }, [carpetaId]);

  const itemsMultiSelect = useMemo(
    () =>
      empleados.map((empleado) => ({
        value: empleado.id,
        label: `${empleado.nombre} ${empleado.apellidos}`,
      })),
    [empleados]
  );

  const handleSeleccionMasiva = () => {
    if (empleados.length === 0) return;
    const todosSeleccionados = empleadosSeleccionados.length === empleados.length;
    if (todosSeleccionados) {
      setEmpleadosSeleccionados([]);
    } else {
      setEmpleadosSeleccionados(empleados.map((empleado) => empleado.id));
    }
  };

  const previewUrl = useMemo(
    () => `/api/documentos/${documentoId}/preview`,
    [documentoId]
  );

  /**
   * Handler cuando se hace click en el documento para añadir firma
   * El componente PdfCanvasViewer ya calcula las coordenadas correctamente
   */
  const handleAddSignature = (position: SignaturePosition) => {
    setPosicionesFirma((prev) => [...prev, position]);
  };

  /**
   * Handler para eliminar una posición de firma
   */
  const handleRemoveSignature = (index: number) => {
    setPosicionesFirma((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (empleadosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un firmante');
      return;
    }

    setLoading(true);
    try {
      // Si hay posiciones definidas, convertir la primera de porcentaje a coordenadas PDF
      let posicionFirma = undefined;
      if (posicionesFirma.length > 0) {
        const pos = posicionesFirma[0];

        /**
         * Conversión de coordenadas:
         * - PdfCanvasViewer devuelve coordenadas en porcentaje (0-100) relativas a cada página
         * - El API espera coordenadas en puntos PDF (595x842 para A4)
         * - Sistema de coordenadas PDF: origen en esquina inferior izquierda
         * - Sistema de coordenadas canvas: origen en esquina superior izquierda
         */
        const PDF_WIDTH = 595; // Ancho A4 en puntos
        const PDF_HEIGHT = 842; // Alto A4 en puntos

        posicionFirma = {
          pagina: pos.page, // Usar el número de página del canvas viewer
          x: (pos.x / 100) * PDF_WIDTH,
          // Invertir coordenada Y porque PDF usa origen abajo-izquierda
          y: PDF_HEIGHT - ((pos.y / 100) * PDF_HEIGHT) - ((pos.height / 100) * PDF_HEIGHT),
          width: SIGNATURE_RECT_WIDTH,
          height: SIGNATURE_RECT_HEIGHT,
        };
      }

      const body = {
        documentoId,
        firmantes: empleadosSeleccionados.map((empleadoId) => ({
          empleadoId,
        })),
        ordenFirma: false,
        posicionFirma,
      };

      const res = await fetch('/api/firma/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await parseJson<{ success?: boolean; error?: string }>(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo crear la solicitud de firma');
      }

      toast.success('Solicitud de firma creada');
      router.back();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al solicitar firma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Solicitar firma</h1>
              {documentoNombre && (
                <p className="text-sm text-gray-500">{documentoNombre}</p>
              )}
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading || empleadosSeleccionados.length === 0}
          >
            {loading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Solicitar firma
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Body - Layout de dos columnas */}
      <div className="flex-1 flex min-h-0">
        {/* Columna izquierda - Documento (PDF con Canvas) */}
        <div className="flex-1 bg-gray-100 relative">
          <PdfCanvasViewer
            pdfUrl={previewUrl}
            signaturePositions={posicionesFirma}
            onDocumentClick={handleAddSignature}
            onRemovePosition={handleRemoveSignature}
            signatureBoxWidth={SIGNATURE_RECT_WIDTH}
            signatureBoxHeight={SIGNATURE_RECT_HEIGHT}
          />
        </div>

        {/* Columna derecha - Panel de firmantes o Monitoreo */}
        <div className="w-96 bg-white border-l flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cargandoSolicitud ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                <Spinner className="w-4 h-4" />
                Cargando...
              </div>
            ) : solicitudExistente ? (
              /* Monitoreo de Firmas */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Estado de Firmas</h2>
                  <Badge variant={solicitudExistente.estado === 'completada' ? 'default' : 'secondary'}>
                    {solicitudExistente.estado}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {solicitudExistente.firmas && solicitudExistente.firmas.map((firma) => (
                    <div
                      key={firma.id}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {firma.empleado?.nombre} {firma.empleado?.apellidos}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {firma.empleado?.email}
                          </p>
                          {firma.firmadoEn && (
                            <p className="text-xs text-gray-400 mt-1">
                              Firmado: {new Date(firma.firmadoEn).toLocaleDateString()}
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

                {solicitudExistente.estado !== 'completada' && (
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-xs text-gray-500">
                      La solicitud permanecerá activa hasta que todos los empleados firmen o sea marcada como completada.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Formulario de Solicitud */
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Firmantes</h2>

                <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Seleccionar firmantes *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={loading || cargandoEmpleados || empleados.length === 0}
                      onClick={handleSeleccionMasiva}
                    >
                      {empleadosSeleccionados.length === empleados.length && empleados.length > 0
                        ? 'Limpiar'
                        : 'Todos'}
                    </Button>
                  </div>
                  <SearchableMultiSelect
                    items={itemsMultiSelect}
                    values={empleadosSeleccionados}
                    onChange={setEmpleadosSeleccionados}
                    placeholder={cargandoEmpleados ? 'Cargando empleados...' : 'Seleccionar empleados...'}
                    emptyMessage="No se encontraron empleados"
                    disabled={loading || cargandoEmpleados}
                  />
                  <p className="text-xs text-gray-500">
                    Selecciona uno o varios empleados que deben firmar este documento.
                  </p>
                </div>

                <div className="border-t pt-4">
                  <Label className="mb-2 block">Posición de firma (opcional)</Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Haz clic sobre el documento para añadir recuadros donde debe aparecer la firma.
                  </p>

                  {posicionesFirma.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {posicionesFirma.length} posición{posicionesFirma.length === 1 ? '' : 'es'}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPosicionesFirma([])}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Limpiar
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {posicionesFirma.map((pos, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5"
                          >
                            <span>
                              Posición {index + 1} (Página {pos.page})
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => handleRemoveSignature(index)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Sin posiciones definidas. La firma se añadirá al final del documento.
                    </p>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
