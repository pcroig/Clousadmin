// ========================================
// Mi Espacio HR Client Component - Tabs Layout
// ========================================

'use client';

import { Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { DenunciaDialog } from '@/components/empleado/denuncia-dialog';
import { AusenciasTab } from '@/components/shared/mi-espacio/ausencias-tab';
import { ContratosTab } from '@/components/shared/mi-espacio/contratos-tab';
import { DocumentosTab } from '@/components/shared/mi-espacio/documentos-tab';
import { FichajesTab } from '@/components/shared/mi-espacio/fichajes-tab';
import { GeneralTab } from '@/components/shared/mi-espacio/general-tab';
import { ProfileAvatar } from '@/components/shared/profile-avatar';
import { Button } from '@/components/ui/button';

import type { MiEspacioEmpleado, Usuario } from '@/types/empleado';

interface MiEspacioHRClientProps {
  empleado: MiEspacioEmpleado;
  usuario: Usuario;
}

export function MiEspacioHRClient({ empleado, usuario }: MiEspacioHRClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [denunciaDialogOpen, setDenunciaDialogOpen] = useState(false);

  const handleFieldUpdate = async (field: keyof MiEspacioEmpleado, value: unknown) => {
    try {
      const response = await fetch(`/api/empleados/${empleado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const error = await response.json() as Record<string, any>;
        throw new Error(error.error || 'Error al actualizar campo');
      }

      toast.success('Campo actualizado correctamente');
      router.refresh();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar campo');
    }
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'ausencias', label: 'Ausencias' },
    { id: 'fichajes', label: 'Fichajes' },
    { id: 'contratos', label: 'Contratos' },
    { id: 'documentos', label: 'Documentos' },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header con avatar y nombre */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <ProfileAvatar
            empleadoId={empleado.id}
            nombre={empleado.nombre ?? ''}
            apellidos={empleado.apellidos}
            email={usuario.email}
            fotoUrl={empleado.fotoUrl}
            showEditButton
          />

          <div className="flex items-center gap-2">
            {/* Botón Dar de Baja - visible en Contratos */}
            {activeTab === 'contratos' && (
              <Button
                variant="destructive"
                onClick={() => {
                  const event = new CustomEvent('darDeBajaContrato');
                  window.dispatchEvent(event);
                }}
              >
                Dar de Baja
              </Button>
            )}

            {/* Botón Canal de Denuncias */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDenunciaDialogOpen(true)}
              className="rounded-lg"
              title="Canal de denuncias"
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'general' && <GeneralTab empleado={empleado} usuario={usuario} rol="hr_admin" onFieldUpdate={handleFieldUpdate} />}
        {activeTab === 'ausencias' && <AusenciasTab empleadoId={empleado.id} contexto="hr_admin" />}
        {activeTab === 'fichajes' && (
          <FichajesTab empleadoId={empleado.id} empleado={empleado} contexto="hr_admin" />
        )}
        {activeTab === 'contratos' && <ContratosTab empleado={empleado} rol="hr_admin" />}
        {activeTab === 'documentos' && <DocumentosTab empleado={empleado} />}
      </div>

      {/* Dialog de Denuncias */}
      <DenunciaDialog
        isOpen={denunciaDialogOpen}
        onClose={() => setDenunciaDialogOpen(false)}
      />
    </div>
  );
}
