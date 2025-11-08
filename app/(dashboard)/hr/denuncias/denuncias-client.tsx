// ========================================
// Denuncias Client Component
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TableHeader } from '@/components/shared/table-header';
import { TableFilters } from '@/components/shared/table-filters';
import { DataTable, Column, AvatarCell } from '@/components/shared/data-table';
import { Shield } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Denuncia {
  id: string;
  descripcion: string;
  fechaIncidente: Date | null;
  ubicacion: string | null;
  estado: string;
  prioridad: string;
  esAnonima: boolean;
  denunciante: {
    id: string;
    nombre: string;
    email: string;
    avatar: string | null;
  } | null;
  createdAt: string;
  asignadaA: string | null;
}

interface DenunciasClientProps {
  denuncias: Denuncia[];
}

export function DenunciasClient({ denuncias }: DenunciasClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todas');

  // Filtrar denuncias
  const denunciasFiltradas = denuncias.filter((denuncia) => {
    const matchesSearch =
      denuncia.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (denuncia.denunciante?.nombre || 'Anónima')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesEstado =
      estadoFiltro === 'todas' || denuncia.estado === estadoFiltro;

    return matchesSearch && matchesEstado;
  });

  // Mapeo de estados a etiquetas en español
  const estadoLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    en_revision: 'En revisión',
    resuelta: 'Resuelta',
    archivada: 'Archivada',
  };

  const prioridadColors: Record<string, string> = {
    baja: 'bg-blue-100 text-blue-800',
    media: 'bg-yellow-100 text-yellow-800',
    alta: 'bg-orange-100 text-orange-800',
    critica: 'bg-red-100 text-red-800',
  };

  const estadoColors: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    en_revision: 'bg-blue-100 text-blue-800',
    resuelta: 'bg-green-100 text-green-800',
    archivada: 'bg-gray-100 text-gray-800',
  };

  // Columnas de la tabla
  const columns: Column<Denuncia>[] = [
    {
      id: 'denunciante',
      header: 'Denunciante',
      cell: (row) =>
        row.esAnonima ? (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground italic">Anónima</span>
          </div>
        ) : row.denunciante ? (
          <AvatarCell
            nombre={row.denunciante.nombre}
            avatar={row.denunciante.avatar || undefined}
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      width: '20%',
    },
    {
      id: 'descripcion',
      header: 'Descripción',
      cell: (row) => (
        <div className="truncate max-w-md" title={row.descripcion}>
          {row.descripcion.substring(0, 100)}
          {row.descripcion.length > 100 ? '...' : ''}
        </div>
      ),
      width: '35%',
    },
    {
      id: 'prioridad',
      header: 'Prioridad',
      cell: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            prioridadColors[row.prioridad] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.prioridad.charAt(0).toUpperCase() + row.prioridad.slice(1)}
        </span>
      ),
      width: '10%',
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            estadoColors[row.estado] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {estadoLabels[row.estado] || row.estado}
        </span>
      ),
      width: '12%',
    },
    {
      id: 'fecha',
      header: 'Fecha',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.createdAt), 'dd MMM yyyy', { locale: es })}
        </span>
      ),
      width: '12%',
    },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <TableHeader
        title="Canal de Denuncias"
        subtitle={`${denunciasFiltradas.length} denuncia${denunciasFiltradas.length !== 1 ? 's' : ''}`}
        icon={<Shield className="h-6 w-6" />}
      />

      {/* Filtros */}
      <TableFilters
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar denuncias..."
        filters={[
          {
            label: 'Estado',
            value: estadoFiltro,
            options: [
              { label: 'Todas', value: 'todas' },
              { label: 'Pendientes', value: 'pendiente' },
              { label: 'En revisión', value: 'en_revision' },
              { label: 'Resueltas', value: 'resuelta' },
              { label: 'Archivadas', value: 'archivada' },
            ],
            onChange: setEstadoFiltro,
          },
        ]}
      />

      {/* Tabla */}
      <DataTable
        columns={columns}
        data={denunciasFiltradas}
        onRowClick={(row) => router.push(`/hr/denuncias/${row.id}`)}
      />
    </div>
  );
}
