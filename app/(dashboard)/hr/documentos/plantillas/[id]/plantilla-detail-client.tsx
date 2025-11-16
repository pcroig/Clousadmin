'use client';

// ========================================
// Plantilla Detail Client - Vista de detalle de plantilla
// ========================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  CheckCircle2,
  FileText,
  Send,
  Loader2,
  AlertCircle,
  ArrowLeft,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import PizZip from 'pizzip';
import { VARIABLES_DISPONIBLES } from '@/lib/plantillas/constantes';

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  tipo: string;
  formato: string;
  esOficial: boolean;
  activa: boolean;
  requiereContrato: boolean;
  requiereFirma: boolean;
  carpetaDestinoDefault: string | null;
  variablesUsadas: string[];
  usarIAParaExtraer: boolean;
  configuracionIA: any;
  totalDocumentosGenerados: number;
  createdAt: string;
  updatedAt: string;
  documentosGenerados: any[];
}

interface PlantillaDetailClientProps {
  plantilla: Plantilla;
}

export function PlantillaDetailClient({ plantilla }: PlantillaDetailClientProps) {
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewRenderState, setPreviewRenderState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<Set<string>>(new Set());
  const [loadingEmpleados, setLoadingEmpleados] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [empleadoPreviewId, setEmpleadoPreviewId] = useState<string | null>(null);
  const [variablesConValor, setVariablesConValor] = useState<string[]>([]);
  const [variablesSinValor, setVariablesSinValor] = useState<string[]>([]);
  const [variablesValores, setVariablesValores] = useState<Record<string, string>>({});

  const variablesDetectadas = useMemo(
    () => (Array.isArray(plantilla.variablesUsadas) ? plantilla.variablesUsadas : []),
    [plantilla.variablesUsadas]
  );

  const definicionesVariables = useMemo(() => {
    const mapa = new Map<string, (typeof VARIABLES_DISPONIBLES)[number]>();
    VARIABLES_DISPONIBLES.forEach((def) => {
      if (!mapa.has(def.key)) {
        mapa.set(def.key, def);
      }
    });
    return mapa;
  }, []);

  const variablesAutoCompletadas = useMemo(
    () => Array.from(new Set(variablesConValor)),
    [variablesConValor]
  );

  const variablesSinDatos = useMemo(() => {
    if (variablesSinValor.length > 0) {
      return Array.from(new Set(variablesSinValor));
    }
    if (variablesDetectadas.length === 0) return [];
    return variablesDetectadas.filter((variable) => !variablesAutoCompletadas.includes(variable));
  }, [variablesSinValor, variablesDetectadas, variablesAutoCompletadas]);

  const renderDocxToHtml = async (
    buffer: ArrayBuffer,
    container: HTMLDivElement,
    options?: {
      autoFill?: Set<string>;
      missing?: Set<string>;
    }
  ) => {
    const zip = new PizZip(buffer);
    const documentXml = zip.file('word/document.xml')?.asText();
    if (!documentXml) {
      throw new Error('No se encontró el documento principal dentro del DOCX');
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(documentXml, 'application/xml');
    const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));
    const fragment = document.createDocumentFragment();

    let renderedParagraphs = 0;

    paragraphs.forEach((paragraph) => {
      const texts = Array.from(paragraph.getElementsByTagName('w:t'))
        .map((node) => node.textContent || '')
        .join('');

      if (!texts.trim()) {
        return;
      }

      const tokens = texts.split(/(\{\{[a-z_][a-z0-9_]*\}\})/gi);
      const p = document.createElement('p');
      p.className = 'text-sm text-gray-800 mb-2 leading-relaxed break-words';

      tokens.forEach((token) => {
        if (!token) {
          return;
        }

        const variableMatch = token.match(/^\{\{([a-z_][a-z0-9_]*)\}\}$/i);
        if (variableMatch) {
          const variableKey = variableMatch[1];
          const normalizedKey = variableKey.toLowerCase();
          const span = document.createElement('span');
          span.dataset.variable = normalizedKey;
          span.className =
            'inline-flex items-center px-1.5 py-0.5 mr-1 rounded border text-xs font-semibold font-mono';

          if (options?.autoFill?.has(normalizedKey)) {
            span.classList.add('bg-green-100', 'text-green-800', 'border-green-200');
            span.title = 'Campo soportado y rellenado automáticamente';
          } else if (options?.missing?.has(normalizedKey)) {
            span.classList.add('bg-amber-100', 'text-amber-800', 'border-amber-200');
            span.title = 'Campo sin datos en los modelos actuales';
          } else {
            span.classList.add('bg-blue-100', 'text-blue-800', 'border-blue-200');
            span.title = 'Campo personalizado o pendiente de mapear';
          }

          span.textContent = `{{${variableKey}}}`;
          p.appendChild(span);
          return;
        }

        p.appendChild(document.createTextNode(token));
      });

      fragment.appendChild(p);
      renderedParagraphs += 1;
    });

    if (renderedParagraphs === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-gray-500 italic';
      empty.textContent = 'No se pudo interpretar el contenido. Descarga el DOCX para revisarlo.';
      fragment.appendChild(empty);
    }

    container.appendChild(fragment);
  };

  useEffect(() => {
    setPreviewUrl(null);
    setPreviewRenderState('idle');
    setPreviewError(null);
    setVariablesConValor([]);
    setVariablesSinValor([]);
    setVariablesValores({});
    setEmpleadosSeleccionados(new Set());
    cargarDatosIniciales();
  }, [plantilla.id]);

  useEffect(() => {
    if (!previewUrl) return;
    if (typeof window === 'undefined') return;

    const controller = new AbortController();

    const renderPreview = async () => {
      try {
        setPreviewRenderState('loading');
        const res = await fetch(previewUrl, { signal: controller.signal });
        if (!res.ok) {
          throw new Error('No se pudo descargar la previsualización');
        }

        const buffer = await res.arrayBuffer();
        if (controller.signal.aborted) return;

        const container = previewContainerRef.current;
        if (!container) return;
        container.innerHTML = '';

        await renderDocxToHtml(buffer, container, {
          autoFill: new Set(variablesAutoCompletadas.map((value) => value.toLowerCase())),
          missing: new Set(variablesSinDatos.map((value) => value.toLowerCase())),
        });

        if (!controller.signal.aborted) {
          setPreviewRenderState('ready');
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('[DocxPreview] Error al renderizar DOCX:', error);
        setPreviewRenderState('error');
        setPreviewError('No se pudo renderizar la previsualización. Descarga el DOCX para revisarlo.');
      }
    };

    renderPreview();

    return () => {
      controller.abort();
    };
  }, [previewUrl, variablesAutoCompletadas, variablesSinDatos]);

  const normalizarRespuestaEmpleados = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.empleados)) return data.empleados;
    if (Array.isArray(data.data)) return data.data;
    return [];
  };

  const mapearEmpleado = (empleado: any) => ({
    id: empleado.id,
    nombre: empleado?.usuario?.nombre || empleado?.nombre || '',
    apellidos: empleado?.usuario?.apellidos || empleado?.apellidos || '',
    email: empleado?.usuario?.email || empleado?.email || '',
  });

  const cargarDatosIniciales = async () => {
    setLoadingEmpleados(true);
    setLoadingPreview(true);
    setPreviewRenderState('idle');
    setPreviewError(null);
    setPreviewUrl(null);
    setEmpleadoPreviewId(null);

    try {
      const res = await fetch('/api/empleados?activos=true');
      const data = await res.json();

      const listaEmpleados = normalizarRespuestaEmpleados(data).map(mapearEmpleado);
      setEmpleados(listaEmpleados);

      if (listaEmpleados.length > 0) {
        setEmpleadoPreviewId(listaEmpleados[0].id);
        await cargarPrevisualizacion(listaEmpleados[0].id);
      } else {
        setLoadingPreview(false);
        setPreviewRenderState('error');
        setPreviewError('Necesitas al menos un empleado activo para generar la previsualización.');
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
      setLoadingPreview(false);
      setPreviewRenderState('error');
      setPreviewError('No se pudieron cargar los empleados para la previsualización.');
    } finally {
      setLoadingEmpleados(false);
    }
  };

  const cargarPrevisualizacion = async (empleadoId: string) => {
    if (!empleadoId) return;

    try {
      setLoadingPreview(true);
      setPreviewRenderState('loading');
      setPreviewError(null);

      const res = await fetch(
        `/api/plantillas/${plantilla.id}/previsualizar?empleadoId=${empleadoId}`
      );
      const data = await res.json();

      if (data.success && data.previewUrl) {
        setPreviewUrl(data.previewUrl);
        const valores = data.variablesResueltas || {};
        setVariablesValores(valores);

        const conValor =
          data.variablesConValor ||
          Object.entries(valores)
            .filter(([, value]) => {
              if (value === null || value === undefined) return false;
              if (typeof value === 'string') return value.trim().length > 0;
              return String(value).trim().length > 0;
            })
            .map(([key]) => key);

        const sinValorBase =
          data.variablesSinValor ||
          data.variablesFaltantes ||
          variablesDetectadas.filter((variable) => !conValor.includes(variable));

        setVariablesConValor(Array.from(new Set(conValor)));
        setVariablesSinValor(
          Array.from(new Set(sinValorBase.length ? sinValorBase : []))
        );
      } else {
        setPreviewRenderState('error');
        setPreviewError(data.error || 'No se pudo generar la previsualización');
      }
    } catch (error) {
      console.error('Error cargando previsualización:', error);
      setPreviewRenderState('error');
      setPreviewError('No se pudo generar la previsualización');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleToggleEmpleado = (empleadoId: string) => {
    const nuevos = new Set(empleadosSeleccionados);
    if (nuevos.has(empleadoId)) {
      nuevos.delete(empleadoId);
    } else {
      nuevos.add(empleadoId);
    }
    setEmpleadosSeleccionados(nuevos);
  };

  const handleSeleccionarTodos = () => {
    if (empleadosSeleccionados.size === empleados.length) {
      setEmpleadosSeleccionados(new Set());
    } else {
      setEmpleadosSeleccionados(new Set(empleados.map((e) => e.id)));
    }
  };

  const handleGenerar = async () => {
    if (empleadosSeleccionados.size === 0) {
      toast.error('Selecciona al menos un empleado');
      return;
    }

    setGenerando(true);

    try {
      const res = await fetch(`/api/plantillas/${plantilla.id}/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleadoIds: Array.from(empleadosSeleccionados),
          configuracion: {
            requiereFirma: plantilla.requiereFirma,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          `Generación iniciada para ${empleadosSeleccionados.size} empleado(s). Se procesarán en segundo plano.`
        );
        setEmpleadosSeleccionados(new Set());
        router.refresh();
      } else {
        toast.error(data.error || 'Error al generar documentos');
      }
    } catch (error) {
      console.error('Error generando documentos:', error);
      toast.error('Error al generar documentos');
    } finally {
      setGenerando(false);
    }
  };

  const getVariableLabel = (variable: string) => {
    const definicion = definicionesVariables.get(variable);
    if (definicion) {
      return definicion.label;
    }

    return variable
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleRefrescarPrevisualizacion = () => {
    const objetivo = empleadoPreviewId || empleados[0]?.id;
    if (objetivo) {
      setEmpleadoPreviewId(objetivo);
      cargarPrevisualizacion(objetivo);
    }
  };

  const totalVariables = variablesDetectadas.length;
  const cobertura =
    totalVariables > 0 ? Math.round((variablesAutoCompletadas.length / totalVariables) * 100) : 0;

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/hr/documentos')}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Documentos
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-6 h-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">{plantilla.nombre}</h1>
              {plantilla.esOficial && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Oficial
                </Badge>
              )}
              {plantilla.requiereFirma && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Requiere firma
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {plantilla.totalDocumentosGenerados} documento(s) generado(s)
            </p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Left: Preview */}
        <div className="flex flex-col min-h-0">
          <div className="border rounded-lg overflow-hidden bg-white flex-1 flex flex-col">
            <div className="flex items-start justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Previsualización</p>
                <p className="text-xs text-gray-500">
                  Generada con los datos reales del empleado y la empresa para validar variables.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleRefrescarPrevisualizacion}>
                  Reprocesar
                </Button>
                {previewUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(previewUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar DOCX
                  </Button>
                )}
              </div>
            </div>

            <div className="relative flex-1 overflow-auto bg-gray-50">
              <div
                ref={previewContainerRef}
                className="docx-preview-wrapper min-h-[480px] w-full px-4 py-4"
              />

              {(loadingPreview || previewRenderState === 'loading') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 text-center gap-3">
                  <Spinner className="w-6 h-6 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Generando previsualización</p>
                    <p className="text-xs text-gray-500">
                      Renderizamos el DOCX con los datos reales para validar variables.
                    </p>
                  </div>
                </div>
              )}

              {previewRenderState === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 text-center gap-3 px-6">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">No se pudo previsualizar</p>
                    <p className="text-xs text-gray-600">
                      {previewError || 'Intenta reprocesar la previsualización.'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRefrescarPrevisualizacion}>
                    Reintentar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Cards */}
        <div className="flex flex-col gap-6 min-h-0">
          {/* Card: Generar */}
          <div className="border rounded-lg bg-white p-6 flex flex-col">
            <p className="text-sm text-gray-600 mb-4">
              Selecciona los empleados que recibirán el documento generado con las variables completadas automáticamente.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Generar para empleados</h3>
                {empleados.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSeleccionarTodos}
                    disabled={loadingEmpleados}
                  >
                    {empleadosSeleccionados.size === empleados.length ? 'Deseleccionar' : 'Seleccionar'} todos
                  </Button>
                )}
              </div>

              {/* Lista de empleados */}
              <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                {loadingEmpleados ? (
                  <div className="p-4 flex items-center justify-center">
                    <Spinner className="w-5 h-5 text-gray-400" />
                  </div>
                ) : empleados.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No hay empleados activos
                  </div>
                ) : (
                  <div className="divide-y">
                    {empleados.map((empleado) => (
                      <label
                        key={empleado.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={empleadosSeleccionados.has(empleado.id)}
                          onChange={() => handleToggleEmpleado(empleado.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {empleado.nombre} {empleado.apellidos}
                          </p>
                          <p className="text-xs text-gray-500">{empleado.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón generar */}
              <Button
                className="w-full"
                onClick={handleGenerar}
                disabled={empleadosSeleccionados.size === 0 || generando}
              >
                {generando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Generar para {empleadosSeleccionados.size} empleado(s)
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Card: Variables */}
          <div className="border rounded-lg bg-white p-6 flex flex-col min-h-0">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Cobertura de variables</h3>
                <span className="text-xs text-gray-500">
                  {variablesAutoCompletadas.length}/{totalVariables} auto-rellenas
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Identificamos qué campos se rellenan automáticamente con los datos del modelo
                (empleado, empresa, contrato) y cuáles seguirán vacíos si no se proporcionan.
              </p>
              {totalVariables > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Cobertura automática actual: <span className="font-semibold text-gray-900">{cobertura}%</span>
                </p>
              )}
            </div>

            {totalVariables === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-500 py-10 text-center">
                <AlertCircle className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-sm font-medium">No se detectaron variables en esta plantilla</p>
                <p className="text-xs">
                  Sube una versión con campos {'{{variable}}'} para automatizarla.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-6">
                <section>
                  <div className="flex items-start gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Se rellenan automáticamente</p>
                      <p className="text-xs text-gray-500">
                        Valores resueltos con IA a partir de los modelos de datos existentes.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-green-600">
                      {variablesAutoCompletadas.length}
                    </span>
                  </div>
                  {variablesAutoCompletadas.length > 0 ? (
                    <div className="space-y-2">
                      {variablesAutoCompletadas.map((variable) => {
                        const definicion = definicionesVariables.get(variable);
                        return (
                          <div
                            key={variable}
                            className="flex items-start gap-3 rounded-lg border border-green-100 bg-green-50/70 p-3"
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-1" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {getVariableLabel(variable)}
                              </p>
                              <p className="text-xs font-mono text-gray-600">
                                {'{{'}{variable}{'}}'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {definicion
                                  ? `Campo soportado (${definicion.categoria})`
                                  : 'Campo personalizado detectado por IA'}
                              </p>
                              {variablesValores[variable] && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                  Ejemplo: {String(variablesValores[variable])}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 pl-8">
                      Calculando cobertura… reprocesa la previsualización si ya actualizaste los datos.
                    </p>
                  )}
                </section>

                <section>
                  <div className="flex items-start gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Variables sin datos</p>
                      <p className="text-xs text-gray-500">
                        Permanecerán en blanco hasta que se añadan esos campos al modelo o se completen manualmente.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-amber-600">
                      {variablesSinDatos.length}
                    </span>
                  </div>
                  {variablesSinDatos.length > 0 ? (
                    <div className="space-y-2">
                      {variablesSinDatos.map((variable) => {
                        const definicion = definicionesVariables.get(variable);
                        return (
                          <div
                            key={variable}
                            className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-1" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {getVariableLabel(variable)}
                              </p>
                              <p className="text-xs font-mono text-gray-600">
                                {'{{'}{variable}{'}}'}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {definicion
                                  ? 'Campo soportado pero sin valor en el empleado seleccionado.'
                                  : 'Campo no mapeado en los modelos actuales. Añádelo a la ficha o mantenlo como manual.'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      Todas las variables se completan automáticamente con los datos actuales.
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
