'use client';

import { AvatarEditButton } from '@/components/shared/avatar-edit-button';
import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface ProfileAvatarProps {
  empleadoId: string;
  nombre: string;
  apellidos?: string | null;
  email?: string | null;
  fotoUrl?: string | null;
  subtitle?: ReactNode;
  showEditButton?: boolean;
  className?: string;
  avatarSize?: 'md' | 'lg';
  activo?: boolean;
}

export function ProfileAvatar({
  empleadoId,
  nombre,
  apellidos,
  email,
  fotoUrl,
  subtitle,
  showEditButton = false,
  className,
  avatarSize = 'md',
  activo,
}: ProfileAvatarProps) {
  const fullName = `${nombre ?? ''} ${apellidos ?? ''}`.trim();
  const avatarComponentSize = avatarSize === 'lg' ? 'xl' : 'lg';

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="relative">
        <EmployeeAvatar
          nombre={nombre}
          apellidos={apellidos}
          fotoUrl={fotoUrl}
          size={avatarComponentSize}
        />
        {showEditButton && <AvatarEditButton empleadoId={empleadoId} />}
      </div>

      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-gray-900">
            {fullName || 'Empleado sin nombre'}
          </p>
          {activo !== undefined && (
            <Badge variant={activo ? 'default' : 'secondary'} className="ml-2">
              {activo ? 'Activo' : 'Inactivo'}
            </Badge>
          )}
        </div>
        {email && <p className="text-sm text-gray-500">{email}</p>}
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <p className="text-sm text-gray-500">{subtitle}</p>
          ) : (
            subtitle
          )
        ) : null}
      </div>
    </div>
  );
}

