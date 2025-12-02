// ========================================
// Dialog para crear denuncias - Canal de denuncias
// ========================================

'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { FileAttachment } from '@/components/shared/file-attachment';
import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseJson } from '@/lib/utils/json';

interface DenunciaDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadFileResponse {
  url: string;
  s3Key?: string;
  size?: number;
  type?: string;
  createdAt?: string;
}

interface DenunciaDocumentoPayload {
  id: string;
  nombre: string;
  s3Key: string;
  mimeType: string;
  tamano: number;
  uploadedAt: string;
}

export function DenunciaDialog({ isOpen, onClose }: DenunciaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    descripcion: '',
    esAnonima: false,
  });
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleClose = () => {
    if (!loading) {
      setFormData({
        descripcion: '',
        esAnonima: false,
      });
      setAttachments([]);
      onClose();
    }
  };

  const generateAttachmentId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const uploadAttachments = async (): Promise<DenunciaDocumentoPayload[]> => {
    if (attachments.length === 0) {
      return [];
    }

    const uploaded: DenunciaDocumentoPayload[] = [];

    for (const file of attachments) {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('tipo', 'denuncias');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await parseJson<UploadFileResponse>(response).catch(() => null);

      if (!response.ok || !data?.s3Key) {
        throw new Error(`No se pudo subir el archivo ${file.name}`);
      }

      uploaded.push({
        id: generateAttachmentId(),
        nombre: file.name,
        s3Key: data.s3Key,
        mimeType: data.type ?? file.type,
        tamano: data.size ?? file.size,
        uploadedAt: data.createdAt ?? new Date().toISOString(),
      });
    }

    return uploaded;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descripcion.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }

    setLoading(true);

    try {
      let documentosPayload: DenunciaDocumentoPayload[] | undefined;

      if (attachments.length > 0) {
        documentosPayload = await uploadAttachments();
      }

      const response = await fetch('/api/denuncias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: formData.descripcion.trim(),
          esAnonima: formData.esAnonima,
          documentos: documentosPayload && documentosPayload.length > 0 ? documentosPayload : undefined,
        }),
      });

      if (response.ok) {
        toast.success('Denuncia enviada correctamente');
        handleClose();
      } else {
        const error = await parseJson<{ error?: string; message?: string }>(response).catch(
          () => null
        );
        toast.error(error?.message || error?.error || 'Error al enviar la denuncia');
      }
    } catch (error) {
      console.error('Error al enviar denuncia:', error);
      toast.error('Error al enviar la denuncia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Canal de Denuncias</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descripcion">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="descripcion"
              placeholder="Describe la situación..."
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              rows={6}
              required
              className="resize-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="esAnonima"
              checked={formData.esAnonima}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, esAnonima: checked as boolean })
              }
            />
            <Label
              htmlFor="esAnonima"
              className="cursor-pointer font-normal text-sm"
            >
              Enviar de forma anónima
            </Label>
          </div>

          <FileAttachment
            label="Adjuntar archivos (opcional)"
            description="Evidencias o documentos"
            files={attachments}
            onFilesChange={setAttachments}
            multiple
            maxFiles={5}
            maxSizeMB={10}
            acceptedTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']}
            disabled={loading}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <LoadingButton type="submit" loading={loading}>
              Enviar denuncia
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
