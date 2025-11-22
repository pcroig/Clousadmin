'use client';

// ========================================
// Reusable Waitlist Request Form
// ========================================

import { useState } from 'react';
import { agregarAWaitlistAction } from '@/app/(auth)/waitlist/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface WaitlistRequestFormProps {
  variant?: 'page' | 'dialog';
  title?: string;
  description?: string;
  successTitle?: string;
  successDescription?: string;
  backLinkHref?: string;
  onSuccess?: () => void;
  className?: string;
}

export function WaitlistRequestForm({
  variant = 'page',
  title,
  description,
  successTitle,
  successDescription,
  backLinkHref,
  onSuccess,
  className,
}: WaitlistRequestFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    empresa: '',
    mensaje: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const resolvedTitle =
    title ||
    (variant === 'dialog' ? 'Solicitar invitación' : 'Lista de espera');
  const resolvedDescription =
    description ||
    (variant === 'dialog'
      ? 'Comparte tus datos y te avisaremos cuando abramos nuevas plazas.'
      : 'Solicita una invitación para crear tu cuenta en Clousadmin');
  const resolvedSuccessTitle =
    successTitle ||
    (variant === 'dialog'
      ? '¡Solicitud enviada!'
      : '¡Te hemos añadido a la lista!');
  const resolvedSuccessDescription =
    successDescription ||
    'Te notificaremos cuando tengamos una invitación disponible.';
  const resolvedBackLink =
    backLinkHref ?? (variant === 'page' ? '/login' : undefined);

  const headingAlignment = variant === 'dialog' ? 'text-left' : 'text-center';

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await agregarAWaitlistAction(
        formData.email.trim(),
        formData.nombre.trim() || undefined,
        formData.empresa.trim() || undefined,
        formData.mensaje.trim() || undefined
      );

      if (result.success) {
        setSuccess(true);
        setFormData({
          nombre: '',
          email: '',
          empresa: '',
          mensaje: '',
        });
        onSuccess?.();
      } else {
        setError(result.error || 'Error al unirse a la lista de espera');
      }
    } catch (err) {
      console.error('Waitlist request error:', err);
      setError('Error al procesar la solicitud. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className={cn('space-y-2', headingAlignment)}>
          <h1 className="text-2xl font-bold">{resolvedSuccessTitle}</h1>
          <p className="text-gray-500">
            {resolvedSuccessDescription}
          </p>
        </div>

        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Hemos recibido tu solicitud correctamente. Revisa tu email para confirmar.
        </div>

        {resolvedBackLink && (
          <div className={cn('text-sm', headingAlignment)}>
            <a
              href={resolvedBackLink}
              className="text-primary hover:underline"
            >
              Volver al inicio de sesión
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className={cn('space-y-2', headingAlignment)}>
        <h1 className="text-2xl font-bold">{resolvedTitle}</h1>
        <p className="text-gray-500">{resolvedDescription}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">
            Nombre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Juan García"
            value={formData.nombre}
            onChange={handleChange}
            required
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="juan@empresa.com"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="empresa">
            Empresa <span className="text-destructive">*</span>
          </Label>
          <Input
            id="empresa"
            name="empresa"
            type="text"
            placeholder="Nombre de tu empresa"
            value={formData.empresa}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mensaje">Contexto (opcional)</Label>
          <Textarea
            id="mensaje"
            name="mensaje"
            placeholder="Cuéntanos qué necesitas o cuándo planeas implementar Clousadmin"
            value={formData.mensaje}
            onChange={handleChange}
            rows={variant === 'dialog' ? 3 : 4}
          />
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Enviando solicitud...' : 'Unirse a la lista de espera'}
        </Button>
      </form>

      {variant === 'dialog' && (
        <p className="text-xs text-muted-foreground">
          Responderemos en menos de 24h laborales. Solo aceptamos cuentas corporativas.
        </p>
      )}
    </div>
  );
}



