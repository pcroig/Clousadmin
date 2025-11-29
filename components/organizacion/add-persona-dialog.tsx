// ========================================
// Add Persona Dialog Component
// ========================================
// Modal con 2 opciones para añadir personas:
// 1. Empleado Existente (entrada de datos históricos - no altas reales)
// 2. Nuevo Empleado (onboarding completo - altas reales)

'use client';

import { UserPlus, Users } from 'lucide-react';
import { useState } from 'react';

import { Dialog, DialogBody, DialogDescription, DialogHeader, DialogScrollableContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { AddPersonaManualForm } from './add-persona-manual-form';
import { AddPersonaOnboardingForm } from './add-persona-onboarding-form';

interface AddPersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddPersonaDialog({ open, onOpenChange, onSuccess }: AddPersonaDialogProps) {
  const [activeTab, setActiveTab] = useState('existente');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogScrollableContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Persona</DialogTitle>
          <DialogDescription>
            Elige el tipo de empleado que deseas añadir
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-6 py-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existente" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Empleado Existente</div>
                    <div className="text-xs text-muted-foreground">Entrada manual o importar</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="nuevo" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Nuevo Empleado</div>
                    <div className="text-xs text-muted-foreground">Onboarding completo</div>
                  </div>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="existente">
                  <AddPersonaManualForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
                </TabsContent>

                <TabsContent value="nuevo">
                  <AddPersonaOnboardingForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} tipoOnboarding="completo" />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogBody>
      </DialogScrollableContent>
    </Dialog>
  );
}








