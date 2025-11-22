'use client';

import { useState } from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type BillingInterval, type ProductWithPrices } from '@/lib/stripe';

import { PricingCard } from './pricing-card';

interface PricingGridProps {
  products: ProductWithPrices[];
  currentPriceId?: string;
  onSelectPlan?: (priceId: string) => Promise<void>;
  showIntervalToggle?: boolean;
  defaultInterval?: BillingInterval;
  buttonText?: string;
}

export function PricingGrid({
  products,
  currentPriceId,
  onSelectPlan,
  showIntervalToggle = true,
  defaultInterval = 'month',
  buttonText,
}: PricingGridProps) {
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const handleSelectPlan = async (priceId: string) => {
    if (!onSelectPlan) return;

    setLoadingPriceId(priceId);
    try {
      await onSelectPlan(priceId);
    } finally {
      setLoadingPriceId(null);
    }
  };

  // Calcular ahorro anual para cada producto
  const getAnnualSavings = (product: ProductWithPrices): number => {
    if (interval !== 'year') return 0;

    const monthlyPrice = product.precios.find((p) => p.intervalo === 'month');
    const yearlyPrice = product.precios.find((p) => p.intervalo === 'year');

    if (!monthlyPrice || !yearlyPrice) return 0;

    const monthlyTotal = monthlyPrice.unitAmount * 12;
    return Math.round(((monthlyTotal - yearlyPrice.unitAmount) / monthlyTotal) * 100);
  };

  return (
    <div className="space-y-6">
      {showIntervalToggle && (
        <div className="flex justify-center">
          <Tabs value={interval} onValueChange={(v) => setInterval(v as BillingInterval)}>
            <TabsList>
              <TabsTrigger value="month">Mensual</TabsTrigger>
              <TabsTrigger value="year">
                Anual
                <span className="ml-2 text-xs text-green-600">(ahorra hasta 20%)</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product, index) => {
          const price = product.precios.find((p) => p.intervalo === interval) || null;
          const isCurrentPlan = currentPriceId === price?.id;
          const isPopular = index === 1; // El plan del medio suele ser el popular
          const savings = getAnnualSavings(product);

          return (
            <PricingCard
              key={product.id}
              name={product.nombre}
              description={product.descripcion}
              features={product.features}
              price={
                price
                  ? {
                      id: price.id,
                      unitAmount: price.unitAmount,
                      currency: price.currency,
                      interval: price.intervalo,
                      trialDays: price.trialDays,
                    }
                  : null
              }
              isCurrentPlan={isCurrentPlan}
              isPopular={isPopular}
              savings={savings}
              loading={loadingPriceId === price?.id}
              onSelect={handleSelectPlan}
              buttonText={buttonText}
              disabled={loadingPriceId !== null && loadingPriceId !== price?.id}
            />
          );
        })}
      </div>
    </div>
  );
}
