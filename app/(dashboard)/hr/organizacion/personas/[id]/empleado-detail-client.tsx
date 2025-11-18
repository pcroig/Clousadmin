'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GeneralTab as GeneralTabShared } from '@/components/shared/mi-espacio/general-tab';
import { FichajesTab as FichajesTabShared } from '@/components/shared/mi-espacio/fichajes-tab';
import { AusenciasTab as AusenciasTabShared } from '@/components/shared/mi-espacio/ausencias-tab';
import { ContratosTab as ContratosTabShared } from '@/components/shared/mi-espacio/contratos-tab';
import { DocumentosTab as DocumentosTabShared } from '@/components/shared/mi-espacio/documentos-tab';
import { ProfileAvatar } from '@/components/shared/profile-avatar';
import type { MiEspacioEmpleado, Usuario } from '@/types/empleado';

interface EmpleadoDetailClientProps {
  empleado: MiEspacioEmpleado;
  usuario: Usuario;
}

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'fichajes', label: 'Fichajes' },
  { id: 'ausencias', label: 'Ausencias' },
  { id: 'contratos', label: 'Contratos' },
  { id: 'documentos', label: 'Documentos' },
];

export function EmpleadoDetailClient({ empleado, usuario }: EmpleadoDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('general');

  const handleFieldUpdate = async (field: keyof MiEspacioEmpleado, value: unknown) => {
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

      router.refresh();
    } catch (error) {
      console.error('[EmpleadoDetailClient] Error updating field', error);
    }
  };

  const triggerSaveGeneral = () => {
    const event = new CustomEvent('saveGeneral');
    window.dispatchEvent(event);
  };

  const triggerDarDeBaja = () => {
    const event = new CustomEvent('darDeBajaContrato');
    window.dispatchEvent(event);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/hr/organizacion/personas"
            className="mb-2 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <ProfileAvatar
            empleadoId={empleado.id}
            nombre={empleado.nombre ?? ''}
            apellidos={empleado.apellidos}
            email={usuario.email}
            fotoUrl={empleado.fotoUrl}
            showEditButton
          />
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'general' && (
            <Button onClick={triggerSaveGeneral}>
              Guardar cambios
            </Button>
          )}
          {activeTab === 'contratos' && (
            <Button variant="destructive" onClick={triggerDarDeBaja}>
              Dar de baja
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 flex gap-4 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'general' && (
          <GeneralTabShared
            empleado={empleado}
            usuario={usuario}
            rol="hr_admin"
            onFieldUpdate={handleFieldUpdate}
          />
        )}

        {activeTab === 'fichajes' && (
          <FichajesTabShared empleadoId={empleado.id} empleado={empleado} contexto="hr_admin" />
        )}

        {activeTab === 'ausencias' && (
          <AusenciasTabShared empleadoId={empleado.id} contexto="hr_admin" />
        )}

        {activeTab === 'contratos' && (
          <ContratosTabShared empleado={empleado} rol="hr_admin" />
        )}

        {activeTab === 'documentos' && <DocumentosTabShared empleado={empleado} />}
      </div>
    </div>
  );
}

