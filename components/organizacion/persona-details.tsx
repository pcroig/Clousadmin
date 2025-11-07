// ========================================
// Persona Details Component
// ========================================

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Calendar, MapPin, CreditCard, DollarSign } from 'lucide-react';
import { getInitials } from '@/components/shared/utils';
import { construirDireccionCompleta } from '@/lib/utils/direccion';
import { getAvatarPlaceholderClasses } from '@/lib/design-system';
import { cn } from '@/lib/utils';

interface PersonaDetailsProps {
  empleado: {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
    equipo: string;
    puesto: string;
    activo: boolean;
    avatar?: string;
    detalles: {
      dni: string;
      numeroSS: string | null;
      fechaNacimiento: Date | null;
      direccion: string | null;
      ciudad: string | null;
      codigoPostal: string | null;
      pais: string | null;
      iban: string | null;
      fechaIngreso: Date | null;
      salarioBase: number | null;
    };
  };
}

export function PersonaDetails({ empleado }: PersonaDetailsProps) {

  const formatDate = (date: Date | null) => {
    if (!date) return 'No especificado';
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'No especificado';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header con Avatar */}
      <div className="flex flex-col items-center text-center pb-6 border-b border-gray-200">
        <Avatar className="h-20 w-20 mb-3">
          {empleado.avatar && <AvatarImage src={empleado.avatar} />}
          <AvatarFallback
            className={cn(
              getAvatarPlaceholderClasses(empleado.nombre),
              'text-lg font-semibold'
            )}
          >
            {getInitials(empleado.nombre)}
          </AvatarFallback>
        </Avatar>
        <h3 className="text-lg font-semibold text-gray-900">{empleado.nombre}</h3>
        <p className="text-sm text-gray-500">{empleado.puesto}</p>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
            empleado.activo
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {empleado.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Información de Contacto */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Información de Contacto
        </h4>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm text-gray-900 break-all">{empleado.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Teléfono</p>
              <p className="text-sm text-gray-900">{empleado.telefono || 'No especificado'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Dirección</p>
              <p className="text-sm text-gray-900">
                {construirDireccionCompleta(empleado.detalles)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Información Personal */}
      <div className="space-y-4 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Información Personal
        </h4>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">DNI/NIE</p>
            <p className="text-sm text-gray-900">{empleado.detalles.dni}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Número de Seguridad Social</p>
            <p className="text-sm text-gray-900">{empleado.detalles.numeroSS || 'No especificado'}</p>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Fecha de Nacimiento</p>
              <p className="text-sm text-gray-900">{formatDate(empleado.detalles.fechaNacimiento)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Información Laboral */}
      <div className="space-y-4 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Información Laboral
        </h4>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">Equipo</p>
            <p className="text-sm text-gray-900">{empleado.equipo}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Puesto</p>
            <p className="text-sm text-gray-900">{empleado.puesto}</p>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Fecha de Ingreso</p>
              <p className="text-sm text-gray-900">{formatDate(empleado.detalles.fechaIngreso)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Salario Base</p>
              <p className="text-sm text-gray-900 font-semibold">
                {formatCurrency(empleado.detalles.salarioBase)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Información Bancaria */}
      <div className="space-y-4 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Información Bancaria
        </h4>

        <div className="flex items-start gap-3">
          <CreditCard className="w-4 h-4 text-gray-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">IBAN</p>
            <p className="text-sm text-gray-900 font-mono">
              {empleado.detalles.iban || 'No especificado'}
            </p>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="pt-6 border-t border-gray-200 space-y-2">
        <Button className="w-full" variant="outline">
          Editar Información
        </Button>
        <Button className="w-full" variant="outline">
          Ver Historial
        </Button>
      </div>
    </div>
  );
}
