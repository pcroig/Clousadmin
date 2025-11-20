// ========================================
// Puestos Client Component
// ========================================

'use client';

import { useState, useEffect } from 'react';
import { TableHeader } from '@/components/shared/table-header';
import { TableFilters } from '@/components/shared/table-filters';
import { DataTable, Column } from '@/components/shared/data-table';
import { DetailsPanel } from '@/components/shared/details-panel';
import { PuestoDetails } from '@/components/organizacion/puesto-details';
import { PuestoFormModal } from '@/components/organizacion/puesto-form-modal';

interface Puesto {
  id: string;
  nombre: string;
  descripcion: string;
  numeroEmpleados: number;
  numeroDocumentos: number;
  empleados: {
    id: string;
    nombre: string;
    avatar?: string;
  }[];
  documentos: {
    id: string;
    nombre: string;
    tipoDocumento: string;
    mimeType: string;
    tamano: number;
    createdAt: string;
    downloadUrl: string;
  }[];
}

interface PuestosClientProps {
  puestos: Puesto[];
}

export function PuestosClient({ puestos: initialPuestos }: PuestosClientProps) {
  const [puestos, setPuestos] = useState<Puesto[]>(initialPuestos);
  const [selectedPuesto, setSelectedPuesto] = useState<Puesto | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Update selected puesto when puestos list changes
  useEffect(() => {
    if (selectedPuesto) {
      const updated = puestos.find((p) => p.id === selectedPuesto.id);
      if (updated) {
        setSelectedPuesto(updated);
      }
    }
  }, [puestos, selectedPuesto]);

  const reloadPuestos = async () => {
    try {
      const response = await fetch('/api/puestos');
      if (!response.ok) {
        throw new Error('Error al cargar puestos');
      }
      const data = await response.json();

      // Transform data to match the expected format
      interface ApiPuesto {
        id: string;
        nombre: string;
        descripcion?: string | null;
        _count: {
          empleados: number;
          documentos: number;
        };
        empleados: Array<{
          id: string;
          nombre: string;
          apellidos: string;
          fotoUrl?: string | null;
        }>;
        documentos?: Array<{
          id: string;
          nombre: string;
          tipoDocumento: string;
          mimeType: string;
          tamano: number;
          createdAt: string;
          downloadUrl?: string | null;
        }>;
      }

      const apiData = data as ApiPuesto[];
      const transformedData = apiData.map((puesto) => ({
        id: puesto.id,
        nombre: puesto.nombre,
        descripcion: puesto.descripcion || '',
        numeroEmpleados: puesto._count.empleados,
        numeroDocumentos: puesto._count.documentos,
        empleados: puesto.empleados.map((emp) => ({
          id: emp.id,
          nombre: `${emp.nombre} ${emp.apellidos}`,
          avatar: emp.fotoUrl || undefined,
        })),
        documentos: (puesto.documentos || []).map((doc) => ({
          ...doc,
          downloadUrl: doc.downloadUrl || `/api/documentos/${doc.id}?inline=1`,
        })),
      }));

      setPuestos(transformedData);
    } catch (error) {
      console.error('Error reloading puestos:', error);
    }
  };

  const handlePuestoDeleted = () => {
    setSelectedPuesto(null);
    reloadPuestos();
  };

  // Columnas de la tabla
  const columns: Column<Puesto>[] = [
    {
      id: 'nombre',
      header: 'Puesto',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.nombre}</p>
          {row.descripcion && (
            <p className="text-sm text-gray-500 line-clamp-1">{row.descripcion}</p>
          )}
        </div>
      ),
      width: '40%',
    },
    {
      id: 'numeroEmpleados',
      header: 'Empleados',
      cell: (row) => (
        <span className="text-gray-900 font-medium">{row.numeroEmpleados}</span>
      ),
      width: '20%',
    },
    {
      id: 'numeroDocumentos',
      header: 'Documentos',
      cell: (row) => (
        <span className="text-gray-900">{row.numeroDocumentos}</span>
      ),
      width: '20%',
    },
  ];

  return (
    <>
      <div className="h-full w-full flex flex-col">
        {/* Header */}
        <TableHeader
          title="Puestos de Trabajo"
          actionButton={{
            label: '+ Crear Puesto',
            onClick: () => setShowCreateModal(true),
          }}
        />

        {/* Filters */}
        <TableFilters
          onFilterClick={() => console.log('Filtro')}
          showDateNavigation={false}
        />

        {/* Content */}
        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={puestos}
            onRowClick={(row) => setSelectedPuesto(row)}
            getRowId={(row) => row.id}
            emptyMessage="No hay puestos creados"
          />
        </div>

        {/* Details Panel */}
        <DetailsPanel
          isOpen={!!selectedPuesto}
          onClose={() => setSelectedPuesto(null)}
          title={selectedPuesto?.nombre || 'Detalles'}
        >
          {selectedPuesto && (
            <PuestoDetails
              puesto={selectedPuesto}
              onUpdate={reloadPuestos}
              onDelete={handlePuestoDeleted}
            />
          )}
        </DetailsPanel>
      </div>

      {/* Create Puesto Modal */}
      <PuestoFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          reloadPuestos();
        }}
      />
    </>
  );
}
