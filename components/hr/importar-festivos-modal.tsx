'use client';

// ========================================
// Importar Festivos Modal - Unified
// ========================================
// Provides two import options:
// 1. Import from file (.ics/.csv)
// 2. Import national holidays for selected year

import { useState } from 'react';
import { toast } from 'sonner';
import { FileUp, CalendarRange } from 'lucide-react';

import { LoadingButton } from '@/components/shared/loading-button';
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
import { parseJson } from '@/lib/utils/json';

interface ImportarFestivosModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  añoSeleccionado?: number;
}

type ImportMode = 'archivo' | 'nacionales' | null;

export function ImportarFestivosModal({
  open,
  onClose,
  onSuccess,
  añoSeleccionado,
}: ImportarFestivosModalProps) {
  const [mode, setMode] = useState<ImportMode>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const añoActual = new Date().getFullYear();
  const año = añoSeleccionado || añoActual;

  const handleClose = () => {
    setMode(null);
    setSelectedFile(null);
    setProcessing(false);
    onClose();
  };

  const handleImportarArchivo = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero');
      return;
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/festivos/importar', {
        method: 'POST',
        body: formData,
      });

      const data = await parseJson<{ message?: string; error?: string }>(response).catch(() => null);

      if (response.ok) {
        toast.success(data?.message || 'Calendario importado correctamente');
        onSuccess();
        handleClose();
      } else {
        toast.error(data?.error || 'Error al importar calendario');
      }
    } catch (error) {
      console.error('Error importando desde archivo:', error);
      toast.error('Error al importar calendario');
    } finally {
      setProcessing(false);
    }
  };

  const handleImportarNacionales = async () => {
    if (!confirm(`¿Importar festivos nacionales de España para el año ${año}?\n\nEsto importará aproximadamente 10 festivos nacionales.`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(
        `/api/festivos/importar-nacionales?añoInicio=${año}&añoFin=${año}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => null);
        throw new Error(error?.error || 'Error al importar festivos');
      }

      const data = await parseJson<{
        importados?: number;
        omitidos?: number;
        message?: string;
      }>(response);

      toast.success(
        data.message ||
          `Festivos importados: ${data.importados || 0} nuevos, ${data.omitidos || 0} ya existían`
      );
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error importando festivos nacionales:', error);
      toast.error(error instanceof Error ? error.message : 'Error al importar festivos');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Festivos</DialogTitle>
          <DialogDescription>
            Elige cómo quieres importar los festivos a tu calendario laboral
          </DialogDescription>
        </DialogHeader>

        {!mode && (
          <div className="space-y-3 py-4">
            <button
              type="button"
              onClick={() => setMode('archivo')}
              className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-colors text-left"
            >
              <FileUp className="size-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Desde archivo</p>
                <p className="text-sm text-gray-500 mt-1">
                  Importar festivos desde un archivo .ics o .csv
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('nacionales')}
              className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-colors text-left"
            >
              <CalendarRange className="size-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Festivos nacionales</p>
                <p className="text-sm text-gray-500 mt-1">
                  Importar los 10 festivos nacionales de España para {año}
                </p>
              </div>
            </button>
          </div>
        )}

        {mode === 'archivo' && (
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="file-upload" className="text-sm font-medium">
                Selecciona un archivo
              </Label>
              <input
                id="file-upload"
                type="file"
                accept=".ics,.csv"
                onChange={handleFileChange}
                className="mt-2 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-gray-100 file:text-gray-700
                  hover:file:bg-gray-200
                  cursor-pointer"
              />
              {selectedFile && (
                <p className="text-xs text-gray-500 mt-2">
                  Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
        )}

        {mode === 'nacionales' && (
          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Se importarán los siguientes festivos nacionales de España para el año <strong>{año}</strong>:
              </p>
              <ul className="text-xs text-blue-800 mt-2 space-y-1 list-disc list-inside">
                <li>Año Nuevo (1 enero)</li>
                <li>Reyes Magos (6 enero)</li>
                <li>Viernes Santo (variable)</li>
                <li>Día del Trabajador (1 mayo)</li>
                <li>Asunción de la Virgen (15 agosto)</li>
                <li>Fiesta Nacional de España (12 octubre)</li>
                <li>Todos los Santos (1 noviembre)</li>
                <li>Día de la Constitución (6 diciembre)</li>
                <li>Inmaculada Concepción (8 diciembre)</li>
                <li>Navidad (25 diciembre)</li>
              </ul>
              <p className="text-xs text-blue-700 mt-2">
                Los festivos que ya existan no se duplicarán.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (mode) {
                setMode(null);
                setSelectedFile(null);
              } else {
                handleClose();
              }
            }}
            disabled={processing}
          >
            {mode ? 'Atrás' : 'Cancelar'}
          </Button>

          {mode === 'archivo' && (
            <LoadingButton
              onClick={handleImportarArchivo}
              loading={processing}
              disabled={!selectedFile || processing}
            >
              {processing ? 'Importando...' : 'Importar archivo'}
            </LoadingButton>
          )}

          {mode === 'nacionales' && (
            <LoadingButton
              onClick={handleImportarNacionales}
              loading={processing}
              disabled={processing}
            >
              {processing ? 'Importando...' : 'Importar festivos'}
            </LoadingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
