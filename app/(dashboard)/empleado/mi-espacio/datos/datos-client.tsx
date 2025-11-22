'use client';

import { Flag } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { ResponsiveContainer } from '@/components/adaptive/ResponsiveContainer';
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
    <ResponsiveContainer variant="page" className="h-full w-full space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <ProfileAvatar
            empleadoId={empleado.id}
            nombre={empleado.nombre ?? ''}
            apellidos={empleado.apellidos}
            email={usuario.email}
            fotoUrl={empleado.fotoUrl}
            subtitle="Mi perfil - Información personal, de contacto y bancaria"
            showEditButton
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            disabled={!canSave}
            onClick={handleGuardarCambios}
            className={cn(MOBILE_DESIGN.button.primary)}
          >
            Guardar cambios
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn('flex items-center gap-2', MOBILE_DESIGN.button.secondary)}
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

      <DenunciaDialog
        isOpen={denunciaDialogOpen}
        onClose={() => setDenunciaDialogOpen(false)}
      />
    </ResponsiveContainer>
  );
}
