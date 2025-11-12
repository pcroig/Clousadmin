'use client';

// ========================================
// Importar Empleados Excel - Componente Unificado
// ========================================
// Componente reutilizable para importación masiva de empleados desde Excel
// Usado en: Onboarding y HR/Organización/Añadir Personas

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface EmpleadoImportado {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  puesto: string | null;
  equipo: string | null;
  fechaAlta: string | null;
  salarioBrutoAnual: number | null;
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
}

export function ImportarEmpleadosExcel({
  onSuccess,
  onCancel,
  showToast = true,
  title = 'Importar múltiples empleados',
  description = 'Sube un archivo Excel con los datos de múltiples empleados. La IA procesará automáticamente la estructura.',
  showCancelButton,
  showFinishButton,
}: ImportarEmpleadosExcelProps) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultadoImportacion, setResultadoImportacion] = useState<ResultadoImportacion | null>(null);
  const [invitarEmpleados, setInvitarEmpleados] = useState(true);
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

  const handleImportarDirecto = async () => {
    if (!archivo) return;

    setError('');
    setImportando(true);

    try {
      // PASO 1: Analizar archivo con IA
      const formData = new FormData();
      formData.append('file', archivo);

      const analyzeResponse = await fetch('/api/empleados/importar-excel', {
        method: 'POST',
        body: formData,
      });

      const analyzeResult = await analyzeResponse.json();

      if (!analyzeResult.success) {
        setError(analyzeResult.error || 'Error al analizar el archivo');
        if (showToast) toast.error('Error al analizar el archivo');
        setImportando(false);
        return;
      }

      // PASO 2: Importar directamente (sin preview intermedio)
      const { empleados, equiposDetectados } = analyzeResult.data;
      
      const importResponse = await fetch('/api/empleados/importar-excel/confirmar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empleados,
          equiposDetectados,
          managersDetectados: [],
          invitarEmpleados,
        }),
      });

      const importResult = await importResponse.json();

      if (importResult.success) {
        setResultadoImportacion(importResult.data);
        if (showToast) {
          toast.success('Importación completada');
        }
        
        // Limpiar archivo
        setArchivo(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(importResult.error || 'Error al importar empleados');
        if (showToast) toast.error('Error al importar empleados');
      }
    } catch (err) {
      setError('Error al procesar la importación');
      if (showToast) toast.error('Error al procesar la importación');
      console.error('Error:', err);
    } finally {
      setImportando(false);
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
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      {/* Loader durante importación */}
      {importando && (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-8 text-center">
            <Spinner className="mx-auto size-12 text-primary" />
            <p className="mt-4 text-lg font-medium text-primary">
              Procesando empleados...
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Estamos analizando el archivo, creando cuentas, asignando equipos y enviando invitaciones.
            </p>
          </div>
        </div>
      )}

      {/* Resultado de importación - Empleados colapsados */}
      {!importando && resultadoImportacion && (
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
                          {emp.salarioBrutoAnual && (
                            <div>
                              <span className="text-gray-500">Salario anual:</span>
                              <span className="ml-1 text-gray-900">
                                {emp.salarioBrutoAnual.toLocaleString('es-ES')}€
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

      {/* Área de carga de archivo (solo si no hay resultado) */}
      {!importando && !resultadoImportacion && (
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
              <Button onClick={handleImportarDirecto} disabled={importando}>
                {importando ? 'Importando...' : 'Importar empleados'}
              </Button>
            </div>
          )}

          {/* Opción de invitar */}
          {archivo && (
            <div className="flex items-center space-x-2 rounded-lg border p-4">
              <Checkbox
                id="invitar"
                checked={invitarEmpleados}
                onCheckedChange={(checked) => setInvitarEmpleados(checked as boolean)}
              />
              <Label htmlFor="invitar" className="text-sm cursor-pointer">
                Enviar invitaciones automáticamente a todos los empleados
              </Label>
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
      {!archivo && !resultadoImportacion && (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            <strong>💡 Tip:</strong> El Excel puede tener cualquier estructura. La IA detectará automáticamente las columnas y mapeará los datos correctamente.
          </p>
        </div>
      )}
    </div>
  );
}

