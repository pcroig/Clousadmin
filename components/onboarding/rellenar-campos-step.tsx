'use client';

// ========================================
// Rellenar Campos Step - Onboarding Employee
// ========================================
// Component for employees to fill required fields during onboarding

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { RellenarCamposConfig } from '@/lib/onboarding-config-types';
import { CAMPOS_DISPONIBLES } from '@/lib/onboarding-config-types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface RellenarCamposStepProps {
  config: RellenarCamposConfig;
  datosActuales: Record<string, unknown>;
  onGuardar: (datos: Record<string, unknown>) => Promise<void>;
}

export function RellenarCamposStep({
  config,
  datosActuales,
  onGuardar,
}: RellenarCamposStepProps) {
  const [guardando, setGuardando] = useState(false);

  // Construir schema dinámico basado en campos configurados
  const schemaFields: Record<string, z.ZodTypeAny> = {};
  config.campos.forEach((campoId) => {
    const campo = CAMPOS_DISPONIBLES.find((c) => c.id === campoId);
    if (campo) {
      // Todos los campos son requeridos en este paso
      schemaFields[campoId] = z.string().min(1, `${campo.label} es requerido`);
    }
  });

  const schema = z.object(schemaFields);
  type FormValues = z.infer<typeof schema>;

  // Preparar valores iniciales
  const defaultValues: Record<string, string> = {};
  config.campos.forEach((campoId) => {
    defaultValues[campoId] = (datosActuales[campoId] as string) || '';
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as FormValues,
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      setGuardando(true);
      await onGuardar(values);
    } catch (error) {
      console.error('[RellenarCamposStep] Error al guardar:', error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Completa tus datos</h2>
        <p className="text-gray-600 mt-2">
          Por favor, rellena los siguientes campos para continuar con tu onboarding.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {config.campos.map((campoId) => {
            const campo = CAMPOS_DISPONIBLES.find((c) => c.id === campoId);
            if (!campo) return null;

            return (
              <FormField
                key={campoId}
                control={form.control}
                name={campoId as keyof FormValues}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{campo.label}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type={campoId === 'fechaNacimiento' ? 'date' : 'text'}
                        placeholder={`Ingresa tu ${campo.label.toLowerCase()}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
