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

type EmptyStateLayout = 'card' | 'inline' | 'table' | 'widget';

interface EmptyStateProps {
  /**
   * @deprecated Usa `layout="card"` | `layout="inline"` en su lugar.
   */
  variant?: 'primary' | 'secondary';
  layout?: EmptyStateLayout;
  icon?: LucideIcon | null;
  title: string;
  description?: string;
  action?: React.ReactNode;
  alignment?: 'center' | 'start';
  className?: string;
}

const layoutConfig: Record<
  EmptyStateLayout,
  {
    empty: string;
    header: string;
    media: string;
    icon: string;
    content: string;
  }
> = {
  card: {
    empty: 'border bg-gray-50/60',
    header: 'items-center text-center gap-3',
    media: 'size-16 rounded-full bg-gray-100 text-gray-400',
    icon: 'h-8 w-8',
    content: 'items-center',
  },
  inline: {
    empty: 'border-none bg-transparent p-0 gap-3 items-center justify-center text-center',
    header: 'items-center text-center gap-2',
    media: 'size-12 rounded-md bg-gray-100 text-gray-500',
    icon: 'h-6 w-6',
    content: 'items-center',
  },
  table: {
    empty: 'border-none bg-transparent py-12 px-6 md:px-10',
    header: 'items-center text-center gap-3',
    media: 'size-14 rounded-full bg-gray-100 text-gray-400',
    icon: 'h-7 w-7',
    content: 'items-center',
  },
  widget: {
    empty: 'border-none bg-transparent py-4 px-4',
    header: 'items-center text-center gap-2',
    media: 'size-12 rounded-full bg-gray-100 text-gray-300',
    icon: 'h-6 w-6',
    content: 'items-center',
  },
};

export function EmptyState({
  variant,
  layout = 'card',
  icon,
  title,
  description,
  action,
  alignment,
  className,
}: EmptyStateProps) {
  const resolvedLayout: EmptyStateLayout =
    variant === 'secondary'
      ? 'widget'
      : variant === 'primary'
        ? 'card'
        : layout;

  const IconComponent = icon ?? null;

  if (resolvedLayout === 'widget') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 text-center py-6 px-2',
          className,
        )}
      >
        {IconComponent && (
          <IconComponent className="h-7 w-7 text-gray-300" />
        )}
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && (
          <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">
            {description}
          </p>
        )}
        {action && (
          <div className="mt-2">
            {action}
          </div>
        )}
      </div>
    );
  }

  const config = layoutConfig[resolvedLayout];
  const resolvedAlignment = alignment ?? 'center';

  const headerAlignmentClass =
    resolvedAlignment === 'start' ? 'items-start text-left' : 'items-center text-center';
  const contentAlignmentClass =
    resolvedAlignment === 'start' ? 'items-start text-left w-full' : 'items-center text-center';

  return (
    <Empty
      className={cn(config.empty, className)}
    >
      <EmptyHeader className={cn(config.header, headerAlignmentClass)}>
        {IconComponent && (
          <EmptyMedia
            variant="icon"
            className={cn(config.media)}
          >
            <IconComponent className={config.icon} />
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description && (
          <EmptyDescription
            className={resolvedAlignment === 'start' ? 'text-left' : undefined}
          >
            {description}
          </EmptyDescription>
        )}
      </EmptyHeader>
      {action && (
        <EmptyContent className={cn(config.content, contentAlignmentClass)}>
          {action}
        </EmptyContent>
      )}
    </Empty>
  );
}

export const emptyStatePresets = {
  table: (title: string, description?: string) => ({
    layout: 'table' as const,
    title,
    description,
  }),
  inline: (title: string, description?: string) => ({
    layout: 'inline' as const,
    title,
    description,
  }),
  card: (title: string, description?: string) => ({
    layout: 'card' as const,
    title,
    description,
  }),
  widget: (title: string, description?: string) => ({
    layout: 'widget' as const,
    title,
    description,
  }),
};
