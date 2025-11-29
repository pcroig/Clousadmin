'use client';

// ========================================
// Importar Empleados Excel - Componente Unificado
// ========================================
// Componente reutilizable para importación masiva de empleados desde Excel
// Usado en: Onboarding y HR/Organización/Añadir Personas
//
// FLUJO DE DOS FASES (con soporte para auto-confirmación):
// 1. Análisis: Procesa Excel con IA y muestra preview (NO guarda en BD)
// 2. Confirmación: Usuario confirma manualmente o se ejecuta automáticamente según el contexto
//
// @see docs/funcionalidades/importacion-empleados-excel.md

import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, FileText, Upload, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { parseJson } from '@/lib/utils/json';


interface EmpleadoDetectado {
  nombre: string | null;
  apellidos: string | null;
  email: string | null;
  nif: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  puesto: string | null;
  equipo: string | null;
  manager: string | null;
  fechaAlta: string | null;
  salarioBaseAnual: number | null;
  salarioBaseMensual: number | null;
  direccionCalle: string | null;
  direccionNumero: string | null;
  direccionPiso: string | null;
  ciudad: string | null;
  codigoPostal: string | null;
  direccionProvincia: string | null;
  valido: boolean;
  errores: string[];
}

interface PreviewData {
  empleados: EmpleadoDetectado[];
  equiposDetectados: string[];
  managersDetectados: string[];
  resumen: {
    total: number;
    validos: number;
    invalidos: number;
  };
}

interface EmpleadoImportado {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  puesto: string | null;
  equipo: string | null;
  fechaAlta: string | null;
  salarioBaseAnual: number | null;
  invitacionEnviada: boolean;
}

interface ResultadoImportacion {
  empleadosCreados: number;
  equiposCreados: number;
  puestosCreados: number;
  invitacionesEnviadas: number;
  errores: string[];
  empleadosImportados: EmpleadoImportado[];
}

type ResumenStat = {
  label: string;
  value: number;
  tone?: 'warning';
};

const buildResumenStats = (data: PreviewData | null): ResumenStat[] => {
  if (!data) {
    return [];
  }

  const stats: ResumenStat[] = [
    { label: 'Empleados detectados', value: data.resumen.total },
    { label: 'Listos para importar', value: data.resumen.validos },
  ];

  if (data.resumen.invalidos > 0) {
    stats.push({ label: 'Con errores', value: data.resumen.invalidos, tone: 'warning' });
  }

  if (data.equiposDetectados.length > 0) {
    stats.push({ label: 'Equipos detectados', value: data.equiposDetectados.length });
  }

  if (data.managersDetectados.length > 0) {
    stats.push({ label: 'Managers detectados', value: data.managersDetectados.length });
  }

  return stats;
};

interface ImportarEmpleadosExcelProps {
  /** Callback ejecutado después de una importación exitosa */
  onSuccess?: () => void;
  
  /** Callback para cancelar la operación */
  onCancel?: () => void;
  
  /** Mostrar notificaciones toast (true por defecto) */
  showToast?: boolean;
  
  /** Título personalizado */
  title?: string;
  
  /** Descripción personalizada */
  description?: string;
  
  /** Mostrar botón de cancelar (true si onCancel está definido) */
  showCancelButton?: boolean;
  
  /** Mostrar botón "Guardar y volver" después de importar (true por defecto si onSuccess definido) */
  showFinishButton?: boolean;

  /** Mostrar cabecera con título y descripción */
  showHeader?: boolean;

  /** Confirmar automáticamente tras procesar el Excel */
  autoConfirmAfterAnalysis?: boolean;
}

