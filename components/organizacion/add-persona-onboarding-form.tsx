// ========================================
// Add Persona Onboarding Form
// ========================================
// Formulario para crear empleado y activar onboarding (envía email con link)

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/shared/loading-button';

interface AddPersonaOnboardingFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddPersonaOnboardingForm({ onSuccess, onCancel }: AddPersonaOnboardingFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    fechaAlta: new Date().toISOString().split('T')[0],
    puesto: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!formData.nombre || !formData.apellidos || !formData.email) {
      toast.error('Nombre, apellidos y email son requeridos');
      return;
    }

    setLoading(true);

    try {
      // Crear empleado
      const responseEmpleado = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          activo: false, // Inactivo hasta que complete onboarding
          onboardingCompletado: false,
        }),
      });

      const empleadoData = await responseEmpleado.json();

      if (!responseEmpleado.ok) {
        toast.error(empleadoData.error || 'Error al crear empleado');
        setLoading(false);
        return;
      }

      // Activar onboarding (crea token y envía email)
      const responseOnboarding = await fetch('/api/empleados/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleadoId: empleadoData.id,
        }),
      });

      const onboardingData = await responseOnboarding.json();

      if (responseOnboarding.ok) {
        toast.success(
          `Empleado creado y email de onboarding enviado a ${formData.email}`,
          { duration: 5000 }
        );
        onSuccess();
      } else {
        toast.error(onboardingData.error || 'Error al activar onboarding');
      }
    } catch (error) {
      console.error('[AddPersonaOnboardingForm] Error:', error);
      toast.error('Error al crear empleado y activar onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="font-medium text-blue-900 mb-2">📧 Activar Onboarding Automático</p>
        <ul className="space-y-1 text-blue-800">
          <li>• Introduce los datos básicos del nuevo empleado</li>
          <li>• Se enviará un email con un link único de onboarding</li>
          <li>• El empleado completará sus datos personales y bancarios</li>
          <li>• Una vez completado, el empleado podrá acceder al portal</li>
          <li>• El link de onboarding expira en 7 días</li>
        </ul>
      </div>

      {/* Datos Básicos */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
          Datos Básicos del Empleado
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              placeholder="Juan"
            />
          </div>
          <div>
            <Label htmlFor="apellidos">Apellidos *</Label>
            <Input
              id="apellidos"
              value={formData.apellidos}
              onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
              required
              placeholder="García López"
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="juan.garcia@empresa.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              El email de onboarding se enviará a esta dirección
            </p>
          </div>
          <div>
            <Label htmlFor="fechaAlta">Fecha de Alta</Label>
            <Input
              id="fechaAlta"
              type="date"
              value={formData.fechaAlta}
              onChange={(e) => setFormData({ ...formData, fechaAlta: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="puesto">Puesto (opcional)</Label>
            <Input
              id="puesto"
              value={formData.puesto}
              onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
              placeholder="Ej: Desarrollador Full Stack"
            />
          </div>
        </div>
      </div>

      {/* Info adicional */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>Nota:</strong> El empleado estará inactivo hasta que complete el proceso de onboarding.
          Una vez completado, podrás subir documentos adicionales (contrato, nóminas, etc.) desde su perfil.
        </p>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <LoadingButton type="submit" loading={loading}>
          <Mail className="h-4 w-4 mr-2" />
          Crear y Enviar Onboarding
        </LoadingButton>
      </div>
    </form>
  );
}




