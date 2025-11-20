'use client';

// ========================================
// Modal de Gestión de Jornadas (Simplificado)
// ========================================

import { Clock, Edit2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DialogLarge as Dialog,
  DialogLargeContent as DialogContent,
  DialogLargeHeader as DialogHeader,
  DialogLargeTitle as DialogTitle,
} from '@/components/ui/dialog-large';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { EditarJornadaModal, type JornadaDetalle } from './editar-jornada-modal';

import type { DiaConfig, JornadaConfig } from '@/lib/calculos/fichajes-helpers';

type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

const DIA_KEYS: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const isDiaConfig = (value: unknown): value is DiaConfig =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDiaConfig = (config: JornadaConfig | null | undefined, dia: DiaKey): DiaConfig | undefined => {
  if (!config) return undefined;
  const value = config[dia];
  return isDiaConfig(value) ? value : undefined;
};

interface JornadaResumen {
  id: string;
  nombre: string;
  horasSemanales: number;
  config: JornadaConfig | null;
  activa: boolean;
  _count?: {
    empleados: number;
  };
}

interface JornadasModalProps {
  open: boolean;
  onClose: () => void;
}

export function JornadasModal({ open, onClose }: JornadasModalProps) {
  const [jornadas, setJornadas] = useState<JornadaResumen[]>([]);
  const [cargando, setCargando] = useState(false);
  const [editarModal, setEditarModal] = useState<{
    open: boolean;
    jornada: Jornada | null;
    modo: 'crear' | 'editar';
  }>({
    open: false,
    jornada: null,
    modo: 'crear',
  });

  useEffect(() => {
    if (open) {
      cargarJornadas();
    }
  }, [open]);

  async function cargarJornadas() {
    setCargando(true);
    try {
      const response = await fetch('/api/jornadas');
      if (response.ok) {
        const data = await response.json();
        setJornadas(data);
      }
    } catch (error) {
      console.error('Error cargando jornadas:', error);
    } finally {
      setCargando(false);
    }
  }

  function handleCrear() {
    setEditarModal({
      open: true,
      jornada: null,
      modo: 'crear',
    });
  }

  function handleEditar(jornada: JornadaResumen) {
    setEditarModal({
      open: true,
      jornada: jornada as JornadaDetalle,
      modo: 'editar',
    });
  }

  function handleCerrarEditar() {
    setEditarModal({
      open: false,
      jornada: null,
      modo: 'crear',
    });
    cargarJornadas(); // Recargar lista
  }

  function getTipoBadge(jornada: JornadaResumen) {
    const config = jornada.config;
    const esFija = DIA_KEYS.some((dia) => {
      const diaConfig = getDiaConfig(config, dia);
      return Boolean(diaConfig?.entrada && diaConfig?.salida);
    });

    return esFija ? (
      <Badge className="bg-green-100 text-green-800">Fija</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Flexible</Badge>
    );
  }

  function getDescripcion(jornada: JornadaResumen) {
    const config = jornada.config;
    const primerDiaActivo = DIA_KEYS.map((dia) => getDiaConfig(config, dia)).find(
      (diaConfig) => diaConfig?.activo
    );

    if (primerDiaActivo?.entrada && primerDiaActivo?.salida) {
      return `${primerDiaActivo.entrada} - ${primerDiaActivo.salida}`;
    }

    return `${jornada.horasSemanales}h semanales`;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Gestión de Jornadas
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horas Semanales</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Asignados</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : jornadas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No hay jornadas creadas
                    </TableCell>
                  </TableRow>
                ) : (
                  jornadas.map((jornada) => (
                    <TableRow key={jornada.id}>
                      <TableCell>
                        <div className="font-medium text-gray-900">{jornada.nombre}</div>
                      </TableCell>
                      <TableCell>{getTipoBadge(jornada)}</TableCell>
                      <TableCell>{jornada.horasSemanales}h</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {getDescripcion(jornada)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {jornada._count?.empleados || 0} empleado{jornada._count?.empleados !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEditar(jornada)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Botón Nueva Jornada abajo */}
          <div className="mt-4 flex justify-end border-t pt-4">
            <Button onClick={handleCrear} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Jornada
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar/Crear Jornada */}
      <EditarJornadaModal
        open={editarModal.open}
        modo={editarModal.modo}
        jornada={editarModal.jornada}
        onClose={handleCerrarEditar}
      />
    </>
  );
}
