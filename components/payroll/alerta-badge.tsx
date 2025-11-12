// ========================================
// Alerta Badge Component
// ========================================
// Badge visual para mostrar tipo de alerta

import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface AlertaBadgeProps {
  tipo: 'critico' | 'advertencia' | 'info';
  mensaje: string;
  showTooltip?: boolean;
}

const alertaConfig = {
  critico: {
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    iconColor: 'text-red-600',
    Icon: AlertCircle,
    label: 'Crítico',
  },
  advertencia: {
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    iconColor: 'text-orange-600',
    Icon: AlertTriangle,
    label: 'Advertencia',
  },
  info: {
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
    Icon: Info,
    label: 'Info',
  },
};

export function AlertaBadge({ tipo, mensaje, showTooltip = true }: AlertaBadgeProps) {
  const config = alertaConfig[tipo];
  const Icon = config.Icon;

  return (
    <div className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 ${config.bgColor} rounded-md`}>
      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      <span className={`text-xs font-medium ${config.textColor}`}>
        {config.label}
      </span>
      
      {showTooltip && (
        <div className="absolute left-0 top-full mt-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
          {mensaje}
        </div>
      )}
    </div>
  );
}

