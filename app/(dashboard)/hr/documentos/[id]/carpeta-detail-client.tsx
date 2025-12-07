// ========================================
// HR - Carpeta Detail Client Component
// ========================================

'use client';

import {
  ArrowLeft,
  Check,
  Download,
  Edit2,
  FileImage,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderInput,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DocumentUploadArea } from '@/components/shared/document-upload-area';
import { DocumentViewerModal, useDocumentViewer } from '@/components/shared/document-viewer';
import { EmptyState } from '@/components/shared/empty-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { LoadingButton } from '@/components/shared/loading-button';
import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
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
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { esDocumentoFirmable, getMensajeTipoDocumento } from '@/lib/documentos/utils';

interface Documento {
  id: string;
  nombre: string;
  tipoDocumento: string;
  mimeType: string;
  tamano: number;
  createdAt: string;
  firmado: boolean;
  firmadoEn: string | null;
  empleado?: {
    id: string;
    nombre: string;
    apellidos: string;
  } | null;
}

interface Carpeta {
  id: string;
  nombre: string;
  esSistema: boolean;
  compartida: boolean;
  asignadoA?: string | null;
  esCarpetaMasterHR?: boolean;
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
  empleados?: Empleado[];
}

/**
 * Determina el icono correcto según el tipo MIME del documento
 */
function getDocumentIcon(mimeType: string) {
  // PDFs
  if (mimeType === 'application/pdf') {
    return FileText;
  }

  // Documentos de Word
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    mimeType.includes('word')
  ) {
    return FileText;
  }

  // Hojas de cálculo (Excel)
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType.includes('spreadsheet')
  ) {
    return FileSpreadsheet;
  }

  // Imágenes
  if (mimeType.startsWith('image/')) {
    return FileImage;
  }

  // Default
  return FileText;
}

