// ========================================
// Puestos Client Component
// ========================================

'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CompactFilterBar } from '@/components/adaptive/CompactFilterBar';
import { MobileActionBar } from '@/components/adaptive/MobileActionBar';
import { ResponsiveContainer } from '@/components/adaptive/ResponsiveContainer';
import { PuestoDetails } from '@/components/organizacion/puesto-details';
import { PuestoFormModal } from '@/components/organizacion/puesto-form-modal';
import { Column, DataTable } from '@/components/shared/data-table';
import { DetailsPanel } from '@/components/shared/details-panel';
import { TableHeader } from '@/components/shared/table-header';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/lib/hooks/use-viewport';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [_filtersOpen, _setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

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
      const data = await response.json() as Record<string, any>;

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

  const puestosFiltrados = puestos.filter((puesto) =>
    puesto.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
      priority: 'high',
      sticky: true,
    },
    {
      id: 'numeroEmpleados',
      header: 'Empleados',
      cell: (row) => (
        <span className="text-gray-900 font-medium">{row.numeroEmpleados}</span>
      ),
      width: '20%',
      priority: 'high',
    },
    {
      id: 'numeroDocumentos',
      header: 'Documentos',
      cell: (row) => (
        <span className="text-gray-900">{row.numeroDocumentos}</span>
      ),
      width: '20%',
      priority: 'medium',
    },
  ];

  const FiltersForm = ({ layout }: { layout: 'desktop' | 'mobile' }) => (
    <div className={layout === 'desktop' ? 'flex items-center gap-3 flex-1' : 'space-y-3'}>
      <Input
        placeholder="Buscar puesto..."
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
              title="Puestos"
              primaryAction={{
                icon: Plus,
                label: 'Crear puesto',
                onClick: () => setShowCreateModal(true),
              }}
              className="mb-3"
            />

            {/* Búsqueda */}
            <div className="flex-shrink-0 mb-3">
              <CompactFilterBar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar puesto..."
              />
            </div>
          </>
        ) : (
          <>
            <TableHeader
              title="Puestos de Trabajo"
              actionButton={{
                label: '+ Crear Puesto',
                onClick: () => setShowCreateModal(true),
              }}
            />
            <div className="flex items-center justify-between mb-6 gap-4">
              <FiltersForm layout="desktop" />
            </div>
          </>
        )}

        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={puestosFiltrados}
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
      </ResponsiveContainer>

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
