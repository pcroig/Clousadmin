// ========================================
// Personas Client Component
// ========================================

'use client';

import { Filter, Flag, Plus, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DenunciasDetails } from '@/components/hr/denuncias-details';
import { GestionarOnboardingModal } from '@/components/hr/gestionar-onboarding-modal';
import { AddPersonaDialog } from '@/components/organizacion/add-persona-dialog';
import { CompactFilterBar } from '@/components/adaptive/CompactFilterBar';
import { MobileActionBar } from '@/components/adaptive/MobileActionBar';
import { MobilePageHeader } from '@/components/adaptive/MobilePageHeader';
import { ResponsiveContainer } from '@/components/adaptive/ResponsiveContainer';
import { AvatarCell, Column, DataTable } from '@/components/shared/data-table';
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


interface Empleado {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  equipo: string;
  puesto: string;
  activo: boolean;
  avatar?: string;
  detalles: {
    dni: string;
    numeroSS: string | null;
    fechaNacimiento: Date | null;
    direccionCalle: string | null;
    direccionNumero: string | null;
    direccionPiso: string | null;
    direccionProvincia: string | null;
    ciudad: string | null;
    codigoPostal: string | null;
    pais: string | null;
    iban: string | null;
    fechaIngreso: Date | null;
    salarioBase: number | null;
  };
}

interface PersonasClientProps {
  empleados: Empleado[];
  initialPanel?: 'denuncias';
  initialDenunciaId?: string;
}

export function PersonasClient({ empleados, initialPanel, initialDenunciaId }: PersonasClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [addPersonaDialogOpen, setAddPersonaDialogOpen] = useState(false);
  const [gestionarOnboardingOpen, setGestionarOnboardingOpen] = useState(false);
  const [denunciasDetailsOpen, setDenunciasDetailsOpen] = useState(initialPanel === 'denuncias');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Filtrar empleados por búsqueda
  const empleadosFiltrados = empleados.filter((emp) =>
    emp.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Columnas de la tabla
  const columns: Column<Empleado>[] = [
    {
      id: 'nombre',
      header: 'Nombre',
      cell: (row) => <AvatarCell nombre={row.nombre} avatar={row.avatar} />,
      width: '25%',
      priority: 'high',
      sticky: true,
    },
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
      width: '25%',
      priority: 'high',
    },
    {
      id: 'telefono',
      header: 'Teléfono',
      accessorKey: 'telefono',
      width: '15%',
      priority: 'medium',
    },
    {
      id: 'equipo',
      header: 'Equipo',
      accessorKey: 'equipo',
      width: '15%',
      priority: 'medium',
    },
    {
      id: 'puesto',
      header: 'Puesto',
      accessorKey: 'puesto',
      width: '15%',
      priority: 'low',
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.activo
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
      width: '5%',
      priority: 'low',
    },
  ];

  const FiltersForm = ({ layout }: { layout: 'desktop' | 'mobile' }) => (
    <div className={layout === 'desktop' ? 'flex items-center gap-3 flex-1' : 'space-y-3'}>
      <Input
        placeholder="Buscar persona..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={layout === 'desktop' ? 'w-[240px]' : 'w-full'}
      />
    </div>
  );

  return (
    <ResponsiveContainer variant="page" className="h-full w-full flex flex-col overflow-hidden">
      {isMobile ? (
        <>
          {/* Action Bar - 48px */}
          <MobileActionBar
            title="Personas"
            primaryAction={{
              icon: Plus,
              label: 'Añadir Persona',
              onClick: () => setAddPersonaDialogOpen(true),
            }}
            secondaryActions={[
              {
                icon: Flag,
                label: 'Canal de denuncias',
                onClick: () => setDenunciasDetailsOpen(true),
              },
            ]}
            overflowActions={[
              {
                icon: Settings,
                label: 'Gestionar on/offboarding',
                onClick: () => setGestionarOnboardingOpen(true),
              },
            ]}
            className="mb-3"
          />

          {/* Search Bar - 44px */}
          <div className="flex-shrink-0 mb-3">
            <CompactFilterBar
              searchValue={filtros.busqueda}
              onSearchChange={(value) => setFiltros((prev) => ({ ...prev, busqueda: value }))}
              searchPlaceholder="Buscar por nombre, email..."
            />
          </div>
        </>
      ) : (
        <>
          <TableHeader
            title="Personas"
            actionButton={{
              label: '+ Añadir Persona',
              onClick: () => setAddPersonaDialogOpen(true),
            }}
            secondaryActionButton={{
              label: 'Gestionar on/offboarding',
              onClick: () => setGestionarOnboardingOpen(true),
              variant: 'outline',
            }}
          />
          <div className="flex items-center justify-between mb-6 gap-4">
            <FiltersForm layout="desktop" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDenunciasDetailsOpen(true)}
              className="rounded-lg"
              title="Canal de denuncias"
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0">
        <DataTable
          columns={columns}
          data={empleadosFiltrados}
          onRowClick={(row) => router.push(`/hr/organizacion/personas/${row.id}`)}
          getRowId={(row) => row.id}
          emptyMessage="No hay personas registradas"
        />
      </div>

      {/* Dialog para añadir persona */}
      <AddPersonaDialog
        open={addPersonaDialogOpen}
        onOpenChange={setAddPersonaDialogOpen}
        onSuccess={() => {
          setAddPersonaDialogOpen(false);
          router.refresh(); // Refrescar la página para mostrar el nuevo empleado
        }}
      />

      {/* Modal para gestionar onboarding */}
      <GestionarOnboardingModal
        open={gestionarOnboardingOpen}
        onOpenChange={setGestionarOnboardingOpen}
      />

      {/* Panel de Denuncias */}
      <DetailsPanel
        isOpen={denunciasDetailsOpen}
        onClose={() => setDenunciasDetailsOpen(false)}
        title="Canal de Denuncias"
      >
        <DenunciasDetails
          onClose={() => setDenunciasDetailsOpen(false)}
          initialDenunciaId={initialDenunciaId}
        />
      </DetailsPanel>
    </div>
  );
}
