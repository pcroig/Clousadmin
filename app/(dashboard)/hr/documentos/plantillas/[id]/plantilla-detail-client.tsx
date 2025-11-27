'use client';

// ========================================
// Plantilla Detail Client - Vista de detalle de plantilla
// ========================================

import { Prisma } from '@prisma/client';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Send,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { VARIABLES_DISPONIBLES } from '@/lib/plantillas/constantes';


interface ConfiguracionIA {
  esHibrida?: boolean;
  variablesAResolver?: string[];
  camposADejar?: string[];
  configuradoEn?: string;
  [key: string]: unknown;
}

interface DocumentoGeneradoResumen {
  id: string;
  empleadoNombre: string;
  documentoId: string | null;
  generadoEn: string;
  firmado: boolean;
  requiereFirma: boolean;
  variablesUtilizadas?: string[];
  usadaIA?: boolean;
  notificado?: boolean;
}

interface EmpleadoResumen {
  id: string;
  nombre?: string;
  apellidos?: string;
  email?: string;
  usuario?: {
    nombre?: string;
    apellidos?: string;
    email?: string;
  };
}

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
  configuracionIA: ConfiguracionIA | Prisma.JsonValue | null;
  totalDocumentosGenerados: number;
  createdAt: string;
  updatedAt: string;
  documentosGenerados: DocumentoGeneradoResumen[];
}

interface PlantillaDetailClientProps {
  plantilla: Plantilla;
}

