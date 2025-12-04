'use client';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Switch } from '@/components/ui/switch';

interface SwitchWithTooltipProps {
  label: string;
  tooltipContent: string | React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Componente reutilizable que muestra una línea con texto, tooltip informativo y switch.
 * Patrón de diseño para opciones configurables con explicación.
 */
export function SwitchWithTooltip({
  label,
  tooltipContent,
  checked,
  onCheckedChange,
  disabled = false,
  tooltipSide = 'right',
}: SwitchWithTooltipProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <InfoTooltip content={tooltipContent} side={tooltipSide} />
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}


