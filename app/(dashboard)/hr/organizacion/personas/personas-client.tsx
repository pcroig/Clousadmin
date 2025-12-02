// ========================================
// Personas Client Component
// ========================================

'use client';

import { Flag, Plus, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CompactFilterBar } from '@/components/adaptive/CompactFilterBar';
import { DenunciasDetails } from '@/components/hr/denuncias-details';
import { GestionarOnboardingModal } from '@/components/hr/gestionar-onboarding-modal';
import { PageMobileHeader } from '@/components/layout/page-mobile-header';
import { AddPersonaDialog } from '@/components/organizacion/add-persona-dialog';
import { AvatarCell, Column, DataTable } from '@/components/shared/data-table';
import { DetailsPanel } from '@/components/shared/details-panel';
import { ExpandableSearch } from '@/components/shared/expandable-search';
import { TableHeader } from '@/components/shared/table-header';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/lib/hooks/use-viewport';


interface Empleado {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  equipo: string;
  puesto: string;
  tipoContrato: string;
  manager: string;
  activo: boolean;
  avatar?: string;
  fotoUrl?: string | null;
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
  const [_filtersOpen, _setFiltersOpen] = useState(false);
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
      cell: (row) => (
        <AvatarCell
          nombre={row.nombre}
          fotoUrl={row.fotoUrl ?? row.avatar ?? null}
          subtitle={row.email}
        />
      ),
      width: '25%',
      priority: 'high',
      sticky: true,
    },
    {
      id: 'equipo',
      header: 'Equipo',
      accessorKey: 'equipo',
      width: '15%',
      priority: 'high',
    },
    {
      id: 'puesto',
      header: 'Puesto',
      accessorKey: 'puesto',
      width: '15%',
      priority: 'medium',
    },
    {
      id: 'tipoContrato',
      header: 'Tipo de Contrato',
      cell: (row) => {
        const contratoLabels: Record<string, string> = {
          indefinido: 'Indefinido',
          temporal: 'Temporal',
          administrador: 'Administrador',
          fijo_discontinuo: 'Fijo discontinuo',
          becario: 'Becario',
          practicas: 'Prácticas',
          obra_y_servicio: 'Obra y servicio',
        };
        return contratoLabels[row.tipoContrato] || row.tipoContrato;
      },
      width: '15%',
      priority: 'medium',
    },
    {
      id: 'manager',
      header: 'Manager',
      accessorKey: 'manager',
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
      width: '10%',
      priority: 'low',
    },
  ];

  return (
    <div className="h-full w-full flex flex-col px-1 py-1 sm:max-w-[1800px] sm:mx-auto sm:px-8 sm:py-6">
      {isMobile ? (
        <>
          <PageMobileHeader
            title="Personas"
            actions={[
              {
                icon: Plus,
                label: 'Añadir persona',
                onClick: () => setAddPersonaDialogOpen(true),
                isPrimary: true,
              },
              {
                icon: Flag,
                label: 'Canal de denuncias',
                onClick: () => setDenunciasDetailsOpen(true),
              },
              {
                icon: Settings,
                label: 'Gestionar onboarding',
                onClick: () => setGestionarOnboardingOpen(true),
              },
            ]}
          />

          {/* Búsqueda */}
          <div className="flex-shrink-0 mb-3">
            <CompactFilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por nombre, email..."
            />
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DataTable
              columns={columns}
              data={empleadosFiltrados}
              onRowClick={(row) => router.push(`/hr/organizacion/personas/${row.id}`)}
              getRowId={(row) => row.id}
              emptyMessage="No hay personas registradas"
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
            rightContent={(
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDenunciasDetailsOpen(true)}
                  className="gap-2"
                >
                  <Flag className="h-4 w-4" />
                  <span>Canal de denuncias</span>
                </Button>
                <ExpandableSearch
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar persona..."
                />
              </div>
            )}
          />

          {/* Desktop table */}
          <div className="flex-1 overflow-y-auto">
            <DataTable
              columns={columns}
              data={empleadosFiltrados}
              onRowClick={(row) => router.push(`/hr/organizacion/personas/${row.id}`)}
              getRowId={(row) => row.id}
              emptyMessage="No hay personas registradas"
            />
          </div>
        </>
      )}

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
