// ========================================
// Auto Completad Widget - Auto-completion Widget
// ========================================
// Shows AI-completed requests (fichajes, ausencias, cambios)

'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { WidgetCard } from './widget-card';


export interface AutoCompletadStats {
  fichajesCompletados: number;
  ausenciasCompletadas: number;
  solicitudesCompletadas: number;
}

interface AutoCompletadoWidgetProps {
  stats: AutoCompletadStats;
}

export function AutoCompletadoWidget({ stats }: AutoCompletadoWidgetProps) {
  const [localStats, setLocalStats] = useState(stats);

  const handleLimpiar = async (tipo: 'fichajes' | 'ausencias' | 'solicitudes') => {
    const mensajes: Record<string, string> = {
      fichajes: '¿Marcar todos los fichajes revisados como finalizados y archivar auto-completados?',
      ausencias: '¿Archivar auto-completados de ausencias?',
      solicitudes: '¿Archivar auto-completados de solicitudes?',
    };

    if (!confirm(mensajes[tipo])) return;
    try {
      const res = await fetch('/api/auto-completado/limpiar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo }),
        cache: 'no-store',
      });
      if (res.ok) {
        // Optimista: resetear contador local a 0
        setLocalStats((prev) => ({
          ...prev,
          fichajesCompletados: tipo === 'fichajes' ? 0 : prev.fichajesCompletados,
          ausenciasCompletadas: tipo === 'ausencias' ? 0 : prev.ausenciasCompletadas,
          solicitudesCompletadas: tipo === 'solicitudes' ? 0 : prev.solicitudesCompletadas,
        }));
      } else {
        toast.error('Error al limpiar');
      }
    } catch (e) {
      toast.error('Error al limpiar');
    }
  };

  return (
    <WidgetCard
      title="Auto-completed"
      href="/hr/bandeja-entrada?tab=solved"
      contentClassName="pb-20"
    >
        <div className="space-y-3">
          {/* Fila 1: Fichajes completados */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4">
            {/* Métrica */}
            <div className="text-4xl font-bold text-gray-900">
              {localStats.fichajesCompletados}
            </div>
            {/* Descripción */}
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Fichajes</p>
              <p className="text-[11px] text-gray-500">completados</p>
            </div>
            {/* Check */}
            <button
              onClick={() => handleLimpiar('fichajes')}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              title="Limpiar fichajes completados"
            >
              <Check className="w-5 h-5 text-gray-900" />
            </button>
            {/* Botón Revisar */}
            <Link href="/hr/horario/fichajes?estado=auto">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 text-[11px] font-normal border-gray-300 rounded-full hover:bg-gray-50"
              >
                Revisar
              </Button>
            </Link>
          </div>

          {/* Fila 2: Ausencias completadas */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4">
            {/* Métrica */}
            <div className="text-4xl font-bold text-gray-900">
              {localStats.ausenciasCompletadas}
            </div>
            {/* Descripción */}
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Ausencias</p>
              <p className="text-[11px] text-gray-500">completados</p>
            </div>
            {/* Check */}
            <button
              onClick={() => handleLimpiar('ausencias')}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              title="Limpiar ausencias completadas"
            >
              <Check className="w-5 h-5 text-gray-900" />
            </button>
            {/* Botón Revisar */}
            <Link href="/hr/horario/ausencias?estado=auto">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 text-[11px] font-normal border-gray-300 rounded-full hover:bg-gray-50"
              >
                Revisar
              </Button>
            </Link>
          </div>

          {/* Fila 3: Solicitudes completadas */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4">
            {/* Métrica */}
            <div className="text-4xl font-bold text-gray-900">
              {localStats.solicitudesCompletadas}
            </div>
            {/* Descripción */}
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Solicitudes</p>
              <p className="text-[11px] text-gray-500">completadas</p>
            </div>
            {/* Check */}
            <button
              onClick={() => handleLimpiar('solicitudes')}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              title="Limpiar solicitudes completadas"
            >
              <Check className="w-5 h-5 text-gray-900" />
            </button>
            {/* Botón Revisar */}
            <Link href="/hr/bandeja-entrada?tab=completadas">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 text-[11px] font-normal border-gray-300 rounded-full hover:bg-gray-50"
              >
                Revisar
              </Button>
            </Link>
          </div>
        </div>
    </WidgetCard>
  );
}
