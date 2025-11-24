'use client';

// ========================================
// Modal para Crear/Editar Festivo
// ========================================

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseJson } from '@/lib/utils/json';
interface Festivo {
  id: string;
  fecha: string;
  nombre: string;
  tipo: string;
  activo: boolean;
}

interface EditarFestivoModalProps {
  open: boolean;
  festivo: Festivo | null;
  modo: 'crear' | 'editar';
  onClose: () => void;
  onSuccess: () => void;
}

export function EditarFestivoModal({
  open,
  festivo,
  modo,
  onClose,
  onSuccess,
}: EditarFestivoModalProps) {
  const [cargando, setCargando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (open) {
      if (modo === 'editar' && festivo) {
        setNombre(festivo.nombre);
        setFecha(festivo.fecha);
        setActivo(festivo.activo);
      } else if (modo === 'crear' && festivo?.fecha) {
        // Modo crear con fecha preseleccionada (desde calendario)
        setNombre('');
        setFecha(festivo.fecha);
        setActivo(true);
      } else {
        // Modo crear sin fecha
        setNombre('');
        setFecha('');
        setActivo(true);
      }
    }
  }, [open, modo, festivo]);

  async function handleGuardar() {
    if (!nombre.trim() || !fecha) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setCargando(true);
    try {
      if (modo === 'crear') {
        const response = await fetch('/api/festivos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, fecha, activo }),
        });

        if (!response.ok) {
          const error = await parseJson<{ error?: string }>(response).catch(() => null);
          toast.error(error?.error || 'Error al crear festivo');
          return;
        }

        toast.success('Festivo creado exitosamente');
      } else {
        const response = await fetch(`/api/festivos/${festivo?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, fecha, activo }),
        });

        if (!response.ok) {
          const error = await parseJson<{ error?: string }>(response).catch(() => null);
          toast.error(error?.error || 'Error al actualizar festivo');
          return;
        }

        toast.success('Festivo actualizado exitosamente');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar festivo');
    } finally {
      setCargando(false);
    }
  }

  const esNacional = festivo?.tipo === 'nacional';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modo === 'crear' ? 'Nuevo Festivo' : 'Editar Festivo'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="fecha">Fecha *</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={modo === 'editar' && esNacional}
            />
            {modo === 'editar' && esNacional && (
              <p className="text-xs text-gray-500 mt-1">
                No se puede modificar la fecha de festivos nacionales
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Día de la empresa"
              maxLength={100}
              disabled={modo === 'editar' && esNacional}
            />
            {modo === 'editar' && esNacional && (
              <p className="text-xs text-gray-500 mt-1">
                No se puede modificar el nombre de festivos nacionales
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="activo"
              checked={activo}
              onCheckedChange={(checked) => setActivo(checked as boolean)}
            />
            <Label htmlFor="activo" className="cursor-pointer">
              Festivo activo
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={cargando}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={cargando}>
            {cargando ? 'Guardando...' : modo === 'crear' ? 'Crear' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

