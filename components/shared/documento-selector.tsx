'use client';

// ========================================
// Documento Selector Component
// ========================================
// Selector para elegir documentos existentes de carpetas

import { FileText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { parseJson } from '@/lib/utils/json';

interface Carpeta {
  id: string;
  nombre: string;
  esSistema: boolean;
}

interface Documento {
  id: string;
  nombre: string;
  tipoDocumento: string;
  carpeta?: {
    nombre: string;
  };
}

interface CarpetasResponse {
  carpetas?: Carpeta[];
  error?: string;
}

interface DocumentosResponse {
  data?: Documento[];
  error?: string;
}

interface DocumentoSelectorProps {
  label?: string;
  description?: string;
  selectedDocuments: string[]; // IDs de documentos seleccionados
  onDocumentsChange: (documentIds: string[]) => void;
  disabled?: boolean;
}

export function DocumentoSelector({
  label = 'Seleccionar Documentos',
  description,
  selectedDocuments,
  onDocumentsChange,
  disabled = false,
}: DocumentoSelectorProps) {
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Cargar carpetas globales al montar
  const cargarCarpetas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/carpetas?global=true');
      const data = await parseJson<CarpetasResponse>(response);
      if (response.ok && data.carpetas) {
        setCarpetas(data.carpetas);
      }
    } catch (error) {
      console.error('[DocumentoSelector] Error cargando carpetas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCarpetas();
  }, [cargarCarpetas]);

  // Cargar documentos cuando se selecciona una carpeta
  useEffect(() => {
    if (carpetaSeleccionada) {
      cargarDocumentos(carpetaSeleccionada);
    } else {
      setDocumentos([]);
    }
  }, [carpetaSeleccionada]);

  const cargarDocumentos = async (carpetaId: string) => {
    setLoadingDocs(true);
    try {
      const response = await fetch(`/api/documentos?carpetaId=${carpetaId}&limit=100`);
      const data = await parseJson<DocumentosResponse>(response);
      if (response.ok && data.data) {
        setDocumentos(data.data);
      }
    } catch (error) {
      console.error('[DocumentoSelector] Error cargando documentos:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleToggleDocumento = (documentoId: string) => {
    const isSelected = selectedDocuments.includes(documentoId);
    if (isSelected) {
      onDocumentsChange(selectedDocuments.filter((id) => id !== documentoId));
    } else {
      onDocumentsChange([...selectedDocuments, documentoId]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{label}</Label>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>

      {/* Selector de carpeta */}
      <div>
        <Label className="text-xs text-gray-600">Carpeta</Label>
        <Select
          value={carpetaSeleccionada}
          onValueChange={setCarpetaSeleccionada}
          disabled={loading || disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={loading ? 'Cargando...' : 'Seleccionar carpeta'} />
          </SelectTrigger>
          <SelectContent>
            {carpetas.map((carpeta) => (
              <SelectItem key={carpeta.id} value={carpeta.id}>
                {carpeta.nombre} {carpeta.esSistema && '(Sistema)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de documentos */}
      {carpetaSeleccionada && (
        <div className="border rounded-lg p-3 max-h-64 overflow-y-auto">
          {loadingDocs ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6 text-gray-400" />
            </div>
          ) : documentos.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No hay documentos en esta carpeta</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded transition-colors"
                >
                  <Checkbox
                    id={`doc-${doc.id}`}
                    checked={selectedDocuments.includes(doc.id)}
                    onCheckedChange={() => handleToggleDocumento(doc.id)}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`doc-${doc.id}`}
                    className="flex-1 cursor-pointer text-sm flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>{doc.nombre}</span>
                    {doc.tipoDocumento && (
                      <Badge variant="secondary" className="text-xs">
                        {doc.tipoDocumento}
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resumen de documentos seleccionados */}
      {selectedDocuments.length > 0 && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">{selectedDocuments.length}</span> documento(s) seleccionado(s)
        </div>
      )}
    </div>
  );
}







