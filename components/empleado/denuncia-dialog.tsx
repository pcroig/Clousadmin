// ========================================
// Dialog para crear denuncias - Canal de denuncias
// ========================================

'use client';

import { useState } from 'react';
import { toast } from 'sonner';

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

export function DenunciaDialog({ isOpen, onClose }: DenunciaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    descripcion: '',
    esAnonima: false,
  });

  const handleClose = () => {
    if (!loading) {
      setFormData({
        descripcion: '',
        esAnonima: false,
      });
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descripcion.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/denuncias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: formData.descripcion.trim(),
          esAnonima: formData.esAnonima,
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
