'use client';

// ========================================
// Lista de Festivos
// ========================================

import { useEffect, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Power, PowerOff } from 'lucide-react';
import { EditarFestivoModal } from './editar-festivo-modal';
import { toast } from 'sonner';

interface Festivo {
  id: string;
  fecha: string;
  nombre: string;
  tipo: string;
  activo: boolean;
}

interface ListaFestivosProps {
  año?: number;
  onUpdate?: () => void;
}

export function ListaFestivos({ año, onUpdate }: ListaFestivosProps) {
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalEditar, setModalEditar] = useState<{
    open: boolean;
    festivo: Festivo | null;
    modo: 'crear' | 'editar';
  }>({
    open: false,
    festivo: null,
    modo: 'crear',
  });

  const cargarFestivos = useCallback(async () => {
    setCargando(true);
    try {
      const url = año ? `/api/festivos?año=${año}` : '/api/festivos';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFestivos(data.festivos || []);
      }
    } catch (error) {
      console.error('Error cargando festivos:', error);
    } finally {
      setCargando(false);
    }
  }, [año]);

  useEffect(() => {
    cargarFestivos();
  }, [cargarFestivos]);

  async function handleEliminar(festivo: Festivo) {
    if (!confirm(`¿Eliminar el festivo "${festivo.nombre}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/festivos/${festivo.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Festivo eliminado exitosamente');
        cargarFestivos();
        if (onUpdate) onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al eliminar festivo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar festivo');
    }
  }

  async function handleToggleActivo(festivo: Festivo) {
    try {
      const response = await fetch(`/api/festivos/${festivo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !festivo.activo }),
      });

      if (response.ok) {
        toast.success(`Festivo ${!festivo.activo ? 'activado' : 'desactivado'} exitosamente`);
        cargarFestivos();
        if (onUpdate) onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al actualizar festivo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar festivo');
    }
  }

  function formatFecha(fechaStr: string): string {
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  if (cargando) {
    return <div className="text-center py-4 text-gray-500">Cargando festivos...</div>;
  }

  if (festivos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No hay festivos registrados</p>
        <p className="text-sm mt-2">Importa el calendario nacional o crea festivos personalizados</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {festivos.map((festivo) => (
              <TableRow key={festivo.id}>
                <TableCell className="font-medium">
                  {formatFecha(festivo.fecha)}
                </TableCell>
                <TableCell>{festivo.nombre}</TableCell>
                <TableCell>
                  <Badge variant={festivo.tipo === 'nacional' ? 'default' : 'secondary'}>
                    {festivo.tipo === 'nacional' ? 'Nacional' : 'Empresa'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {festivo.activo ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                      Inactivo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {festivo.tipo === 'empresa' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setModalEditar({ open: true, festivo, modo: 'editar' })
                          }
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEliminar(festivo)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActivo(festivo)}
                      title={festivo.activo ? 'Desactivar' : 'Activar'}
                    >
                      {festivo.activo ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditarFestivoModal
        open={modalEditar.open}
        festivo={modalEditar.festivo}
        modo={modalEditar.modo}
        onClose={() => setModalEditar({ open: false, festivo: null, modo: 'crear' })}
        onSuccess={() => {
          cargarFestivos();
          if (onUpdate) onUpdate();
        }}
      />
    </>
  );
}






