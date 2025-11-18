'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Flag } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarEditButton } from '@/components/shared/avatar-edit-button';
import { Button } from '@/components/ui/button';
import { GeneralTab } from '@/components/shared/mi-espacio/general-tab';
import { DenunciaDialog } from '@/components/empleado/denuncia-dialog';
import { getAvatarStyle } from '@/lib/design-system';

import type { MiEspacioEmpleado, Usuario } from '@/types/empleado';

interface MiPerfilClientProps {
  empleado: MiEspacioEmpleado;
  usuario: Usuario;
  openDenunciaDialog?: boolean;
}

export function MiPerfilClient({ empleado, usuario, openDenunciaDialog = false }: MiPerfilClientProps) {
  const [denunciaDialogOpen, setDenunciaDialogOpen] = useState(openDenunciaDialog);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveActionRef = useRef<(() => Promise<void>) | null>(null);

  const avatarStyle = useMemo(
    () => getAvatarStyle(`${empleado.nombre} ${empleado.apellidos}`),
    [empleado.apellidos, empleado.nombre],
  );

  const initials = useMemo(() => {
    const nombreInicial = empleado.nombre?.charAt(0) ?? '';
    const apellidoInicial = empleado.apellidos?.charAt(0) ?? '';
    return `${nombreInicial}${apellidoInicial}`.toUpperCase() || '??';
  }, [empleado.apellidos, empleado.nombre]);

  const handleSaveReady = useCallback((action: () => Promise<void>, pending: boolean) => {
    saveActionRef.current = action;
    setHasPendingChanges(pending);
  }, []);

  const handleSave = useCallback(async () => {
    if (!saveActionRef.current || !hasPendingChanges) {
      return;
    }

    setSaving(true);
    try {
      await saveActionRef.current();
    } finally {
      setSaving(false);
    }
  }, [hasPendingChanges]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              {empleado.fotoUrl && <AvatarImage src={empleado.fotoUrl} alt={empleado.nombre ?? 'Avatar'} />}
              <AvatarFallback
                className="text-lg font-semibold uppercase"
                style={avatarStyle}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <AvatarEditButton empleadoId={empleado.id} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">Mi perfil</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {empleado.nombre} {empleado.apellidos}
            </h1>
            <p className="text-sm text-gray-500">{usuario.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-lg"
            title="Canal de denuncias"
            onClick={() => setDenunciaDialogOpen(true)}
          >
            <Flag className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasPendingChanges || saving}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
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

