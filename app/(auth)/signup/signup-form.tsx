'use client';

// ========================================
// Signup Form Component - Multi-Step with Onboarding
// ========================================

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  type JornadaStepHandle,
  JornadaStep,
} from '@/components/onboarding/jornada-step';
import {
  type CalendarioStepHandle,
  CalendarioStep,
} from '@/components/onboarding/calendario-step';
import { ImportarEmpleados } from '@/components/onboarding/importar-empleados';
import { IntegracionesForm } from '@/components/onboarding/integraciones-form';
import { InvitarHRAdmins } from '@/components/onboarding/invitar-hr-admins';
import { SedesForm } from '@/components/onboarding/sedes-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { signupEmpresaAction, completarOnboardingAction } from './actions';


interface SignupPrefill {
  nombreEmpresa?: string | null;
  nombre?: string | null;
  apellidos?: string | null;
}

interface SignupFormProps {
  token: string;
  emailInvitacion: string;
  prefill?: SignupPrefill;
}

export function SignupForm({ token, emailInvitacion, prefill }: SignupFormProps) {
  const router = useRouter();
  
  // Estado del paso actual (0-6)
  const [pasoActual, setPasoActual] = useState(0);
  
  const jornadaStepRef = useRef<JornadaStepHandle>(null);
  const calendarioStepRef = useRef<CalendarioStepHandle>(null);
  
  const [guardandoPaso, setGuardandoPaso] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  
  // Estado del formulario inicial (paso 0)
  const [formData, setFormData] = useState(() => ({
    nombreEmpresa: prefill?.nombreEmpresa ?? '',
    webEmpresa: '',
    nombre: prefill?.nombre ?? '',
    apellidos: prefill?.apellidos ?? '',
    email: emailInvitacion, // Pre-rellenar con email de la invitación
    password: '',
    consentimientoTratamiento: false,
  }));
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Total de pasos
  const totalPasos = 7;

  // Prevenir redirección automática durante el onboarding
  // Esto es crítico porque el usuario está en /signup (ruta auth) pero ya tiene sesión activa
  useEffect(() => {
    // Evitar que Next.js redirija al dashboard mientras estamos en onboarding
    // El flag se limpia solo cuando se completa el onboarding
    const preventRedirect = () => {
      // No hacer nada, solo mantener al usuario aquí
    };
    
    // Si el usuario intenta navegar atrás/adelante en el navegador
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      // Mantener en la página actual
      window.history.pushState(null, '', window.location.href);
    };
    
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      consentimientoTratamiento: checked,
    }));
  };

  const handleSubmitPaso0 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signupEmpresaAction({
        ...formData,
        token, // Incluir token en la acción
      });

      if (result.success) {
        // Usuario autenticado, pasar al siguiente paso
        setPasoActual(1);
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

  const handleFinalizarOnboarding = async () => {
    if (finalizando) {
      return;
    }

    setFinalizando(true);

    try {
      // Marcar el onboarding como completado
      const result = await completarOnboardingAction();
      
      if (result.success) {
        toast.success('Cuenta creada con éxito. Te llevamos a tu panel.');
        router.push('/hr/dashboard');
        router.refresh();
      } else {
        toast.error(result.error || 'Error al completar el onboarding');
        setFinalizando(false);
      }
    } catch (err) {
      console.error('Finalizar onboarding error:', err);
      toast.error('No hemos podido redirigirte. Inténtalo de nuevo.');
      setFinalizando(false);
    }
  };

  const handleGuardarJornada = async () => {
    if (!jornadaStepRef.current) {
      handleSiguiente();
      return;
    }

    setGuardandoPaso(true);
    const success = await jornadaStepRef.current.guardar();
    setGuardandoPaso(false);

    if (success) {
      handleSiguiente();
    }
  };

  const handleGuardarCalendario = async () => {
    if (!calendarioStepRef.current) {
      handleSiguiente();
      return;
    }

    setGuardandoPaso(true);
    const success = await calendarioStepRef.current.guardar();
    setGuardandoPaso(false);

    if (success) {
      handleSiguiente();
    }
  }

  const handleSiguiente = () => {
    if (pasoActual < totalPasos - 1) {
      setPasoActual(pasoActual + 1);
    }
  };

  const handleAnterior = () => {
    if (pasoActual > 0) {
      setPasoActual(pasoActual - 1);
    }
  };

  // Títulos y descripciones por paso
  const pasoConfig = [
    {
      titulo: 'Crea la cuenta de tu empresa',
      descripcion: 'Configura tu empresa en Clousadmin y empieza a gestionar tu equipo. Tu email ya ha sido verificado.',
    },
    {
      titulo: 'Importa empleados',
      descripcion: 'Sube un archivo Excel con los datos de tus empleados',
    },
    {
      titulo: 'Configura las sedes',
      descripcion: 'Añade las oficinas o centros de trabajo y decide a quién se asignan',
    },
    {
      titulo: 'Jornada Laboral',
      descripcion: 'Define el horario y jornada base de tu equipo',
    },
    {
      titulo: 'Calendario Laboral',
      descripcion: 'Establece días laborables y festivos',
    },
    {
      titulo: 'Integraciones (opcional)',
      descripcion: 'Conecta con tus herramientas favoritas',
    },
    {
      titulo: 'Invita a otros administradores (opcional)',
      descripcion: 'Añade más personas al equipo de RRHH',
    },
  ];

  const configActual = pasoConfig[pasoActual];

  return (
    <div className="space-y-6">
      {/* Título y descripción */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{configActual.titulo}</h1>
        <p className="text-sm text-gray-600">{configActual.descripcion}</p>
      </div>

      {/* Stepper con líneas */}
      <div className="flex items-center gap-1">
        {[...Array(totalPasos)].map((_, index) => {
          const estaCompletado = index < pasoActual;
          const esActivoOCompletado = estaCompletado || index === pasoActual;
          
          return (
            <div key={index} className="flex-1">
              <div
                className={`h-1 transition-colors ${
                  esActivoOCompletado
                    ? 'bg-gray-600'
                    : 'bg-gray-200'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Paso 0: Datos de empresa y usuario */}
      {pasoActual === 0 && (
        <form onSubmit={handleSubmitPaso0} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        <div className="flex items-start gap-2">
          <Checkbox
            id="consentimientoTratamiento"
            checked={formData.consentimientoTratamiento}
            onCheckedChange={(checked) => handleCheckboxChange(Boolean(checked))}
            required
            aria-describedby="consentimiento-help-text"
          />
          <div className="text-sm">
            <Label
              htmlFor="consentimientoTratamiento"
              className="text-sm font-medium text-gray-900"
            >
              Acepto el tratamiento de mis datos conforme a la política de privacidad de Clousadmin.
            </Label>
            <p id="consentimiento-help-text" className="text-xs text-gray-500">
              Esta autorización es necesaria para poder crear tu cuenta y gestionar tus datos como
              responsable del servicio.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!formData.consentimientoTratamiento || loading}
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta y continuar'}
        </Button>

        <div className="space-y-3 pt-4">
          <p className="text-center text-xs text-gray-500">
            ¿Tu empresa usa Google Workspace? Tras crear la cuenta podrás iniciar sesión desde{' '}
            <Link href="/login" className="text-primary hover:underline">
              «Continuar con Google»
            </Link>{' '}
            usando este mismo email.
          </p>
          <div className="text-center">
            <span className="text-sm text-gray-500">¿Ya tienes cuenta? </span>
            <a href="/login" className="text-sm text-primary hover:underline">
              Inicia sesión
            </a>
          </div>
        </div>
      </form>
      )}

      {/* Paso 1: Empleados */}
      {pasoActual === 1 && (
        <div className="space-y-6">
          <ImportarEmpleados />
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleAnterior}>
              Anterior
            </Button>
            <Button onClick={handleSiguiente}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Paso 2: Sedes */}
      {pasoActual === 2 && (
        <div className="space-y-6">
          <SedesForm sedesIniciales={[]} />
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleAnterior}>
              Anterior
            </Button>
            <Button onClick={handleSiguiente}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Paso 3: Jornada Laboral */}
      {pasoActual === 3 && (
        <div className="space-y-6">
          <JornadaStep ref={jornadaStepRef} />
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleAnterior}>
              Anterior
            </Button>
            <Button onClick={handleGuardarJornada} disabled={guardandoPaso}>
              {guardandoPaso ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar y continuar'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Paso 4: Calendario Laboral */}
      {pasoActual === 4 && (
        <div className="space-y-6">
          <CalendarioStep ref={calendarioStepRef} />
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleAnterior}>
              Anterior
            </Button>
            <Button onClick={handleGuardarCalendario} disabled={guardandoPaso}>
              {guardandoPaso ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar y continuar'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Paso 5: Integraciones */}
      {pasoActual === 5 && (
        <div className="space-y-6">
          <IntegracionesForm integracionesIniciales={[]} />
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleAnterior}>
              Anterior
            </Button>
            <Button onClick={handleSiguiente}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Paso 6: Invitar HR Admins */}
      {pasoActual === 6 && (
        <div className="space-y-6">
          <InvitarHRAdmins />
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleAnterior}>
              Anterior
            </Button>
            <Button onClick={handleFinalizarOnboarding} disabled={finalizando}>
              {finalizando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando en tu panel...
                </>
              ) : (
                'Finalizar y empezar'
              )}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
