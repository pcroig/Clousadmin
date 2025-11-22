'use client';

// ========================================
// Login Form Component
// ========================================

import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { WaitlistRequestForm } from '@/components/auth/WaitlistRequestForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsuarioRol } from '@/lib/constants/enums';

import { loginAction } from './actions';

interface LoginFormProps {
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  // Detectar errores en la URL (cuenta inactiva, OAuth, etc.)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const emailParam = searchParams.get('email');

    if (errorParam === 'cuenta_inactiva') {
      // Borrar cookie de sesión automáticamente
      document.cookie = 'clousadmin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      setError('Tu sesión anterior ha expirado. Por favor, inicia sesión de nuevo.');
      router.replace('/login');
    } else if (errorParam === 'oauth_error') {
      const messageParam = searchParams.get('message');
      const errorMessage = messageParam
        ? `Error en la autenticación con Google: ${messageParam}`
        : 'Error en la autenticación con Google. Por favor, intenta de nuevo.';
      setError(errorMessage);
      router.replace('/login');
    } else if (errorParam === 'missing_code') {
      setError('No se recibió código de autorización de Google.');
      router.replace('/login');
    } else if (errorParam === 'invalid_state') {
      setError('Error de seguridad en la autenticación. Por favor, intenta de nuevo.');
      router.replace('/login');
    } else if (errorParam === 'email_not_verified') {
      setError('Tu email de Google no está verificado. Por favor, verifica tu email en Google.');
      router.replace('/login');
    } else if (errorParam === 'user_inactive') {
      setError('Tu cuenta está inactiva. Contacta con tu administrador de RRHH.');
      router.replace('/login');
    } else if (errorParam === 'no_account') {
      const emailMsg = emailParam
        ? ` (${emailParam})`
        : '';
      setError(
        `No existe una cuenta con este email${emailMsg}. Necesitas una invitación para crear una cuenta.`
      );
      router.replace('/login');
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Borrar cualquier cookie de sesión existente antes de hacer login
    // Esto asegura que se cree una nueva sesión con el estado actualizado
    document.cookie = 'clousadmin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';

    try {
      const result = await loginAction(email, password);

      if (result.twoFactorRequired) {
        router.push('/verify-otp');
        return;
      }

      if (result.success) {
        // Reset rate limit states
        setRateLimited(false);
        setRetryAfter(0);
        
        // Redirigir según el callback URL o el rol del usuario
        if (callbackUrl) {
          router.push(callbackUrl);
        } else if (result.rol === UsuarioRol.platform_admin) {
          router.push('/platform/invitaciones');
        } else if (result.rol === UsuarioRol.hr_admin) {
          router.push('/hr/dashboard');
        } else if (result.rol === UsuarioRol.manager) {
          router.push('/manager/dashboard');
        } else {
          router.push('/empleado/dashboard');
        }
        router.refresh();
      } else {
        // Manejar rate limiting
        if (result.rateLimited) {
          setRateLimited(true);
          setRetryAfter(result.retryAfter || 60);
          setError(
            `Demasiados intentos de inicio de sesión. Por favor, espera ${result.retryAfter || 60} segundos antes de intentar de nuevo.`
          );
        } else {
          setRateLimited(false);
          setError(result.error || 'Error al iniciar sesión');
        }
      }
    } catch (err) {
      setError('Error al iniciar sesión. Por favor, inténtalo de nuevo.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para login con Google OAuth
  const handleGoogleLogin = async () => {
    try {
      setError('');
      setGoogleLoading(true);

      const options = callbackUrl ? { callbackUrl } : undefined;
      await signIn('google', options);
    } catch (err) {
      console.error('Google login error:', err);
      setError('Error al conectar con Google. Por favor, intenta de nuevo.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="text-gray-500">Accede a tu cuenta de Clousadmin</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading || rateLimited}>
          {loading ? 'Iniciando sesión...' : rateLimited ? `Espera ${retryAfter}s` : 'Iniciar sesión'}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            O continúa con
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={googleLoading}
        onClick={() => void handleGoogleLogin()}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {googleLoading ? 'Conectando con Google...' : 'Continuar con Google'}
      </Button>

      <div className="text-center space-y-2">
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => router.push('/forgot-password')}
        >
          ¿Olvidaste tu contraseña?
        </button>
        <div>
          <p className="text-sm text-gray-500">
            ¿No tienes cuenta? Necesitas una invitación para crear una cuenta.
          </p>
          <Dialog open={waitlistOpen} onOpenChange={setWaitlistOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="text-sm text-primary hover:underline focus:outline-none"
              >
                Solicitar invitación
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Solicitar invitación</DialogTitle>
                <DialogDescription>
                  Déjanos tus datos y te avisaremos en cuanto habilitemos tu cuenta corporativa.
                </DialogDescription>
              </DialogHeader>
              <WaitlistRequestForm
                variant="dialog"
                backLinkHref={undefined}
                className="pt-2"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

