'use client';

import { Loader2, Mail } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { changeEmailAction } from '@/app/(dashboard)/configuracion/seguridad/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

interface ChangeEmailCardProps {
  currentEmail: string;
}

export function ChangeEmailCard({ currentEmail }: ChangeEmailCardProps) {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail || !password) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (newEmail === currentEmail) {
      toast.error('El nuevo email es igual al actual');
      return;
    }

    startTransition(async () => {
      const result = await changeEmailAction(newEmail, password);

      if (!result.success) {
        toast.error(result.error ?? 'No se pudo cambiar el email');
      } else {
        toast.success('Email actualizado correctamente');
        setNewEmail('');
        setPassword('');
        setIsEditing(false);
      }
    });
  };

  const handleCancel = () => {
    setNewEmail('');
    setPassword('');
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email de la cuenta
        </CardTitle>
        <CardDescription>
          Actualiza el email asociado a tu cuenta. Necesitarás tu contraseña para confirmar el
          cambio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Email actual</Label>
          <p className="text-sm text-muted-foreground mt-1">{currentEmail}</p>
        </div>

        {!isEditing ? (
          <Button type="button" onClick={() => setIsEditing(true)} variant="outline">
            Cambiar email
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Nuevo email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="tu.nuevo@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña actual</Label>
              <PasswordInput
                id="password"
                placeholder="Introduce tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Confirmar cambio'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
