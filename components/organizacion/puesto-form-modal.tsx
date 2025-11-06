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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [empleados, setEmpleados] = useState<Array<{ id: string; nombre: string; apellidos: string }>>([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });

  const isEditing = !!puesto;

  // Cargar empleados disponibles al abrir el modal (solo si es creación)
  useEffect(() => {
    if (isOpen && !isEditing) {
      fetchEmpleados();
    } else if (isOpen && isEditing && puesto) {
      // Si es edición, cargar empleados ya asignados al puesto
      fetchEmpleados();
      fetchEmpleadosAsignados();
    }
  }, [isOpen, isEditing, puesto]);

  async function fetchEmpleados() {
    try {
      const response = await fetch('/api/empleados');
      if (response.ok) {
        const data = await response.json();
        setEmpleados(data || []);
      }
    } catch (error) {
      console.error('Error fetching empleados:', error);
    }
  }

  async function fetchEmpleadosAsignados() {
    if (!puesto) return;
    try {
      const response = await fetch(`/api/puestos/${puesto.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.empleados) {
          setEmpleadosSeleccionados(data.empleados.map((emp: any) => emp.id));
        }
      }
    } catch (error) {
      console.error('Error fetching empleados asignados:', error);
    }
  }

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
        setEmpleadosSeleccionados([]);
      }
    }
  }, [isOpen, puesto]);

  const toggleEmpleado = (empleadoId: string) => {
    if (empleadosSeleccionados.includes(empleadoId)) {
      setEmpleadosSeleccionados(empleadosSeleccionados.filter(id => id !== empleadoId));
    } else {
      setEmpleadosSeleccionados([...empleadosSeleccionados, empleadoId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing ? `/api/puestos/${puesto.id}` : '/api/puestos';
      const method = isEditing ? 'PATCH' : 'POST';

      const body: any = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
      };

      // Si es creación y hay empleados seleccionados, incluirlos
      if (!isEditing && empleadosSeleccionados.length > 0) {
        body.empleadoIds = empleadosSeleccionados;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar puesto');
      }

      // Si es edición y hay cambios en empleados, actualizar asignaciones
      if (isEditing && puesto) {
        await actualizarEmpleadosAsignados(puesto.id);
      }

      toast.success(isEditing ? 'Puesto actualizado' : 'Puesto creado');
      // Recargar lista de puestos para sincronización
      if (!isEditing) {
        // Recargar puestos para que se actualice en otros componentes
        await fetchEmpleados();
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving puesto:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar puesto');
    } finally {
      setLoading(false);
    }
  };

  async function actualizarEmpleadosAsignados(puestoId: string) {
    try {
      // Obtener empleados actuales del puesto
      const response = await fetch(`/api/puestos/${puestoId}`);
      if (!response.ok) return;
      
      const data = await response.json();
      const empleadosActuales = (data.empleados || []).map((emp: any) => emp.id);
      
      // Encontrar empleados a añadir y a quitar
      const empleadosAAnadir = empleadosSeleccionados.filter(id => !empleadosActuales.includes(id));
      const empleadosAQuitar = empleadosActuales.filter((id: string) => !empleadosSeleccionados.includes(id));

      // Actualizar empleados
      for (const empleadoId of empleadosAAnadir) {
        await fetch(`/api/empleados/${empleadoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puestoId }),
        });
      }

      for (const empleadoId of empleadosAQuitar) {
        await fetch(`/api/empleados/${empleadoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puestoId: null }),
        });
      }
    } catch (error) {
      console.error('Error updating empleados asignados:', error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Asignar Empleados */}
          <div className="space-y-2">
            <Label>Asignar Empleados</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  role="combobox"
                >
                  <span className="truncate">
                    {empleadosSeleccionados.length === 0
                      ? 'Seleccionar empleados'
                      : empleadosSeleccionados.length === 1
                      ? empleados.find((e) => e.id === empleadosSeleccionados[0])?.nombre + ' ' + empleados.find((e) => e.id === empleadosSeleccionados[0])?.apellidos || '1 empleado seleccionado'
                      : `${empleadosSeleccionados.length} empleados seleccionados`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                  {empleados.length === 0 ? (
                    <p className="text-sm text-gray-500 p-2">No hay empleados disponibles</p>
                  ) : (
                    empleados.map((empleado) => (
                      <label
                        key={empleado.id}
                        className={cn(
                          "flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded",
                          empleadosSeleccionados.includes(empleado.id) && "bg-blue-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={empleadosSeleccionados.includes(empleado.id)}
                          onChange={() => toggleEmpleado(empleado.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm flex-1">
                          {empleado.nombre} {empleado.apellidos}
                        </span>
                        {empleadosSeleccionados.includes(empleado.id) && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </label>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {empleadosSeleccionados.length > 0 && (
              <p className="text-xs text-gray-500">
                {empleadosSeleccionados.length} empleado{empleadosSeleccionados.length !== 1 ? 's' : ''} seleccionado{empleadosSeleccionados.length !== 1 ? 's' : ''}
              </p>
            )}
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
