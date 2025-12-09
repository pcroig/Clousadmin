'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderIcon, FolderPlusIcon, InfoIcon } from 'lucide-react';

interface CarpetaCentralizada {
  id: string;
  nombre: string;
}

interface SeleccionarCarpetaDestinoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carpetasCentralizadas: CarpetaCentralizada[];
  onConfirm: (carpetaId: string | null, nuevaCarpetaNombre?: string) => void;
  isLoading?: boolean;
}

export function SeleccionarCarpetaDestinoDialog({
  open,
  onOpenChange,
  carpetasCentralizadas,
  onConfirm,
  isLoading = false,
}: SeleccionarCarpetaDestinoDialogProps) {
  const [modo, setModo] = useState<'existente' | 'nueva'>('existente');
  const [carpetaSeleccionadaId, setCarpetaSeleccionadaId] = useState<string>('');
  const [nuevaCarpetaNombre, setNuevaCarpetaNombre] = useState('');

  const handleConfirm = () => {
    if (modo === 'existente') {
      if (!carpetaSeleccionadaId) return;
      onConfirm(carpetaSeleccionadaId);
    } else {
      if (!nuevaCarpetaNombre.trim()) return;
      onConfirm(null, nuevaCarpetaNombre.trim());
    }
  };

  const isValid =
    modo === 'existente' ? !!carpetaSeleccionadaId : !!nuevaCarpetaNombre.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Carpeta para documentos firmados</DialogTitle>
          <DialogDescription>
            El documento original está en una carpeta compartida. Los documentos firmados
            necesitan asignarse a una carpeta centralizada.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Cada empleado solo verá su documento firmado, pero todos se organizarán en la
            misma carpeta centralizada para facilitar la gestión.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <RadioGroup value={modo} onValueChange={(v) => setModo(v as typeof modo)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existente" id="existente" />
              <Label htmlFor="existente" className="flex items-center gap-2 cursor-pointer">
                <FolderIcon className="h-4 w-4" />
                Usar carpeta centralizada existente
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="nueva" id="nueva" />
              <Label htmlFor="nueva" className="flex items-center gap-2 cursor-pointer">
                <FolderPlusIcon className="h-4 w-4" />
                Crear nueva carpeta centralizada
              </Label>
            </div>
          </RadioGroup>

          {modo === 'existente' ? (
            <div className="space-y-2">
              <Label htmlFor="carpeta-select">Seleccionar carpeta</Label>
              <Select value={carpetaSeleccionadaId} onValueChange={setCarpetaSeleccionadaId}>
                <SelectTrigger id="carpeta-select">
                  <SelectValue placeholder="Selecciona una carpeta..." />
                </SelectTrigger>
                <SelectContent>
                  {carpetasCentralizadas.map((carpeta) => (
                    <SelectItem key={carpeta.id} value={carpeta.id}>
                      <div className="flex items-center gap-2">
                        <FolderIcon className="h-4 w-4" />
                        {carpeta.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {carpetasCentralizadas.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay carpetas centralizadas disponibles. Crea una nueva.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="nombre-carpeta">Nombre de la carpeta</Label>
              <Input
                id="nombre-carpeta"
                placeholder="ej: Contratos Onboarding 2025"
                value={nuevaCarpetaNombre}
                onChange={(e) => setNuevaCarpetaNombre(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                Se creará una carpeta centralizada visible solo para el equipo de recursos
                humanos.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || isLoading}>
            {isLoading ? 'Procesando...' : 'Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
