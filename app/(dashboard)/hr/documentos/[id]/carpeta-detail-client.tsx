// ========================================
// HR - Carpeta Detail Client Component
// ========================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Trash2,
  Folder,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingButton } from '@/components/shared/loading-button';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';

interface Documento {
  id: string;
  nombre: string;
  tipoDocumento: string;
  mimeType: string;
  tamano: number;
  createdAt: string;
}

interface Carpeta {
  id: string;
  nombre: string;
  esSistema: boolean;
  compartida: boolean;
  asignadoA?: string | null;
  empleado?: {
    id: string;
    nombre: string;
    apellidos: string;
  } | null;
  documentos: Documento[];
}

interface Equipo {
  id: string;
  nombre: string;
}

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
}

interface CarpetaDetailClientProps {
  carpeta: Carpeta;
}

export function CarpetaDetailClient({ carpeta }: CarpetaDetailClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [documentoAEliminar, setDocumentoAEliminar] = useState<string | null>(
    null
  );

  // Estados para modal de editar asignación
  const [modalEditarAsignacion, setModalEditarAsignacion] = useState(false);
  const [tipoAsignacion, setTipoAsignacion] = useState<'todos' | 'equipo' | 'individual'>('todos');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('');
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [actualizandoAsignacion, setActualizandoAsignacion] = useState(false);

  // Cargar equipos y empleados cuando se abre el modal
  useEffect(() => {
    if (modalEditarAsignacion) {
      cargarDatos();
      // Parsear asignadoA actual para pre-seleccionar valores
      parsearAsignadoA();
    }
  }, [modalEditarAsignacion]);

  const parsearAsignadoA = () => {
    if (!carpeta.asignadoA) {
      setTipoAsignacion('todos');
      return;
    }

    if (carpeta.asignadoA === 'todos') {
      setTipoAsignacion('todos');
    } else if (carpeta.asignadoA.startsWith('equipo:')) {
      setTipoAsignacion('equipo');
      setEquipoSeleccionado(carpeta.asignadoA.replace('equipo:', ''));
    } else if (carpeta.asignadoA.includes('empleado:')) {
      setTipoAsignacion('individual');
      const empleadosIds = carpeta.asignadoA
        .split(',')
        .map(s => s.trim())
        .filter(s => s.startsWith('empleado:'))
        .map(s => s.replace('empleado:', ''));
      setEmpleadosSeleccionados(empleadosIds);
    } else {
      setTipoAsignacion('todos');
    }
  };

  const cargarDatos = async () => {
    setCargandoDatos(true);
    try {
      const [equiposRes, empleadosRes] = await Promise.all([
        fetch('/api/organizacion/equipos'),
        fetch('/api/empleados'),
      ]);

      if (equiposRes.ok) {
        const { equipos } = await equiposRes.json();
        setEquipos(equipos || []);
      }

      if (empleadosRes.ok) {
        const { empleados } = await empleadosRes.json();
        setEmpleados(empleados || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargandoDatos(false);
    }
  };

  const handleActualizarAsignacion = async () => {
    // Validar según tipo de asignación
    if (tipoAsignacion === 'equipo' && !equipoSeleccionado) {
      toast.error('Debes seleccionar un equipo');
      return;
    }

    if (tipoAsignacion === 'individual' && empleadosSeleccionados.length === 0) {
      toast.error('Debes seleccionar al menos un empleado');
      return;
    }

    // Construir valor de asignadoA
    let asignadoA = 'todos';
    if (tipoAsignacion === 'equipo') {
      asignadoA = `equipo:${equipoSeleccionado}`;
    } else if (tipoAsignacion === 'individual') {
      asignadoA = empleadosSeleccionados.map(id => `empleado:${id}`).join(',');
    }

    setActualizandoAsignacion(true);
    try {
      const response = await fetch(`/api/carpetas/${carpeta.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compartida: true,
          asignadoA: asignadoA,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar asignación');
      }

      toast.success('Asignación actualizada correctamente');
      setModalEditarAsignacion(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar asignación');
    } finally {
      setActualizandoAsignacion(false);
    }
  };

  const handleSubirArchivo = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('carpetaId', carpeta.id);

        const response = await fetch('/api/documentos', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Error al subir archivo');
        }
      }

      // Mostrar notificación de éxito
      toast.success(
        `${files.length === 1 ? 'Documento subido' : `${files.length} documentos subidos`} correctamente`                                                       
      );

      // Recargar página para mostrar nuevos documentos
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al subir archivos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDescargar = async (documentoId: string, nombre: string) => {
    try {
      const response = await fetch(`/api/documentos/${documentoId}`);

      if (!response.ok) {
        throw new Error('Error al descargar documento');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Documento descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar documento');
    }
  };

  const handleEliminar = async () => {
    if (!documentoAEliminar) return;

    setEliminando(true);
    try {
      const response = await fetch(`/api/documentos/${documentoAEliminar}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar documento');
      }

      setModalEliminar(false);
      setDocumentoAEliminar(null);
      toast.success('Documento eliminado correctamente');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar documento');
    } finally {
      setEliminando(false);
    }
  };

  const formatearTamano = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="h-full w-full flex flex-col">
        {/* Header con breadcrumb */}
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
                <Folder className="w-6 h-6 text-gray-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  {carpeta.nombre}
                </h1>
                {carpeta.esSistema && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">                                                                    
                    Sistema
                  </span>
                )}
                {carpeta.compartida && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">                                                                        
                    Compartida
                  </span>
                )}
              </div>
              {carpeta.empleado && (
                <p className="text-sm text-gray-600">
                  Empleado: {carpeta.empleado.nombre}{' '}
                  {carpeta.empleado.apellidos}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {carpeta.compartida && !carpeta.esSistema && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalEditarAsignacion(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Editar Asignación
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleSubirArchivo}
                disabled={uploading}
              />
              <LoadingButton
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Documentos
              </LoadingButton>
            </div>
          </div>
        </div>

        {/* Contador de documentos */}
        <div className="mb-4 flex-shrink-0">
          <p className="text-sm text-gray-600 font-medium">
            {carpeta.documentos.length}{' '}
            {carpeta.documentos.length === 1 ? 'documento' : 'documentos'}
          </p>
        </div>

        {/* Lista de documentos */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {carpeta.documentos.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <EmptyState
                variant="secondary"
                icon={FileText}
                title="No hay documentos en esta carpeta"
                description="Haz clic en 'Subir Documentos' para añadir archivos"
                action={
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Documento
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">
                      Nombre
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">
                      Tipo
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">
                      Tamaño
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">
                      Fecha
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {carpeta.documentos.map((documento) => (
                    <tr
                      key={documento.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {documento.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {documento.tipoDocumento}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatearTamano(documento.tamano)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatearFecha(documento.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              handleDescargar(documento.id, documento.nombre)
                            }
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors group"
                            title="Descargar"
                          >
                            <Download className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              setDocumentoAEliminar(documento.id);
                              setModalEliminar(true);
                            }}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors group"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Editar Asignación */}
      <Dialog open={modalEditarAsignacion} onOpenChange={setModalEditarAsignacion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Asignación de Carpeta</DialogTitle>
            <DialogDescription>
              Define quién puede acceder a esta carpeta compartida
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipoAsignacion">Asignar a</Label>
              <Select
                value={tipoAsignacion}
                onValueChange={(value: 'todos' | 'equipo' | 'individual') => {
                  setTipoAsignacion(value);
                  setEquipoSeleccionado('');
                  setEmpleadosSeleccionados([]);
                }}
                disabled={cargandoDatos}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona a quién asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los empleados</SelectItem>
                  <SelectItem value="equipo">Por equipo</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selector de equipo */}
            {tipoAsignacion === 'equipo' && (
              <div className="space-y-2">
                <Label htmlFor="equipo">Seleccionar equipo</Label>
                <SearchableSelect
                  items={equipos.map((e) => ({ value: e.id, label: e.nombre }))}
                  value={equipoSeleccionado}
                  onChange={setEquipoSeleccionado}
                  placeholder="Buscar equipo..."
                  emptyMessage="No se encontraron equipos"
                  disabled={cargandoDatos}
                />
              </div>
            )}

            {/* Selector de empleados */}
            {tipoAsignacion === 'individual' && (
              <div className="space-y-2">
                <Label>Seleccionar empleados</Label>
                {cargandoDatos ? (
                  <div className="text-sm text-gray-500 py-2">Cargando empleados...</div>                                                                       
                ) : (
                  <>
                    <SearchableMultiSelect
                      items={empleados.map((e) => ({
                        value: e.id,
                        label: `${e.nombre} ${e.apellidos}`,
                      }))}
                      values={empleadosSeleccionados}
                      onChange={setEmpleadosSeleccionados}
                      placeholder="Buscar empleados..."
                      emptyMessage="No se encontraron empleados"
                      disabled={cargandoDatos}
                    />
                    {empleadosSeleccionados.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {empleadosSeleccionados.length} empleado{empleadosSeleccionados.length !== 1 ? 's' : ''} seleccionado{empleadosSeleccionados.length !== 1 ? 's' : ''}                                                                   
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalEditarAsignacion(false)}
              disabled={actualizandoAsignacion}
            >
              Cancelar
            </Button>
            <LoadingButton loading={actualizandoAsignacion} onClick={handleActualizarAsignacion}>
              Guardar Cambios
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar Documento */}
      <Dialog open={modalEliminar} onOpenChange={setModalEliminar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Documento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar este documento? Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalEliminar(false);
                setDocumentoAEliminar(null);
              }}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={handleEliminar}
              loading={eliminando}
            >
              Eliminar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
