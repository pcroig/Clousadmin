// ========================================
// Personas Client Component
// ========================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TableHeader } from '@/components/shared/table-header';
import { TableFilters } from '@/components/shared/table-filters';
import { DataTable, Column, AvatarCell } from '@/components/shared/data-table';
import { AddPersonaDialog } from '@/components/organizacion/add-persona-dialog';
import { GestionarOnboardingModal } from '@/components/hr/gestionar-onboarding-modal';
import { DetailsPanel } from '@/components/shared/details-panel';
import { DenunciasDetails } from '@/components/hr/denuncias-details';
import { Button } from '@/components/ui/button';
import { Settings, Flag } from 'lucide-react';

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
    },
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
      width: '25%',
    },
    {
      id: 'telefono',
      header: 'Teléfono',
      accessorKey: 'telefono',
      width: '15%',
    },
    {
      id: 'equipo',
      header: 'Equipo',
      accessorKey: 'equipo',
      width: '15%',
    },
    {
      id: 'puesto',
      header: 'Puesto',
      accessorKey: 'puesto',
      width: '15%',
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
    },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Personas</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDenunciasDetailsOpen(true)}
            className="rounded-lg"
            title="Canal de denuncias"
          >
            <Flag className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setGestionarOnboardingOpen(true)}
          >
            Gestionar on/offboarding
          </Button>
          <Button onClick={() => setAddPersonaDialogOpen(true)}>
            + Añadir Persona
          </Button>
        </div>
      </div>

      {/* Filters */}
      <TableFilters
        onFilterClick={() => console.log('Filtro')}
        showDateNavigation={false}
      />

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
