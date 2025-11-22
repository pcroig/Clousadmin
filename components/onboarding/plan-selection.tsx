'use client';

/**
 * Plan Selection Component for Onboarding
 *
 * Este componente está preparado para añadirse al flujo de onboarding
 * cuando se active la pasarela de pagos.
 *
 * Para activar:
 * 1. Importar en signup-form.tsx
 * 2. Añadir como paso después de crear la cuenta (paso 0)
 * 3. Incrementar totalPasos
 *
 * NOTA: De momento no se usa porque el sistema funciona con invitaciones.
 */

import { Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PricingGrid } from '@/components/billing/pricing-grid';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type ProductWithPrices } from '@/lib/stripe';

interface PlanSelectionProps {
  onComplete: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  allowSkip?: boolean;
}

export function PlanSelection({
  onComplete,
  onBack,
  onSkip,
  allowSkip = true,
}: PlanSelectionProps) {
  const [products, setProducts] = useState<ProductWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar productos al montar
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('/api/billing/products');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar planes');
        }

        setProducts(data.products);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const handleSelectPlan = async (priceId: string) => {
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar el pago');
      }

      // Redirigir a Stripe Checkout
      // Después del pago, Stripe redirige a la URL de éxito configurada
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Elige tu plan</h2>
        <p className="text-muted-foreground">
          Selecciona el plan que mejor se adapte a las necesidades de tu empresa.
          Todos los planes incluyen 14 d\u00edas de prueba gratis.
        </p>
      </div>

      {/* Planes */}
      {products.length > 0 ? (
        <PricingGrid
          products={products}
          onSelectPlan={handleSelectPlan}
          buttonText="Empezar prueba gratis"
          showIntervalToggle={true}
          defaultInterval="month"
        />
      ) : (
        <Alert>
          <AlertTitle>Sin planes disponibles</AlertTitle>
          <AlertDescription>
            No hay planes configurados en este momento. Contacta con soporte.
          </AlertDescription>
        </Alert>
      )}

      {/* Acciones */}
      <div className="flex justify-between pt-4 border-t">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Anterior
          </Button>
        )}

        {allowSkip && (
          <Button variant="ghost" onClick={handleSkip} className="ml-auto">
            Omitir por ahora
          </Button>
        )}
      </div>

      {/* Nota de prueba gratis */}
      <p className="text-center text-xs text-muted-foreground">
        No se realizar\u00e1 ning\u00fan cobro durante el periodo de prueba.
        Puedes cancelar en cualquier momento.
      </p>
    </div>
  );
}
