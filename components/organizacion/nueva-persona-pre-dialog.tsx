'use client';

// ========================================
// Nueva Persona Pre-Dialog
// ========================================
// Dialog de selección inicial para crear empleado nuevo o existente

import { UserCheck, UserPlus } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface NuevaPersonaPreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTipo: (tipo: 'nuevo' | 'existente') => void;
}

export function NuevaPersonaPreDialog({
  open,
  onOpenChange,
  onSelectTipo,
}: NuevaPersonaPreDialogProps) {
  const handleSelect = (tipo: 'nuevo' | 'existente') => {
    onSelectTipo(tipo);
    // No cerrar el dialog, dejar que el padre lo maneje
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        // Evita que el auto-focus caiga en el primer botón y muestre el ring inicial
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Nueva Persona</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Opción: Empleado Nuevo */}
          <button
            onClick={() => handleSelect('nuevo')}
            className={cn(
              'group relative flex flex-col items-center gap-4 p-6 rounded-lg border-2 border-gray-200 transition-all',
              'hover:border-primary hover:bg-primary/5 hover:shadow-md',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            )}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <UserPlus className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-1">Empleado Nuevo</h3>
              <p className="text-sm text-gray-600">
                Crear empleado desde cero e iniciar onboarding
              </p>
            </div>
          </button>

          {/* Opción: Empleado Existente */}
          <button
            onClick={() => handleSelect('existente')}
            className={cn(
              'group relative flex flex-col items-center gap-4 p-6 rounded-lg border-2 border-gray-200 transition-all',
              'hover:border-primary hover:bg-primary/5 hover:shadow-md',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            )}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <UserCheck className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-1">Empleado Existente</h3>
              <p className="text-sm text-gray-600">
                Importar o añadir manualmente datos del empleado
              </p>
            </div>
          </button>
        </div>

        <p className="text-xs text-center text-gray-500 pb-2">
          Selecciona una opción para continuar
        </p>
      </DialogContent>
    </Dialog>
  );
}