export function PlantillaDetailClient({ plantilla }: PlantillaDetailClientProps) {
  const router = useRouter();
  const [previewNonce, setPreviewNonce] = useState(() => Date.now());
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(true);
  const [empleados, setEmpleados] = useState<Array<{ id: string; nombre: string; apellidos: string; email: string }>>([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<Set<string>>(new Set());
  const [loadingEmpleados, setLoadingEmpleados] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [empleadoPreviewId, setEmpleadoPreviewId] = useState<string>('');
  const [variablesConValor, setVariablesConValor] = useState<string[]>([]);
  const [variablesSinValor, setVariablesSinValor] = useState<string[]>([]);
  const [variablesValores, setVariablesValores] = useState<Record<string, string>>({});
  const [analizandoVariables, setAnalizandoVariables] = useState(false);
  const [ultimoAnalisisEmpleado, setUltimoAnalisisEmpleado] = useState<string | null>(null);

  const previewFrameUrl = useMemo(
    () => `/api/plantillas/${plantilla.id}/preview?ts=${previewNonce}`,
    [plantilla.id, previewNonce]
  );

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

  const analizarVariablesParaEmpleado = useCallback(
    async (empleadoId: string) => {
      setEmpleadoPreviewId(empleadoId);
      setAnalizandoVariables(true);
      try {
        const res = await fetch(`/api/plantillas/${plantilla.id}/previsualizar?empleadoId=${empleadoId}`);
        const data = await res.json() as Record<string, unknown>;

        if (!res.ok || !data.success) {
          throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo analizar la plantilla');
        }

        const valores =
          typeof data.variablesResueltas === 'object' && data.variablesResueltas !== null
            ? (data.variablesResueltas as Record<string, string>)
            : {};
        setVariablesValores(valores);

        const conValor = Array.isArray(data.variablesConValor)
          ? (data.variablesConValor as string[])
          : Object.entries(valores)
              .filter(([, value]) => {
                if (value === null || value === undefined) return false;
                if (typeof value === 'string') return value.trim().length > 0;
                return String(value).trim().length > 0;
              })
              .map(([key]) => key);

        const sinValorBase = Array.isArray(data.variablesSinValor)
          ? (data.variablesSinValor as string[])
          : Array.isArray(data.variablesFaltantes)
            ? (data.variablesFaltantes as string[])
            : variablesDetectadas.filter((variable) => !conValor.includes(variable));

        setVariablesConValor(Array.from(new Set(conValor)));
        setVariablesSinValor(Array.from(new Set(sinValorBase)));
        setUltimoAnalisisEmpleado(empleadoId);
        toast.success('Análisis actualizado con los datos del empleado seleccionado.');
      } catch (error) {
        console.error('Error analizando variables:', error);
        toast.error(
          error instanceof Error ? error.message : 'No se pudo analizar la plantilla con ese empleado'
        );
      } finally {
        setAnalizandoVariables(false);
      }
    },
    [plantilla.id, variablesDetectadas]
  );

  const normalizarRespuestaEmpleados = (data: unknown): EmpleadoResumen[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data as EmpleadoResumen[];
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.empleados)) return obj.empleados as EmpleadoResumen[];
      if (Array.isArray(obj.data)) return obj.data as EmpleadoResumen[];
    }
    return [];
  };

  const mapearEmpleado = (empleado: EmpleadoResumen): { id: string; nombre: string; apellidos: string; email: string } => ({
    id: empleado.id,
    nombre: empleado?.usuario?.nombre || empleado?.nombre || '',
    apellidos: empleado?.usuario?.apellidos || empleado?.apellidos || '',
    email: empleado?.usuario?.email || empleado?.email || '',
  });

  const cargarDatosIniciales = useCallback(async () => {
    setLoadingEmpleados(true);
    try {
      const res = await fetch('/api/empleados?activos=true');
      const data = await res.json() as Record<string, unknown>;
      const listaEmpleados = normalizarRespuestaEmpleados(data).map(mapearEmpleado);
      setEmpleados(listaEmpleados);
      if (listaEmpleados.length > 0) {
        setEmpleadoPreviewId(listaEmpleados[0].id);
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
      toast.error('No se pudieron cargar los empleados para generar documentos.');
    } finally {
      setLoadingEmpleados(false);
    }
  }, []);

  useEffect(() => {
    setPreviewError(null);
    setViewerLoading(true);
    setPreviewNonce(Date.now());
    setVariablesConValor([]);
    setVariablesSinValor([]);
    setVariablesValores({});
    setEmpleadosSeleccionados(new Set());
    setUltimoAnalisisEmpleado(null);
    setEmpleadoPreviewId('');
    cargarDatosIniciales();
  }, [plantilla.id, cargarDatosIniciales]);

  const handleToggleEmpleado = (empleadoId: string) => {
    const nuevos = new Set(empleadosSeleccionados);
    if (nuevos.has(empleadoId)) {
      nuevos.delete(empleadoId);
    } else {
      nuevos.add(empleadoId);
    }
    setEmpleadosSeleccionados(nuevos);
  };

  const handleRefreshPreview = useCallback(() => {
    setPreviewError(null);
    setViewerLoading(true);
    setPreviewNonce(Date.now());
  }, []);

  const handleSeleccionarTodos = () => {
    if (empleadosSeleccionados.size === empleados.length) {
      setEmpleadosSeleccionados(new Set());
    } else {
      setEmpleadosSeleccionados(new Set(empleados.map((e) => e.id)));
    }
  };

  const handleAnalizarVariables = useCallback(() => {
    if (!empleadoPreviewId) {
      toast.error('Selecciona un empleado para analizar las variables.');
      return;
    }
    void analizarVariablesParaEmpleado(empleadoPreviewId);
  }, [analizarVariablesParaEmpleado, empleadoPreviewId]);

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

      const data = await res.json() as Record<string, unknown>;

      if (data.success) {
        toast.success(
          `Generación iniciada para ${empleadosSeleccionados.size} empleado(s). Se procesarán en segundo plano.`
        );
        setEmpleadosSeleccionados(new Set());
        router.refresh();
      } else {
        toast.error(typeof data.error === 'string' ? data.error : 'Error al generar documentos');
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
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Previsualización</p>
                <p className="text-xs text-gray-500">
                  Generada con los datos reales del empleado y la empresa para validar variables.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button variant="outline" size="sm" onClick={handleRefreshPreview} disabled={viewerLoading}>
                  Refrescar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewFrameUrl, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden bg-gray-50">
              <iframe
                key={previewFrameUrl}
                src={previewFrameUrl}
                className="h-full w-full border-0 bg-white"
                title="Previsualización de la plantilla"
                onLoad={() => setViewerLoading(false)}
                onError={() => {
                  setViewerLoading(false);
                  setPreviewError('No se pudo cargar la vista previa del documento.');
                }}
              />

              {viewerLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 text-center gap-3">
                  <Spinner className="w-6 h-6 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Procesando documento</p>
                    <p className="text-xs text-gray-500">Esto puede tardar unos segundos.</p>
                  </div>
                </div>
              )}

              {previewError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 text-center gap-3 px-6">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">No se pudo previsualizar</p>
                    <p className="text-xs text-gray-600">{previewError}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRefreshPreview}>
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

            <div className="mb-6 space-y-2">
              <Label className="text-xs text-gray-500">Analizar variables con datos reales (opcional)</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={empleadoPreviewId}
                  onValueChange={setEmpleadoPreviewId}
                  disabled={loadingEmpleados}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecciona un empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados.map((empleado) => (
                      <SelectItem key={empleado.id} value={empleado.id}>
                        {empleado.nombre} {empleado.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalizarVariables}
                  disabled={analizandoVariables || !empleadoPreviewId}
                >
                  {analizandoVariables ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    'Analizar variables'
                  )}
                </Button>
              </div>
              {ultimoAnalisisEmpleado && (
                <p className="text-xs text-gray-500">
                  Último análisis realizado con{' '}
                  {(() => {
                    const empleado = empleados.find((emp) => emp.id === ultimoAnalisisEmpleado);
                    return empleado ? `${empleado.nombre} ${empleado.apellidos}` : 'el empleado seleccionado';
                  })()}
                  .
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
