'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { parseJsonSafe } from '@/lib/utils/json';

interface ResetPasswordFormProps {
  token: string;
  tokenValid: boolean;
}

export function ResetPasswordForm({ token, tokenValid }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/recovery/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await parseJsonSafe<{ error?: string }>(response, { error: 'error' });
        setError(
          data.error === 'invalid_or_expired'
            ? 'El enlace no es válido o ha expirado.'
            : 'No hemos podido actualizar tu contraseña.'
        );
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 2000);
    } catch (err) {
      console.error('[ResetPasswordForm] Error:', err);
      setError('No hemos podido actualizar tu contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Enlace inválido</h1>
        <p className="text-sm text-muted-foreground">
          El enlace para restablecer la contraseña no es válido o ya expiró.
        </p>
        <Button onClick={() => router.push('/forgot-password')} className="w-full">
          Solicitar nuevo enlace
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-center text-sm text-green-800">
        Tu contraseña se actualizó correctamente. Redirigiendo al inicio de sesión...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Nueva contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Introduce una contraseña segura para tu cuenta.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Actualizando...' : 'Actualizar contraseña'}
        </Button>
      </form>
    </div>
  );
}

