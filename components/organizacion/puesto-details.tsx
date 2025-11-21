// ========================================
// Puesto Details Component
// ========================================

'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Briefcase, Pencil, Trash2, Upload, FileText, Download } from 'lucide-react';
import { getInitials } from '@/components/shared/utils';
import { getAvatarStyle } from '@/lib/design-system';
import { PuestoFormModal } from './puesto-form-modal';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PuestoDetailsProps {
  puesto: {
    id: string;
    nombre: string;
    descripcion: string;
    numeroEmpleados: number;
    empleados: {
      id: string;
      nombre: string;
      avatar?: string | null;
      fotoUrl?: string | null;
    }[];
    documentos?: {
      id: string;
      nombre: string;
      tipoDocumento: string;
      mimeType: string;
      tamano: number;
      createdAt: string;
      downloadUrl: string;
    }[];
  };
  onUpdate: () => void;
  onDelete: () => void;
}

export function PuestoDetails({ puesto, onUpdate, onDelete }: PuestoDetailsProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/puestos/${puesto.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar puesto');
      }

      toast.success('Puesto eliminado');
      onDelete();
    } catch (error) {
      console.error('Error deleting puesto:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar puesto');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipoDocumento', 'otro');

      const response = await fetch(`/api/puestos/${puesto.id}/documentos`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir documento');
      }

      toast.success('Documento subido correctamente');
      onUpdate();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir documento');
    } finally {
      setUploadingFile(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (documentoId: string) => {
    setDeletingDocId(documentoId);
    try {
      const response = await fetch(
        `/api/puestos/${puesto.id}/documentos?documentoId=${documentoId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar documento');
      }

      toast.success('Documento eliminado');
      onUpdate();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar documento');
    } finally {
      setDeletingDocId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-6 border-b border-gray-200">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900">{puesto.nombre}</h3>
                  <p className="text-sm text-gray-500">{puesto.numeroEmpleados} empleados</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowEditModal(true)}
                  className="flex-shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {puesto.descripcion && (
            <p className="text-sm text-gray-600">{puesto.descripcion}</p>
          )}
        </div>

        {/* Empleados con este Puesto */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Empleados en este Puesto ({puesto.numeroEmpleados})
          </h4>

          <div className="space-y-2">
            {puesto.empleados.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No hay empleados con este puesto
              </p>
            ) : (
              puesto.empleados.map((empleado) => {
                const avatarStyle = getAvatarStyle(empleado.nombre);
                const fotoUrl = empleado.fotoUrl ?? empleado.avatar ?? undefined;

                return (
                  <div
                    key={empleado.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Avatar className="h-9 w-9">
                      {fotoUrl && <AvatarImage src={fotoUrl} />}
                      <AvatarFallback
                        className="text-xs font-semibold uppercase"
                        style={avatarStyle}
                      >
                        {getInitials(empleado.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">{empleado.nombre}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Documentos */}
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Documentos ({puesto.documentos?.length || 0})
            </h4>
            <label>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <LoadingButton
                size="sm"
                variant="ghost"
                className="h-7"
                loading={uploadingFile}
                onClick={(e) => {
                  e.preventDefault();
                  (e.target as HTMLElement)
                    .closest('label')
                    ?.querySelector('input')
                    ?.click();
                }}
              >
                <Upload className="h-3 w-3 mr-1" />
                Subir
              </LoadingButton>
            </label>
          </div>

          <div className="space-y-2">
            {!puesto.documentos || puesto.documentos.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No hay documentos adjuntos
              </p>
            ) : (
              puesto.documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium truncate">{doc.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.tamano)} • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        window.open(doc.downloadUrl || `/api/documentos/${doc.id}?inline=1`, '_blank')
                      }
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deletingDocId === doc.id}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delete Puesto */}
        <div className="pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Puesto
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      <PuestoFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={onUpdate}
        puesto={{
          id: puesto.id,
          nombre: puesto.nombre,
          descripcion: puesto.descripcion || null,
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar puesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el puesto "{puesto.nombre}".
              {puesto.numeroEmpleados > 0 &&
                ` Los ${puesto.numeroEmpleados} empleado(s) con este puesto perderán la asignación.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar Puesto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
