'use client';

// ========================================
// Importar Empleados Component - Onboarding
// ========================================

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, XCircle, Users, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface EmpleadoPreview {
  nombre: string | null;
  apellidos: string | null;
  email: string | null;
  puesto: string | null;
  equipo: string | null;
  valido: boolean;
  errores: string[];
}

interface PreviewData {
  empleados: EmpleadoPreview[];
  equiposDetectados: string[];
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

export function ImportarEmpleados() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [resultadoImportacion, setResultadoImportacion] = useState<ResultadoImportacion | null>(null);
  const [invitarEmpleados, setInvitarEmpleados] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [empleadosExpandidos, setEmpleadosExpandidos] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setPreviewData(null);
      setResultadoImportacion(null);
      setError('');
      setSuccess('');
    }
  };

  const handleProcesarArchivo = async () => {
    if (!archivo) return;

    setError('');
    setProcesando(true);

    try {
      const formData = new FormData();
      formData.append('file', archivo);

      const response = await fetch('/api/empleados/importar-excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setPreviewData(result.data);
      } else {
        setError(result.error || 'Error al procesar el archivo');
      }
    } catch (err) {
      setError('Error al procesar el archivo');
      console.error('Error:', err);
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarImportacion = async () => {
    if (!previewData) return;

    setError('');
    setImportando(true);
    setPreviewData(null); // Ocultar preview para mostrar loader

    try {
      const response = await fetch('/api/empleados/importar-excel/confirmar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empleados: previewData.empleados,
          equiposDetectados: previewData.equiposDetectados,
          managersDetectados: [],
          invitarEmpleados,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setResultadoImportacion(result.data);
        setSuccess(
          `✅ Importación completada: ${result.data.empleadosCreados} empleados creados, ${result.data.equiposCreados} equipos creados${
            invitarEmpleados ? `, ${result.data.invitacionesEnviadas} invitaciones enviadas` : ''
          }`
        );
        setArchivo(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(result.error || 'Error al importar empleados');
      }
    } catch (err) {
      setError('Error al importar empleados');
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Importar empleados</h3>
        <p className="text-sm text-gray-500">
          Sube un archivo Excel con los datos de tus empleados. La IA procesará automáticamente la estructura.
        </p>
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
              Esto puede tardar unos segundos. Estamos creando cuentas, asignando equipos y enviando invitaciones.
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

          {/* Botón para importar más */}
          <Button
            variant="outline"
            onClick={() => {
              setResultadoImportacion(null);
              setSuccess('');
            }}
          >
            Importar más empleados
          </Button>
        </div>
      )}

      {/* Área de carga de archivo */}
      {!previewData && !importando && !resultadoImportacion && (
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
              <Button onClick={handleProcesarArchivo} disabled={procesando}>
                {procesando ? 'Procesando...' : 'Analizar con IA'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Preview de empleados */}
      {previewData && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Resumen de importación</h4>
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <p>Total de empleados: {previewData.resumen.total}</p>
                  <p className="text-green-600">✓ Válidos: {previewData.resumen.validos}</p>
                  <p className="text-red-600">✗ Inválidos: {previewData.resumen.invalidos}</p>
                  {previewData.equiposDetectados.length > 0 && (
                    <p>Equipos detectados: {previewData.equiposDetectados.join(', ')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de empleados (primeros 10) */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Vista previa (primeros 10 empleados):</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {previewData.empleados.slice(0, 10).map((emp, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-3 ${
                    emp.valido ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {emp.valido ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {emp.nombre} {emp.apellidos}
                        </p>
                        <p className="text-xs text-gray-600">{emp.email}</p>
                        {emp.puesto && (
                          <p className="text-xs text-gray-500">
                            {emp.puesto} {emp.equipo ? `• ${emp.equipo}` : ''}
                          </p>
                        )}
                        {!emp.valido && emp.errores.length > 0 && (
                          <p className="text-xs text-red-600 mt-1">
                            {emp.errores.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {previewData.empleados.length > 10 && (
              <p className="text-xs text-gray-500 text-center">
                Y {previewData.empleados.length - 10} empleados más...
              </p>
            )}
          </div>

          {/* Opción de invitar */}
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

          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPreviewData(null);
                setArchivo(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarImportacion}
              disabled={importando || previewData.resumen.validos === 0}
            >
              {importando ? 'Importando...' : `Importar ${previewData.resumen.validos} empleados`}
            </Button>
          </div>
        </div>
      )}

      {/* Mensajes de error/éxito */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Información adicional */}
      {!previewData && !archivo && (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            <strong>💡 Tip:</strong> El Excel puede tener cualquier estructura. La IA detectará automáticamente las columnas y mapeará los datos correctamente.
          </p>
        </div>
      )}
    </div>
  );
}

