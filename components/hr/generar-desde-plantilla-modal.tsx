'use client';

// ========================================
// Generar desde Plantilla Modal - Generación de documentos desde plantillas
// ========================================

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import {
  FileText,
  Users,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  FileType,
  Loader2,
  CheckCheck,
} from 'lucide-react';

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'oficial' | 'personalizada';
  formato: 'docx' | 'pdf_rellenable';
  categoria: string | null;
  esOficial: boolean;
  activa: boolean;
  variablesUsadas: string[];
  requiereFirma: boolean;
}

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  departamento?: string | null;
}

interface GenerarDesdePlantillaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GenerarDesdePlantillaModal({
  open,
  onOpenChange,
  onSuccess,
}: GenerarDesdePlantillaModalProps) {
  const [paso, setPaso] = useState<'plantilla' | 'empleados' | 'configuracion' | 'procesando'>('plantilla');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados de selección
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<Plantilla | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<Set<string>>(new Set());

  // Estados de configuración
  const [nombreDocumento, setNombreDocumento] = useState('');
  const [carpetaDestino, setCarpetaDestino] = useState('');
  const [notificarEmpleado, setNotificarEmpleado] = useState(true);
  const [requiereFirma, setRequiereFirma] = useState(false);
  const [fechaLimiteFirma, setFechaLimiteFirma] = useState('');
  const [mensajeFirma, setMensajeFirma] = useState('');

  // Estado de procesamiento
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);

  useEffect(() => {
    if (open) {
      cargarPlantillas();
      cargarEmpleados();
    } else {
      // Reset al cerrar
      setPaso('plantilla');
      setPlantillaSeleccionada(null);
      setEmpleadosSeleccionados(new Set());
      setNombreDocumento('');
      setCarpetaDestino('');
      setError('');
      setJobId(null);
      setJobStatus(null);
    }
  }, [open]);

  // Polling del job status
  useEffect(() => {
    if (!jobId || !open) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/plantillas/jobs/${jobId}`);
        const data = await res.json();

        if (data.success && data.job) {
          setJobStatus(data.job);

          // Si terminó (completado o fallido), detener polling
          if (data.job.estado === 'completado' || data.job.estado === 'fallido') {
            clearInterval(interval);

            if (data.job.estado === 'completado') {
              // Esperar 2 segundos antes de cerrar
              setTimeout(() => {
                onOpenChange(false);
                onSuccess?.();
              }, 2000);
            }
          }
        }
      } catch (err) {
        console.error('[polling job] Error:', err);
      }
    }, 2000); // Polling cada 2 segundos

    return () => clearInterval(interval);
  }, [jobId, open, onSuccess, onOpenChange]);

  const cargarPlantillas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/plantillas?activas=true');
      const data = await res.json();
      if (data.success) {
        setPlantillas(data.plantillas || []);
      }
    } catch (err) {
      console.error('[cargarPlantillas] Error:', err);
      setError('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const cargarEmpleados = async () => {
    try {
      const res = await fetch('/api/empleados');
      const data = await res.json();

      // La API retorna el array directamente, no envuelto en {success, empleados}
      if (Array.isArray(data)) {
        setEmpleados(data.map((emp: any) => ({
          id: emp.id,
          nombre: emp.usuario?.nombre || emp.nombre,
          apellidos: emp.usuario?.apellidos || emp.apellidos,
          email: emp.usuario?.email || emp.email,
          departamento: emp.puestoRelacion?.nombre,
        })));
      }
    } catch (err) {
      console.error('[cargarEmpleados] Error:', err);
    }
  };

  const handleSeleccionarPlantilla = (plantilla: Plantilla) => {
    setPlantillaSeleccionada(plantilla);
    setNombreDocumento(plantilla.nombre);
    setCarpetaDestino(plantilla.carpetaDestinoDefault || '');
    setRequiereFirma(plantilla.requiereFirma);
    setPaso('empleados');
  };

  const handleToggleEmpleado = (empleadoId: string) => {
    const nuevaSeleccion = new Set(empleadosSeleccionados);
    if (nuevaSeleccion.has(empleadoId)) {
      nuevaSeleccion.delete(empleadoId);
    } else {
      nuevaSeleccion.add(empleadoId);
    }
    setEmpleadosSeleccionados(nuevaSeleccion);
  };

  const handleSeleccionarTodos = () => {
    if (empleadosSeleccionados.size === empleados.length) {
      setEmpleadosSeleccionados(new Set());
    } else {
      setEmpleadosSeleccionados(new Set(empleados.map((e) => e.id)));
    }
  };

  const handleGenerarDocumentos = async () => {
    if (!plantillaSeleccionada) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/plantillas/${plantillaSeleccionada.id}/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleadoIds: Array.from(empleadosSeleccionados),
          nombreDocumento: nombreDocumento || undefined,
          carpetaDestino: carpetaDestino || undefined,
          notificarEmpleado,
          requiereFirma,
          fechaLimiteFirma: fechaLimiteFirma || undefined,
          mensajeFirma: mensajeFirma || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setJobId(data.jobId);
        setPaso('procesando');
      } else {
        setError(data.error || 'Error al generar documentos');
      }
    } catch (err) {
      console.error('[handleGenerarDocumentos] Error:', err);
      setError('Error al generar documentos');
    } finally {
      setLoading(false);
    }
  };

  const renderPasoPlantilla = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Selecciona la plantilla que deseas usar</p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="size-8 text-gray-400" />
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {plantillas.map((plantilla) => (
            <div
              key={plantilla.id}
              className="border rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
              onClick={() => handleSeleccionarPlantilla(plantilla)}
            >
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{plantilla.nombre}</p>
                    {plantilla.esOficial && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Oficial
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {plantilla.formato.toUpperCase()}
                    </span>
                  </div>
                  {plantilla.descripcion && (
                    <p className="text-sm text-gray-600">{plantilla.descripcion}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    {plantilla.categoria && <span>{plantilla.categoria}</span>}
                    <span>•</span>
                    <span>{plantilla.variablesUsadas.length} variables</span>
                    {plantilla.requiereFirma && (
                      <>
                        <span>•</span>
                        <span className="text-amber-700">Requiere firma</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {plantillas.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No hay plantillas disponibles</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderPasoEmpleados = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Selecciona los empleados para generar documentos
        </p>
        <Button variant="outline" size="sm" onClick={handleSeleccionarTodos}>
          {empleadosSeleccionados.size === empleados.length ? 'Deseleccionar' : 'Seleccionar'} todos
        </Button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
        {empleados.map((empleado) => (
          <div
            key={empleado.id}
            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
          >
            <Checkbox
              id={`emp-${empleado.id}`}
              checked={empleadosSeleccionados.has(empleado.id)}
              onCheckedChange={() => handleToggleEmpleado(empleado.id)}
            />
            <Label htmlFor={`emp-${empleado.id}`} className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium text-sm">
                  {empleado.nombre} {empleado.apellidos}
                </p>
                <p className="text-xs text-gray-500">{empleado.email}</p>
              </div>
            </Label>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setPaso('plantilla')}>
          Atrás
        </Button>
        <Button
          onClick={() => setPaso('configuracion')}
          disabled={empleadosSeleccionados.size === 0}
        >
          Continuar ({empleadosSeleccionados.size} seleccionados)
        </Button>
      </div>
    </div>
  );

  const renderPasoConfiguracion = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Configura las opciones de generación</p>

      <div className="space-y-3">
        <div>
          <Label>Nombre del documento (opcional)</Label>
          <Input
            value={nombreDocumento}
            onChange={(e) => setNombreDocumento(e.target.value)}
            placeholder="Dejar vacío para usar nombre de plantilla"
          />
        </div>

        <div>
          <Label>Carpeta destino (opcional)</Label>
          <Input
            value={carpetaDestino}
            onChange={(e) => setCarpetaDestino(e.target.value)}
            placeholder="ej: Contratos"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="notificar"
            checked={notificarEmpleado}
            onCheckedChange={(checked) => setNotificarEmpleado(checked === true)}
          />
          <Label htmlFor="notificar">Notificar a los empleados</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="firma"
            checked={requiereFirma}
            onCheckedChange={(checked) => setRequiereFirma(checked === true)}
          />
          <Label htmlFor="firma">Requiere firma digital</Label>
        </div>

        {requiereFirma && (
          <div className="ml-6 space-y-3 border-l-2 border-blue-200 pl-4">
            <div>
              <Label>Fecha límite para firmar (opcional)</Label>
              <Input
                type="date"
                value={fechaLimiteFirma}
                onChange={(e) => setFechaLimiteFirma(e.target.value)}
              />
            </div>
            <div>
              <Label>Mensaje para firma (opcional)</Label>
              <Input
                value={mensajeFirma}
                onChange={(e) => setMensajeFirma(e.target.value)}
                placeholder="ej: Por favor, firma este documento"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setPaso('empleados')}>
          Atrás
        </Button>
        <LoadingButton onClick={handleGenerarDocumentos} loading={loading}>
          Generar Documentos
        </LoadingButton>
      </div>
    </div>
  );

  const renderPasoProcesando = () => (
    <div className="space-y-4">
      {jobStatus ? (
        <>
          <div className="text-center py-6">
            {jobStatus.estado === 'completado' ? (
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : jobStatus.estado === 'fallido' ? (
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            ) : (
              <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
            )}

            <h3 className="text-lg font-medium mb-2">
              {jobStatus.estado === 'completado'
                ? 'Documentos generados correctamente'
                : jobStatus.estado === 'fallido'
                ? 'Error al generar documentos'
                : 'Generando documentos...'}
            </h3>

            <div className="text-sm text-gray-600">
              <p>
                {jobStatus.documentosGenerados || 0} de {jobStatus.totalEmpleados || 0} documentos generados
              </p>
              {jobStatus.porcentaje !== undefined && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${jobStatus.porcentaje}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs">{jobStatus.porcentaje}%</p>
                </div>
              )}
            </div>
          </div>

          {jobStatus.estado === 'fallido' && jobStatus.mensajeError && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-600">{jobStatus.mensajeError}</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Spinner className="size-8 text-gray-400 mx-auto" />
          <p className="text-sm text-gray-600 mt-3">Iniciando generación...</p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileType className="h-5 w-5 text-gray-600" />
            Generar Documentos desde Plantilla
            {plantillaSeleccionada && paso !== 'plantilla' && (
              <span className="text-sm font-normal text-gray-500">
                • {plantillaSeleccionada.nombre}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {paso === 'plantilla' && renderPasoPlantilla()}
          {paso === 'empleados' && renderPasoEmpleados()}
          {paso === 'configuracion' && renderPasoConfiguracion()}
          {paso === 'procesando' && renderPasoProcesando()}

          {error && paso !== 'procesando' && (
            <div className="rounded-md bg-red-50 p-3 mt-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
