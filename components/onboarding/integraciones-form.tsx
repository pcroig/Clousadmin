'use client';

// ========================================
// Integraciones Form Component - Onboarding
// ========================================

import { Calendar, Check, DollarSign, MessageSquare } from 'lucide-react';
import { useState } from 'react';

import { configurarIntegracionAction } from '@/app/(dashboard)/onboarding/cargar-datos/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Integracion {
  [key: string]: unknown;
}

interface IntegracionesFormProps {
  integracionesIniciales?: Integracion[];
  token?: string;
  empresaId?: string;
  onComplete?: () => void;
  onSkip?: () => void;
  simplified?: boolean;
}

export function IntegracionesForm({ 
  integracionesIniciales = [],
  token,
  empresaId,
  onComplete,
  onSkip,
  simplified = false 
}: IntegracionesFormProps) {
  const [calendarioSeleccionado, setCalendarioSeleccionado] = useState<string>('');
  const [comunicacionSeleccionada, setComunicacionSeleccionada] = useState<string>('');
  const [loading, setLoading] = useState<{
    calendario: boolean;
    comunicacion: boolean;
  }>({
    calendario: false,
    comunicacion: false,
  });
  const [success, setSuccess] = useState<{
    calendario: boolean;
    comunicacion: boolean;
  }>({
    calendario: false,
    comunicacion: false,
  });
  const [error, setError] = useState('');

  const proveedoresCalendario = [
    { value: 'google_calendar', label: 'Google Calendar' },
    { value: 'outlook', label: 'Microsoft Outlook' },
    { value: 'apple_calendar', label: 'Apple Calendar' },
  ];

  const proveedoresComunicacion = [
    { value: 'slack', label: 'Slack' },
    { value: 'teams', label: 'Microsoft Teams' },
    { value: 'discord', label: 'Discord' },
  ];

  const handleConfigurarCalendario = async () => {
    if (!calendarioSeleccionado) return;

    setError('');
    setLoading({ ...loading, calendario: true });

    try {
      const result = await configurarIntegracionAction(
        'calendario',
        calendarioSeleccionado
      );

      if (result.success) {
        setSuccess({ ...success, calendario: true });
        setTimeout(() => {
          setSuccess({ ...success, calendario: false });
        }, 2000);
      } else {
        setError(result.error || 'Error al configurar la integración');
      }
    } catch (err) {
      setError('Error al configurar la integración');
      console.error('Error:', err);
    } finally {
      setLoading({ ...loading, calendario: false });
    }
  };

  const handleConfigurarComunicacion = async () => {
    if (!comunicacionSeleccionada) return;

    setError('');
    setLoading({ ...loading, comunicacion: true });

    try {
      const result = await configurarIntegracionAction(
        'comunicacion',
        comunicacionSeleccionada
      );

      if (result.success) {
        setSuccess({ ...success, comunicacion: true });
        setTimeout(() => {
          setSuccess({ ...success, comunicacion: false });
        }, 2000);
      } else {
        setError(result.error || 'Error al configurar la integración');
      }
    } catch (err) {
      setError('Error al configurar la integración');
      console.error('Error:', err);
    } finally {
      setLoading({ ...loading, comunicacion: false });
    }
  };

  // Manejar omitir integraciones (marcar como completado)
  const handleSkipIntegrations = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`/api/onboarding-simplificado/${token}/integraciones-completado`, {
        method: 'POST',
      });

      if (response.ok && onSkip) {
        onSkip();
      }
    } catch (error) {
      console.error('[IntegracionesForm] Error skipping integrations:', error);
    }
  };

  // Manejar completar integraciones
  const handleCompleteIntegrations = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/onboarding-simplificado/${token}/integraciones-completado`, {
        method: 'POST',
      });

      if (response.ok && onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('[IntegracionesForm] Error completing integrations:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integraciones</h3>
        <p className="text-sm text-gray-500">
          Conecta herramientas externas para sincronizar calendarios y comunicaciones.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Calendario */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-medium text-sm">Calendario</h4>
              <p className="text-xs text-gray-500">
                Sincroniza ausencias y eventos con tu calendario corporativo
              </p>
            </div>
            
            <div className="flex gap-2">
              <Select
                value={calendarioSeleccionado}
                onValueChange={setCalendarioSeleccionado}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {proveedoresCalendario.map((proveedor) => (
                    <SelectItem key={proveedor.value} value={proveedor.value}>
                      {proveedor.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                size="sm"
                onClick={handleConfigurarCalendario}
                disabled={!calendarioSeleccionado || loading.calendario}
              >
                {success.calendario ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Guardado
                  </>
                ) : loading.calendario ? (
                  'Guardando...'
                ) : (
                  'Configurar'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comunicación */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="h-5 w-5 text-gray-500 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-medium text-sm">Comunicación</h4>
              <p className="text-xs text-gray-500">
                Recibe notificaciones y alertas en tu canal de comunicación
              </p>
            </div>
            
            <div className="flex gap-2">
              <Select
                value={comunicacionSeleccionada}
                onValueChange={setComunicacionSeleccionada}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {proveedoresComunicacion.map((proveedor) => (
                    <SelectItem key={proveedor.value} value={proveedor.value}>
                      {proveedor.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                size="sm"
                onClick={handleConfigurarComunicacion}
                disabled={!comunicacionSeleccionada || loading.comunicacion}
              >
                {success.comunicacion ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Guardado
                  </>
                ) : loading.comunicacion ? (
                  'Guardando...'
                ) : (
                  'Configurar'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Nóminas (Próximamente) */}
      <div className="rounded-lg border p-4 space-y-4 opacity-60">
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-green-500 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">Software de nóminas</h4>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                Próximamente
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Integración con sistemas de nóminas para importación automática
            </p>
          </div>
        </div>
      </div>

      {/* Botones de navegación para onboarding simplificado */}
      {simplified && (onComplete || onSkip) && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onSkip && (
            <Button type="button" variant="outline" onClick={handleSkipIntegrations}>
              Omitir por ahora
            </Button>
          )}
          {onComplete && (
            <Button type="button" onClick={handleCompleteIntegrations}>
              Continuar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}


