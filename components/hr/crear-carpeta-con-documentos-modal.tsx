'use client';

import { FolderPlus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DocumentUploaderInline } from '@/components/shared/document-uploader-inline';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
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
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { parseJson } from '@/lib/utils/json';
interface CrearCarpetaResponse {
  carpeta: {
    id: string;
  };
  error?: string;
}

interface UploadDocumentoResponse {
  documento?: {
    id: string;
    carpetaId: string;
  };
  error?: string;
}

interface UploadedFile {
  file: File;
  id: string;
  nombre: string;
  tipoDocumento?: string;
}

interface CrearCarpetaConDocumentosModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (carpetaId: string) => void;
}

interface EquipoOption {
  id: string;
  nombre: string;
}

interface EmpleadoOption {
  id: string;
  nombre: string;
  apellidos: string;
}

export function CrearCarpetaConDocumentosModal({
  open,
  onClose,
  onSuccess,
}: CrearCarpetaConDocumentosModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Datos de la carpeta
  const [nombreCarpeta, setNombreCarpeta] = useState('');
  const [tipoAsignacion, setTipoAsignacion] = useState<'todos' | 'equipo' | 'empleados'>('todos');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('');
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [equipos, setEquipos] = useState<EquipoOption[]>([]);
  const [empleadosList, setEmpleadosList] = useState<EmpleadoOption[]>([]);
  const [cargandoAsignaciones, setCargandoAsignaciones] = useState(false);
  
  // Documentos a subir
  const [documentos, setDocumentos] = useState<UploadedFile[]>([]);

  useEffect(() => {
    if (!open) return;

    const cargarAsignaciones = async () => {
      setCargandoAsignaciones(true);
      try {
        const [equiposRes, empleadosRes] = await Promise.all([
          fetch('/api/organizacion/equipos'),
          fetch('/api/empleados?activos=true'),
        ]);

        if (equiposRes.ok) {
          const data = await equiposRes.json() as Record<string, unknown>;
          const lista = extractArrayFromResponse<{ id: string; nombre: string }>(data, { key: 'equipos' }) ?? [];
          setEquipos(lista);
        }

        if (empleadosRes.ok) {
          const data = await empleadosRes.json() as Record<string, unknown>;
          const lista = extractArrayFromResponse<{
            id: string;
            nombre?: string;
            apellidos?: string;
            usuario?: { nombre?: string; apellidos?: string };
          }>(data, { key: 'empleados' }) ?? [];

          setEmpleadosList(
            lista.map((empleado) => ({
              id: empleado.id,
              nombre: empleado.nombre || empleado.usuario?.nombre || '',
              apellidos: empleado.apellidos || empleado.usuario?.apellidos || '',
            }))
          );
        }
      } catch (error) {
        console.error('Error cargando datos de asignación:', error);
      } finally {
        setCargandoAsignaciones(false);
      }
    };

    void cargarAsignaciones();
  }, [open]);

  const buildAsignadoA = () => {
    if (tipoAsignacion === 'equipo' && equipoSeleccionado) {
      return `equipo:${equipoSeleccionado}`;
    }
    if (tipoAsignacion === 'empleados' && empleadosSeleccionados.length > 0) {
      return empleadosSeleccionados.map((id) => `empleado:${id}`).join(',');
    }
    return 'todos';
  };

  const handleCrearCarpeta = async () => {
    if (!nombreCarpeta.trim()) {
      alert('Por favor ingresa un nombre para la carpeta');
      return;
    }

    if (tipoAsignacion === 'equipo' && !equipoSeleccionado) {
      toast.error('Selecciona un equipo para asignar la carpeta');
      return;
    }

    if (tipoAsignacion === 'empleados' && empleadosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un empleado para asignar la carpeta');
      return;
    }

    setLoading(true);

    try {
      const asignadoA = buildAsignadoA();

      // 1. Crear carpeta
      const carpetaResponse = await fetch('/api/carpetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreCarpeta,
          compartida: true,
          asignadoA,
        }),
      });

      if (!carpetaResponse.ok) {
        const error = await parseJson<{ error?: string }>(carpetaResponse).catch(() => null);
        throw new Error(error?.error || 'Error al crear carpeta');
      }

      const { carpeta } = await parseJson<CrearCarpetaResponse>(carpetaResponse);

      // 2. Subir documentos si hay alguno
      if (documentos.length > 0) {
        const uploadPromises = documentos.map(async (doc) => {
          try {
            const formData = new FormData();
            
            // Si el nombre fue editado, crear un nuevo File con ese nombre
            // (Nota: La API actualmente usa el nombre del File, pero podríamos mejorar esto)
            const fileToUpload = doc.nombre !== doc.file.name 
              ? new File([doc.file], doc.nombre, { type: doc.file.type })
              : doc.file;
            
            formData.append('file', fileToUpload);
            formData.append('carpetaId', carpeta.id);
            formData.append('tipoDocumento', doc.tipoDocumento || 'otro');

            const uploadResponse = await fetch('/api/documentos', {
              method: 'POST',
              body: formData,
            });

            if (!uploadResponse.ok) {
              const error = await parseJson<{ error?: string }>(uploadResponse).catch(() => null);
              throw new Error(error?.error || `Error subiendo ${doc.nombre}`);
            }

            return parseJson<UploadDocumentoResponse>(uploadResponse);
          } catch (error) {
            console.error(`Error subiendo ${doc.nombre}:`, error);
            throw error;
          }
        });

        const results = await Promise.allSettled(uploadPromises);
        
        // Verificar si hubo errores
        const errores = results.filter(r => r.status === 'rejected');
        if (errores.length > 0) {
          console.warn(`${errores.length} documento(s) no se pudieron subir`);
        }
      }

      // 3. Resetear y cerrar
      setNombreCarpeta('');
      setTipoAsignacion('todos');
      setEquipoSeleccionado('');
      setEmpleadosSeleccionados([]);
      setDocumentos([]);
      
      onClose();
      
      // 4. Callback o redirigir
      if (onSuccess) {
        onSuccess(carpeta.id);
      } else {
        router.push(`/hr/documentos/${carpeta.id}`);
      }
    } catch (error) {
      console.error('Error creando carpeta:', error);
      alert(error instanceof Error ? error.message : 'Error al crear carpeta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            Crear Carpeta
          </DialogTitle>
          <DialogDescription>
            Crea una carpeta y asígnala a empleados o equipos. Opcionalmente sube documentos directamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nombre de la carpeta */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la carpeta *</Label>
            <Input
              id="nombre"
              value={nombreCarpeta}
              onChange={(e) => setNombreCarpeta(e.target.value)}
              placeholder="ej: Políticas 2025, Protocolos COVID, etc."
              disabled={loading}
            />
          </div>

          {/* Asignar a */}
          <div className="space-y-2">
            <Label>Compartir con</Label>
            <Select
              value={tipoAsignacion}
              onValueChange={(value) => {
                setTipoAsignacion(value as 'todos' | 'equipo' | 'empleados');
                setEquipoSeleccionado('');
                setEmpleadosSeleccionados([]);
              }}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los empleados</SelectItem>
                <SelectItem value="equipo">Equipo específico</SelectItem>
                <SelectItem value="empleados">Empleados seleccionados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipoAsignacion === 'equipo' && (
            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select
                value={equipoSeleccionado}
                onValueChange={setEquipoSeleccionado}
                disabled={loading || cargandoAsignaciones}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un equipo" />
                </SelectTrigger>
                <SelectContent>
                  {equipos.map((equipo) => (
                    <SelectItem key={equipo.id} value={equipo.id}>
                      {equipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipoAsignacion === 'empleados' && (
            <div className="space-y-2">
              <Label>Empleados</Label>
              <SearchableMultiSelect
                items={empleadosList.map((empleado) => ({
                  label: `${empleado.nombre} ${empleado.apellidos}`,
                  value: empleado.id,
                }))}
                values={empleadosSeleccionados}
                onChange={setEmpleadosSeleccionados}
                placeholder="Buscar empleados..."
                emptyMessage="No se encontraron empleados"
                disabled={loading || cargandoAsignaciones}
              />
            </div>
          )}

          {/* Subida de documentos */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Documentos (opcional)</Label>
              <InfoTooltip
                content="Puedes subir documentos ahora o hacerlo más tarde desde la carpeta."
              />
            </div>
            <DocumentUploaderInline
              onFilesChange={setDocumentos}
              maxFiles={20}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleCrearCarpeta} disabled={loading || !nombreCarpeta.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <FolderPlus className="mr-2 h-4 w-4" />
                Crear{documentos.length > 0 && ` y Subir ${documentos.length} ${documentos.length === 1 ? 'Documento' : 'Documentos'}`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

