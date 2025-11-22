// ========================================
// Loading Button - Botón con Spinner Integrado
// ========================================
// Uso:
// <LoadingButton loading={isSubmitting} onClick={handleSubmit}>Guardar</LoadingButton>

"use client";

import { type VariantProps } from "class-variance-authority";
import * as React from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface ReactElementWithDisplayName {
  displayName?: string;
  [key: string]: unknown;
}

interface LoadingButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

export function LoadingButton({
  loading = false,
  disabled,
  children,
  className,
  variant,
  size,
  asChild,
  ...props
}: LoadingButtonProps) {
  // Si está cargando, filtramos iconos hijos para evitar duplicados
  const filteredChildren = React.useMemo(() => {
    if (!loading) return children;

    // Si el children tiene iconos de lucide-react, los ocultamos durante loading
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type && typeof child.type !== 'string') {
        // Ocultar iconos de lucide durante loading
        const displayName = ((child.type as unknown) as ReactElementWithDisplayName).displayName || '';
        if (displayName.includes('Icon') || displayName.includes('Lucide')) {
          return null;
        }
      }
      return child;
    });
  }, [loading, children]);

  return (
    <Button
      disabled={loading || disabled}
      className={cn(className)}
      variant={variant}
      size={size}
      asChild={asChild}
      {...props}
    >
      {loading && <Spinner className="mr-2 text-current" />}
      {filteredChildren}
    </Button>
  );
}
