'use client';

// ========================================
// Onboarding Client Component
// ========================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { SedesForm } from '@/components/onboarding/sedes-form';
import { ImportarEmpleados } from '@/components/onboarding/importar-empleados';
import { IntegracionesForm } from '@/components/onboarding/integraciones-form';
import { InvitarHRAdmins } from '@/components/onboarding/invitar-hr-admins';
import { completarOnboardingAction } from './actions';
import { Building2, Users, Plug, UserPlus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Prisma } from '@prisma/client';

interface Sede {
  id: string;
  nombre: string;
  ciudad: string;
  equipos?: Array<{
    id: string;
    nombre: string;
  }>;
}

interface Integracion {
  id: string;
  tipo: string;
  proveedor: string;
  activa: boolean;
  config: Prisma.JsonValue;
}

interface OnboardingClientProps {
  sedes: Sede[];
  integraciones: Integracion[];
  nombreEmpresa: string;
}

export function OnboardingClient({
  sedes,
  integraciones,
  nombreEmpresa: _nombreEmpresa,
}: OnboardingClientProps) {
  void _nombreEmpresa; // Explicitly mark as unused
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('sedes');
  const [loading, setLoading] = useState(false);

  const tabs = [
    {
      value: 'sedes',
      label: 'Sedes',
      icon: Building2,
      component: <SedesForm sedesIniciales={sedes} />,
    },
    {
      value: 'empleados',
      label: 'Empleados',
      icon: Users,
      component: <ImportarEmpleados />,
    },
    {
      value: 'integraciones',
      label: 'Integraciones',
      icon: Plug,
      component: <IntegracionesForm integracionesIniciales={integraciones} />,
    },
    {
      value: 'admins',
      label: 'HR Admins',
      icon: UserPlus,
      component: <InvitarHRAdmins />,
    },
  ];

  const currentTabIndex = tabs.findIndex((tab) => tab.value === currentTab);
  const isLastTab = currentTabIndex === tabs.length - 1;
  const isFirstTab = currentTabIndex === 0;

  const handleNext = () => {
    if (!isLastTab) {
      setCurrentTab(tabs[currentTabIndex + 1].value);
    }
  };

  const handlePrevious = () => {
    if (!isFirstTab) {
      setCurrentTab(tabs[currentTabIndex - 1].value);
    }
  };

  const handleFinalizarOnboarding = async () => {
    setLoading(true);

    try {
      const result = await completarOnboardingAction();

      if (result.success) {
        router.push('/hr/dashboard');
        router.refresh();
      } else {
        toast.error('Error al completar el onboarding: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al completar el onboarding');
    } finally {
      setLoading(false);
    }
  };

  // Títulos y descripciones por paso
  const pasoConfig = {
    sedes: {
      titulo: 'Sedes',
      descripcion: 'Configura las sedes de tu empresa',
    },
    empleados: {
      titulo: 'Empleados',
      descripcion: 'Importa los empleados de tu empresa',
    },
    integraciones: {
      titulo: 'Integraciones',
      descripcion: 'Configura las integraciones de tu empresa',
    },
    admins: {
      titulo: 'HR Admins',
      descripcion: 'Invita a otros administradores de RRHH',
    },
  };

  const configActual = pasoConfig[currentTab as keyof typeof pasoConfig];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content */}
      <div className="max-w-3xl px-6 py-8">
        {/* Header con título, descripción y stepper */}
        <div className="space-y-6 mb-8">
          {/* Título y descripción */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{configActual.titulo}</h1>
            <p className="text-gray-500">{configActual.descripcion}</p>
          </div>

          {/* Stepper con líneas - debajo del título */}
          <div className="flex items-center gap-1">
            {tabs.map((_, index) => {
              const estaCompletado = index < currentTabIndex;
              const esActivoOCompletado = estaCompletado || index === currentTabIndex;
              
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
        </div>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          {/* Tabs content - sin tabs list visible, solo el contenido */}
          <div className="bg-white rounded-lg border p-6 min-h-[500px]">
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {tab.component}
              </TabsContent>
            ))}
          </div>
        </Tabs>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstTab}
          >
            Anterior
          </Button>

          {isLastTab ? (
            <Button onClick={handleFinalizarOnboarding} disabled={loading}>
              {loading ? (
                'Finalizando...'
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Finalizar y empezar
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Siguiente
            </Button>
          )}
        </div>

        {/* Skip option */}
        <div className="text-center mt-6">
          <button
            onClick={handleFinalizarOnboarding}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Saltar configuración y empezar
          </button>
        </div>
      </div>
    </div>
  );
}






