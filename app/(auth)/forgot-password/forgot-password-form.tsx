'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState<number | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setRateLimited(null);

    try {
      const response = await fetch('/api/auth/recovery/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setRateLimited(Number(data.retryAfter ?? 60));
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'error' }));
        setError(
          data.error === 'rate_limit'
            ? 'Demasiadas solicitudes. Intenta más tarde.'
            : 'No hemos podido enviar el email. Inténtalo de nuevo.'
        );
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error('[ForgotPasswordForm] Error:', err);
      setError('No hemos podido enviar el email. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
        <p className="text-muted-foreground text-sm">
          Introduce tu email y te enviaremos un enlace para restablecerla.
        </p>
      </div>

      {success ? (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          Si la cuenta existe, hemos enviado un email con instrucciones.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@empresa.com"
              required
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {rateLimited && (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
              Demasiadas solicitudes. Intenta de nuevo en {rateLimited} segundos.
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar instrucciones'}
          </Button>
        </form>
      )}

      <button
        type="button"
        onClick={() => router.push('/login')}
        className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Volver a iniciar sesión
      </button>
    </div>
  );
}

