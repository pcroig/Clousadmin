'use client';

// ========================================
// Config Compartir Docs
// ========================================
// Configuración para acción de compartir documentos

import { useEffect, useState } from 'react';
import { Search, Upload } from 'lucide-react';
import { toast } from 'sonner';

import type { CompartirDocsConfig } from '@/lib/onboarding-config-types';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Documento {
  id: string;
  nombre: string;
  carpetaNombre?: string;
}

interface ConfigCompartirDocsProps {
  config: CompartirDocsConfig;
  onChange: (config: CompartirDocsConfig) => void;
}

export function ConfigCompartirDocs({ config, onChange }: ConfigCompartirDocsProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const cargarDocumentos = async () => {
    try {
      setCargando(true);
      // Cargar documentos de la empresa desde la API
      const response = await fetch('/api/documentos');
      if (response.ok) {
        const data = await response.json() as { documentos?: Documento[] };
        setDocumentos(data.documentos || []);
      }
    } catch (error) {
      console.error('[ConfigCompartirDocs] Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleSubirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setSubiendoArchivo(true);

      // Obtener carpeta de empresa (o crearla si no existe)
      const carpetasRes = await fetch('/api/carpetas?tipo=empresa');
      if (!carpetasRes.ok) throw new Error('Error al obtener carpetas');

      const carpetasData = (await carpetasRes.json()) as { carpetas: { id: string; nombre: string }[] };
      let carpetaEmpresa = carpetasData.carpetas.find(c => c.nombre === 'Documentos Empresa');

      // Si no existe, crear carpeta de empresa
      if (!carpetaEmpresa) {
        const crearRes = await fetch('/api/carpetas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: 'Documentos Empresa', compartida: true, asignadoA: 'todos' }),
        });

        if (!crearRes.ok) throw new Error('Error al crear carpeta de empresa');

        const crearData = (await crearRes.json()) as { success?: boolean; carpeta?: { id: string; nombre: string }; error?: string };

        if (!crearData.success || !crearData.carpeta) {
          throw new Error(crearData.error || 'Error al crear carpeta de empresa');
        }

        carpetaEmpresa = crearData.carpeta;
      }

      // Subir cada archivo
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('carpetaId', carpetaEmpresa.id);
        formData.append('tipoDocumento', 'general');

        const response = await fetch('/api/documentos', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'Error al subir documento');
        }

        const responseData = (await response.json()) as { success?: boolean; documento?: Documento; error?: string };

        if (!responseData.success || !responseData.documento) {
          throw new Error(responseData.error || 'Error al subir documento');
        }

        // Añadir a la lista y seleccionar automáticamente
        setDocumentos(prev => [...prev, responseData.documento as Documento]);
        onChange({
          ...config,
          documentoIds: [...(config.documentoIds || []), responseData.documento.id]
        });
      }

      toast.success('Documento(s) subido(s) correctamente');

      // Resetear input
      e.target.value = '';
    } catch (error) {
      console.error('[ConfigCompartirDocs] Error al subir:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error al subir documento(s)';
      toast.error(errorMsg);
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const toggleDocumento = (docId: string) => {
    const documentoIds = config.documentoIds || [];
    const nuevosIds = documentoIds.includes(docId)
      ? documentoIds.filter(id => id !== docId)
      : [...documentoIds, docId];

    onChange({ ...config, documentoIds: nuevosIds });
  };

  const documentosSeleccionados = config.documentoIds || [];
  const documentosFiltrados = documentos.filter(doc =>
    doc.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Documentos a Compartir *</Label>
          <p className="text-sm text-gray-600 mt-1">
            Selecciona o sube documentos que el empleado debe revisar
          </p>
        </div>
        <div>
          <input
            type="file"
            id="upload-docs-compartir"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={handleSubirArchivo}
            disabled={subiendoArchivo}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('upload-docs-compartir')?.click()}
            disabled={subiendoArchivo}
          >
            <Upload className="h-4 w-4 mr-2" />
            {subiendoArchivo ? 'Subiendo...' : 'Subir Documento'}
          </Button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar documentos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de documentos */}
      {cargando ? (
        <div className="text-center py-8 text-gray-500">Cargando documentos...</div>
      ) : documentosFiltrados.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {busqueda ? 'No se encontraron documentos' : 'No hay documentos disponibles'}
        </div>
      ) : (
        <div className="border rounded-lg max-h-80 overflow-y-auto">
          {documentosFiltrados.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center space-x-3 p-3 border-b last:border-b-0 hover:bg-gray-50"
            >
              <Checkbox
                id={`doc-${doc.id}`}
                checked={documentosSeleccionados.includes(doc.id)}
                onCheckedChange={() => toggleDocumento(doc.id)}
              />
              <label
                htmlFor={`doc-${doc.id}`}
                className="flex-1 text-sm cursor-pointer"
              >
                <p className="font-medium">{doc.nombre}</p>
                {doc.carpetaNombre && (
                  <p className="text-xs text-gray-500">{doc.carpetaNombre}</p>
                )}
              </label>
            </div>
          ))}
        </div>
      )}

      {documentosSeleccionados.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>{documentosSeleccionados.length}</strong> documento{documentosSeleccionados.length !== 1 ? 's' : ''} seleccionado{documentosSeleccionados.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
