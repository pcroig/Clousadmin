'use client';

import { Flag } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { DenunciaDialog } from '@/components/empleado/denuncia-dialog';
import { ContratosTab } from '@/components/shared/mi-espacio/contratos-tab';
import { GeneralTab } from '@/components/shared/mi-espacio/general-tab';
import { ProfileAvatar } from '@/components/shared/profile-avatar';
import { Button } from '@/components/ui/button';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { cn } from '@/lib/utils';

import type { MiEspacioEmpleado, Usuario } from '@/types/empleado';

interface MiEspacioClientProps {
  empleado: MiEspacioEmpleado;
  usuario: Usuario;
  openDenunciaDialog?: boolean;
}

const TABS = [
  { id: 'datos', label: 'Datos' },
  { id: 'contratos', label: 'Contratos' },
];

export function MiEspacioClient({
  empleado,
  usuario,
  openDenunciaDialog = false,
}: MiEspacioClientProps) {
  const [activeTab, setActiveTab] = useState<string>('datos');
  const [denunciaDialogOpen, setDenunciaDialogOpen] = useState(openDenunciaDialog);
  const [canSave, setCanSave] = useState(false);
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const handleSaveReady = useCallback((saveFn: () => Promise<void>, hasChanges: boolean) => {
    saveHandlerRef.current = saveFn;
    setCanSave(hasChanges);
  }, []);

  const handleGuardarCambios = useCallback(() => {
    void saveHandlerRef.current?.();
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <ProfileAvatar
            empleadoId={empleado.id}
            nombre={empleado.nombre ?? ''}
            apellidos={empleado.apellidos}
            email={usuario.email}
            fotoUrl={empleado.fotoUrl}
            showEditButton
            activo={empleado.activo}
          />
        </div>

        {activeTab === 'datos' && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="lg"
              disabled={!canSave}
              onClick={handleGuardarCambios}
              className="w-full sm:w-auto min-h-[44px] px-5 text-sm font-semibold"
            >
              Guardar cambios
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto min-h-[44px] px-5 text-sm font-semibold flex items-center gap-2"
              onClick={() => setDenunciaDialogOpen(true)}
            >
              <Flag className={cn(MOBILE_DESIGN.components.icon.small)} />
              <span className="hidden sm:inline">Canal de denuncias</span>
              <span className="sm:hidden">Denuncias</span>
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
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

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'datos' && (
          <GeneralTab
            empleado={empleado}
            usuario={usuario}
            rol="empleado"
            onSaveReady={handleSaveReady}
          />
        )}

        {activeTab === 'contratos' && (
          <ContratosTab empleado={empleado} rol="empleado" />
        )}
      </div>

      <DenunciaDialog
        isOpen={denunciaDialogOpen}
        onClose={() => setDenunciaDialogOpen(false)}
      />
    </div>
  );
}
