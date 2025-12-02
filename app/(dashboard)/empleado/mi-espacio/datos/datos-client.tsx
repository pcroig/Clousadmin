'use client';

import { Flag } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { DenunciaDialog } from '@/components/empleado/denuncia-dialog';
import { GeneralTab } from '@/components/shared/mi-espacio/general-tab';
import { ProfileAvatar } from '@/components/shared/profile-avatar';
import { Button } from '@/components/ui/button';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { cn } from '@/lib/utils';

import type { MiEspacioEmpleado, Usuario } from '@/types/empleado';

interface MiEspacioDatosClientProps {
  empleado: MiEspacioEmpleado;
  usuario: Usuario;
  openDenunciaDialog?: boolean;
}

export function MiEspacioDatosClient({
  empleado,
  usuario,
  openDenunciaDialog = false,
}: MiEspacioDatosClientProps) {
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
    <div className="h-full w-full flex flex-col px-1 py-1 sm:max-w-[1800px] sm:mx-auto sm:px-8 sm:py-6">
      <div className="flex-1 overflow-auto">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <ProfileAvatar
                empleadoId={empleado.id}
                nombre={empleado.nombre ?? ''}
                apellidos={empleado.apellidos}
                email={usuario.email}
                fotoUrl={empleado.fotoUrl}
                showEditButton
              />
            </div>
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
          </div>

          <GeneralTab
            empleado={empleado}
            usuario={usuario}
            rol="empleado"
            onSaveReady={handleSaveReady}
          />
        </div>
      </div>

      <DenunciaDialog
        isOpen={denunciaDialogOpen}
        onClose={() => setDenunciaDialogOpen(false)}
      />
    </div>
  );
}
