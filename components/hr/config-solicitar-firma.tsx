'use client';

// ========================================
// Config Solicitar Firma
// ========================================
// Configuración para acción de solicitar firmas

import { Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Helper para generar IDs únicos
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

import type { SolicitarFirmaConfig, DocumentoFirma } from '@/lib/onboarding-config-types';

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

interface Documento {
  id: string;
  nombre: string;
}

interface ConfigSolicitarFirmaProps {
  config: SolicitarFirmaConfig;
  onChange: (config: SolicitarFirmaConfig) => void;
}

export function ConfigSolicitarFirma({ config, onChange }: ConfigSolicitarFirmaProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      // Cargar documentos de la empresa
      const docsRes = await fetch('/api/documentos');

      if (docsRes.ok) {
        const data = await docsRes.json() as { data?: Documento[] };
        setDocumentos(data.data || []);
      }
    } catch (error) {
      console.error('[ConfigSolicitarFirma] Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleSubirDocumento = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSubiendoArchivo(true);

      // Obtener/crear carpeta "Documentos Firma"
      const carpetasRes = await fetch('/api/carpetas');
      if (!carpetasRes.ok) throw new Error('Error al obtener carpetas');

      const carpetasData = (await carpetasRes.json()) as { carpetas?: { id: string; nombre: string }[] };
      let carpetaFirma = carpetasData.carpetas?.find(c => c.nombre === 'Documentos Firma');

      if (!carpetaFirma) {
        const crearRes = await fetch('/api/carpetas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: 'Documentos Firma', compartida: true, asignadoA: 'todos' }),
        });

        if (!crearRes.ok) throw new Error('Error al crear carpeta');

        const crearData = (await crearRes.json()) as { success?: boolean; carpeta?: { id: string; nombre: string }; error?: string };

        if (!crearData.success || !crearData.carpeta) {
          throw new Error(crearData.error || 'Error al crear carpeta');
        }

        carpetaFirma = crearData.carpeta;
      }

      // Subir documento
      const formData = new FormData();
      formData.append('file', file);
      formData.append('carpetaId', carpetaFirma.id);
      formData.append('tipoDocumento', 'firma');

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

      // Añadir a la lista
      setDocumentos(prev => [...prev, responseData.documento as Documento]);

      toast.success('Documento subido correctamente');

      // Resetear input
      e.target.value = '';
    } catch (error) {
      console.error('[ConfigSolicitarFirma] Error al subir:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error al subir documento';
      toast.error(errorMsg);
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const añadirDocumentoFirma = () => {
    const documentosFirma = config.documentosFirma || [];
    const nuevoDoc: DocumentoFirma = {
      id: generateId(),
      nombre: '',
      tipo: 'sincrono', // Por defecto síncrono
      requiereAccionesAntes: [],
    };

    onChange({
      ...config,
      documentosFirma: [...documentosFirma, nuevoDoc],
    });
  };

  const actualizarDocumentoFirma = (index: number, campo: keyof DocumentoFirma, valor: unknown) => {
    const documentosFirma = [...(config.documentosFirma || [])];
    documentosFirma[index] = {
      ...documentosFirma[index],
      [campo]: valor,
    };

    onChange({ ...config, documentosFirma });
  };

  const eliminarDocumentoFirma = (index: number) => {
    const documentosFirma = [...(config.documentosFirma || [])];
    documentosFirma.splice(index, 1);
    onChange({ ...config, documentosFirma });
  };

  const documentosFirma = config.documentosFirma || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Documentos a Firmar *</Label>
          <p className="text-sm text-gray-600 mt-1">
            Sube documentos que el empleado debe firmar durante el onboarding
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            id="upload-doc-firma"
            className="hidden"
            accept=".pdf"
            onChange={handleSubirDocumento}
            disabled={subiendoArchivo}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('upload-doc-firma')?.click()}
            disabled={subiendoArchivo}
          >
            <Upload className="h-4 w-4 mr-2" />
            {subiendoArchivo ? 'Subiendo...' : 'Subir Documento'}
          </Button>
          <Button size="sm" onClick={añadirDocumentoFirma} disabled={cargando}>
            <Plus className="h-4 w-4 mr-2" />
            Añadir Firma
          </Button>
        </div>
      </div>

      {cargando && (
        <div className="text-center py-4 text-gray-500">Cargando documentos...</div>
      )}

      {!cargando && documentosFirma.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay documentos configurados</p>
          <p className="text-sm mt-2">Sube un documento y luego añádelo a la firma</p>
        </div>
      )}

      {!cargando && documentosFirma.map((doc, index) => (
        <div key={doc.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-gray-700">Documento #{index + 1}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => eliminarDocumentoFirma(index)}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor={`firma-nombre-${index}`}>Nombre del Documento *</Label>
              <Input
                id={`firma-nombre-${index}`}
                value={doc.nombre}
                onChange={(e) => actualizarDocumentoFirma(index, 'nombre', e.target.value)}
                placeholder="Ej: Contrato Laboral"
              />
            </div>

            <div>
              <Label htmlFor={`firma-doc-${index}`}>Seleccionar Documento *</Label>
              <Select
                value={doc.documentoId || ''}
                onValueChange={(value) => actualizarDocumentoFirma(index, 'documentoId', value)}
              >
                <SelectTrigger id={`firma-doc-${index}`}>
                  <SelectValue placeholder="Seleccionar documento" />
                </SelectTrigger>
                <SelectContent>
                  {documentos.map((documento) => (
                    <SelectItem key={documento.id} value={documento.id}>
                      {documento.nombre}
                    </SelectItem>
                  ))}
                  {documentos.length === 0 && (
                    <div className="p-2 text-sm text-gray-500">
                      No hay documentos disponibles. Sube uno primero.
                    </div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                El empleado firmará este documento durante el onboarding
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
