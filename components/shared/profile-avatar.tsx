'use client';

import { AvatarEditButton } from '@/components/shared/avatar-edit-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarStyle } from '@/lib/design-system';
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
}: ProfileAvatarProps) {
  const fullName = `${nombre ?? ''} ${apellidos ?? ''}`.trim();
  const initials = `${nombre?.charAt(0) ?? ''}${apellidos?.charAt(0) ?? ''}`.toUpperCase() || '??';
  const avatarStyle = getAvatarStyle(fullName || 'Usuario');

  const avatarClasses =
    avatarSize === 'lg'
      ? 'h-20 w-20'
      : 'h-16 w-16';

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="relative">
        <Avatar className={avatarClasses}>
          {fotoUrl && <AvatarImage src={fotoUrl} alt={fullName || 'Avatar'} />}
          <AvatarFallback
            className="text-lg font-semibold uppercase"
            style={avatarStyle}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        {showEditButton && <AvatarEditButton empleadoId={empleadoId} />}
      </div>

      <div className="space-y-0.5">
        <p className="text-2xl font-bold text-gray-900">
          {fullName || 'Empleado sin nombre'}
        </p>
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

