'use client';

import { ArrowLeft, Check, Info, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SignatureCanvas, type SignatureCanvasHandle } from '@/components/firma/signature-canvas';
import { PdfCanvasViewer } from '@/components/shared/pdf-canvas-viewer';
import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getPostFirmaRedirect } from '@/lib/firma-digital/get-post-firma-redirect';
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
  const [pdfDimensiones, setPdfDimensiones] = useState<{ width: number; height: number } | null>(null);
  const [mantenerOriginal, setMantenerOriginal] = useState(true);
  const [incluirFirmaEmpresa, setIncluirFirmaEmpresa] = useState(false);
  const [posicionesFirmaEmpresa, setPosicionesFirmaEmpresa] = useState<SignaturePosition[]>([]);
  const [guardarFirmaEmpresa, setGuardarFirmaEmpresa] = useState(false);
  const [firmaEmpresaGuardada, setFirmaEmpresaGuardada] = useState<string | null>(null);

  const firmaEmpresaCanvasRef = useRef<SignatureCanvasHandle>(null);

  // ID especial para la firma de empresa
  const FIRMA_EMPRESA_ID = '__EMPRESA__';

  // Constantes para el tamaño del recuadro de firma
  const SIGNATURE_RECT_WIDTH = 180;
  const SIGNATURE_RECT_HEIGHT = 60;

  // Verificar si hay firma de empresa disponible y cargarla
  useEffect(() => {
    fetch('/api/empresa/firma')
      .then(async (res) => {
        if (!res.ok) return null;
        return parseJson<{ firmaGuardada?: boolean; firmaUrl?: string }>(res);
      })
      .then((data) => {
        if (data?.firmaGuardada && data.firmaUrl) {
          setFirmaEmpresaGuardada(data.firmaUrl);
          setGuardarFirmaEmpresa(true); // Mantener activado el checkbox
        }
      })
      .catch(() => {
        // Silenciar error (puede ser que no sea HR admin)
      });
  }, []);

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
   * Asigna la posición al firmante activo o a la firma de empresa
   */
  const handleAddSignature = (position: SignaturePosition) => {
    if (!firmanteActivo) {
      toast.error('Selecciona un firmante o la firma de empresa');
      return;
    }

    if (firmanteActivo === FIRMA_EMPRESA_ID) {
      // Añadir posición para firma de empresa
      setPosicionesFirmaEmpresa((prev) => [...prev, position]);
    } else {
      // Añadir posición para empleado
      setPosicionesPorFirmante((prev) => ({
        ...prev,
        [firmanteActivo]: [...(prev[firmanteActivo] || []), position],
      }));
    }
  };

  /**
   * Handler para eliminar una posición de firma del firmante activo o firma empresa
   */
  const handleRemoveSignature = (index: number) => {
    if (!firmanteActivo) return;

    if (firmanteActivo === FIRMA_EMPRESA_ID) {
      setPosicionesFirmaEmpresa((prev) => prev.filter((_, i) => i !== index));
    } else {
      setPosicionesPorFirmante((prev) => ({
        ...prev,
        [firmanteActivo]: (prev[firmanteActivo] || []).filter((_, i) => i !== index),
      }));
    }
  };

  const handleSubmit = async () => {
    // Validar que haya al menos un empleado
    if (empleadosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un empleado');
      return;
    }

    // Validar firma de empresa si está activada
    if (incluirFirmaEmpresa) {
      if (posicionesFirmaEmpresa.length === 0) {
        toast.error('Coloca al menos una posición para la firma de empresa');
        return;
      }

      if (!firmaEmpresaGuardada) {
        const firmaDataURL = firmaEmpresaCanvasRef.current?.getDataURL();
        if (!firmaDataURL) {
          toast.error('Por favor dibuja la firma de empresa');
          return;
        }
      }
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

      // Convertir posiciones de firma de empresa a formato PDF
      const posicionesFirmaEmpresaConvertidas = posicionesFirmaEmpresa.map(pos => ({
        pagina: pos.page,
        x: (pos.x / 100) * PDF_WIDTH,
        y: PDF_HEIGHT - ((pos.y / 100) * PDF_HEIGHT) - ((pos.height / 100) * PDF_HEIGHT),
        width: (pos.width / 100) * PDF_WIDTH,
        height: (pos.height / 100) * PDF_HEIGHT,
      }));

      // Obtener firma de empresa si está activada
      let firmaEmpresaDataURL: string | null = null;
      if (incluirFirmaEmpresa) {
        if (firmaEmpresaGuardada) {
          firmaEmpresaDataURL = firmaEmpresaGuardada;
        } else {
          firmaEmpresaDataURL = firmaEmpresaCanvasRef.current?.getDataURL() || null;
        }
      }

      const resultados = await Promise.allSettled(
        empleadosSeleccionados.map(async (empleadoId) => {
          // Obtener posiciones convertidas de este firmante específico
          const posicionesFirmante = posicionesPorFirmanteConvertidas[empleadoId] || [];

          const body: any = {
            documentoId,
            firmantes: [{ empleadoId }], // Solo un firmante por solicitud
            ordenFirma: false,
            posicionesFirma: posicionesFirmante, // Array de posiciones
            mantenerOriginal, // Toggle para mantener o reemplazar el original
            incluirFirmaEmpresa, // Toggle para incluir firma de empresa
          };

          // Añadir firma de empresa si está activada
          if (incluirFirmaEmpresa && firmaEmpresaDataURL) {
            body.firmaEmpresaDataURL = firmaEmpresaDataURL;
            body.guardarFirmaEmpresa = guardarFirmaEmpresa;
            body.posicionesFirmaEmpresa = posicionesFirmaEmpresaConvertidas; // Posiciones específicas de firma empresa
          }

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
        router.push(getPostFirmaRedirect());
      } else if (exitosas > 0) {
        // Parcialmente exitosas
        toast.warning(
          `${exitosas} solicitudes creadas correctamente, ${fallidas} fallaron. Revisa las solicitudes creadas.`
        );
        router.push(getPostFirmaRedirect());
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
              onClick={() => router.push(getPostFirmaRedirect())}
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
            signaturePositions={
              firmanteActivo === FIRMA_EMPRESA_ID
                ? posicionesFirmaEmpresa
                : firmanteActivo
                  ? (posicionesPorFirmante[firmanteActivo] || [])
                  : []
            }
            signatureBoxColor={firmanteActivo === FIRMA_EMPRESA_ID ? 'purple' : 'blue'}
            onDocumentClick={handleAddSignature}
            onRemovePosition={handleRemoveSignature}
            signatureBoxWidth={SIGNATURE_RECT_WIDTH}
            signatureBoxHeight={SIGNATURE_RECT_HEIGHT}
          />
        </div>

        {/* Columna derecha - Panel de firmantes */}
        <div className="w-96 bg-white border-l flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Formulario de Solicitud */}
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
                {(empleadosSeleccionados.length > 0 || incluirFirmaEmpresa) && (
                  <div className="border-t pt-4">
                    <Label className="mb-2 block">Asignar posiciones de firma</Label>
                    <p className="text-xs text-gray-500 mb-3">
                      Selecciona un firmante para asignarle posiciones en el documento.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {/* Botones de empleados */}
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
                      const posicionesActual = firmanteActivo === FIRMA_EMPRESA_ID
                        ? posicionesFirmaEmpresa
                        : (posicionesPorFirmante[firmanteActivo] || []);

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
                                if (firmanteActivo === FIRMA_EMPRESA_ID) {
                                  setPosicionesFirmaEmpresa([]);
                                } else {
                                  setPosicionesPorFirmante((prev) => ({
                                    ...prev,
                                    [firmanteActivo]: [],
                                  }));
                                }
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
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="mantener-original" className="text-sm font-medium">
                          Mantener documento original
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                Si está activado, se crearán copias individuales del documento firmado para cada empleado.
                                Si está desactivado, el documento original será reemplazado con la versión firmada.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <Switch
                      id="mantener-original"
                      checked={mantenerOriginal}
                      onCheckedChange={setMantenerOriginal}
                      disabled={loading}
                    />
                  </div>

                  {/* Sección de firma de empresa */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="incluir-firma-empresa" className="text-sm font-medium">
                            Añadir firma de empresa
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">
                                  La firma de la empresa se añadirá al documento ANTES de enviarlo a los empleados.
                                  Los empleados verán el documento con la firma de la empresa ya aplicada.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <Switch
                        id="incluir-firma-empresa"
                        checked={incluirFirmaEmpresa}
                        onCheckedChange={(checked) => {
                          setIncluirFirmaEmpresa(checked);
                          // Si se desactiva, limpiar posiciones y firma
                          if (!checked) {
                            setPosicionesFirmaEmpresa([]);
                            if (firmanteActivo === FIRMA_EMPRESA_ID) {
                              setFirmanteActivo(null);
                            }
                          }
                        }}
                        disabled={loading}
                      />
                    </div>

                    {/* Sección de asignación de posiciones de firma empresa */}
                    {incluirFirmaEmpresa && (
                      <div className="mt-3 p-3 border border-purple-200 rounded-md bg-purple-50/50">
                        <Label className="text-sm font-medium mb-2 block text-purple-900">
                          Asignar posiciones de firma de empresa
                        </Label>
                        <p className="text-xs text-purple-700 mb-3">
                          Haz clic en el botón "Firma Empresa" y luego haz clic en el documento para colocar las posiciones.
                        </p>

                        {/* Botón para activar modo firma empresa */}
                        <div className="mb-3">
                          <Button
                            type="button"
                            variant={firmanteActivo === FIRMA_EMPRESA_ID ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFirmanteActivo(FIRMA_EMPRESA_ID)}
                            className="border-purple-300 text-purple-700 hover:bg-purple-50 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                          >
                            Firma Empresa
                            {posicionesFirmaEmpresa.length > 0 && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                                {posicionesFirmaEmpresa.length}
                              </span>
                            )}
                          </Button>
                        </div>

                        {/* Lista de posiciones colocadas */}
                        {posicionesFirmaEmpresa.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-purple-800">
                              Posiciones colocadas:
                            </p>
                            <div className="space-y-1">
                              {posicionesFirmaEmpresa.map((pos, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between text-xs bg-white rounded px-2 py-1.5 border border-purple-200"
                                >
                                  <span className="text-purple-700">
                                    Posición {index + 1} (Página {pos.page})
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-purple-600 hover:text-purple-800"
                                    onClick={() => {
                                      setPosicionesFirmaEmpresa((prev) => prev.filter((_, i) => i !== index));
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Canvas de firma de empresa cuando hay posiciones colocadas */}
                    {incluirFirmaEmpresa && posicionesFirmaEmpresa.length > 0 && (
                      <div className="space-y-3 mt-3">
                        <div className="p-3 bg-white border rounded-md">
                          <Label className="text-sm font-medium mb-2 block">Dibuja la firma de la empresa</Label>
                          <p className="text-xs text-gray-500 mb-3">
                            Esta firma aparecerá en {posicionesFirmaEmpresa.length} posición{posicionesFirmaEmpresa.length === 1 ? '' : 'es'} del documento.
                          </p>

                          {firmaEmpresaGuardada ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                                <span className="text-xs text-green-700">Firma guardada disponible</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setFirmaEmpresaGuardada(null);
                                    firmaEmpresaCanvasRef.current?.clear();
                                  }}
                                  className="h-6 text-xs"
                                >
                                  Cambiar firma
                                </Button>
                              </div>
                              <img
                                src={firmaEmpresaGuardada}
                                alt="Firma de empresa guardada"
                                className="border rounded p-2 bg-white max-h-20 mx-auto"
                              />
                            </div>
                          ) : (
                            <SignatureCanvas ref={firmaEmpresaCanvasRef} className="w-full" />
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="guardar-firma-empresa"
                            checked={guardarFirmaEmpresa}
                            onCheckedChange={(checked) => setGuardarFirmaEmpresa(Boolean(checked))}
                            disabled={loading}
                          />
                          <Label
                            htmlFor="guardar-firma-empresa"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Guardar como firma predeterminada de la empresa
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
