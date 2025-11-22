// ========================================
// Equipos Client Component
// ========================================

'use client';

import { Filter, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EquipoDetails } from '@/components/organizacion/equipo-details';
import { EquipoFormModal } from '@/components/organizacion/equipo-form-modal';
import { CompactFilterBar } from '@/components/adaptive/CompactFilterBar';
import { MobileActionBar } from '@/components/adaptive/MobileActionBar';
import { MobilePageHeader } from '@/components/adaptive/MobilePageHeader';
import { ResponsiveContainer } from '@/components/adaptive/ResponsiveContainer';
import { Column, DataTable } from '@/components/shared/data-table';
import { DetailsPanel } from '@/components/shared/details-panel';
import { TableHeader } from '@/components/shared/table-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
    avatar?: string;
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      const data = await response.json();

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

      const apiData = data as ApiEquipo[];
      const transformedData = apiData.map((equipo) => ({
        id: equipo.id,
        nombre: equipo.nombre,
        descripcion: equipo.descripcion || '',
        responsable: equipo.manager
          ? `${equipo.manager.nombre} ${equipo.manager.apellidos}`
          : 'Sin responsable',
        responsableId: equipo.managerId,
        numeroEmpleados: equipo.miembros.length,
        empleados: equipo.miembros.map((miembro) => ({
          id: miembro.empleado.id,
          nombre: `${miembro.empleado.nombre} ${miembro.empleado.apellidos}`,
          avatar: miembro.empleado.fotoUrl || undefined,
        })),
        sede: equipo.sede,
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

  const FiltersForm = ({ layout }: { layout: 'desktop' | 'mobile' }) => (
    <div className={layout === 'desktop' ? 'flex items-center gap-3 flex-1' : 'space-y-3'}>
      <Input
        placeholder="Buscar equipo..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={layout === 'desktop' ? 'w-[240px]' : 'w-full'}
      />
    </div>
  );

  return (
    <>
      <ResponsiveContainer variant="page" className="h-full w-full flex flex-col overflow-hidden">
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
                searchValue={filtros.busqueda}
                onSearchChange={(value) => setFiltros((prev) => ({ ...prev, busqueda: value }))}
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
            />
            <div className="flex items-center justify-between mb-6 gap-4">
              <FiltersForm layout="desktop" />
            </div>
          </>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={equiposFiltrados}
            onRowClick={(row) => setSelectedEquipo(row)}
            getRowId={(row) => row.id}
            emptyMessage="No hay equipos creados"
          />
        </div>

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
      </div>

      {/* Create Team Modal */}
      <EquipoFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          reloadEquipos();
        }}
      />
      </ResponsiveContainer>
    </>
  );
}
