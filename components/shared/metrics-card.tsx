// ========================================
// Metrics Card Component
// ========================================
// Card de métricas reutilizable para móvil
// Estilo: Número grande + Label pequeño

'use client';

interface Metric {
  value: string | number;
  label: string;
  color?: 'default' | 'green' | 'red' | 'blue' | 'amber';
  size?: 'small' | 'large';
}

interface MetricsCardProps {
  metrics: Metric[];
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

const colorClasses = {
  default: 'text-gray-900',
  green: 'text-green-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
  amber: 'text-amber-600',
};

export function MetricsCard({ metrics, layout = 'horizontal', className = '' }: MetricsCardProps) {
  const gridCols = layout === 'horizontal' ? `grid-cols-${metrics.length}` : 'grid-cols-1';

  return (
    <div className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 ${className}`}>
      <div className={`grid ${gridCols} gap-3`}>
        {metrics.map((metric, idx) => {
          const isLarge = metric.size === 'large';
          // Números grandes pero labels MUY pequeños
          const valueSize = isLarge ? 'text-2xl' : 'text-xl';
          const labelSize = 'text-[10px]'; // Más pequeño que text-xs

          return (
            <div
              key={idx}
              className={`text-center ${
                layout === 'vertical' && idx < metrics.length - 1 ? 'pb-3 border-b' : ''
              }`}
            >
              <div className={`${valueSize} font-bold ${colorClasses[metric.color || 'default']} mb-0.5`}>
                {metric.value}
              </div>
              <div className={`${labelSize} text-gray-500 uppercase tracking-wide font-medium leading-tight`}>
                {metric.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
