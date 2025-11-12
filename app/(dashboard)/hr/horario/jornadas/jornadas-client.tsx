'use client';

// ========================================
// Jornadas Client Component
// ========================================

import { useState, useEffect } from 'react';
import { useApi, useMutation } from '@/lib/hooks';
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
import { Badge } from '@/components/ui/badge';

import { TableHeader as PageHeader } from '@/components/shared/table-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Edit2, Trash2, Users, CalendarX } from 'lucide-react';
import { EditarJornadaModal } from '../fichajes/editar-jornada-modal';

interface Jornada {
  id: string;
  nombre: string;
  horasSemanales: number;
  config: any;
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
    const config = jornada.config || {};
    const diasActivos = Object.values(config).filter((dia: any) => dia.activo).length;

    if (jornada.esPredefinida) {
      return <Badge className="bg-blue-100 text-blue-800">Predefinida</Badge>;
    }

    // Determinar si es fija o flexible basándose en la configuración
    const esFija = Object.values(config).some((dia: any) => dia.entrada && dia.salida);

    return esFija ? (
      <Badge className="bg-green-100 text-green-800">Fija</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Flexible</Badge>
    );
  }

  function getDescripcion(jornada: Jornada) {
    const config = jornada.config || {};
    const primerDiaActivo = Object.entries(config).find(([_, dia]: any) => dia.activo)?.[1] as any;

    if (primerDiaActivo?.entrada && primerDiaActivo?.salida) {
      return `${primerDiaActivo.entrada} - ${primerDiaActivo.salida}`;
    }

    return `${jornada.horasSemanales}h semanales`;
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
                <TableHead>Nombre</TableHead>
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

