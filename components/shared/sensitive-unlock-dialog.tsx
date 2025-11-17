'use client';

import { KeyRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SensitiveUnlockDialogProps {
  isOpen: boolean;
  fieldLabel?: string;
  password: string;
  error?: string;
  loading?: boolean;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function SensitiveUnlockDialog({
  isOpen,
  fieldLabel,
  password,
  error,
  loading,
  onPasswordChange,
  onClose,
  onConfirm,
}: SensitiveUnlockDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-gray-600" />
            Desbloquear dato sensible
          </DialogTitle>
          <DialogDescription>
            Introduce tu contraseña para ver {fieldLabel ?? 'los datos'}. El acceso se mantendrá activo durante
            unos minutos para todos los campos sensibles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="unlock-password">Contraseña</Label>
          <Input
            id="unlock-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading || !password}>
            {loading ? 'Verificando...' : 'Desbloquear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

