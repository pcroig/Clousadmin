'use client';

// ========================================
// Upload Nóminas Modal
// ========================================
// Modal para subida directa de PDFs sin generar evento

import { AlertCircle, CheckCircle, FileText, Loader2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { parseJson } from '@/lib/utils/json';

interface UploadNominasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MatchingResult {
  filename: string;
  empleado: {
    id: string;
    nombre: string;
    apellidos: string;
  } | null;
  confidence: number;
  autoAssigned: boolean;
  candidates: Array<{
    id: string;
    nombre: string;
    apellidos: string;
    confidence: number;
  }>;
}

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface UploadNominasResponse {
  sessionId?: string | null;
  results?: MatchingResult[];
  stats?: {
    autoAssigned?: number;
  };
  error?: string;
}

interface ConfirmNominasResponse {
  imported?: number;
  error?: string;
}

export function UploadNominasModal({ isOpen, onClose, onSuccess }: UploadNominasModalProps) {
  const currentDate = new Date();
  const [mes, setMes] = useState(currentDate.getMonth() + 1);
  const [anio, setAnio] = useState(currentDate.getFullYear());
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [results, setResults] = useState<MatchingResult[]>([]);
  const [step, setStep] = useState<'upload' | 'review' | 'success'>('upload');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const pdfFiles = selectedFiles.filter((file) => file.type === 'application/pdf');

    if (pdfFiles.length !== selectedFiles.length) {
      toast.error('Solo se permiten archivos PDF');
    }

    setFiles(pdfFiles);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFiles = droppedFiles.filter((file) => file.type === 'application/pdf');

    if (pdfFiles.length !== droppedFiles.length) {
      toast.error('Solo se permiten archivos PDF');
    }

    setFiles(pdfFiles);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Selecciona al menos un archivo PDF');
      return;
    }

    if (!mes || !anio) {
      toast.error('Selecciona mes y año');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('nominas', file);
      });
      formData.append('mes', mes.toString());
      formData.append('anio', anio.toString());

      const response = await fetch('/api/nominas/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await parseJson<UploadNominasResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar archivos');
      }

      setSessionId(data.sessionId ?? null);
      setResults(data.results || []);
      setStep('review');

      toast.success('Archivos procesados correctamente', {
        description: `${data.stats?.autoAssigned || 0} asignados automáticamente`,
      });
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir archivos');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!sessionId) {
      toast.error('No hay sesión activa');
      return;
    }

    try {
      setProcessing(true);

      const response = await fetch('/api/nominas/confirmar-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          confirmaciones: results.map((result) => ({
            filename: result.filename,
            empleadoId: result.empleado?.id || null,
          })),
        }),
      });

      const data = await parseJson<ConfirmNominasResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || 'Error al confirmar nóminas');
      }

      setStep('success');
      const creadas = typeof data.imported === 'number' ? data.imported : 0;
      toast.success(`${creadas} nómina(s) creada(s) correctamente`);

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Error confirming:', error);
      toast.error(error instanceof Error ? error.message : 'Error al confirmar');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setStep('upload');
    setSessionId(null);
    setResults([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-50 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {step === 'upload' && 'Subir Nóminas Directamente'}
              {step === 'review' && 'Revisar Asignaciones'}
              {step === 'success' && 'Nóminas Creadas'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {step === 'upload' && (
              <div className="space-y-6">
                {/* Período */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Período de Nómina
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={mes}
                      onChange={(e) => setMes(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      {meses.map((nombre, index) => (
                        <option key={index} value={index + 1}>
                          {nombre}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      value={anio}
                      onChange={(e) => setAnio(parseInt(e.target.value))}
                      min={2020}
                      max={2100}
                      className="px-3 py-2"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Las nóminas se crearán para {meses[mes - 1]} {anio}
                  </p>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Archivos PDF
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                      Arrastra archivos PDF aquí o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-500">
                      Se asignarán automáticamente por nombre de archivo
                    </p>
                    <input
                      id="file-input"
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Selected Files */}
                {files.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Archivos seleccionados ({files.length})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-gray-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(index);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Revisa las asignaciones antes de confirmar
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Los archivos se han asignado automáticamente usando IA. Verifica que sean correctos.
                      </p>
                    </div>
                  </div>
                </div>

                {results.map((result, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {result.filename}
                        </p>
                        {result.empleado ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <p className="text-sm text-gray-700">
                              {result.empleado.nombre} {result.empleado.apellidos}
                            </p>
                            {result.autoAssigned && (
                              <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded">
                                {result.confidence}% confianza
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                            <p className="text-sm text-orange-700">
                              No se pudo asignar automáticamente
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ¡Nóminas creadas correctamente!
                </h3>
                <p className="text-sm text-gray-600">
                  Las nóminas están listas para publicar
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {step !== 'success' && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              {step === 'upload' && (
                <Button
                  onClick={handleUpload}
                  disabled={files.length === 0 || uploading}
                  className="btn-primary"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Subir y Procesar
                    </>
                  )}
                </Button>
              )}
              {step === 'review' && (
                <Button
                  onClick={handleConfirm}
                  disabled={processing}
                  className="btn-primary"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar y Crear Nóminas
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

