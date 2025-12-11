'use client';

// ========================================
// Importar Empleados Excel - Componente Unificado
// ========================================
// Componente reutilizable para importación masiva de empleados desde Excel
// Usado en: Onboarding y HR/Organización/Añadir Personas
//
// FLUJO SIMPLIFICADO (auto-importación):
// 1. Análisis y guardado: Procesa Excel con IA y guarda automáticamente en BD
// 2. Resultado: Muestra resumen de empleados importados con opción de importar más
//
// @see docs/funcionalidades/importacion-empleados-excel.md

import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, FileText, Upload, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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

// Datos procesados del Excel antes de guardar en BD
interface DatosAnalisisExcel {
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
}

export function ImportarEmpleadosExcel({
  onSuccess,
  onCancel,
  showToast = true,
  title = 'Importar múltiples empleados',
  description = 'Sube un archivo Excel con los datos que tengas; la IA detecta la estructura y mapea las columnas automáticamente.',
  showCancelButton,
  showFinishButton,
  showHeader = true,
}: ImportarEmpleadosExcelProps) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resultadoImportacion, setResultadoImportacion] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState('');
  const [empleadosExpandidos, setEmpleadosExpandidos] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shouldShowCancelButton = showCancelButton ?? (onCancel !== undefined);
  const shouldShowFinishButton = showFinishButton ?? (onSuccess !== undefined);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setResultadoImportacion(null);
      setError('');
    }
  };

  // Analizar archivo y auto-importar directamente (sin paso intermedio de confirmación)
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
          resumen: {
            total: number;
            validos: number;
            invalidos: number;
          };
        };
      }>(analyzeResponse);

      if (!analyzeResponse.ok || !analyzeResult?.success || !analyzeResult.data) {
        setError(analyzeResult?.error || 'Error al analizar el archivo');
        if (showToast) toast.error('Error al analizar el archivo');
        return;
      }

      // Guardar datos del análisis
      const datosAnalisis: DatosAnalisisExcel = {
        empleados: analyzeResult.data.empleados,
        equiposDetectados: analyzeResult.data.equiposDetectados,
        managersDetectados: analyzeResult.data.managersDetectados || [],
        resumen: analyzeResult.data.resumen,
      };

      // Guardar directamente sin paso intermedio de confirmación
      setAnalizando(false);
      await handleConfirmarImportacion(datosAnalisis);
    } catch (err) {
      setError('Error al procesar el archivo');
      if (showToast) toast.error('Error al procesar el archivo');
      console.error('Error:', err);
      setAnalizando(false);
    }
  };

  // Guardar empleados en BD
  const handleConfirmarImportacion = async (data: DatosAnalisisExcel) => {
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
        }),
      });

      const importResult = await parseJson<{
        success?: boolean;
        error?: string;
        data?: ResultadoImportacion;
      }>(importResponse);

      if (importResponse.ok && importResult.success) {
        setResultadoImportacion(importResult.data ?? null);
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
    setResultadoImportacion(null);
    setArchivo(null);
    setError('');
    setEmpleadosExpandidos(new Set());
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

      {/* Loader durante confirmación (prioridad sobre análisis) */}
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
            <p className="text-xs text-gray-500">
              La confirmación puede tardar 1-5 minutos según el volumen del archivo.
            </p>
          </div>
        </div>
      )}

      {/* Loader durante análisis */}
      {!confirmando && analizando && (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-8 text-center">
            <Spinner className="mx-auto size-12 text-primary" />
            <p className="mt-4 text-lg font-medium text-primary">
              Analizando archivo...
            </p>
            <p className="mt-2 text-sm text-gray-600">
              La IA está procesando el Excel y detectando empleados, equipos y puestos.
            </p>
            <p className="text-xs text-gray-500">
              La confirmación puede tardar 1-5 minutos según el volumen del archivo.
            </p>
          </div>
        </div>
      )}

      {/* ELIMINADO: Paso intermedio de preview con botón "Confirmar e importar X empleados"
          Ahora el flujo es directo: Analizar → Auto-importar → Resultado */}

      {/* Resultado de importación - Empleados colapsados */}
      {!analizando && !confirmando && resultadoImportacion && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <FileText className="h-6 w-6 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-base font-semibold text-gray-900">Importación completada</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Estamos sincronizando los nuevos registros y enviando las invitaciones automáticamente.
                </p>
                <dl className="mt-4 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-500">Empleados creados</dt>
                    <dd className="font-medium text-gray-900">{resultadoImportacion.empleadosCreados}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-500">Equipos creados</dt>
                    <dd className="font-medium text-gray-900">{resultadoImportacion.equiposCreados}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-500">Puestos creados</dt>
                    <dd className="font-medium text-gray-900">{resultadoImportacion.puestosCreados}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-500">Invitaciones enviadas</dt>
                    <dd className="font-medium text-gray-900">{resultadoImportacion.invitacionesEnviadas}</dd>
                  </div>
                </dl>
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
              <Button onClick={handleFinalizar}>
                Guardar y volver
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Área de carga de archivo (solo si no hay resultado) */}
      {!analizando && !confirmando && !resultadoImportacion && (
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

    </div>
  );
}

