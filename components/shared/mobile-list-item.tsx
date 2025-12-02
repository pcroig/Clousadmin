// ========================================
// Mobile List Item Component
// ========================================
// Componente minimalista para listas mobile
// - Muestra info básica visible
// - Resto de info en acordeón desplegable
// - Sin avatares, diseño limpio

'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface MobileListItemField {
  label: string;
  value: React.ReactNode;
  /** Si true, se muestra en la vista básica */
  showInBasic?: boolean;
}

interface MobileListItemProps {
  /** Campos a mostrar */
  fields: MobileListItemField[];
  /** Contenido opcional que se muestra siempre (ej: badges, botones) */
  header?: React.ReactNode;
  /** Si true, permite expandir para ver más detalles */
  expandable?: boolean;
  /** Callback al hacer clic en el item */
  onClick?: () => void;
  className?: string;
}

export function MobileListItem({
  fields,
  header,
  expandable = true,
  onClick,
  className,
}: MobileListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const basicFields = fields.filter((f) => f.showInBasic);
  const detailFields = fields.filter((f) => !f.showInBasic);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-3 transition-shadow',
        onClick && 'cursor-pointer hover:shadow-sm',
        className
      )}
      onClick={onClick}
    >
      {/* Header opcional */}
      {header && <div className="mb-2">{header}</div>}

      {/* Campos básicos */}
      <div className="space-y-2">
        {basicFields.map((field, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-gray-500 text-xs uppercase tracking-wide">{field.label}</span>
            <span className="font-medium text-gray-900">{field.value}</span>
          </div>
        ))}
      </div>

      {/* Botón expandir */}
      {expandable && detailFields.length > 0 && (
        <>
          <button
            onClick={handleToggle}
            className="w-full mt-3 pt-3 border-t border-gray-100 flex items-center justify-center text-xs text-gray-500 hover:text-gray-700 transition"
          >
            <span>{isExpanded ? 'Ver menos' : 'Ver detalles'}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 ml-1 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </button>

          {/* Campos detallados (desplegable) */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              {detailFields.map((field, idx) => (
                <div key={idx} className="flex items-start justify-between text-sm">
                  <span className="text-gray-500 text-xs uppercase tracking-wide">
                    {field.label}
                  </span>
                  <span className="font-medium text-gray-900 text-right">{field.value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
