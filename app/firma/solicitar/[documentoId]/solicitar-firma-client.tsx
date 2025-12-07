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
import { Switch } from '@/components/ui/switch';
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
  // Cambio: Posiciones por firmante en lugar de array global
  const [posicionesPorFirmante, setPosicionesPorFirmante] = useState<Record<string, SignaturePosition[]>>({});
  const [firmanteActivo, setFirmanteActivo] = useState<string | null>(null); // Para seleccionar a quién se asignan posiciones
  const [documentoNombre, setDocumentoNombre] = useState('');
  const [carpetaId, setCarpetaId] = useState<string | null>(null);
  const [solicitudExistente, setSolicitudExistente] = useState<SolicitudExistente | null>(null);
  const [cargandoSolicitud, setCargandoSolicitud] = useState(true);
  const [pdfDimensiones, setPdfDimensiones] = useState<{ width: number; height: number } | null>(null);
  const [mantenerOriginal, setMantenerOriginal] = useState(true);

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

  // Cargar dimensiones reales del PDF para conversión precisa de coordenadas
  useEffect(() => {
    fetch(`/api/documentos/${documentoId}/pdf-metadata`)
      .then((res) => parseJson<{ metadata?: { paginaPrincipal?: { width: number; height: number } } }>(res))
      .then((data) => {
        if (data.metadata?.paginaPrincipal) {
          setPdfDimensiones({
            width: data.metadata.paginaPrincipal.width,
            height: data.metadata.paginaPrincipal.height,
          });
        }
      })
      .catch(() => {
        // Fallback a dimensiones A4 estándar
        setPdfDimensiones({ width: 595, height: 842 });
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

  // Auto-seleccionar primer firmante cuando se selecciona al menos uno
  useEffect(() => {
    if (empleadosSeleccionados.length === 0) {
      // Limpiar todo si no hay empleados seleccionados
      if (firmanteActivo !== null) {
        setFirmanteActivo(null);
      }
      setPosicionesPorFirmante({});
    } else if (!firmanteActivo || !empleadosSeleccionados.includes(firmanteActivo)) {
      // Seleccionar el primero si no hay activo o si el activo fue deseleccionado
      setFirmanteActivo(empleadosSeleccionados[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadosSeleccionados]);

  /**
   * Handler cuando se hace click en el documento para añadir firma
   * Asigna la posición al firmante activo
   */
  const handleAddSignature = (position: SignaturePosition) => {
    if (!firmanteActivo) {
      toast.error('Selecciona un firmante primero');
      return;
    }
    setPosicionesPorFirmante((prev) => ({
      ...prev,
      [firmanteActivo]: [...(prev[firmanteActivo] || []), position],
    }));
  };

  /**
   * Handler para eliminar una posición de firma del firmante activo
   */
  const handleRemoveSignature = (index: number) => {
    if (!firmanteActivo) return;
    setPosicionesPorFirmante((prev) => ({
      ...prev,
      [firmanteActivo]: (prev[firmanteActivo] || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (empleadosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un firmante');
      return;
    }

    setLoading(true);
    try {
      /**
       * Crear una solicitud individual por cada firmante
       * Cada solicitud tiene sus propias posiciones de firma
       */
      // Usar dimensiones reales del PDF (o fallback a A4)
      const PDF_WIDTH = pdfDimensiones?.width || 595;
      const PDF_HEIGHT = pdfDimensiones?.height || 842;

      // Convertir TODAS las posiciones de TODOS los firmantes a formato PDF
      const posicionesPorFirmanteConvertidas: Record<string, any[]> = {};

      for (const empleadoId of empleadosSeleccionados) {
        const posicionesEmpleado = posicionesPorFirmante[empleadoId] || [];

        if (posicionesEmpleado.length > 0) {
          posicionesPorFirmanteConvertidas[empleadoId] = posicionesEmpleado.map(pos => ({
            pagina: pos.page,
            x: (pos.x / 100) * PDF_WIDTH,
            // Invertir coordenada Y porque PDF usa origen abajo-izquierda
            y: PDF_HEIGHT - ((pos.y / 100) * PDF_HEIGHT) - ((pos.height / 100) * PDF_HEIGHT),
            // IMPORTANTE: Guardar width/height calculados desde los porcentajes, no valores hardcodeados
            width: (pos.width / 100) * PDF_WIDTH,
            height: (pos.height / 100) * PDF_HEIGHT,
          }));
        }
      }

      const resultados = await Promise.allSettled(
        empleadosSeleccionados.map(async (empleadoId) => {
          // Obtener posiciones convertidas de este firmante específico
          const posicionesFirmante = posicionesPorFirmanteConvertidas[empleadoId] || [];

          const body = {
            documentoId,
            firmantes: [{ empleadoId }], // Solo un firmante por solicitud
            ordenFirma: false,
            posicionesFirma: posicionesFirmante, // Array de posiciones
            mantenerOriginal, // Toggle para mantener o reemplazar el original
          };

          const res = await fetch('/api/firma/solicitudes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          const data = await parseJson<{ success?: boolean; error?: string }>(res);
          if (!res.ok || !data.success) {
            throw new Error(data.error || `No se pudo crear solicitud para empleado ${empleadoId}`);
          }

          return { empleadoId, success: true };
        })
      );

      // Contar éxitos y fallos
      const exitosas = resultados.filter((r) => r.status === 'fulfilled').length;
      const fallidas = resultados.filter((r) => r.status === 'rejected').length;

      if (fallidas === 0) {
        // Todas exitosas
        const mensaje = exitosas === 1
          ? 'Solicitud de firma creada'
          : `${exitosas} solicitudes de firma creadas`;
        toast.success(mensaje);
        router.back();
      } else if (exitosas > 0) {
        // Parcialmente exitosas
        toast.warning(
          `${exitosas} solicitudes creadas correctamente, ${fallidas} fallaron. Revisa las solicitudes creadas.`
        );
        router.back();
      } else {
        // Todas fallaron
        throw new Error('No se pudo crear ninguna solicitud de firma');
      }
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
            signaturePositions={firmanteActivo ? (posicionesPorFirmante[firmanteActivo] || []) : []}
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

                {/* Selector de firmante activo */}
                {empleadosSeleccionados.length > 0 && (
                  <div className="border-t pt-4">
                    <Label className="mb-2 block">Asignar posiciones de firma</Label>
                    <p className="text-xs text-gray-500 mb-3">
                      Selecciona un firmante para asignarle posiciones en el documento.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {empleadosSeleccionados.map((empId) => {
                        const empleado = empleados.find((e) => e.id === empId);
                        const numPosiciones = (posicionesPorFirmante[empId] || []).length;
                        return (
                          <Button
                            key={empId}
                            type="button"
                            variant={firmanteActivo === empId ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFirmanteActivo(empId)}
                            className="relative"
                          >
                            {empleado ? `${empleado.nombre} ${empleado.apellidos}` : empId}
                            {numPosiciones > 0 && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                {numPosiciones}
                              </span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Posiciones de firma del firmante activo */}
                {firmanteActivo && (
                  <div className="border-t pt-4">
                    <Label className="mb-2 block">Posiciones de firma</Label>
                    <p className="text-xs text-gray-500 mb-3">
                      Haz clic sobre el documento para añadir recuadros donde debe aparecer la firma.
                    </p>

                    {(() => {
                      const posicionesActual = posicionesPorFirmante[firmanteActivo] || [];
                      return posicionesActual.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">
                              {posicionesActual.length} posición{posicionesActual.length === 1 ? '' : 'es'}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPosicionesPorFirmante((prev) => ({
                                  ...prev,
                                  [firmanteActivo]: [],
                                }));
                              }}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Limpiar
                            </Button>
                          </div>
                          <div className="space-y-1">
                            {posicionesActual.map((pos, index) => (
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
                      );
                    })()}
                  </div>
                )}

                {/* Toggle para mantener original */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="mantener-original" className="text-sm font-medium">
                        Mantener documento original
                      </Label>
                      <p className="text-xs text-gray-500">
                        Si está activado, se crearán copias individuales del documento firmado para cada empleado.
                        Si está desactivado, el documento original será reemplazado con la versión firmada.
                      </p>
                    </div>
                    <Switch
                      id="mantener-original"
                      checked={mantenerOriginal}
                      onCheckedChange={setMantenerOriginal}
                      disabled={loading}
                    />
                  </div>
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
