'use client';

// ========================================
// Config Rellenar Campos
// ========================================
// Configuración para acción de rellenar campos

import type { RellenarCamposConfig } from '@/lib/onboarding-config-types';
import { CAMPOS_DISPONIBLES } from '@/lib/onboarding-config-types';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ConfigRellenarCamposProps {
  config: RellenarCamposConfig;
  onChange: (config: RellenarCamposConfig) => void;
}

export function ConfigRellenarCampos({ config, onChange }: ConfigRellenarCamposProps) {
  const toggleCampo = (campoId: string) => {
    const campos = config.campos || [];
    const nuevoCampos = campos.includes(campoId)
      ? campos.filter(c => c !== campoId)
      : [...campos, campoId];

    onChange({ ...config, campos: nuevoCampos });
  };

  const camposSeleccionados = config.campos || [];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base">Campos a Rellenar *</Label>
        <p className="text-sm text-gray-600 mt-1">
          Selecciona los campos que el empleado debe completar
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {CAMPOS_DISPONIBLES.map((campo) => (
          <div key={campo.id} className="flex items-center space-x-2">
            <Checkbox
              id={`campo-${campo.id}`}
              checked={camposSeleccionados.includes(campo.id)}
              onCheckedChange={() => toggleCampo(campo.id)}
            />
            <label
              htmlFor={`campo-${campo.id}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {campo.label}
            </label>
          </div>
        ))}
      </div>

      {camposSeleccionados.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>{camposSeleccionados.length}</strong> campo{camposSeleccionados.length !== 1 ? 's' : ''} seleccionado{camposSeleccionados.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
