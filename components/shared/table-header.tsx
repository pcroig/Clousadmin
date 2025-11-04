// ========================================
// Table Header - Title, Tabs, Action Button
// ========================================

'use client';

import { Button } from '@/components/ui/button';

interface Tab {
  id: string;
  label: string;
}

interface TableHeaderProps {
  title: string;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  actionButton?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
  };
  secondaryActionButton?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
  };
}

export function TableHeader({
  title,
  tabs,
  activeTab,
  onTabChange,
  actionButton,
  secondaryActionButton,
}: TableHeaderProps) {
  return (
    <div className="mb-6">
      {/* Title + Action Button */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center gap-2">
          {secondaryActionButton && (
            <Button
              onClick={secondaryActionButton.onClick}
              variant={secondaryActionButton.variant || 'default'}
            >
              {secondaryActionButton.label}
            </Button>
          )}
          {actionButton && (
            <Button
              onClick={actionButton.onClick}
              variant={actionButton.variant || 'default'}
            >
              {actionButton.label}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
