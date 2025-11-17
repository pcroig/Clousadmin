'use client';

import { Lock, Unlock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SensitiveUnlockDialog } from '@/components/shared/sensitive-unlock-dialog';
import { useSensitiveUnlock, type SensitiveFieldKey } from '@/lib/hooks/useSensitiveUnlock';
import type { MiEspacioEmpleado } from '@/types/empleado';

interface MiEspacioDatosClientProps {
  empleado: MiEspacioEmpleado;
}

const SENSITIVE_FIELD_LABELS: Record<SensitiveFieldKey, string> = {
  nif: 'DNI/NIE',
  nss: 'Número de Seguridad Social',
  iban: 'IBAN',
};

export function MiEspacioDatosClient({ empleado }: MiEspacioDatosClientProps) {
  const {
    isUnlocked,
    requestUnlock,
    dialogState,
    password: unlockPassword,
    setPassword: setUnlockPassword,
    error: unlockError,
    confirmUnlock,
    closeDialog,
    loading: unlockingSensitiveData,
  } = useSensitiveUnlock();

  const renderSensitiveField = (
    field: SensitiveFieldKey,
    {
      id,
      value,
      placeholder = 'No especificado',
    }: {
      id: string;
      value: string | null | undefined;
      placeholder?: string;
    }
  ) => {
    const unlocked = isUnlocked(field);
    return (
      <div>
        <Label htmlFor={id} className="text-sm font-medium text-gray-700">
          {SENSITIVE_FIELD_LABELS[field]}
        </Label>
        <div className="relative">
          <Input
            id={id}
            type={unlocked ? 'text' : 'password'}
            value={value ?? ''}
            readOnly
            placeholder={unlocked ? placeholder : 'Desbloquea para ver'}
          />
          {unlocked ? (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-emerald-600">
              <Unlock className="mr-1 h-3.5 w-3.5" />
              Visible
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute inset-y-1 right-1 px-3 text-xs"
              onClick={() => requestUnlock(field)}
            >
              <Lock className="mr-1 h-3.5 w-3.5" />
              Desbloquear
            </Button>
          )}
        </div>
        {!unlocked && (
          <p className="mt-1 text-xs text-gray-500">
            Protegido. Desbloquea una sola vez para visualizar todos los datos sensibles.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Datos</h1>
        <p className="text-sm text-gray-500 mt-1">Información personal y de contacto</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información Personal */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
          <div className="space-y-3">
            {renderSensitiveField('nif', {
              id: 'nif',
              value: empleado.nif,
            })}
            {renderSensitiveField('nss', {
              id: 'nss',
              value: empleado.nss,
            })}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
              <input
                type="date"
                defaultValue={
                  empleado.fechaNacimiento ? new Date(empleado.fechaNacimiento).toISOString().split('T')[0] : ''
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                defaultValue={empleado.email}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                defaultValue={empleado.telefono || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calle</label>
              <input
                type="text"
                defaultValue={empleado.direccionCalle || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input
                  type="text"
                  defaultValue={empleado.direccionNumero || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Piso/Puerta</label>
                <input
                  type="text"
                  defaultValue={empleado.direccionPiso || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CP</label>
                <input
                  type="text"
                  defaultValue={empleado.codigoPostal || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  defaultValue={empleado.ciudad || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <input
                type="text"
                defaultValue={empleado.direccionProvincia || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="default">
          Guardar cambios
        </Button>
      </div>

      <SensitiveUnlockDialog
        isOpen={dialogState.isOpen}
        fieldLabel={dialogState.field ? SENSITIVE_FIELD_LABELS[dialogState.field] : undefined}
        password={unlockPassword}
        error={unlockError}
        loading={unlockingSensitiveData}
        onPasswordChange={setUnlockPassword}
        onClose={closeDialog}
        onConfirm={confirmUnlock}
      />
    </div>
  );
}