export function CarpetaDetailClient({ carpeta, empleados = [] }: CarpetaDetailClientProps) {
  const router = useRouter();
  const [modalUploadOpen, setModalUploadOpen] = useState(false);
  const [empleadoDestinoUpload, setEmpleadoDestinoUpload] = useState('');
  const [modalEliminar, setModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [documentoAEliminar, setDocumentoAEliminar] = useState<string | null>(
    null
  );

  // Estados para modal de editar nombre
  const [modalEditarNombre, setModalEditarNombre] = useState(false);
  const [documentoAEditar, setDocumentoAEditar] = useState<Documento | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editandoNombre, setEditandoNombre] = useState(false);

  // Estados para modal de mover documento
  const [modalMoverDocumento, setModalMoverDocumento] = useState(false);
  const [documentoAMover, setDocumentoAMover] = useState<Documento | null>(null);
  const [carpetaDestino, setCarpetaDestino] = useState('');
  const [carpetasDisponibles, setCarpetasDisponibles] = useState<Array<{ id: string; nombre: string }>>([]);
  const [cargandoCarpetas, setCargandoCarpetas] = useState(false);
  const [moviendoDocumento, setMoviendoDocumento] = useState(false);

  // Estados para filtros (solo para carpetas globales)
  const [filtroEmpleado, setFiltroEmpleado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  // Estados para modal de editar asignación
  const [modalEditarAsignacion, setModalEditarAsignacion] = useState(false);
  const [tipoAsignacion, setTipoAsignacion] = useState<'todos' | 'equipo' | 'individual'>('todos');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('');
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [empleadosList, setEmpleadosList] = useState<Empleado[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [actualizandoAsignacion, setActualizandoAsignacion] = useState(false);

  // Document viewer state
  const documentViewer = useDocumentViewer();

  const handleUploadButtonClick = useCallback(() => {
    if (carpeta.esCarpetaMasterHR) {
      if (empleados.length === 0) {
        toast.error('No hay empleados activos para asignar este documento.');
        return;
      }
      setEmpleadoDestinoUpload((prev) => prev || empleados[0]?.id || '');
    } else {
      setEmpleadoDestinoUpload('');
    }
    setModalUploadOpen(true);
  }, [carpeta.esCarpetaMasterHR, empleados]);

  const parsearAsignadoA = useCallback(() => {
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
  }, [carpeta]);

  const cargarDatos = useCallback(async () => {
    setCargandoDatos(true);
    try {
      const [equiposRes, empleadosRes] = await Promise.all([
        fetch('/api/organizacion/equipos'),
        fetch('/api/empleados'),
      ]);

      if (equiposRes.ok) {
        const payload = await equiposRes.json() as Record<string, unknown>;
        const listaEquipos = extractArrayFromResponse<
          { id: string; nombre: string }
        >(payload, { key: 'equipos' });
        setEquipos(listaEquipos || []);
      }

      if (empleadosRes.ok) {
        const payload = await empleadosRes.json() as Record<string, unknown>;
        const lista = extractArrayFromResponse<
          {
            id: string;
            nombre?: string;
            apellidos?: string;
            usuario?: {
              nombre?: string;
              apellidos?: string;
            };
          }
        >(payload, { key: 'empleados' });
        setEmpleadosList(
          lista.map((empleado) => ({
            id: empleado.id,
            nombre: empleado.nombre || empleado.usuario?.nombre || '',
            apellidos: empleado.apellidos || empleado.usuario?.apellidos || '',
          }))
        );
      }
    } catch (error: unknown) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargandoDatos(false);
    }
  }, []);

  // Cargar equipos y empleados cuando se abre el modal
  useEffect(() => {
    if (modalEditarAsignacion) {
      cargarDatos();
      // Parsear asignadoA actual para pre-seleccionar valores
      parsearAsignadoA();
    }
  }, [modalEditarAsignacion, cargarDatos, parsearAsignadoA]);

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
        const error = await response.json() as Record<string, unknown>;
        throw new Error(typeof error.error === 'string' ? error.error : 'Error al actualizar asignación');
      }

      toast.success('Asignación actualizada correctamente');
      setModalEditarAsignacion(false);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar asignación';
      toast.error(message);
    } finally {
      setActualizandoAsignacion(false);
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
    } catch (error: unknown) {
      console.error('Error al descargar documento:', error);
      toast.error('Error al descargar documento');
    }
  };

  const handleVerDocumento = (documento: Documento) => {
    documentViewer.openViewer(documento.id, documento.nombre, documento.mimeType);
  };

  const handleSolicitarFirma = (documento: Documento) => {
    if (!esDocumentoFirmable(documento.mimeType)) {
      toast.error('Solo los documentos PDF y Word pueden enviarse a firma.');
      return;
    }
    // Navegar a la página de solicitar firma (fuera del dashboard)
    router.push(`/firma/solicitar/${documento.id}`);
  };

  const handleEliminar = async () => {
    if (!documentoAEliminar) return;

    setEliminando(true);
    try {
      const response = await fetch(`/api/documentos/${documentoAEliminar}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json() as Record<string, unknown>;
        throw new Error(typeof error.error === 'string' ? error.error : 'Error al eliminar documento');
      }

      setModalEliminar(false);
      setDocumentoAEliminar(null);
      toast.success('Documento eliminado correctamente');
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar documento';
      toast.error(message);
    } finally {
      setEliminando(false);
    }
  };

  const handleAbrirModalEditar = (documento: Documento) => {
    setDocumentoAEditar(documento);
    setNuevoNombre(documento.nombre);
    setModalEditarNombre(true);
  };

  const handleGuardarNombre = async () => {
    if (!documentoAEditar) return;

    if (!nuevoNombre.trim()) {
      toast.error('El nombre del documento no puede estar vacío');
      return;
    }

    setEditandoNombre(true);
    try {
      const response = await fetch(`/api/documentos/${documentoAEditar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre.trim() }),
      });

      if (!response.ok) {
        const error = await response.json() as Record<string, unknown>;
        throw new Error(typeof error.error === 'string' ? error.error : 'Error al actualizar nombre');
      }

      setModalEditarNombre(false);
      setDocumentoAEditar(null);
      setNuevoNombre('');
      toast.success('Nombre del documento actualizado correctamente');
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar nombre';
      toast.error(message);
    } finally {
      setEditandoNombre(false);
    }
  };

  const handleAbrirModalMover = async (documento: Documento) => {
    setDocumentoAMover(documento);
    setCarpetaDestino('');
    setModalMoverDocumento(true);

    // Cargar carpetas disponibles
    setCargandoCarpetas(true);
    try {
      const response = await fetch('/api/carpetas');
      if (!response.ok) throw new Error('Error al cargar carpetas');

      const data = await response.json() as { carpetas?: Array<{ id: string; nombre: string }> };
      const carpetas = data.carpetas || [];
      setCarpetasDisponibles(carpetas);
    } catch (error: unknown) {
      console.error('Error cargando carpetas:', error);
      toast.error('Error al cargar carpetas disponibles');
    } finally {
      setCargandoCarpetas(false);
    }
  };

  const handleMoverDocumento = async () => {
    if (!documentoAMover || !carpetaDestino) return;

    setMoviendoDocumento(true);
    try {
      const response = await fetch(`/api/documentos/${documentoAMover.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carpetaId: carpetaDestino }),
      });

      if (!response.ok) {
        const error = await response.json() as Record<string, unknown>;
        throw new Error(typeof error.error === 'string' ? error.error : 'Error al mover documento');
      }

      setModalMoverDocumento(false);
      setDocumentoAMover(null);
      setCarpetaDestino('');
      toast.success('Documento movido a otra carpeta correctamente');
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al mover documento';
      toast.error(message);
    } finally {
      setMoviendoDocumento(false);
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

  // Filtrar documentos (solo para carpetas globales)
  const documentosFiltrados = carpeta.esCarpetaMasterHR
    ? carpeta.documentos.filter((doc) => {
        if (filtroEmpleado !== 'todos' && doc.empleado?.id !== filtroEmpleado) {
          return false;
        }
        if (busqueda.trim()) {
          const termino = busqueda.toLowerCase();
          const coincideNombre = doc.nombre.toLowerCase().includes(termino);
          const coincideEmpleado = doc.empleado
            ? `${doc.empleado.nombre} ${doc.empleado.apellidos}`.toLowerCase().includes(termino)
            : false;
          return coincideNombre || coincideEmpleado;
        }
        return true;
      })
    : carpeta.documentos;

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
              {carpeta.esCarpetaMasterHR && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <span>Carpeta global con documentos de todos los empleados.</span>
                  <InfoTooltip
                    content={`Carpeta global que reúne todos los documentos tipo "${carpeta.nombre}" de la empresa.`}
                  />
                </div>
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
              <Button onClick={handleUploadButtonClick}>
                <Upload className="w-4 h-4 mr-2" />
                Subir Documentos
              </Button>
            </div>
          </div>
        </div>


        {/* Filtros (solo para carpetas globales) */}
        {carpeta.esCarpetaMasterHR && empleados.length > 0 && (
          <div className="mb-4 flex-shrink-0 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="filtro-empleado" className="text-xs text-gray-600">Filtrar por empleado</Label>
                <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
                  <SelectTrigger id="filtro-empleado">
                    <SelectValue placeholder="Todos los empleados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los empleados</SelectItem>
                    {empleados.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre} {emp.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="busqueda" className="text-xs text-gray-600">Buscar documento</Label>
                <Input
                  id="busqueda"
                  placeholder="Buscar por nombre o empleado..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Contador de documentos */}
        <div className="mb-4 flex-shrink-0">
          <p className="text-sm text-gray-600 font-medium">
            {documentosFiltrados.length}{' '}
            {documentosFiltrados.length === 1 ? 'documento' : 'documentos'}
            {carpeta.esCarpetaMasterHR && documentosFiltrados.length !== carpeta.documentos.length && (
              <span className="text-gray-500"> (de {carpeta.documentos.length} total)</span>
            )}
          </p>
        </div>

        {/* Lista de documentos */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {documentosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <EmptyState
                layout="inline"
                icon={FileText}
                title="No hay documentos en esta carpeta"
                description="Haz clic en 'Subir Documentos' para añadir archivos"
                action={
                  <Button onClick={handleUploadButtonClick}>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Documento
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">
                      Nombre
                    </th>
                    {carpeta.esCarpetaMasterHR && (
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">
                        Empleado
                      </th>
                    )}
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">
                      Tipo
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">
                      Tamaño
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">
                      Fecha
                    </th>
                    <th className="w-[120px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {documentosFiltrados.map((documento) => (
                    <tr
                      key={documento.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => handleVerDocumento(documento)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const IconComponent = getDocumentIcon(documento.mimeType);
                            return <IconComponent className="w-5 h-5 text-gray-400" />;
                          })()}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {documento.nombre}
                              </span>
                              {documento.firmado && (
                                <span className="text-xs px-1.5 py-0.5 bg-[#FFF4ED] text-[#d97757] rounded-md font-medium">
                                  Firmado
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">{documento.mimeType}</span>
                          </div>
                        </div>
                      </td>
                      {carpeta.esCarpetaMasterHR && (
                        <td className="py-3 px-4">
                          {documento.empleado ? (
                            <span className="text-sm text-gray-700">
                              {documento.empleado.nombre} {documento.empleado.apellidos}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Sin asignar</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {documento.tipoDocumento || 'Documento'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatearTamano(documento.tamano)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatearFecha(documento.createdAt)}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar nombre"
                            onClick={() => handleAbrirModalEditar(documento)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mover a otra carpeta"
                            onClick={() => handleAbrirModalMover(documento)}
                          >
                            <FolderInput className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={
                              esDocumentoFirmable(documento.mimeType)
                                ? `Solicitar firma - ${getMensajeTipoDocumento(documento.mimeType)}`
                                : 'Solo PDF y Word pueden enviarse a firma'
                            }
                            disabled={!esDocumentoFirmable(documento.mimeType)}
                            onClick={() => handleSolicitarFirma(documento)}
                          >
                            <FileSignature className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Descargar"
                            onClick={() => handleDescargar(documento.id, documento.nombre)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar"
                            onClick={() => {
                              setDocumentoAEliminar(documento.id);
                              setModalEliminar(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-gray-600" />
                          </Button>
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
                      items={empleadosList.map((e) => ({
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

      {/* Modal subir documentos */}
      <Dialog
        open={modalUploadOpen}
        onOpenChange={(open) => {
          setModalUploadOpen(open);
          if (!open) {
            setEmpleadoDestinoUpload('');
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subir documentos</DialogTitle>
            <DialogDescription>
              Selecciona los archivos que quieres añadir a la carpeta <strong>{carpeta.nombre}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {carpeta.esCarpetaMasterHR ? (
              <div className="space-y-2">
                <Label>Asignar a empleado</Label>
                <Select
                  value={empleadoDestinoUpload || undefined}
                  onValueChange={setEmpleadoDestinoUpload}
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
                  Esta carpeta es maestra. Cada documento debe asignarse a la subcarpeta del empleado correspondiente.
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Los documentos se guardarán en la carpeta individual asignada a{' '}
                {carpeta.empleado ? `${carpeta.empleado.nombre} ${carpeta.empleado.apellidos}` : 'esta carpeta'}.
              </p>
            )}

            <DocumentUploadArea
              carpetaId={carpeta.id}
              variant="dropzone"
              description="PDF, JPG o PNG | Máx. 10MB"
              onUploaded={() => {
                setModalUploadOpen(false);
                setEmpleadoDestinoUpload('');
                router.refresh();
              }}
              disabled={carpeta.esCarpetaMasterHR && !empleadoDestinoUpload}
              getExtraFormData={() =>
                carpeta.esCarpetaMasterHR && empleadoDestinoUpload ? { empleadoId: empleadoDestinoUpload } : undefined
              }
            />
          </div>
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

      {/* Modal Editar Nombre */}
      <Dialog open={modalEditarNombre} onOpenChange={setModalEditarNombre}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nombre del Documento</DialogTitle>
            <DialogDescription>
              Cambia el nombre del documento. Los cambios se aplicarán inmediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="nuevoNombre">Nombre del documento</Label>
            <Input
              id="nuevoNombre"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ingresa el nuevo nombre"
              disabled={editandoNombre}
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !editandoNombre) {
                  handleGuardarNombre();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalEditarNombre(false);
                setDocumentoAEditar(null);
                setNuevoNombre('');
              }}
              disabled={editandoNombre}
            >
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleGuardarNombre}
              loading={editandoNombre}
            >
              <Check className="w-4 h-4 mr-2" />
              Guardar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Mover Documento */}
      <Dialog open={modalMoverDocumento} onOpenChange={setModalMoverDocumento}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Documento</DialogTitle>
            <DialogDescription>
              Selecciona la carpeta de destino para mover {documentoAMover?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="carpetaDestino">Carpeta de destino</Label>
            {cargandoCarpetas ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Select
                value={carpetaDestino}
                onValueChange={setCarpetaDestino}
                disabled={moviendoDocumento}
              >
                <SelectTrigger id="carpetaDestino">
                  <SelectValue placeholder="Selecciona una carpeta" />
                </SelectTrigger>
                <SelectContent>
                  {carpetasDisponibles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalMoverDocumento(false);
                setDocumentoAMover(null);
                setCarpetaDestino('');
              }}
              disabled={moviendoDocumento}
            >
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleMoverDocumento}
              loading={moviendoDocumento}
              disabled={!carpetaDestino}
            >
              <FolderInput className="w-4 h-4 mr-2" />
              Mover
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Asignación */}
      <Dialog open={modalEditarAsignacion} onOpenChange={setModalEditarAsignacion}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Asignación de Carpeta Compartida</DialogTitle>
            <DialogDescription>
              Configura quién puede acceder a esta carpeta compartida. Los cambios se aplicarán inmediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-sm font-medium">Tipo de asignación</Label>
              <Select
                value={tipoAsignacion}
                onValueChange={(val) => setTipoAsignacion(val as 'todos' | 'equipo' | 'individual')}
                disabled={actualizandoAsignacion}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los empleados</SelectItem>
                  <SelectItem value="equipo">Equipo específico</SelectItem>
                  <SelectItem value="individual">Empleados específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoAsignacion === 'equipo' && (
              <div>
                <Label className="text-sm font-medium">
                  Seleccionar Equipo
                </Label>
                {cargandoDatos ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <SearchableSelect
                    value={equipoSeleccionado}
                    onChange={setEquipoSeleccionado}
                    items={equipos.map(eq => ({
                      value: eq.id,
                      label: eq.nombre,
                    }))}
                    placeholder="Buscar equipo..."
                    emptyMessage="No se encontraron equipos"
                    disabled={actualizandoAsignacion}
                    className="mt-2"
                  />
                )}
              </div>
            )}

            {tipoAsignacion === 'individual' && (
              <div>
                <Label className="text-sm font-medium">
                  Seleccionar Empleados
                  <InfoTooltip content="Puedes seleccionar múltiples empleados" />
                </Label>
                {cargandoDatos ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <SearchableMultiSelect
                    items={empleadosList.map(emp => ({
                      value: emp.id,
                      label: `${emp.nombre} ${emp.apellidos}`,
                    }))}
                    values={empleadosSeleccionados}
                    onChange={setEmpleadosSeleccionados}
                    placeholder="Buscar empleados..."
                    emptyMessage="No se encontraron empleados"
                    disabled={actualizandoAsignacion}
                  />
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
            <LoadingButton
              onClick={handleActualizarAsignacion}
              loading={actualizandoAsignacion}
            >
              <Check className="w-4 h-4 mr-2" />
              Guardar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Modal */}
      {documentViewer.documentId && (
        <DocumentViewerModal
          open={documentViewer.isOpen}
          onClose={documentViewer.closeViewer}
          documentId={documentViewer.documentId}
          title={documentViewer.documentTitle}
          mimeType={documentViewer.documentMimeType ?? undefined}
          onDownload={() => {
            if (documentViewer.documentId) {
              handleDescargar(documentViewer.documentId, documentViewer.documentTitle);
            }
          }}
          actions={
            esDocumentoFirmable(documentViewer.documentMimeType) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const doc = carpeta.documentos.find(d => d.id === documentViewer.documentId);
                  if (doc) {
                    documentViewer.closeViewer();
                    handleSolicitarFirma(doc);
                  }
                }}
              >
                <FileSignature className="w-4 h-4 mr-2" />
                Solicitar firma
              </Button>
            ) : undefined
          }
        />
      )}
    </>
  );
}
