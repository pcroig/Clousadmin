// ========================================
// Team Form Modal - Create/Edit Team
// ========================================

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { parseJson } from '@/lib/utils/json';



interface Sede {
  id: string;
  nombre: string;
  ciudad: string;
}

interface EquipoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  team?: {
    id: string;
    nombre: string;
    descripcion: string | null;
    sedeId: string | null;
  } | null;
}

export function EquipoFormModal({
  isOpen,
  onClose,
  onSuccess,
  team,
}: EquipoFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    sedeId: '',
  });

  const isEditing = !!team;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadSedes = async () => {
      try {
        const res = await fetch('/api/sedes');
        if (!res.ok) {
          const error = await parseJson<{ error?: string }>(res);
          throw new Error(error.error || 'Error al cargar sedes');
        }
        const data = await parseJson<Sede[]>(res);
        setSedes(data);
      } catch (error) {
        console.error('Error loading offices:', error);
        toast.error('Error al cargar sedes');
      }
    };

    loadSedes();

    if (team) {
      setFormData({
        nombre: team.nombre,
        descripcion: team.descripcion || '',
        sedeId: team.sedeId || '',
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        sedeId: '',
      });
    }
  }, [isOpen, team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing ? `/api/equipos/${team.id}` : '/api/equipos';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || null,
          sedeId: formData.sedeId || null,
        }),
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response);
        throw new Error(error.error || 'Error al guardar equipo');
      }

      toast.success(isEditing ? 'Equipo actualizado' : 'Equipo creado');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar equipo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Equipo' : 'Crear Equipo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="nombre">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Equipo de Marketing"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Describe brevemente el propósito del equipo..."
              rows={3}
            />
          </div>

          {/* Sede */}
          <div className="space-y-2">
            <Label htmlFor="sede">Sede</Label>
            <Select
              value={formData.sedeId || 'none'}
              onValueChange={(value) => setFormData({ ...formData, sedeId: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sede (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin sede</SelectItem>
                {sedes.map((sede) => (
                  <SelectItem key={sede.id} value={sede.id}>
                    {sede.nombre} - {sede.ciudad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <LoadingButton type="submit" loading={loading}>
              {isEditing ? 'Guardar Cambios' : 'Crear Equipo'}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
