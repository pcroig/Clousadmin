// ========================================
// Modal para crear denuncias - Canal de denuncias
// ========================================

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CrearDenunciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CrearDenunciaModal({
  isOpen,
  onClose,
  onSuccess,
}: CrearDenunciaModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    descripcion: '',
    fechaIncidente: '',
    ubicacion: '',
    esAnonima: false,
  });

  const handleClose = () => {
    if (!loading) {
      setFormData({
        descripcion: '',
        fechaIncidente: '',
        ubicacion: '',
        esAnonima: false,
      });
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.descripcion.trim().length < 10) {
      toast.error('La descripción debe tener al menos 10 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/denuncias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: formData.descripcion.trim(),
          fechaIncidente: formData.fechaIncidente || undefined,
          ubicacion: formData.ubicacion.trim() || undefined,
          esAnonima: formData.esAnonima,
        }),
      });

      if (response.ok) {
        toast.success(
          formData.esAnonima
            ? 'Denuncia anónima enviada correctamente'
            : 'Denuncia enviada correctamente'
        );
        handleClose();
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al enviar la denuncia');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <DialogTitle>Canal de Denuncias</DialogTitle>
          </div>
          <DialogDescription>
            Este canal es completamente confidencial y seguro. Puedes reportar cualquier
            irregularidad de forma anónima o identificada.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Todas las denuncias son tratadas con la máxima confidencialidad y revisadas
            exclusivamente por el equipo de Recursos Humanos.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="descripcion">
              Descripción de la situación <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="descripcion"
              placeholder="Describe la situación con el mayor detalle posible..."
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              rows={6}
              required
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Mínimo 10 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaIncidente">
              Fecha aproximada del incidente (opcional)
            </Label>
            <Input
              id="fechaIncidente"
              type="date"
              value={formData.fechaIncidente}
              onChange={(e) =>
                setFormData({ ...formData, fechaIncidente: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ubicacion">
              Ubicación o contexto (opcional)
            </Label>
            <Input
              id="ubicacion"
              placeholder="Ej: Oficina Madrid, reunión de equipo, email..."
              value={formData.ubicacion}
              onChange={(e) =>
                setFormData({ ...formData, ubicacion: e.target.value })
              }
            />
          </div>

          <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
            <Checkbox
              id="esAnonima"
              checked={formData.esAnonima}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, esAnonima: checked as boolean })
              }
            />
            <div className="flex-1">
              <Label
                htmlFor="esAnonima"
                className="cursor-pointer font-medium"
              >
                Enviar de forma anónima
              </Label>
              <p className="text-sm text-muted-foreground">
                Si marcas esta opción, tu identidad no será registrada y no recibirás
                actualizaciones sobre el estado de la denuncia.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
