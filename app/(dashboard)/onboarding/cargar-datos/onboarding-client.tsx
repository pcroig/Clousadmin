'use client';

// ========================================
// Onboarding Client Component
// ========================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SedesForm } from '@/components/onboarding/sedes-form';
import { ImportarEmpleados } from '@/components/onboarding/importar-empleados';
import { IntegracionesForm } from '@/components/onboarding/integraciones-form';
import { InvitarHRAdmins } from '@/components/onboarding/invitar-hr-admins';
import { completarOnboardingAction } from './actions';
import { Building2, Users, Plug, UserPlus, CheckCircle } from 'lucide-react';

interface OnboardingClientProps {
  sedes: any[];
  integraciones: any[];
  nombreEmpresa: string;
}

export function OnboardingClient({
  sedes,
  integraciones,
  nombreEmpresa,
}: OnboardingClientProps) {
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
        alert('Error al completar el onboarding: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al completar el onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Bienvenido a Clousadmin</h1>
            <p className="text-gray-600">
              Configura {nombreEmpresa} en solo unos pasos
            </p>
          </div>

          {/* Progress bar */}
          <div className="mt-8">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Paso {currentTabIndex + 1} de {tabs.length}</span>
              <span>{Math.round(((currentTabIndex + 1) / tabs.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((currentTabIndex + 1) / tabs.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          {/* Tabs list */}
          <TabsList className="grid w-full grid-cols-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tabs content */}
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




