'use client';

// ========================================
// Plantilla Detail Client - Vista de detalle de plantilla
// ========================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, FileText, Send, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<Set<string>>(new Set());
  const [loadingEmpleados, setLoadingEmpleados] = useState(true);
  const [generando, setGenerando] = useState(false);
  const variablesDetectadas = Array.isArray(plantilla.variablesUsadas)
    ? plantilla.variablesUsadas
    : [];

  useEffect(() => {
    setPdfUrl(null);
    setEmpleadosSeleccionados(new Set());
    cargarDatosIniciales();
  }, [plantilla.id]);

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
    setLoadingPdf(true);
    try {
      const res = await fetch('/api/empleados?activos=true');
      const data = await res.json();

      const listaEmpleados = normalizarRespuestaEmpleados(data).map(mapearEmpleado);
      setEmpleados(listaEmpleados);

      if (listaEmpleados.length > 0) {
        await cargarPrevisualizacion(listaEmpleados[0].id);
      } else {
        setLoadingPdf(false);
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
      setLoadingPdf(false);
    } finally {
      setLoadingEmpleados(false);
    }
  };

  const cargarPrevisualizacion = async (empleadoId: string) => {
    try {
      if (!empleadoId) return;

      const res = await fetch(
        `/api/plantillas/${plantilla.id}/previsualizar?empleadoId=${empleadoId}`
      );
      const data = await res.json();

      if (data.success && data.previewUrl) {
        setPdfUrl(data.previewUrl);
      }
    } catch (error) {
      console.error('Error cargando previsualización:', error);
    } finally {
      setLoadingPdf(false);
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
          empleadosIds: Array.from(empleadosSeleccionados),
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
    const labels: Record<string, string> = {
      first_name: 'Name',
      last_name: 'Last Name',
      birthday_year: 'Birthday year',
      id_number: 'ID number',
      city: 'City',
      address: 'Address',
      postal_code: 'Postal code',
      province: 'Province',
      phone: 'Phone',
      email: 'Email',
      nif: 'NIF/NIE',
      nss: 'Social Security Number',
      iban: 'IBAN',
      // Agregar más según sea necesario
    };

    return labels[variable] || variable.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

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
            {loadingPdf ? (
              <div className="flex-1 flex items-center justify-center">
                <Spinner className="w-8 h-8 text-gray-400" />
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full flex-1"
                title="Vista previa del documento"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                <FileText className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-center">No se pudo cargar la previsualización</p>
                <p className="text-sm text-center mt-2">
                  El documento se generará correctamente al seleccionar empleados
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cards */}
        <div className="flex flex-col gap-6 min-h-0">
          {/* Card: Generar */}
          <div className="border rounded-lg bg-white p-6 flex flex-col">
            <p className="text-sm text-gray-600 mb-4">
              Select an employee to preview how the variables are replaced by the information of the employee.
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
              <h3 className="font-medium text-gray-900">
                {variablesDetectadas.length} recognized variables
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Check the complete list of available variables in case you are missing any.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {variablesDetectadas.map((variable) => (
                  <div
                    key={variable}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {getVariableLabel(variable)}
                      </p>
                      <p className="text-xs text-gray-600 font-mono mt-0.5">
                        {'{{'}{variable}{'}}'}
                      </p>
                    </div>
                  </div>
                ))}

                {variablesDetectadas.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No se detectaron variables en esta plantilla</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
