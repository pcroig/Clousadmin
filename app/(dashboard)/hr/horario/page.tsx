// ========================================
// HR Horario Page - Fichajes & Ausencias
// ========================================

'use client';

import { useState } from 'react';
import { TableHeader } from '@/components/shared/table-header';
import { TableFilters } from '@/components/shared/table-filters';
import { DataTable, Column, AvatarCell } from '@/components/shared/data-table';
import { DetailsPanel } from '@/components/shared/details-panel';

import { EstadoAusencia } from '@/lib/constants/enums';

// Tipos de datos
interface Fichaje {
  id: string;
  empleado: {
    nombre: string;
    avatar?: string;
  };
  horas: string;
  extras: string;
  horario: string;
  balance: string;
}

interface Ausencia {
  id: string;
  empleado: {
    nombre: string;
    avatar?: string;
  };
  dias: number;
  estado: EstadoAusencia;
  tipo: string;
  justificante: boolean;
}

export default function HorarioPage() {
  const [activeTab, setActiveTab] = useState('fichajes');
  const [selectedItem, setSelectedItem] = useState<Ausencia | null>(null);
  const [currentMonth, setCurrentMonth] = useState('jun 2025');

  // Datos de ejemplo - Fichajes
  const fichajesData: Fichaje[] = [
    {
      id: '1',
      empleado: { nombre: 'Ada Lovelace' },
      horas: '9h 00min',
      extras: '00:00 h',
      horario: '9:00 AM - 5:00 PM',
      balance: '+196h 59min',
    },
    {
      id: '2',
      empleado: { nombre: 'Ada Lovelace' },
      horas: '9h 00min',
      extras: '00:00 h',
      horario: '9:00 AM - 5:00 PM',
      balance: '+196h 59min',
    },
    {
      id: '3',
      empleado: { nombre: 'Ada Lovelace' },
      horas: '9h 00min',
      extras: '00:00 h',
      horario: '9:00 AM - 5:00 PM',
      balance: '+196h 59min',
    },
    {
      id: '4',
      empleado: { nombre: 'Ada Lovelace' },
      horas: '9h 00min',
      extras: '00:00 h',
      horario: '9:00 AM - 5:00 PM',
      balance: '+196h 59min',
    },
    {
      id: '5',
      empleado: { nombre: 'Ada Lovelace' },
      horas: '9h 00min',
      extras: '00:00 h',
      horario: '9:00 AM - 5:00 PM',
      balance: '+196h 59min',
    },
  ];

  // Datos de ejemplo - Ausencias
  const ausenciasData: Ausencia[] = [
    {
      id: '1',
      empleado: { nombre: 'Ada Lovelace' },
      dias: 5,
      estado: EstadoAusencia.pendiente,
      tipo: 'Vacaciones',
      justificante: false,
    },
  ];

  // Columnas de Fichajes
  const fichajesColumns: Column<Fichaje>[] = [
    {
      id: 'nombre',
      header: 'Nombre',
      cell: (row) => <AvatarCell nombre={row.empleado.nombre} avatar={row.empleado.avatar} />,
      width: '25%',
    },
    {
      id: 'horas',
      header: 'Horas',
      accessorKey: 'horas',
      width: '15%',
    },
    {
      id: 'horario',
      header: 'Horario',
      accessorKey: 'horario',
      width: '25%',
    },
    {
      id: 'balance',
      header: 'Balance',
      cell: (row) => <span className="text-green-600 font-semibold">{row.balance}</span>,
      width: '20%',
    },
  ];

  // Columnas de Ausencias
  const ausenciasColumns: Column<Ausencia>[] = [
    {
      id: 'nombre',
      header: 'Nombre',
      cell: (row) => <AvatarCell nombre={row.empleado.nombre} avatar={row.empleado.avatar} />,
      width: '25%',
    },
    {
      id: 'dias',
      header: 'Días',
      accessorKey: 'dias',
      width: '15%',
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.estado === EstadoAusencia.confirmada || row.estado === EstadoAusencia.completada
              ? 'bg-green-100 text-green-800'
              : row.estado === EstadoAusencia.rechazada
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {row.estado.charAt(0).toUpperCase() + row.estado.slice(1)}
        </span>
      ),
      width: '15%',
    },
    {
      id: 'tipo',
      header: 'Tipo de ausencia',
      accessorKey: 'tipo',
      width: '25%',
    },
    {
      id: 'justificante',
      header: 'Justificante',
      cell: (row) => (row.justificante ? 'Sí' : 'No'),
      width: '15%',
    },
  ];

  const handlePreviousMonth = () => {
    // TODO: Implementar navegación de mes
  };

  const handleNextMonth = () => {
    // TODO: Implementar navegación de mes
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header con tabs */}
      <TableHeader
        title="Horario"
        tabs={[
          { id: 'fichajes', label: 'Fichajes' },
          { id: 'ausencias', label: 'Ausencias' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actionButton={{
          label: 'Cuadrar fichajes',
          onClick: () => {
            // TODO: Implementar funcionalidad de cuadrar fichajes
          },
          variant: 'outline',
        }}
      />

      {/* Filters */}
      <TableFilters
        currentMonth={currentMonth}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onFilterClick={() => {
          // TODO: Implementar funcionalidad de filtros
        }}
      />

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'fichajes' ? (
          <DataTable
            columns={fichajesColumns}
            data={fichajesData}
            getRowId={(row) => row.id}
            emptyMessage="No hay fichajes registrados"
          />
        ) : (
          <DataTable
            columns={ausenciasColumns}
            data={ausenciasData}
            onRowClick={(row) => setSelectedItem(row)}
            getRowId={(row) => row.id}
            emptyMessage="No hay ausencias registradas"
          />
        )}
      </div>

      {/* Details Panel */}
      <DetailsPanel
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.empleado?.nombre || 'Detalles'}
      >
        {selectedItem && activeTab === 'ausencias' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Tipo de ausencia</p>
              <p className="mt-1 text-sm text-gray-900">{selectedItem.tipo}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Días</p>
              <p className="mt-1 text-sm text-gray-900">{selectedItem.dias}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Estado</p>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem.estado.charAt(0).toUpperCase() + selectedItem.estado.slice(1)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Justificante</p>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem.justificante ? 'Sí' : 'No'}
              </p>
            </div>
          </div>
        )}
      </DetailsPanel>
    </div>
  );
}
