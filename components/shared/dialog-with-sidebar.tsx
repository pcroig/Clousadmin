'use client';

// ========================================
// Dialog with Sidebar - Componente reutilizable
// ========================================
// Dialog amplio con sidebar lateral para navegación entre secciones

import { Menu, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface DialogWithSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sidebar: SidebarItem[];
  activeSidebarItem: string;
  onSidebarItemChange: (itemId: string) => void;
  children: React.ReactNode;
  width?: 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showCloseButton?: boolean;
}

export function DialogWithSidebar({
  open,
  onOpenChange,
  title,
  sidebar,
  activeSidebarItem,
  onSidebarItemChange,
  children,
  width = '4xl',
  showCloseButton = true,
}: DialogWithSidebarProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Cerrar sidebar móvil al cambiar de item
  const handleSidebarItemClick = (itemId: string) => {
    onSidebarItemChange(itemId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const widthClasses = {
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[90vh] flex flex-col p-0 gap-0',
          widthClasses[width]
        )}
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="flex-shrink-0"
                >
                  {sidebarOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              )}
              <DialogTitle>{title}</DialogTitle>
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="flex-shrink-0"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content area con sidebar */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Sidebar */}
          <aside
            className={cn(
              'border-r bg-gray-50/50 flex-shrink-0 transition-all duration-200',
              isMobile
                ? cn(
                    'absolute inset-y-0 left-0 z-50 w-64 bg-white shadow-lg',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                  )
                : 'w-64 relative'
            )}
          >
            <nav className="p-3 space-y-1">
              {sidebar.map((item) => {
                const Icon = item.icon;
                const isActive = activeSidebarItem === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSidebarItemClick(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Overlay para sidebar móvil */}
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

