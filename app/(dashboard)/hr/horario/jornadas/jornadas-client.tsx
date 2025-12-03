'use client';

// ========================================
// Jornadas Client Component
// ========================================

import { CalendarX, Edit2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/shared/empty-state';
import { TableHeader as PageHeader } from '@/components/shared/table-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useApi, useMutation } from '@/lib/hooks';

import { EditarJornadaModal } from '../fichajes/editar-jornada-modal';

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

interface Jornada {
  id: string;
  // NOTE: 'nombre' field has been removed from Jornada model
  horasSemanales: number;
  config: JornadaConfig | null;
  esPredefinida: boolean;
  activa: boolean;
  _count?: {
    empleados: number;
  };
}

export function JornadasClient() {
  const [editarModal, setEditarModal] = useState<{
    open: boolean;
    jornada: Jornada | null;
    modo: 'crear' | 'editar';
  }>({
    open: false,
    jornada: null,
    modo: 'crear',
  });

  // Hook para cargar jornadas
  const { data: jornadas = [], loading, execute: refetchJornadas } = useApi<Jornada[]>();



  // Hook para eliminar jornada
  const { mutate: eliminarJornada } = useMutation<void, void>({
    onSuccess: () => {
      refetchJornadas('/api/jornadas');
    },
  });

  useEffect(() => {
    refetchJornadas('/api/jornadas');
  }, [refetchJornadas]);

    function handleCrear() {
    setEditarModal({
      open: true,
      jornada: null,
      modo: 'crear',
    });
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta jornada?')) return;

    await eliminarJornada(`/api/jornadas/${id}`, undefined, { method: 'DELETE' });                                                                              
  }

  function getTipoBadge(jornada: Jornada) {
    const config = jornada.config;
    if (jornada.esPredefinida) {
      return <Badge className="bg-blue-100 text-blue-800">Predefinida</Badge>;
    }

    // Determinar si es fija o flexible basándose en la configuración
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

  function getDescripcion(jornada: Jornada) {
    const config = jornada.config;
    const primerDiaActivo = DIA_KEYS.map((dia) => getDiaConfig(config, dia)).find(
      (diaConfig) => diaConfig?.activo
    );

    if (primerDiaActivo?.entrada && primerDiaActivo?.salida) {
      return `${primerDiaActivo.entrada} - ${primerDiaActivo.salida}`;
    }

    return `${jornada.horasSemanales}h semanales`;
  }

  function getNombreGenerado(jornada: Jornada) {
    // Generate a descriptive name based on jornada configuration
    const config = jornada.config;
    const esFija = DIA_KEYS.some((dia) => {
      const diaConfig = getDiaConfig(config, dia);
      return Boolean(diaConfig?.entrada && diaConfig?.salida);
    });

    const tipo = esFija ? 'Fija' : 'Flexible';
    const horas = jornada.horasSemanales;

    if (jornada.esPredefinida) {
      return `Jornada por Defecto (${horas}h ${tipo})`;
    }

    return `Jornada ${tipo} ${horas}h`;
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <PageHeader
        title="Jornadas Laborales"
        actionButton={{
          label: '+ Nueva Jornada',
          onClick: handleCrear,
        }}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Horas Semanales</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Asignados</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : !jornadas || jornadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      layout="table"
                      icon={CalendarX}
                      title="No hay jornadas creadas"
                      description="Crea una jornada para asignarla a los empleados"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                jornadas.map((jornada) => (
                  <TableRow key={jornada.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{getNombreGenerado(jornada)}</div>
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
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setEditarModal({ open: true, jornada, modo: 'editar' })}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        {!jornada.esPredefinida && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleEliminar(jornada.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      

      {/* Modal Editar Jornada */}
      <EditarJornadaModal
        open={editarModal.open}
        modo={editarModal.modo}
        jornada={editarModal.jornada}
        onClose={() => {
          setEditarModal({ open: false, jornada: null, modo: 'crear' });
          refetchJornadas('/api/jornadas'); // Recargar lista
        }}
      />
    </div>
  );
}