export function ImportarEmpleadosExcel({
  onSuccess,
  onCancel,
  showToast = true,
  title = 'Importar múltiples empleados',
  description = 'Sube un archivo Excel con los datos de múltiples empleados. La IA procesará automáticamente la estructura. La confirmación puede tardar entre 1 y 5 minutos dependiendo del volumen.',
  showCancelButton,
  showFinishButton,
  showHeader = true,
  autoConfirmAfterAnalysis = false,
}: ImportarEmpleadosExcelProps) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [resultadoImportacion, setResultadoImportacion] = useState<ResultadoImportacion | null>(null);
  const [invitarEmpleados, setInvitarEmpleados] = useState(true);
  const [error, setError] = useState('');
  const [empleadosExpandidos, setEmpleadosExpandidos] = useState<Set<string>>(new Set());
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumenStats = buildResumenStats(previewData);

  const shouldShowCancelButton = showCancelButton ?? (onCancel !== undefined);
  const shouldShowFinishButton = showFinishButton ?? (onSuccess !== undefined);
  const actionButtonsClass = shouldShowCancelButton
    ? 'flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between'
    : 'flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end';

  // Cargar empleados recientes (sin onboarding completado) al montar
  useEffect(() => {
    const loadEmpleados = async () => {
      // Solo cargar si autoConfirmAfterAnalysis está activo (modo onboarding)
      // y no hay resultado de importación ya
      if (!autoConfirmAfterAnalysis || resultadoImportacion) return;

      setCargandoEmpleados(true);
      try {
        const response = await fetch('/api/empleados?limit=100');
        if (response.ok) {
          const data = await parseJson<{
            data?: Array<{
              id: string;
              nombre: string;
              apellidos: string;
              email: string;
              puesto?: { id: string; nombre: string } | null;
              equipos?: Array<{ id: string; nombre: string }>;
              fechaAlta: string | null;
              salarioBaseAnual: number | null;
              onboardingCompletado: boolean;
              createdAt?: string;
            }>;
          }>(response);

          const empleados = data?.data ?? [];

          // Filtrar empleados sin onboarding completado (creados durante este flujo)
          const empleadosSinOnboarding = empleados.filter(
            (emp) => !emp.onboardingCompletado
          );

          if (empleadosSinOnboarding.length > 0) {
            // Transformar a formato ResultadoImportacion
            const resultado: ResultadoImportacion = {
              empleadosCreados: empleadosSinOnboarding.length,
              equiposCreados: 0, // No podemos calcularlo desde aquí
              puestosCreados: 0, // No podemos calcularlo desde aquí
              invitacionesEnviadas: 0, // No podemos saberlo
              errores: [],
              empleadosImportados: empleadosSinOnboarding.map((emp) => ({
                id: emp.id,
                nombre: emp.nombre,
                apellidos: emp.apellidos,
                email: emp.email,
                puesto: emp.puesto?.nombre ?? null,
                equipo: emp.equipos?.[0]?.nombre ?? null,
                fechaAlta: emp.fechaAlta,
                salarioBaseAnual: emp.salarioBaseAnual,
                invitacionEnviada: false, // Asumir que no sabemos
              })),
            };

            setResultadoImportacion(resultado);
          }
        }
      } catch (err) {
        console.error('Error cargando empleados:', err);
        // No mostrar error, simplemente dejar vacío
      } finally {
        setCargandoEmpleados(false);
      }
    };

    loadEmpleados();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setPreviewData(null);
      setResultadoImportacion(null);
      setError('');
    }
  };

  // PASO 1: Analizar archivo y mostrar preview (NO guarda en BD)
  const handleAnalizarArchivo = async () => {
    if (!archivo) return;

    setError('');
    setAnalizando(true);

    try {
      const formData = new FormData();
      formData.append('file', archivo);

      const analyzeResponse = await fetch('/api/empleados/importar-excel', {
        method: 'POST',
        body: formData,
      });

      const analyzeResult = await parseJson<{
        success?: boolean;
        error?: string;
        data?: {
          empleados: EmpleadoDetectado[];
          equiposDetectados: string[];
          managersDetectados?: string[];
          resumen: PreviewData['resumen'];
        };
      }>(analyzeResponse);

      if (!analyzeResponse.ok || !analyzeResult?.success || !analyzeResult.data) {
        setError(analyzeResult?.error || 'Error al analizar el archivo');
        if (showToast) toast.error('Error al analizar el archivo');
        return;
      }

      // Guardar datos para preview
      const previewPayload: PreviewData = {
        empleados: analyzeResult.data.empleados,
        equiposDetectados: analyzeResult.data.equiposDetectados,
        managersDetectados: analyzeResult.data.managersDetectados || [],
        resumen: analyzeResult.data.resumen,
      };

      setPreviewData(previewPayload);

      if (showToast) {
        toast.success('Archivo procesado correctamente');
      }

      if (autoConfirmAfterAnalysis && previewPayload.resumen.validos > 0) {
        setAnalizando(false);
        await handleConfirmarImportacion(previewPayload);
        return;
      }
    } catch (err) {
      setError('Error al procesar el archivo');
      if (showToast) toast.error('Error al procesar el archivo');
      console.error('Error:', err);
    } finally {
      setAnalizando(false);
    }
  };

  // PASO 2: Confirmar y guardar en BD
  const handleConfirmarImportacion = async (dataOverride?: PreviewData) => {
    const data = dataOverride ?? previewData;
    if (!data) return;

    setError('');
    setConfirmando(true);

    try {
      const importResponse = await fetch('/api/empleados/importar-excel/confirmar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empleados: data.empleados,
          equiposDetectados: data.equiposDetectados,
          managersDetectados: data.managersDetectados,
          invitarEmpleados,
        }),
      });

      const importResult = await parseJson<{
        success?: boolean;
        error?: string;
        data?: ResultadoImportacion;
      }>(importResponse);

      if (importResponse.ok && importResult.success) {
        setResultadoImportacion(importResult.data ?? null);
        setPreviewData(null); // Limpiar preview
        if (showToast) {
          toast.success('Importación completada');
        }
        
        // Limpiar archivo
        setArchivo(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const message = importResult.error || 'Error al importar empleados';
        setError(message);
        if (showToast) toast.error('Error al importar empleados');
      }
    } catch (err) {
      setError('Error al procesar la importación');
      if (showToast) toast.error('Error al procesar la importación');
      console.error('Error:', err);
    } finally {
      setConfirmando(false);
    }
  };

  const toggleEmpleadoExpandido = (empleadoId: string) => {
    setEmpleadosExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(empleadoId)) {
        next.delete(empleadoId);
      } else {
        next.add(empleadoId);
      }
      return next;
    });
  };

  const handleReiniciar = () => {
    setPreviewData(null);
    setResultadoImportacion(null);
    setArchivo(null);
    setError('');
    setEmpleadosExpandidos(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelarPreview = () => {
    setPreviewData(null);
    setArchivo(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFinalizar = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {showHeader && (
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <Checkbox
          id="invitar-empleados"
          checked={invitarEmpleados}
          onCheckedChange={(checked) => setInvitarEmpleados(Boolean(checked))}
        />
        <Label htmlFor="invitar-empleados" className="cursor-pointer text-sm text-gray-700">
          Enviar invitaciones automáticamente a todos los empleados importados
        </Label>
      </div>

      {/* Loader durante análisis */}
      {analizando && (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-8 text-center">
            <Spinner className="mx-auto size-12 text-primary" />
            <p className="mt-4 text-lg font-medium text-primary">
              Analizando archivo...
            </p>
            <p className="mt-2 text-sm text-gray-600">
              La IA está procesando el Excel y detectando empleados, equipos y puestos.
            </p>
          </div>
        </div>
      )}

      {/* Loader durante confirmación */}
      {confirmando && (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-8 text-center">
            <Spinner className="mx-auto size-12 text-primary" />
            <p className="mt-4 text-lg font-medium text-primary">
              Guardando empleados...
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Estamos creando cuentas, asignando equipos y enviando invitaciones.
            </p>
          </div>
        </div>
      )}

      {/* Preview de datos analizados (antes de guardar) */}
      {!analizando && !confirmando && previewData && !resultadoImportacion && (
        <div className="space-y-4">
          {/* Resumen del análisis */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Resumen de la importación</h4>
                <p className="text-sm text-gray-500">
                  Datos detectados durante el análisis del archivo.
                </p>
              </div>
              <span className="text-xs font-medium text-gray-500">
                Último análisis: {new Date().toLocaleTimeString('es-ES')}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {resumenStats.length > 0 ? (
                resumenStats.map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-lg border px-3 py-3 ${
                      stat.tone === 'warning'
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                    <p
                      className={`text-2xl font-semibold ${
                        stat.tone === 'warning' ? 'text-amber-600' : 'text-gray-900'
                      }`}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-gray-500">
                  No hay datos para mostrar todavía.
                </div>
              )}
            </div>

            {previewData.equiposDetectados.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Equipos detectados
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {previewData.equiposDetectados.map((equipo, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-gray-700"
                    >
                      {equipo}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lista de empleados válidos (colapsados) */}
          {previewData.empleados.filter(e => e.valido).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Empleados a importar ({previewData.empleados.filter(e => e.valido).length})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {previewData.empleados.filter(e => e.valido).map((emp, idx) => {
                  const empleadoKey = `${emp.email}-${idx}`;
                  const expandido = empleadosExpandidos.has(empleadoKey);
                  return (
                    <div
                      key={empleadoKey}
                      className="rounded-lg border bg-white hover:border-gray-400 transition-colors"
                    >
                      <button
                        onClick={() => toggleEmpleadoExpandido(empleadoKey)}
                        className="w-full p-3 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {emp.nombre} {emp.apellidos}
                            </p>
                            <p className="text-xs text-gray-600">{emp.email}</p>
                          </div>
                        </div>
                        {expandido ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      {expandido && (
                        <div className="px-3 pb-3 pt-0 space-y-2 border-t bg-gray-50">
                          <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                            {emp.puesto && (
                              <div>
                                <span className="text-gray-500">Puesto:</span>
                                <span className="ml-1 text-gray-900">{emp.puesto}</span>
                              </div>
                            )}
                            {emp.equipo && (
                              <div>
                                <span className="text-gray-500">Equipo:</span>
                                <span className="ml-1 text-gray-900">{emp.equipo}</span>
                              </div>
                            )}
                            {emp.fechaAlta && (
                              <div>
                                <span className="text-gray-500">Fecha de alta:</span>
                                <span className="ml-1 text-gray-900">
                                  {new Date(emp.fechaAlta).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            )}
                            {emp.salarioBaseAnual && (
                              <div>
                                <span className="text-gray-500">Salario anual:</span>
                                <span className="ml-1 text-gray-900">
                                  {emp.salarioBaseAnual.toLocaleString('es-ES')}€
                                </span>
                              </div>
                            )}
                            {emp.nif && (
                              <div>
                                <span className="text-gray-500">NIF:</span>
                                <span className="ml-1 text-gray-900">{emp.nif}</span>
                              </div>
                            )}
                            {emp.telefono && (
                              <div>
                                <span className="text-gray-500">Teléfono:</span>
                                <span className="ml-1 text-gray-900">{emp.telefono}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista de empleados inválidos */}
          {previewData.empleados.filter(e => !e.valido).length > 0 && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-900 text-sm">
                    Empleados con errores ({previewData.empleados.filter(e => !e.valido).length})
                  </h4>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {previewData.empleados.filter(e => !e.valido).map((emp, idx) => (
                      <div key={idx} className="text-xs text-yellow-800">
                        <p className="font-medium">{emp.email || 'Sin email'}</p>
                        <ul className="list-disc list-inside ml-2">
                          {emp.errores.map((error, errorIdx) => (
                            <li key={errorIdx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botones de confirmación */}
          <div className={actionButtonsClass}>
            {shouldShowCancelButton && (
              <Button variant="outline" onClick={handleCancelarPreview}>
                Cancelar
              </Button>
            )}

            <Button
              onClick={() => handleConfirmarImportacion()}
              disabled={previewData.resumen.validos === 0}
              className="bg-primary hover:bg-primary/90"
            >
              Confirmar e importar {previewData.resumen.validos} empleados
            </Button>
          </div>
        </div>
      )}

      {/* Resultado de importación - Empleados colapsados */}
      {!analizando && !confirmando && !previewData && resultadoImportacion && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-900">Importación completada</h4>
                <div className="mt-2 space-y-1 text-sm text-green-800">
                  <p>✓ {resultadoImportacion.empleadosCreados} empleados creados</p>
                  <p>✓ {resultadoImportacion.equiposCreados} equipos creados</p>
                  <p>✓ {resultadoImportacion.puestosCreados} puestos creados</p>
                  <p>✓ {resultadoImportacion.invitacionesEnviadas} invitaciones enviadas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Errores si hay */}
          {resultadoImportacion.errores.length > 0 && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-900 text-sm">Algunos empleados no se pudieron importar:</h4>
                  <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-yellow-800">
                    {resultadoImportacion.errores.slice(0, 5).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {resultadoImportacion.errores.length > 5 && (
                      <li>Y {resultadoImportacion.errores.length - 5} errores más...</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Lista de empleados importados (colapsados) */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Empleados importados ({resultadoImportacion.empleadosImportados.length})
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {resultadoImportacion.empleadosImportados.map((emp) => {
                const expandido = empleadosExpandidos.has(emp.id);
                return (
                  <div
                    key={emp.id}
                    className="rounded-lg border bg-white hover:border-gray-400 transition-colors"
                  >
                    <button
                      onClick={() => toggleEmpleadoExpandido(emp.id)}
                      className="w-full p-3 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {emp.nombre} {emp.apellidos}
                          </p>
                          <p className="text-xs text-gray-600">{emp.email}</p>
                        </div>
                      </div>
                      {expandido ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    {expandido && (
                      <div className="px-3 pb-3 pt-0 space-y-2 border-t bg-gray-50">
                        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                          {emp.puesto && (
                            <div>
                              <span className="text-gray-500">Puesto:</span>
                              <span className="ml-1 text-gray-900">{emp.puesto}</span>
                            </div>
                          )}
                          {emp.equipo && (
                            <div>
                              <span className="text-gray-500">Equipo:</span>
                              <span className="ml-1 text-gray-900">{emp.equipo}</span>
                            </div>
                          )}
                          {emp.fechaAlta && (
                            <div>
                              <span className="text-gray-500">Fecha de alta:</span>
                              <span className="ml-1 text-gray-900">
                                {new Date(emp.fechaAlta).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                          )}
                          {emp.salarioBaseAnual && (
                            <div>
                              <span className="text-gray-500">Salario anual:</span>
                              <span className="ml-1 text-gray-900">
                                {emp.salarioBaseAnual.toLocaleString('es-ES')}€
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="pt-1">
                          {emp.invitacionEnviada ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                              <CheckCircle className="h-3 w-3" />
                              Invitación enviada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              <XCircle className="h-3 w-3" />
                              Sin invitación
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botones de acción después de importar */}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={handleReiniciar}>
              Importar más empleados
            </Button>
            
            {shouldShowFinishButton && (
              <div className="flex gap-2 sm:justify-end">
                {shouldShowCancelButton && onCancel && (
                  <Button variant="ghost" onClick={onCancel}>
                    Cancelar
                  </Button>
                )}
                <Button onClick={handleFinalizar}>Guardar y volver</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Área de carga de archivo (solo si no hay resultado ni preview) */}
      {!analizando && !confirmando && !previewData && !resultadoImportacion && (
        <div className="space-y-4">
          <div
            className="rounded-lg border-2 border-dashed p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm font-medium">
              {archivo ? archivo.name : 'Arrastra un archivo o haz clic para seleccionar'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Formatos soportados: .xlsx, .xls, .csv
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {archivo && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{archivo.name}</p>
                  <p className="text-xs text-gray-500">
                    {(archivo.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button onClick={handleAnalizarArchivo} disabled={analizando}>
                {analizando ? 'Analizando...' : 'Analizar archivo'}
              </Button>
            </div>
          )}

          {/* Botón cancelar (solo si está al inicio) */}
          {shouldShowCancelButton && onCancel && (
            <div className="flex justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Mensajes de error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Información adicional */}
      {!archivo && !previewData && !resultadoImportacion && (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            <strong>💡 Tip:</strong> El Excel puede tener cualquier estructura. La IA detectará automáticamente las columnas y mapeará los datos correctamente.
          </p>
        </div>
      )}
    </div>
  );
}

