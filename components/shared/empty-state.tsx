// ========================================
// Empty State - Componente Reutilizable
// ========================================
// Uso:
// <EmptyState variant="primary" icon={FolderIcon} title="..." description="..." action={<Button>...</Button>} />

import { LucideIcon } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  variant?: 'primary' | 'secondary';
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  variant = 'primary',
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  if (variant === 'secondary') {
    // Estado vacío secundario: Simple, sin fondo, más compacto
    return (
      <div className={cn('text-center py-8', className)}>
        <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        {action && (
          <div className="mt-4">
            {action}
          </div>
        )}
      </div>
    );
  }

  // Estado vacío principal: Grande, con fondo, CTA
  return (
    <Empty className={cn('border bg-gray-50/50', className)}>
      <EmptyHeader>
        <EmptyMedia className="w-20 h-20 rounded-full bg-gray-100 mb-4">
          <Icon className="w-10 h-10 text-gray-400" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
