// ========================================
// Action Button Component
// ========================================
// Botón de acción principal para mobile
// Usado SOLO para acciones importantes: Fichar, Solicitar Ausencia
// Tiene texto visible y bordes

'use client';

import { cn } from '@/lib/utils';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function ActionButton({
  label,
  onClick,
  icon: Icon,
  variant = 'primary',
  className,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-gray-900 text-white hover:bg-gray-800'
          : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{label}</span>
    </button>
  );
}
