'use client';

// ========================================
// Lista de Festivos
// ========================================

import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { EditarFestivoModal } from './editar-festivo-modal';
import { parseJson } from '@/lib/utils/json';

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
        const data = await parseJson<{ festivos?: Festivo[] }>(response);
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
        const error = await parseJson<{ error?: string }>(response).catch(() => null);
        toast.error(error?.error || 'Error al eliminar festivo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar festivo');
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
      <div className="rounded-md border max-h-80 overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white">
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Nombre del festivo</TableHead>
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEliminar(festivo)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Quitar festivo"
                    >
                      <Trash2 className="w-4 h-4" />
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






