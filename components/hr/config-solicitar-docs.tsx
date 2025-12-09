'use client';

// ========================================
// Config Solicitar Docs
// ========================================
// Configuración para acción de solicitar documentos

import { FolderPlus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Helper para generar IDs únicos
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

import type { SolicitarDocsConfig, DocumentoRequeridoSolicitar } from '@/lib/onboarding-config-types';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CarpetaMaster {
  id: string;
  nombre: string;
  esSistema: boolean;
}

interface ConfigSolicitarDocsProps {
  config: SolicitarDocsConfig;
  onChange: (config: SolicitarDocsConfig) => void;
}

export function ConfigSolicitarDocs({ config, onChange }: ConfigSolicitarDocsProps) {
  const [carpetasMaster, setCarpetasMaster] = useState<CarpetaMaster[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarDialogCarpeta, setMostrarDialogCarpeta] = useState(false);
  const [nombreNuevaCarpeta, setNombreNuevaCarpeta] = useState('');
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);

  useEffect(() => {
    cargarCarpetasMaster();
  }, []);

  const cargarCarpetasMaster = async () => {
    try {
      setCargando(true);
      const response = await fetch('/api/carpetas');
      if (response.ok) {
        const data = await response.json() as { carpetas?: CarpetaMaster[] };
        // Filtrar solo carpetas master (sin empleadoId y esSistema=true)
        const carpetasMaster = (data.carpetas || []).filter(
          (c) => c.esSistema && !('empleadoId' in c) || ('empleadoId' in c && !(c as { empleadoId?: string }).empleadoId)
        );
        setCarpetasMaster(carpetasMaster);
      }
    } catch (error) {
      console.error('[ConfigSolicitarDocs] Error:', error);
      toast.error('No se pudieron cargar las carpetas');
    } finally {
      setCargando(false);
    }
  };

  const crearNuevaCarpetaMaster = async () => {
    if (!nombreNuevaCarpeta.trim()) {
      toast.error('El nombre de la carpeta es requerido');
      return;
    }

    try {
      setCreandoCarpeta(true);
      const response = await fetch('/api/carpetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreNuevaCarpeta.trim(),
          esSistema: true,
          compartida: true,
          asignadoA: 'todos',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Error al crear carpeta');
      }

      const responseData = await response.json() as { success?: boolean; carpeta?: CarpetaMaster; error?: string };

      if (!responseData.success || !responseData.carpeta) {
        throw new Error(responseData.error || 'Error al crear carpeta');
      }

      // Añadir a la lista
      setCarpetasMaster([...carpetasMaster, responseData.carpeta]);
      toast.success('Carpeta master creada correctamente');
      setMostrarDialogCarpeta(false);
      setNombreNuevaCarpeta('');
    } catch (error) {
      console.error('[ConfigSolicitarDocs] Error al crear carpeta:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error al crear carpeta';
      toast.error(errorMsg);
    } finally {
      setCreandoCarpeta(false);
    }
  };

  const añadirDocumento = () => {
    const documentosRequeridos = config.documentosRequeridos || [];

    // Obtener la primera carpeta master disponible, o 'otros' si existe
    const carpetaDefecto = carpetasMaster.find(c => c.nombre.toLowerCase() === 'otros')
      || carpetasMaster[0];

    const nuevoDoc: DocumentoRequeridoSolicitar = {
      id: generateId(),
      nombre: '',
      requerido: true,
      carpetaDestinoId: carpetaDefecto?.id || '',
    };

    onChange({
      ...config,
      documentosRequeridos: [...documentosRequeridos, nuevoDoc],
    });
  };

  const actualizarDocumento = (index: number, campo: keyof DocumentoRequeridoSolicitar, valor: unknown) => {
    const documentosRequeridos = [...(config.documentosRequeridos || [])];
    documentosRequeridos[index] = {
      ...documentosRequeridos[index],
      [campo]: valor,
    };

    onChange({ ...config, documentosRequeridos });
  };

  const eliminarDocumento = (index: number) => {
    const documentosRequeridos = [...(config.documentosRequeridos || [])];
    documentosRequeridos.splice(index, 1);
    onChange({ ...config, documentosRequeridos });
  };

  const documentosRequeridos = config.documentosRequeridos || [];

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Documentos a Solicitar *</Label>
            <p className="text-sm text-gray-600 mt-1">
              Define qué documentos debe subir el empleado
            </p>
          </div>
          <Button size="sm" onClick={añadirDocumento} disabled={cargando}>
            <Plus className="h-4 w-4 mr-2" />
            Añadir Documento
          </Button>
        </div>

        {cargando && (
          <div className="text-center py-4 text-gray-500">Cargando carpetas...</div>
        )}

        {!cargando && documentosRequeridos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No hay documentos configurados</p>
            <p className="text-sm mt-2">Haz clic en "Añadir Documento" para empezar</p>
          </div>
        )}

        {!cargando && documentosRequeridos.map((doc, index) => (
          <div key={doc.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-gray-700">Documento #{index + 1}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => eliminarDocumento(index)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor={`doc-nombre-${index}`}>Nombre del Documento *</Label>
                <Input
                  id={`doc-nombre-${index}`}
                  value={doc.nombre}
                  onChange={(e) => actualizarDocumento(index, 'nombre', e.target.value)}
                  placeholder="Ej: DNI/NIE"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor={`doc-carpeta-${index}`}>Carpeta Destino *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMostrarDialogCarpeta(true)}
                  >
                    <FolderPlus className="h-4 w-4 mr-1" />
                    Nueva Carpeta
                  </Button>
                </div>
                <Select
                  value={doc.carpetaDestinoId}
                  onValueChange={(value) => actualizarDocumento(index, 'carpetaDestinoId', value)}
                >
                  <SelectTrigger id={`doc-carpeta-${index}`}>
                    <SelectValue placeholder="Seleccionar carpeta" />
                  </SelectTrigger>
                  <SelectContent>
                    {carpetasMaster.map((carpeta) => (
                      <SelectItem key={carpeta.id} value={carpeta.id}>
                        {carpeta.nombre}
                      </SelectItem>
                    ))}
                    {carpetasMaster.length === 0 && (
                      <div className="p-2 text-sm text-gray-500">
                        No hay carpetas disponibles. Crea una nueva carpeta.
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  El documento se subirá a una carpeta personal del empleado basada en esta carpeta master
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`doc-requerido-${index}`}
                  checked={doc.requerido}
                  onCheckedChange={(checked) =>
                    actualizarDocumento(index, 'requerido', checked === true)
                  }
                />
                <label
                  htmlFor={`doc-requerido-${index}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  Documento requerido (obligatorio para finalizar onboarding)
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog para crear nueva carpeta master */}
      <Dialog open={mostrarDialogCarpeta} onOpenChange={setMostrarDialogCarpeta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Carpeta Master</DialogTitle>
            <DialogDescription>
              Esta carpeta se creará como carpeta personal para cada empleado nuevo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nombre-carpeta">Nombre de la Carpeta *</Label>
              <Input
                id="nombre-carpeta"
                value={nombreNuevaCarpeta}
                onChange={(e) => setNombreNuevaCarpeta(e.target.value)}
                placeholder="Ej: Certificados, Formación, etc."
                disabled={creandoCarpeta}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMostrarDialogCarpeta(false);
                setNombreNuevaCarpeta('');
              }}
              disabled={creandoCarpeta}
            >
              Cancelar
            </Button>
            <Button
              onClick={crearNuevaCarpetaMaster}
              disabled={creandoCarpeta || !nombreNuevaCarpeta.trim()}
            >
              {creandoCarpeta ? 'Creando...' : 'Crear Carpeta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
