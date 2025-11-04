// ========================================
// Documentos Client Component - HR View
// ========================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Upload, FolderPlus, FileText } from 'lucide-react';
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
import { SearchableSelect } from '@/components/shared/searchable-select';
import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
import { LoadingButton } from '@/components/shared/loading-button';

interface Carpeta {
  id: string;
  nombre: string;
  esSistema: boolean;
  numeroDocumentos: number;
  numeroSubcarpetas: number;
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

interface DocumentosClientProps {
  carpetas: Carpeta[];
}

export function DocumentosClient({ carpetas }: DocumentosClientProps) {
  const router = useRouter();
  const [modalCrearCarpeta, setModalCrearCarpeta] = useState(false);
  const [nombreCarpeta, setNombreCarpeta] = useState('');
  const [tipoAsignacion, setTipoAsignacion] = useState<'todos' | 'equipo' | 'individual'>('todos');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('');
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);

  // Cargar equipos y empleados cuando se abre el modal
  useEffect(() => {
    if (modalCrearCarpeta) {
      cargarDatos();
    }
  }, [modalCrearCarpeta]);

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

  const handleCrearCarpeta = async () => {
    if (!nombreCarpeta.trim()) {
      toast.error('El nombre de la carpeta es requerido');
      return;
    }

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

    setCargando(true);
    try {
      const response = await fetch('/api/carpetas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombreCarpeta,
          compartida: true,
          asignadoA: asignadoA,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear carpeta');
      }

      // Resetear form y cerrar modal
      setNombreCarpeta('');
      setTipoAsignacion('todos');
      setEquipoSeleccionado('');
      setEmpleadosSeleccionados([]);
      setModalCrearCarpeta(false);

      // Mostrar notificación de éxito
      toast.success('Carpeta creada exitosamente');

      // Recargar página para mostrar nueva carpeta
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear carpeta');
    } finally {
      setCargando(false);
    }
  };

  const handleAbrirCarpeta = (carpetaId: string) => {
    router.push(`/hr/documentos/${carpetaId}`);
  };

  return (
    <>
      <div className="h-full w-full flex flex-col">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona documentos y carpetas de la empresa
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setModalCrearCarpeta(true)}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Crear Carpeta
              </Button>
              <Button
                variant="default"
                onClick={() => router.push('/hr/documentos/subir')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Documentos
              </Button>
            </div>
          </div>
        </div>

        {/* Contador de carpetas */}
        <div className="mb-6 flex-shrink-0">
          <p className="text-sm text-gray-700 font-medium">
            {carpetas.length} {carpetas.length === 1 ? 'carpeta' : 'carpetas'}
          </p>
        </div>

        {/* Grid de carpetas */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-6">
            {carpetas.map((carpeta) => (
              <div
                key={carpeta.id}
                className="group cursor-pointer"
                onClick={() => handleAbrirCarpeta(carpeta.id)}
              >
                {/* Contenedor con fondo suave */}
                <div className="bg-gray-50/50 rounded-3xl p-6 group-hover:bg-gray-100/50 transition-all duration-200 border border-gray-200">
                  <div className="flex flex-col items-center space-y-3">
                    {/* Círculo con icono de carpeta */}
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-200 shadow-sm">
                      <Folder className="w-14 h-14 text-gray-600 group-hover:text-gray-700 transition-colors" strokeWidth={1.5} />
                    </div>

                    {/* Nombre de la carpeta */}
                    <div className="text-center w-full">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        {carpeta.nombre}
                      </p>

                      {/* Info adicional */}
                      <div className="flex flex-col items-center gap-0.5">
                        {carpeta.esSistema && (
                          <span className="text-xs text-gray-500 font-medium">Sistema</span>
                        )}
                        {carpeta.numeroDocumentos > 0 && (
                          <p className="text-xs text-gray-500">
                            {carpeta.numeroDocumentos} doc{carpeta.numeroDocumentos !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Mensaje si no hay carpetas */}
            {carpetas.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  variant="primary"
                  icon={Folder}
                  title="No hay carpetas creadas"
                  description="Crea tu primera carpeta para organizar los documentos de la empresa"
                  action={
                    <Button onClick={() => setModalCrearCarpeta(true)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Crear Carpeta
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Crear Carpeta */}
      <Dialog open={modalCrearCarpeta} onOpenChange={setModalCrearCarpeta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Carpeta Compartida</DialogTitle>
            <DialogDescription>
              Crea una carpeta para compartir documentos con empleados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la carpeta</Label>
              <Input
                id="nombre"
                placeholder="Ej: Políticas 2025"
                value={nombreCarpeta}
                onChange={(e) => setNombreCarpeta(e.target.value)}
                disabled={cargandoDatos}
              />
            </div>

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
              onClick={() => setModalCrearCarpeta(false)}
              disabled={cargando}
            >
              Cancelar
            </Button>
            <LoadingButton loading={cargando} onClick={handleCrearCarpeta}>
              Crear Carpeta
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
