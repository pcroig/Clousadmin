// ========================================
// Alerta List Component
// ========================================
// Lista de alertas con formato consistente

'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertaBadge } from './alerta-badge';
import { ExternalLink, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Alerta {
  id: string;
  tipo: 'critico' | 'advertencia' | 'info';
  categoria: string;
  codigo: string;
  mensaje: string;
  detalles?: any;
  accionUrl?: string;
  empleadoId: string;
  empleado?: {
    id: string;
    nombre: string;
    apellidos: string;
  };
}

interface AlertaListProps {
  alertas: Alerta[];
  onResolve?: (alertaId: string) => Promise<void>;
}

export function AlertaList({ alertas, onResolve }: AlertaListProps) {
  const router = useRouter();

  const handleResolve = async (alertaId: string) => {
    if (!onResolve) return;

    try {
      await onResolve(alertaId);
      toast.success('Alerta resuelta correctamente');
    } catch (error) {
      console.error('Error resolviendo alerta:', error);
      toast.error('Error al resolver alerta');
    }
  };

  if (alertas.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No hay alertas pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alertas.map((alerta) => (
        <Card key={alerta.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertaBadge tipo={alerta.tipo} mensaje={alerta.mensaje} showTooltip={false} />
                {alerta.empleado && (
                  <span className="text-sm font-medium text-gray-700">
                    {alerta.empleado.nombre} {alerta.empleado.apellidos}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-900 mb-1">{alerta.mensaje}</p>

              {alerta.detalles && (
                <div className="text-xs text-gray-600 mt-2">
                  <span className="font-medium">Categoría:</span> {alerta.categoria}
                  {alerta.codigo && (
                    <>
                      {' · '}
                      <span className="font-medium">Código:</span> {alerta.codigo}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {alerta.accionUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(alerta.accionUrl!)}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Ver empleado
                </Button>
              )}
              {onResolve && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleResolve(alerta.id)}
                  title="Marcar como resuelta"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

