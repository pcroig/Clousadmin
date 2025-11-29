// ========================================
// Equipos Client Component
// ========================================

'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CompactFilterBar } from '@/components/adaptive/CompactFilterBar';
import { MobileActionBar } from '@/components/adaptive/MobileActionBar';
import { ResponsiveContainer } from '@/components/adaptive/ResponsiveContainer';
import { EquipoDetails } from '@/components/organizacion/equipo-details';
import { EquipoFormModal } from '@/components/organizacion/equipo-form-modal';
import { Column, DataTable } from '@/components/shared/data-table';
import { ExpandableSearch } from '@/components/shared/expandable-search';
import { DetailsPanel } from '@/components/shared/details-panel';
import { TableHeader } from '@/components/shared/table-header';
import { useIsMobile } from '@/lib/hooks/use-viewport';

interface Equipo {
  id: string;
  nombre: string;
  descripcion: string;
  responsable: string;
  responsableId: string | null;
  numeroEmpleados: number;
  empleados: {
    id: string;
    nombre: string;
    avatar?: string | null;
    fotoUrl?: string | null;
  }[];
  sede?: {
    id: string;
    nombre: string;
    ciudad?: string;
  } | null;
  sedeId?: string | null;
}

interface EquiposClientProps {
  equipos: Equipo[];
}

export function EquiposClient({ equipos: initialEquipos }: EquiposClientProps) {
  const [equipos, setEquipos] = useState<Equipo[]>(initialEquipos);
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [_filtersOpen, _setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Update selected equipo when equipos list changes
  useEffect(() => {
    if (selectedEquipo) {
      const updated = equipos.find((eq) => eq.id === selectedEquipo.id);
      if (updated) {
        setSelectedEquipo(updated);
      }
    }
  }, [equipos, selectedEquipo]);

  const reloadEquipos = async () => {
    try {
      const response = await fetch('/api/equipos');
      if (!response.ok) {
        throw new Error('Error al cargar equipos');
      }
      const data = await response.json() as Record<string, unknown>;

      // Transform data to match the expected format
      interface ApiEquipo {
        id: string;
        nombre: string;
        descripcion?: string | null;
        managerId?: string | null;
        manager?: {
          nombre: string;
          apellidos: string;
        } | null;
        miembros: Array<{
          empleado: {
            id: string;
            nombre: string;
            apellidos: string;
            fotoUrl?: string | null;
          };
        }>;
        sede?: {
          id: string;
          nombre: string;
          ciudad?: string | null;
        } | null;
        sedeId?: string | null;
      }

      const apiData = Array.isArray(data) ? data as unknown as ApiEquipo[] : [];
      const transformedData = apiData.map((equipo) => ({
        id: equipo.id,
        nombre: equipo.nombre,
        descripcion: equipo.descripcion || '',
        responsable: equipo.manager
          ? `${equipo.manager.nombre} ${equipo.manager.apellidos}`
          : 'Sin responsable',
        responsableId: equipo.managerId ?? null,
        numeroEmpleados: equipo.miembros.length,
        empleados: equipo.miembros.map((miembro) => ({
          id: miembro.empleado.id,
          nombre: `${miembro.empleado.nombre} ${miembro.empleado.apellidos}`,
          avatar: miembro.empleado.fotoUrl || null,
          fotoUrl: miembro.empleado.fotoUrl || null,
        })),
        sede: equipo.sede
          ? {
              id: equipo.sede.id,
              nombre: equipo.sede.nombre,
              ciudad: equipo.sede.ciudad || undefined,
            }
          : null,
        sedeId: equipo.sedeId,
      }));

      setEquipos(transformedData);
    } catch (error) {
      console.error('Error reloading teams:', error);
    }
  };

  const handleTeamDeleted = () => {
    setSelectedEquipo(null);
    reloadEquipos();
  };

  const equiposFiltrados = equipos.filter((equipo) =>
    equipo.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Columnas de la tabla
  const columns: Column<Equipo>[] = [
    {
      id: 'nombre',
      header: 'Nombre',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.nombre}</p>
          {row.descripcion && (
            <p className="text-sm text-gray-500 line-clamp-1">{row.descripcion}</p>
          )}
        </div>
      ),
      width: '30%',
      priority: 'high',
      sticky: true,
    },
    {
      id: 'responsable',
      header: 'Responsable',
      accessorKey: 'responsable',
      width: '20%',
      priority: 'high',
    },
    {
      id: 'sede',
      header: 'Sede',
      cell: (row) => (
        <span className="text-gray-900">
          {row.sede ? row.sede.nombre : 'Sin sede'}
        </span>
      ),
      width: '20%',
      priority: 'medium',
    },
    {
      id: 'numeroEmpleados',
      header: 'Miembros',
      cell: (row) => (
        <span className="text-gray-900 font-medium">{row.numeroEmpleados}</span>
      ),
      width: '15%',
      priority: 'low',
    },
  ];

  return (
    <>
      <ResponsiveContainer variant="page" className="flex flex-col">
        {isMobile ? (
          <>
            <MobileActionBar
              title="Equipos"
              primaryAction={{
                icon: Plus,
                label: 'Crear equipo',
                onClick: () => setShowCreateModal(true),
              }}
              className="mb-3"
            />

            {/* Búsqueda */}
            <div className="flex-shrink-0 mb-3">
              <CompactFilterBar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar equipo..."
              />
            </div>
          </>
        ) : (
          <>
            <TableHeader
              title="Equipos"
              actionButton={{
                label: '+ Crear Equipo',
                onClick: () => setShowCreateModal(true),
              }}
              rightContent={(
                <ExpandableSearch
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar equipo..."
                />
              )}
            />
          </>
        )}

        {/* Content */}
        <DataTable
          columns={columns}
          data={equiposFiltrados}
          onRowClick={(row) => setSelectedEquipo(row)}
          getRowId={(row) => row.id}
          emptyMessage="No hay equipos creados"
        />

        {/* Details Panel */}
        <DetailsPanel
          isOpen={!!selectedEquipo}
          onClose={() => setSelectedEquipo(null)}
          title={selectedEquipo?.nombre || 'Detalles'}
        >
          {selectedEquipo && (
            <EquipoDetails
              equipo={selectedEquipo}
              onUpdate={reloadEquipos}
              onDelete={handleTeamDeleted}
            />
          )}
        </DetailsPanel>
      </ResponsiveContainer>

      {/* Create Team Modal */}
      <EquipoFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          reloadEquipos();
        }}
      />
    </>
  );
}
