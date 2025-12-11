'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Info,
  Upload,
  X,
} from 'lucide-react';

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
}

interface MatchingResult {
  filename: string;
  empleado: { id: string; nombre: string } | null;
  confidence: number;
  autoAssigned: boolean;
  candidates: Array<{ id: string; nombre: string; confidence: number }>;
  extraccionIA?: {
    totalDeducciones: number | null;
    totalNeto: number | null;
    confianza: number;
    provider: string;
  };
}

interface UploadNominasMultipleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  mes: number;
  anio: number;
  empleados: Empleado[];
  onSuccess: () => void;
}

type ProcessingState = 'idle' | 'uploading' | 'reviewing' | 'confirming';

export function UploadNominasMultiple({
  open,
  onOpenChange,
  eventoId,
  mes,
  anio,
  empleados,
  onSuccess,
}: UploadNominasMultipleProps) {
  const [state, setState] = useState<ProcessingState>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [results, setResults] = useState<MatchingResult[]>([]);
  const [confirmaciones, setConfirmaciones] = useState<
    Record<string, { empleadoId?: string; descartado?: boolean }>
  >({});
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const pdfFiles = selectedFiles.filter((f) => f.name.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length !== selectedFiles.length) {
      toast.error('Solo se permiten archivos PDF');
    }

    setFiles(pdfFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Selecciona al menos un archivo PDF');
      return;
    }

    setState('uploading');
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('eventoId', eventoId);

      files.forEach((file) => {
        formData.append('files', file);
      });

      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/nominas/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || 'Error al procesar archivos');
      }

      const data = await response.json() as {
        sessionId: string;
        results: MatchingResult[];
        stats: { total: number; autoAssigned: number };
      };
      setSessionId(data.sessionId);
      setResults(data.results);

      // Inicializar confirmaciones con auto-asignados
      const initialConfirmaciones: Record<
        string,
        { empleadoId?: string; descartado?: boolean }
      > = {};
      data.results.forEach((result: MatchingResult) => {
        if (result.autoAssigned && result.empleado) {
          initialConfirmaciones[result.filename] = {
            empleadoId: result.empleado.id,
          };
        }
      });
      setConfirmaciones(initialConfirmaciones);

      setState('reviewing');
      toast.success(
        `${data.stats.total} archivos procesados. ${data.stats.autoAssigned} asignados automáticamente.`
      );
    } catch (error) {
      setState('idle');
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const handleConfirm = async () => {
    if (!sessionId) return;

    // Validar que todos los archivos tengan asignación o estén descartados
    const pendientes = results.filter(
      (r) =>
        !confirmaciones[r.filename]?.descartado &&
        !confirmaciones[r.filename]?.empleadoId
    );

    if (pendientes.length > 0) {
      toast.error(
        `Debes asignar o descartar ${pendientes.length} archivo(s) pendiente(s)`
      );
      return;
    }

    setState('confirming');

    try {
      const confirmacionesArray = Object.entries(confirmaciones).map(
        ([filename, data]) => ({
          filename,
          empleadoId: data.empleadoId || '',
          descartado: data.descartado || false,
        })
      );

      const response = await fetch('/api/nominas/upload/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          confirmaciones: confirmacionesArray,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || 'Error al confirmar importación');
      }

      const data = await response.json() as {
        imported: number;
        descartados: number;
        errors?: string[];
      };

      if (data.errors && data.errors.length > 0) {
        toast.error(`Importadas: ${data.imported}. Errores: ${data.errors.length}`);
        console.error('Errores de importación:', data.errors);
      } else {
        toast.success(
          `${data.imported} nóminas importadas correctamente. ${data.descartados} descartadas.`
        );
      }

      onOpenChange(false);
      onSuccess();
      resetState();
    } catch (error) {
      setState('reviewing');
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const resetState = () => {
    setState('idle');
    setFiles([]);
    setSessionId(null);
    setResults([]);
    setConfirmaciones({});
    setProgress(0);
  };

  const handleClose = () => {
    if (state === 'uploading' || state === 'confirming') return;
    onOpenChange(false);
    resetState();
  };

  const setEmpleado = (filename: string, empleadoId: string) => {
    setConfirmaciones((prev) => ({
      ...prev,
      [filename]: { empleadoId },
    }));
  };

  const setDescartado = (filename: string) => {
    setConfirmaciones((prev) => ({
      ...prev,
      [filename]: { descartado: true },
    }));
  };

  const removeDescartado = (filename: string) => {
    setConfirmaciones((prev) => {
      const { [filename]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Nóminas - Múltiples PDFs</DialogTitle>
          <DialogDescription>
            Mes {mes}/{anio}
          </DialogDescription>
        </DialogHeader>

        {state === 'idle' && (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Sube múltiples PDFs de nóminas. La IA clasificará automáticamente cada
                archivo al empleado correspondiente.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-primary hover:underline">
                  Seleccionar archivos PDF
                </span>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </Label>
              <p className="text-xs text-muted-foreground mt-2">
                Solo archivos PDF
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {files.length} archivo(s) seleccionado(s):
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm p-2 bg-secondary rounded"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {state === 'uploading' && (
          <div className="space-y-4 py-8">
            <p className="text-center text-sm">
              Procesando archivos con IA...
            </p>
            <Progress value={progress} className="w-full" />
            <p className="text-center text-xs text-muted-foreground">
              Esto puede tardar varios minutos
            </p>
          </div>
        )}

        {state === 'reviewing' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Revisa las asignaciones automáticas. Puedes cambiar el empleado o
                descartar archivos.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result) => {
                const isDescartado = confirmaciones[result.filename]?.descartado;
                const empleadoAsignado = confirmaciones[result.filename]?.empleadoId;

                return (
                  <div
                    key={result.filename}
                    className={`border rounded-lg p-4 ${
                      isDescartado ? 'bg-gray-50 opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {result.filename}
                          </span>
                          {result.autoAssigned && !isDescartado && (
                            <Badge variant="success" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Auto
                            </Badge>
                          )}
                          {!result.autoAssigned && !isDescartado && (
                            <Badge variant="warning" className="text-xs">
                              Revisar
                            </Badge>
                          )}
                        </div>

                        {!isDescartado && (
                          <>
                            <Select
                              value={empleadoAsignado || ''}
                              onValueChange={(value) =>
                                setEmpleado(result.filename, value)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar empleado" />
                              </SelectTrigger>
                              <SelectContent>
                                {empleados.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.nombre} {emp.apellidos}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {result.extraccionIA && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Extraído: Deducciones{' '}
                                {result.extraccionIA.totalDeducciones?.toFixed(2) ||
                                  'N/A'}
                                , Neto{' '}
                                {result.extraccionIA.totalNeto?.toFixed(2) || 'N/A'} (
                                {result.extraccionIA.confianza}%)
                              </div>
                            )}
                          </>
                        )}

                        {isDescartado && (
                          <p className="text-sm text-muted-foreground">Descartado</p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {!isDescartado ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDescartado(result.filename)}
                          >
                            <X className="h-4 w-4" />
                            Descartar
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDescartado(result.filename)}
                          >
                            Restaurar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          {state === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={files.length === 0}>
                <Upload className="h-4 w-4 mr-2" />
                Procesar Archivos
              </Button>
            </>
          )}

          {state === 'reviewing' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm}>
                Confirmar Importación
              </Button>
            </>
          )}

          {(state === 'uploading' || state === 'confirming') && (
            <Button disabled>
              {state === 'uploading' ? 'Procesando...' : 'Confirmando...'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
