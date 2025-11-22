'use client';

import { Check, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type BillingInterval, formatPrice } from '@/lib/stripe';
import { cn } from '@/lib/utils';

interface PricingCardProps {
  name: string;
  description?: string | null;
  features: string[];
  price: {
    id: string;
    unitAmount: number;
    currency: string;
    interval: BillingInterval;
    trialDays?: number | null;
  } | null;
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  savings?: number;
  loading?: boolean;
  onSelect?: (priceId: string) => void;
  buttonText?: string;
  disabled?: boolean;
}

export function PricingCard({
  name,
  description,
  features,
  price,
  isCurrentPlan = false,
  isPopular = false,
  savings,
  loading = false,
  onSelect,
  buttonText,
  disabled = false,
}: PricingCardProps) {
  const handleClick = () => {
    if (price && onSelect) {
      onSelect(price.id);
    }
  };

  return (
    <Card
      className={cn(
        'relative flex flex-col',
        isCurrentPlan && 'border-primary ring-2 ring-primary',
        isPopular && !isCurrentPlan && 'border-blue-500'
      )}
    >
      {/* Badges */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge>Plan actual</Badge>
        </div>
      )}
      {isPopular && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="secondary">M\u00e1s popular</Badge>
        </div>
      )}
      {savings && savings > 0 && (
        <div className="absolute -top-3 right-4">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Ahorra {savings}%
          </Badge>
        </div>
      )}

      <CardHeader className="flex-1">
        <CardTitle>{name}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <div className="pt-4">
          {price ? (
            <>
              <span className="text-4xl font-bold">
                {formatPrice(price.unitAmount, price.currency)}
              </span>
              <span className="text-muted-foreground">
                /{price.interval === 'month' ? 'mes' : 'a\u00f1o'}
              </span>
              {price.trialDays && price.trialDays > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {price.trialDays} d\u00edas de prueba gratis
                </p>
              )}
            </>
          ) : (
            <span className="text-2xl font-bold text-muted-foreground">Contactar</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Features */}
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        {price && !isCurrentPlan && onSelect && (
          <Button
            className="w-full"
            variant={isPopular ? 'default' : 'outline'}
            onClick={handleClick}
            disabled={disabled || loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {buttonText || 'Seleccionar plan'}
          </Button>
        )}

        {isCurrentPlan && (
          <Button className="w-full" variant="outline" disabled>
            Plan actual
          </Button>
        )}

        {!price && (
          <Button className="w-full" variant="outline" asChild>
            <a href="mailto:contacto@clousadmin.com">Contactar ventas</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
