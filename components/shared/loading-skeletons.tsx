// ========================================
// Loading Skeletons - Patrones de Carga Reutilizables
// ========================================
// Uso:
// <GridSkeleton cols={5} items={10} /> - Para grids de carpetas/cards
// <TableSkeleton rows={5} cols={4} /> - Para tablas

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface GridSkeletonProps {
  cols?: number;
  items?: number;
  className?: string;
}

export function GridSkeleton({ cols = 5, items = 10, className }: GridSkeletonProps) {
  return (
    <div
      className={cn(
        'grid gap-6',
        {
          'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5': cols === 5,
          'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4': cols === 4,
          'grid-cols-1 sm:grid-cols-2 md:grid-cols-3': cols === 3,
          'grid-cols-1 sm:grid-cols-2': cols === 2,
        },
        className
      )}
    >
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-gray-50/50 rounded-3xl p-6 border border-gray-200">
          <div className="flex flex-col items-center space-y-3">
            <Skeleton className="w-28 h-28 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, cols = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="text-left py-3 px-4">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-gray-100 last:border-0"
            >
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} className="py-3 px-4">
                  <Skeleton className="h-4 w-full max-w-[150px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

interface ListSkeletonProps {
  items?: number;
  className?: string;
}

export function ListSkeleton({ items = 5, className }: ListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200"
        >
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
