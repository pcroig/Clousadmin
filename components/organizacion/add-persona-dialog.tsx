// ========================================
// Add Persona Dialog Component
// ========================================
// Modal con 3 opciones para añadir personas:
// 1. Entrada manual
// 2. Subir documentos para autocompletar
// 3. Activar onboarding

'use client';

import { useState } from 'react';
import { X, Upload, UserPlus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddPersonaManualForm } from './add-persona-manual-form';
import { AddPersonaDocumentForm } from './add-persona-document-form';
import { AddPersonaOnboardingForm } from './add-persona-onboarding-form';

interface AddPersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddPersonaDialog({ open, onOpenChange, onSuccess }: AddPersonaDialogProps) {
  const [activeTab, setActiveTab] = useState('manual');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Persona</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span>Entrada Manual</span>
            </TabsTrigger>
            <TabsTrigger value="document" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span>Subir Documento</span>
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Activar Onboarding</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="manual">
              <AddPersonaManualForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
            </TabsContent>

            <TabsContent value="document">
              <AddPersonaDocumentForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
            </TabsContent>

            <TabsContent value="onboarding">
              <AddPersonaOnboardingForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}




