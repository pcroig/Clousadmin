'use client';

import { useCallback, useRef, useState } from 'react';
import { Flag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GeneralTab } from '@/components/shared/mi-espacio/general-tab';
import { DenunciaDialog } from '@/components/empleado/denuncia-dialog';
import { ProfileAvatar } from '@/components/shared/profile-avatar';
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
          >
            Guardar cambios
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setDenunciaDialogOpen(true)}
          >
            <Flag className="h-4 w-4" />
            Canal de denuncias
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
    </div>
  );
}
