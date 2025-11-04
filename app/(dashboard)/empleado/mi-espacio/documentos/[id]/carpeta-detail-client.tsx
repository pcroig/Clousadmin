// ========================================
// Empleado - Carpeta Detail Client Component
// ========================================

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileText, Download, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingButton } from '@/components/shared/loading-button';

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
  documentos: Documento[];
}

interface CarpetaDetailClientEmpleadoProps {
  carpeta: Carpeta;
  puedeSubir: boolean;
}

export function CarpetaDetailClientEmpleado({
  carpeta,
  puedeSubir,
}: CarpetaDetailClientEmpleadoProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
    <div className="h-full w-full flex flex-col">
      {/* Header con breadcrumb */}
      <div className="mb-6 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/empleado/mi-espacio/documentos')}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Mis Documentos
        </Button>

        <div className="flex items-center justify-between">
          <div>
                        <div className="flex items-center gap-2 mb-2">
              <Folder
                className={`w-6 h-6 ${
                  carpeta.compartida ? 'text-blue-600' : 'text-gray-600'
                }`}
              />
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
            {carpeta.compartida ? (
              <p className="text-sm text-gray-600">
                Carpeta compartida por la empresa
              </p>
            ) : (
              <p className="text-sm text-gray-600">Tu carpeta personal</p>
            )}
          </div>

          {puedeSubir && (
            <div>
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
          )}
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
              description={
                puedeSubir
                  ? 'Haz clic en "Subir Documentos" para añadir archivos'
                  : undefined
              }
              action={
                puedeSubir ? (
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mt-4"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Documento
                  </Button>
                ) : undefined
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
  );
}
