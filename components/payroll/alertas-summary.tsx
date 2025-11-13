'use client';

import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface AlertasSummaryProps {
  alertas?: {
    total: number;
    criticas: number;
    advertencias: number;
    informativas: number;
  } | null;
  compact?: boolean;
  onClick?: () => void;
}

export function AlertasSummary({ alertas, compact = false, onClick }: AlertasSummaryProps) {
  if (!alertas || alertas.total === 0) {
    return null;
  }

  const Wrapper = onClick ? 'button' : 'div';

  const content = (
    <div
      className={
        'flex items-center gap-2 rounded border px-3 py-1.5 ' +
        (onClick ? 'hover:border-gray-400 transition-colors' : '')
      }
    >
      <AlertCircle className="w-4 h-4 text-red-600" />
      <span className="text-xs font-semibold text-gray-900">
        {alertas.total} alerta{alertas.total !== 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-1 text-xs text-gray-500">
        {alertas.criticas > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <AlertCircle className="w-3 h-3" />
            {alertas.criticas}
          </span>
        )}
        {alertas.advertencias > 0 && (
          <span className="flex items-center gap-1 text-orange-500">
            <AlertTriangle className="w-3 h-3" />
            {alertas.advertencias}
          </span>
        )}
        {alertas.informativas > 0 && (
          <span className="flex items-center gap-1 text-blue-500">
            <Info className="w-3 h-3" />
            {alertas.informativas}
          </span>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <Wrapper
        onClick={onClick}
        className="text-left disabled:opacity-60"
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        {content}
      </Wrapper>
    );
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-600" />
        <p className="text-sm font-semibold text-gray-900">
          {alertas.total} alerta{alertas.total !== 1 ? 's' : ''} detectada{alertas.total !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1 text-red-600">
          <AlertCircle className="w-3 h-3" /> Críticas: {alertas.criticas}
        </span>
        <span className="flex items-center gap-1 text-orange-500">
          <AlertTriangle className="w-3 h-3" /> Advertencias: {alertas.advertencias}
        </span>
        <span className="flex items-center gap-1 text-blue-500">
          <Info className="w-3 h-3" /> Informativas: {alertas.informativas}
        </span>
      </div>
    </div>
  );
}

