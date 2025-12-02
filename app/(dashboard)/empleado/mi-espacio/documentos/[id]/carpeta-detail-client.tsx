// ========================================
// Empleado - Carpeta Detail Client Component
// ========================================

'use client';

import { ArrowLeft, Download, Eye, FileSignature, FileText, Folder, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { DocumentUploadArea } from '@/components/shared/document-upload-area';
import { DocumentViewerModal, useDocumentViewer } from '@/components/shared/document-viewer';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { MiEspacioCarpeta, MiEspacioDocumento } from '@/types/empleado';

type CarpetaDocumento = {
  id: string;
  nombre: string;
  tipoDocumento?: string | null;
  tamano?: number | null;
  createdAt?: string | null;
  mimeType?: string | null;
  firmaInfo?: {
    tieneSolicitud: boolean;
    firmado: boolean;
    firmaId?: string;
    estadoSolicitud: string;
  } | null;
};

type CarpetaDetalle = MiEspacioCarpeta & {
  esSistema?: boolean;
  compartida?: boolean;
  documentos: CarpetaDocumento[];
};

interface CarpetaDetailClientEmpleadoProps {
  carpeta: CarpetaDetalle;
  puedeSubir: boolean;
}

export function CarpetaDetailClientEmpleado({
  carpeta,
  puedeSubir,
}: CarpetaDetailClientEmpleadoProps) {
  const router = useRouter();
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const maxUploadMB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? '10');

  // Document viewer state
  const documentViewer = useDocumentViewer();

  const handleVerDocumento = (documento: CarpetaDocumento) => {
    documentViewer.openViewer(documento.id, documento.nombre, documento.mimeType ?? undefined);
  };

  const scrollToUploader = useCallback(() => {
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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
    } catch {
      toast.error('Error al descargar documento');
    }
  };

  const formatearTamano = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatearFecha = (fecha?: string | null) => {
    if (!fecha) return '-';
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
          <Button onClick={scrollToUploader}>
            <Upload className="w-4 h-4 mr-2" />
            Subir Documentos
          </Button>
          )}
        </div>
      </div>

      {puedeSubir && (
        <div ref={uploadSectionRef} className="mb-6">
          <DocumentUploadArea
            carpetaId={carpeta.id}
            onUploaded={() => router.refresh()}
            description={`Tamaño máximo ${maxUploadMB}MB por archivo`}
          />
        </div>
      )}

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
              layout="inline"
              icon={FileText}
              title="No hay documentos en esta carpeta"
              description={
                puedeSubir
                  ? 'Haz clic en "Subir Documentos" para añadir archivos'
                  : undefined
              }
              action={
                puedeSubir ? (
                  <Button onClick={scrollToUploader} className="mt-4">
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
                    Estado
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
                    <td className="py-3 px-4">
                      {documento.firmaInfo?.tieneSolicitud ? (
                        documento.firmaInfo.firmado ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <FileSignature className="w-3 h-3 mr-1" />
                            Firmado
                          </Badge>
                        ) : (
                          <button
                            onClick={() => {
                              if (documento.firmaInfo?.firmaId) {
                                router.push(`/firma/firmar/${documento.firmaInfo.firmaId}`);
                              }
                            }}
                            className="inline-flex items-center"
                          >
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 cursor-pointer">
                              <FileSignature className="w-3 h-3 mr-1" />
                              Pendiente firma
                            </Badge>
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatearTamano(documento.tamano ?? 0)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatearFecha(documento.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleVerDocumento(documento)}
                          className="p-2 rounded-full hover:bg-gray-100 transition-colors group"
                          title="Ver documento"
                        >
                          <Eye className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                        </button>
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
        />
      )}
    </div>
  );
}
