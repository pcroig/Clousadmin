'use client';

// ========================================
// Waitlist Form Component
// ========================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Note: agregarAWaitlist es una función server, necesitamos crear una server action
import { agregarAWaitlistAction } from './actions';

export function WaitlistForm() {
  const router = useRouter();
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    empresa: '',
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const result = await agregarAWaitlistAction(
        formData.email,
        formData.nombre || undefined,
        formData.empresa || undefined
      );

      if (result.success) {
        setSuccess(true);
        // Limpiar formulario
        setFormData({
          nombre: '',
          email: '',
          empresa: '',
        });
      } else {
        setError(result.error || 'Error al unirse a la lista de espera');
      }
    } catch (err) {
      setError('Error al procesar la solicitud. Por favor, inténtalo de nuevo.');
      console.error('Waitlist error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">¡Te hemos añadido a la lista!</h1>
          <p className="text-gray-500">
            Te notificaremos cuando tengas una invitación disponible
          </p>
        </div>

        <div className="rounded-md bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-800">
            Hemos recibido tu solicitud correctamente. Revisa tu email para confirmar.
          </p>
        </div>

        <div className="text-center">
          <a
            href="/login"
            className="text-sm text-primary hover:underline"
          >
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Lista de espera</h1>
        <p className="text-gray-500">
          Solicita una invitación para crear tu cuenta en Clousadmin
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
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
          <Label htmlFor="email">Email *</Label>
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
          <Label htmlFor="empresa">Empresa *</Label>
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

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Enviando solicitud...' : 'Unirse a la lista de espera'}
        </Button>
      </form>

      <div className="text-center">
        <span className="text-sm text-gray-500">¿Ya tienes cuenta? </span>
        <a href="/login" className="text-sm text-primary hover:underline">
          Inicia sesión
        </a>
      </div>
    </div>
  );
}

