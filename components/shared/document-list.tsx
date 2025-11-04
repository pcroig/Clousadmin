'use client';

// ========================================
// Document List Component - Display and manage documents
// ========================================

import { FileText, Download, Eye, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Documento {
  id: string;
  nombre: string;
  tipoDocumento: string;
  mimeType: string;
  tamano: number;
  s3Key: string;
  createdAt: Date | string;
  downloadUrl?: string | null;
}

interface DocumentListProps {
  documentos: Documento[];
  onDownload?: (documento: Documento) => void;
  onView?: (documento: Documento) => void;
  onDelete?: (documento: Documento) => void;
  showActions?: {
    download?: boolean;
    view?: boolean;
    delete?: boolean;
  };
  emptyMessage?: string;
}

export function DocumentList({
  documentos,
  onDownload,
  onView,
  onDelete,
  showActions = { download: true, view: true, delete: false },
  emptyMessage = 'No hay documentos disponibles',
}: DocumentListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    }
    if (mimeType === 'application/pdf') {
      return '📄';
    }
    return '📎';
  };

  const getTipoDocumentoBadge = (tipo: string) => {
    const tipos: Record<string, { label: string; color: string }> = {
      contrato: { label: 'Contrato', color: 'bg-blue-100 text-blue-800' },
      nomina: { label: 'Nómina', color: 'bg-green-100 text-green-800' },
      dni: { label: 'DNI', color: 'bg-purple-100 text-purple-800' },
      seguridad_social: { label: 'Seg. Social', color: 'bg-orange-100 text-orange-800' },
      medico: { label: 'Médico', color: 'bg-red-100 text-red-800' },
      certificado: { label: 'Certificado', color: 'bg-yellow-100 text-yellow-800' },
      otro: { label: 'Otro', color: 'bg-gray-100 text-gray-800' },
    };

    const tipoInfo = tipos[tipo] || tipos.otro;
    return (
      <Badge variant="secondary" className={tipoInfo.color}>
        {tipoInfo.label}
      </Badge>
    );
  };

  if (documentos.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-sm text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documentos.map((doc) => (
        <div
          key={doc.id}
          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="text-2xl mt-1">{getFileIcon(doc.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {doc.nombre}
                  </h4>
                  {getTipoDocumentoBadge(doc.tipoDocumento)}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatFileSize(doc.tamano)}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(doc.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-4">
              {showActions.view && onView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(doc)}
                  title="Ver documento"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {showActions.download && onDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(doc)}
                  title="Descargar documento"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {showActions.delete && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(doc)}
                  title="Eliminar documento"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

