'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DocumentUploaderInline } from '@/components/shared/document-uploader-inline';
import { Loader2, FolderPlus } from 'lucide-react';
import { InfoTooltip } from '@/components/shared/info-tooltip';

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

export function CrearCarpetaConDocumentosModal({
  open,
  onClose,
  onSuccess,
}: CrearCarpetaConDocumentosModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Datos de la carpeta
  const [nombreCarpeta, setNombreCarpeta] = useState('');
  const [asignadoA, setAsignadoA] = useState<string>('todos');
  
  // Documentos a subir
  const [documentos, setDocumentos] = useState<UploadedFile[]>([]);

  const handleCrearCarpeta = async () => {
    if (!nombreCarpeta.trim()) {
      alert('Por favor ingresa un nombre para la carpeta');
      return;
    }

    setLoading(true);

    try {
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
        const error = await carpetaResponse.json();
        throw new Error(error.error || 'Error al crear carpeta');
      }

      const { carpeta } = await carpetaResponse.json();

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
              const error = await uploadResponse.json();
              throw new Error(error.error || `Error subiendo ${doc.nombre}`);
            }

            return await uploadResponse.json();
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
      setAsignadoA('todos');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            Crear Carpeta Compartida
          </DialogTitle>
          <DialogDescription>
            Crea una carpeta compartida y opcionalmente sube documentos directamente
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
            <Label htmlFor="asignadoA">Asignar a</Label>
            <Select value={asignadoA} onValueChange={setAsignadoA} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los empleados</SelectItem>
                {/* Futuro: equipos, departamentos, etc. */}
              </SelectContent>
            </Select>
          </div>

          {/* Subida de documentos */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Documentos (opcional)</Label>
              <InfoTooltip
                content="Puedes subir documentos ahora o hacerlo más tarde desde la carpeta."
                variant="subtle"
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

