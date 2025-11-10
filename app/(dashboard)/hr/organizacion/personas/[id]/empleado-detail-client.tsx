// ========================================
// Empleado Detail Client Component
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Calendar, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/shared/loading-button';
import { CompensacionModal } from '@/components/hr/compensacion-modal';
import { getAvatarStyle } from '@/lib/design-system';
import type { Empleado, Usuario } from '@/types/empleado';
import { GeneralTab as GeneralTabShared } from '@/app/(dashboard)/hr/mi-espacio/tabs/general-tab';
import { FichajesTab as FichajesTabShared } from '@/app/(dashboard)/hr/mi-espacio/tabs/fichajes-tab';
import { ContratosTab as ContratosTabShared } from '@/app/(dashboard)/hr/mi-espacio/tabs/contratos-tab';
import { DocumentosTab as DocumentosTabShared } from '@/app/(dashboard)/hr/mi-espacio/tabs/documentos-tab';

interface EmpleadoDetailClientProps {
  empleado: Empleado;
  usuario: Usuario;
}

export function EmpleadoDetailClient({ empleado, usuario }: EmpleadoDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');

  // Función helper para actualizar campos del empleado
  const handleFieldUpdate = async (field: string, value: any) => {
    try {
      const response = await fetch(`/api/empleados/${empleado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar campo');
      }

      toast.success('Campo actualizado correctamente');
      router.refresh();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar campo');
    }
  };

  const getInitials = () => {
    return `${empleado.nombre.charAt(0)}${empleado.apellidos.charAt(0)}`.toUpperCase();
  };

  const avatarStyle = getAvatarStyle(`${empleado.nombre} ${empleado.apellidos || ''}`);

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'fichajes', label: 'Fichajes' },
    { id: 'ausencias', label: 'Ausencias' },
    { id: 'contratos', label: 'Contratos' },
    { id: 'documentos', label: 'Documentos' },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header con avatar y nombre */}
      <div className="mb-6">
        <Link
          href="/hr/organizacion/personas"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver</span>
        </Link>

        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {empleado.fotoUrl && <AvatarImage src={empleado.fotoUrl} />}
            <AvatarFallback
              className="text-lg font-semibold uppercase"
              style={avatarStyle}
            >
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {empleado.nombre} {empleado.apellidos}
            </h1>
            <p className="text-sm text-gray-500">{empleado.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'general' && (
          <GeneralTabShared
            empleado={empleado}
            usuario={usuario}
            rol="hr_admin"
            onFieldUpdate={handleFieldUpdate}
          />
        )}
        {activeTab === 'fichajes' && (
          <FichajesTabShared 
            empleadoId={empleado.id}
            empleadoNombre={`${empleado.nombre} ${empleado.apellidos}`}
          />
        )}
        {activeTab === 'ausencias' && <AusenciasTab empleado={empleado} />}
        {activeTab === 'contratos' && (
          <ContratosTabShared
            empleado={empleado}
            rol="hr_admin"
            onFieldUpdate={handleFieldUpdate}
          />
        )}
        {activeTab === 'documentos' && <DocumentosTabShared empleado={empleado} />}
      </div>
    </div>
  );
}

// ========================================
// AusenciasTab Component
// ========================================
interface AusenciasTabProps {
  empleado: Empleado;
}

function AusenciasTab({ empleado }: AusenciasTabProps) {
  // Calcular saldo de ausencias
  const calcularSaldo = () => {
    const totalDias = empleado.diasVacaciones || 22;
    const ausencias = empleado.ausencias || [];

    const diasUsados = ausencias
      .filter((a: any) => a.estado === 'approved')
      .reduce((sum: number, a: any) => sum + (a.diasLaborables || 0), 0);

    const diasPendientes = ausencias
      .filter((a: any) => a.estado === 'pending')
      .reduce((sum: number, a: any) => sum + (a.diasLaborables || 0), 0);

    const diasDisponibles = totalDias - diasUsados - diasPendientes;

    return {
      diasTotales: totalDias,
      diasUsados,
      diasPendientes,
      diasDisponibles,
    };
  };

  const saldo = calcularSaldo();
  const ausencias = empleado.ausencias || [];

  // Ordenar ausencias por fecha (más recientes primero)
  const ausenciasOrdenadas = ausencias.sort((a: any, b: any) => 
    new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
  );

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'approved':
      case 'auto_aprobada':
      case 'en_curso':
        return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      case 'pending':
      case 'pendiente_aprobacion':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'completada':
        return <Badge className="bg-gray-100 text-gray-800">Completada</Badge>;
      case 'cancelada':
        return <Badge className="bg-gray-100 text-gray-800">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getTipoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      vacaciones: 'Vacaciones',
      enfermedad: 'Enfermedad',
      enfermedad_familiar: 'Enfermedad Familiar',
      maternidad_paternidad: 'Maternidad/Paternidad',
      otro: 'Otro',
    };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="space-y-6">
      {/* Card de saldo - una sola altura */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Saldo de Ausencias {new Date().getFullYear()}</h3>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{saldo.diasTotales}</div>
            <div className="text-xs text-gray-500 mt-1">Asignados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{saldo.diasUsados}</div>
            <div className="text-xs text-gray-500 mt-1">Gastados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{saldo.diasPendientes}</div>
            <div className="text-xs text-gray-500 mt-1">Pendientes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{saldo.diasDisponibles}</div>
            <div className="text-xs text-gray-500 mt-1">Disponibles</div>
          </div>
        </div>
      </div>

      {/* Tabla de ausencias */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Historial de Ausencias</h3>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha Inicio</TableHead>
              <TableHead>Fecha Fin</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ausenciasOrdenadas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No hay ausencias registradas
                </TableCell>
              </TableRow>
            ) : (
              ausenciasOrdenadas.map((ausencia: any) => (
                <TableRow key={ausencia.id}>
                  <TableCell className="font-medium">
                    {getTipoLabel(ausencia.tipo)}
                  </TableCell>
                  <TableCell>
                    {new Date(ausencia.fechaInicio).toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell>
                    {new Date(ausencia.fechaFin).toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell>
                    {ausencia.diasLaborables || 0} {ausencia.diasLaborables === 1 ? 'día' : 'días'}
                  </TableCell>
                  <TableCell>
                    {getEstadoBadge(ausencia.estado)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {ausencia.motivo || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ========================================
// FichajesTab Shared Integration
