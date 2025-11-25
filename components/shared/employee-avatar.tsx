'use client';

import type { CSSProperties, ReactNode } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarStyle } from '@/lib/design-system';
import { cn } from '@/lib/utils';

import { getInitials } from './utils';

interface EmployeeAvatarProps {
  nombre?: string | null;
  apellidos?: string | null;
  fotoUrl?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  fallbackContent?: ReactNode;
  fallbackStyle?: CSSProperties;
}

const SIZE_CONFIG: Record<
  NonNullable<EmployeeAvatarProps['size']>,
  { avatar: string; text: string }
> = {
  xs: { avatar: 'h-6 w-6', text: 'text-[10px]' },
  sm: { avatar: 'h-8 w-8', text: 'text-xs' },
  md: { avatar: 'h-12 w-12', text: 'text-base' },
  lg: { avatar: 'h-16 w-16', text: 'text-lg' },
  xl: { avatar: 'h-20 w-20', text: 'text-xl' },
};

export function EmployeeAvatar({
  nombre,
  apellidos,
  fotoUrl,
  alt,
  size = 'md',
  className,
  imageClassName,
  fallbackClassName,
  fallbackContent,
  fallbackStyle,
}: EmployeeAvatarProps) {
  const fullName = [nombre, apellidos].filter(Boolean).join(' ').trim();
  const displayName = fullName || nombre || 'Empleado';
  const initials = getInitials(displayName);
  const avatarStyle = getAvatarStyle(displayName);
  const sizeClasses = SIZE_CONFIG[size] ?? SIZE_CONFIG.md;
  const resolvedFallbackStyle = fallbackStyle ?? avatarStyle;
  const resolvedFallbackContent = fallbackContent ?? initials;

  return (
    <Avatar className={cn(sizeClasses.avatar, className)}>
      {fotoUrl ? (
        <AvatarImage
          src={fotoUrl}
          alt={alt ?? displayName}
          className={imageClassName}
        />
      ) : null}
      <AvatarFallback
        className={cn(
          'font-semibold uppercase',
          sizeClasses.text,
          fallbackClassName
        )}
        style={resolvedFallbackStyle}
      >
        {resolvedFallbackContent}
      </AvatarFallback>
    </Avatar>
  );
}

