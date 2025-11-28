'use client';

import { Loader2, Plus, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DocumentUploadArea } from '@/components/shared/document-upload-area';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseJson } from '@/lib/utils/json';

interface SubirDocumentosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}

interface CarpetaOption {
  id: string;
  nombre: string;
  esSistema: boolean;
  empleado?: {
    id: string;
    nombre: string;
    apellidos: string;
  } | null;
}

interface EmpleadoOption {
  id: string;
  nombre: string;
  apellidos: string;
}

export function SubirDocumentosModal({ open, onOpenChange, onUploaded }: SubirDocumentosModalProps) {
  const [carpetas, setCarpetas] = useState<CarpetaOption[]>([]);
  const [selectedCarpeta, setSelectedCarpeta] = useState<string>('');
  const [loadingCarpetas, setLoadingCarpetas] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [nuevoNombreCarpeta, setNuevoNombreCarpeta] = useState('');
  const [empleados, setEmpleados] = useState<EmpleadoOption[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [empleadoDestino, setEmpleadoDestino] = useState<string>('');

  const loadCarpetas = useCallback(async () => {
    setLoadingCarpetas(true);
    try {
      const response = await fetch('/api/carpetas');
      const data = await parseJson<{ carpetas?: CarpetaOption[] }>(response);
      if (data.carpetas) {
        setCarpetas(data.carpetas);
        setSelectedCarpeta((prev) => {
          if (prev) return prev;
          const first = data.carpetas?.[0]?.id;
          return first ?? '';
        });
      }
    } catch (error) {
      console.error('Error cargando carpetas:', error);
      toast.error('No se pudieron cargar las carpetas');
    } finally {
      setLoadingCarpetas(false);
    }
  }, []);

  const loadEmpleados = useCallback(async () => {
    setLoadingEmpleados(true);
    try {
      const response = await fetch('/api/empleados?activos=true');
      const data = await parseJson<Record<string, unknown>>(response);
      const lista = Array.isArray(data?.empleados) ? (data?.empleados as Record<string, unknown>[]) :
        Array.isArray(data?.data) ? (data?.data as Record<string, unknown>[]) : [];
      const mapped = lista.map((item) => ({
        id: String(item.id),
        nombre: String(item.nombre ?? item.usuario?.nombre ?? ''),
        apellidos: String(item.apellidos ?? item.usuario?.apellidos ?? ''),
      }));
      setEmpleados(mapped);
      if (mapped.length > 0 && !empleadoDestino) {
        setEmpleadoDestino(mapped[0].id);
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
      toast.error('No se pudieron cargar los empleados disponibles.');
    } finally {
      setLoadingEmpleados(false);
    }
  }, [empleadoDestino]);

  useEffect(() => {
    if (open) {
      void loadCarpetas();
      void loadEmpleados();
    }
  }, [open, loadCarpetas, loadEmpleados]);

  useEffect(() => {
    const carpetaActual = carpetas.find((carpeta) => carpeta.id === selectedCarpeta);
    const requiereEmpleado = Boolean(carpetaActual?.esSistema && !carpetaActual?.empleado);
    if (!requiereEmpleado) {
      setEmpleadoDestino('');
    }
  }, [carpetas, selectedCarpeta]);

  const carpetaItems = useMemo(
    () =>
      carpetas.map((carpeta) => ({
        value: carpeta.id,
        label: carpeta.empleado
          ? `${carpeta.nombre} · ${carpeta.empleado.nombre} ${carpeta.empleado.apellidos}`
          : carpeta.nombre,
        aux: carpeta.esSistema ? 'Carpeta del sistema' : 'Carpeta personalizada',
      })),
    [carpetas]
  );

  const carpetaSeleccionada = useMemo(
    () => carpetas.find((carpeta) => carpeta.id === selectedCarpeta),
    [carpetas, selectedCarpeta]
  );
  const requiereEmpleadoDestino = Boolean(carpetaSeleccionada?.esSistema && !carpetaSeleccionada?.empleado);

  const handleCrearCarpetaRapida = useCallback(async () => {
    if (!nuevoNombreCarpeta.trim()) {
      toast.error('El nombre de la carpeta es requerido');
      return;
    }

    setCreatingFolder(true);
    try {
      const response = await fetch('/api/carpetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoNombreCarpeta.trim(),
          compartida: true,
          asignadoA: 'todos',
        }),
      });

      const data = await parseJson<{ success?: boolean; carpeta?: CarpetaOption; error?: string }>(response);

      if (!response.ok || !data.success || !data.carpeta) {
        throw new Error(data.error || 'No se pudo crear la carpeta');
      }

      setCarpetas((prev) => [data.carpeta as CarpetaOption, ...prev]);
      setSelectedCarpeta(data.carpeta.id);
      setNuevoNombreCarpeta('');
      toast.success('Carpeta creada correctamente');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear la carpeta';
      toast.error(message);
    } finally {
      setCreatingFolder(false);
    }
  }, [nuevoNombreCarpeta]);

  const handleUploaded = useCallback(() => {
    onUploaded?.();
    onOpenChange(false);
    setEmpleadoDestino('');
  }, [onOpenChange, onUploaded]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Subir documentos
          </DialogTitle>
          <DialogDescription>
            Selecciona una carpeta destino y sube los archivos. Se procesarán automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-2">
            <Label>Carpeta destino</Label>
            <SearchableSelect
              items={carpetaItems}
              loading={loadingCarpetas}
              placeholder={loadingCarpetas ? 'Cargando...' : 'Selecciona una carpeta'}
              value={selectedCarpeta}
              onChange={setSelectedCarpeta}
              emptyMessage="No hay carpetas disponibles"
            />
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-gray-500">Crear carpeta rápida</Label>
                <Input
                  value={nuevoNombreCarpeta}
                  onChange={(event) => setNuevoNombreCarpeta(event.target.value)}
                  placeholder="Ej. Contratos 2025"
                  disabled={creatingFolder}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleCrearCarpetaRapida}
                disabled={creatingFolder || !nuevoNombreCarpeta.trim()}
              >
                {creatingFolder ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear
                  </>
                )}
              </Button>
            </div>
          </section>

          {requiereEmpleadoDestino && (
            <section className="space-y-2">
              <Label>Asignar a empleado</Label>
              <Select
                value={empleadoDestino || undefined}
                onValueChange={setEmpleadoDestino}
                disabled={loadingEmpleados}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((empleado) => (
                    <SelectItem key={empleado.id} value={empleado.id}>
                      {empleado.nombre} {empleado.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Las carpetas maestras requieren asignar el documento a un empleado concreto.
              </p>
            </section>
          )}

          <section>
            <DocumentUploadArea
              carpetaId={selectedCarpeta}
              variant="dropzone"
              onUploaded={handleUploaded}
              description="PDF, JPG o PNG | Máx. 10MB"
              disabled={!selectedCarpeta || (requiereEmpleadoDestino && !empleadoDestino)}
              getExtraFormData={() =>
                requiereEmpleadoDestino && empleadoDestino ? { empleadoId: empleadoDestino } : undefined
              }
            />
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


