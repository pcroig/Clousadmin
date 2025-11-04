'use client';

// ========================================
// Signup Form Component
// ========================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signupEmpresaAction } from './actions';

interface SignupFormProps {
  token: string;
  emailInvitacion: string;
}

export function SignupForm({ token, emailInvitacion }: SignupFormProps) {
  const router = useRouter();
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombreEmpresa: '',
    webEmpresa: '',
    nombre: '',
    apellidos: '',
    email: emailInvitacion, // Pre-rellenar con email de la invitación
    password: '',
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signupEmpresaAction({
        ...formData,
        token, // Incluir token en la acción
      });

      if (result.success) {
        // Usuario autenticado automáticamente, redirigir a onboarding
        router.push('/onboarding/cargar-datos');
        router.refresh();
      } else {
        if (result.requiereInvitacion) {
          // Si requiere invitación, redirigir a waitlist
          setError('Se requiere una invitación válida. Serás redirigido...');
          setTimeout(() => {
            router.push('/waitlist');
          }, 2000);
        } else {
          setError(result.error || 'Error al crear la cuenta');
        }
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Error al crear la cuenta. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        <p className="text-gray-500">
          Configura tu empresa y comienza a gestionar tu equipo
        </p>
        <div className="mt-2 rounded-md bg-green-50 border border-green-200 p-2">
          <p className="text-xs text-green-700">
            ✓ Has sido invitado - Tu email está verificado
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombreEmpresa">Nombre de la empresa *</Label>
          <Input
            id="nombreEmpresa"
            name="nombreEmpresa"
            type="text"
            placeholder="Acme Inc."
            value={formData.nombreEmpresa}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="webEmpresa">Sitio web (opcional)</Label>
          <Input
            id="webEmpresa"
            name="webEmpresa"
            type="url"
            placeholder="https://www.tuempresa.com"
            value={formData.webEmpresa}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nombre">Tu nombre *</Label>
          <Input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Juan"
            value={formData.nombre}
            onChange={handleChange}
            required
            autoComplete="given-name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apellidos">Tus apellidos *</Label>
          <Input
            id="apellidos"
            name="apellidos"
            type="text"
            placeholder="García López"
            value={formData.apellidos}
            onChange={handleChange}
            required
            autoComplete="family-name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="juan@tuempresa.com"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            disabled
            className="bg-gray-50"
          />
          <p className="text-xs text-green-600">
            ✓ Email verificado (viene de tu invitación)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Crea tu contraseña *</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
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

