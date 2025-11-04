// ========================================
// Puesto Form Modal - Create/Edit Job Position
// ========================================

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PuestoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  puesto?: {
    id: string;
    nombre: string;
    descripcion: string | null;
  } | null;
}

export function PuestoFormModal({
  isOpen,
  onClose,
  onSuccess,
  puesto,
}: PuestoFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });

  const isEditing = !!puesto;

  useEffect(() => {
    if (isOpen) {
      if (puesto) {
        setFormData({
          nombre: puesto.nombre,
          descripcion: puesto.descripcion || '',
        });
      } else {
        setFormData({
          nombre: '',
          descripcion: '',
        });
      }
    }
  }, [isOpen, puesto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing ? `/api/puestos/${puesto.id}` : '/api/puestos';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar puesto');
      }

      toast.success(isEditing ? 'Puesto actualizado' : 'Puesto creado');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving puesto:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar puesto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Puesto' : 'Crear Puesto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre del Puesto */}
          <div className="space-y-2">
            <Label htmlFor="nombre">
              Nombre del Puesto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Desarrollador Senior, Gerente de Ventas"
              required
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Describe las responsabilidades y requisitos del puesto..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <LoadingButton type="submit" loading={loading}>
              {isEditing ? 'Guardar Cambios' : 'Crear Puesto'}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
