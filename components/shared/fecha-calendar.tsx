// ========================================
// Fecha Calendar Component - Standardized
// Design: Small red top section, white main section with day number
// ========================================

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface FechaCalendarProps {
  date: Date;
  className?: string;
}

export function FechaCalendar({ date, className = '' }: FechaCalendarProps) {
  const mes = format(date, 'MMM', { locale: es }).toUpperCase();
  const dia = format(date, 'd');

  return (
    <div className={`flex-shrink-0 w-12 h-12 bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden flex flex-col ${className}`}>
      {/* Parte superior roja - más pequeña */}
      <div className="w-full h-1/4 flex items-center justify-center" style={{ backgroundColor: '#F4564D' }}>
        <span className="text-[9px] font-semibold text-white leading-none">
          {mes}
        </span>
      </div>
      {/* Parte inferior blanca - más grande */}
      <div className="flex-1 flex items-center justify-center bg-white">
        <span className="text-lg font-bold text-gray-900">{dia}</span>
      </div>
    </div>
  );
}
