'use client';

// ========================================
// Importar Empleados Component - Onboarding
// ========================================

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, XCircle, Users, AlertCircle } from 'lucide-react';

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

export function ImportarEmpleados() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [invitarEmpleados, setInvitarEmpleados] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setPreviewData(null);
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
        setSuccess(
          `✅ Importación completada: ${result.data.empleadosCreados} empleados creados, ${result.data.equiposCreados} equipos creados${
            invitarEmpleados ? `, ${result.data.invitacionesEnviadas} invitaciones enviadas` : ''
          }`
        );
        setArchivo(null);
        setPreviewData(null);
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Importar empleados</h3>
        <p className="text-sm text-gray-500">
          Sube un archivo Excel con los datos de tus empleados. La IA procesará automáticamente la estructura.
        </p>
      </div>

      {/* Área de carga de archivo */}
      {!previewData && (
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

