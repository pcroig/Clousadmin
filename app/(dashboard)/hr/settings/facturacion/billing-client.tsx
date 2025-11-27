'use client';

import {
  AlertCircle,
  Calendar,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type BillingInterval, formatPrice, type ProductWithPrices } from '@/lib/stripe';

interface SubscriptionData {
  hasSubscription: boolean;
  status: string | null;
  plan: {
    id: string;
    nombre: string;
    descripcion: string | null;
    features: string[];
  } | null;
  price: {
    id: string;
    unitAmount: number;
    currency: string;
    intervalo: BillingInterval;
  } | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  isTrialing: boolean;
  trialEnd: Date | null;
}

interface BillingClientProps {
  subscription: SubscriptionData;
  products: ProductWithPrices[];
}

export function BillingClient({ subscription, products }: BillingClientProps) {
  const searchParams = useSearchParams();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // Mostrar toast según parámetros de URL
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  if (success === 'true') {
    toast.success('Suscripción activada correctamente');
  } else if (canceled === 'true') {
    toast.info('Has cancelado el proceso de pago');
  }

  const handleSubscribe = async (priceId: string) => {
    setLoadingPriceId(priceId);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Error al crear la sesión de pago');
      }

      // Redirigir a Stripe Checkout
      const url = typeof data.url === 'string' ? data.url : '/';
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoadingPriceId(null);
    }
  };

  const handleManageBilling = async () => {
    setLoadingPortal(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Error al acceder al portal');
      }

      // Redirigir al portal de Stripe
      const url = typeof data.url === 'string' ? data.url : '/';
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoadingPortal(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Activa</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Periodo de prueba</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Pago pendiente</Badge>;
      case 'canceled':
        return <Badge variant="secondary">Cancelada</Badge>;
      default:
        return <Badge variant="outline">Sin suscripción</Badge>;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
        <p className="text-muted-foreground">
          Gestiona tu suscripción y métodos de pago
        </p>
      </div>

      {/* Current Subscription */}
      {subscription.hasSubscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">Tu plan actual</CardTitle>
                  <CardDescription>{subscription.plan?.nombre}</CardDescription>
                </div>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {subscription.price
                    ? formatPrice(
                        subscription.price.unitAmount,
                        subscription.price.currency,
                        subscription.price.intervalo
                      )
                    : '-'}
                </p>
                {subscription.isTrialing && subscription.trialEnd && (
                  <p className="text-sm text-muted-foreground">
                    Prueba gratis hasta {formatDate(subscription.trialEnd)}
                  </p>
                )}
              </div>
              <Button onClick={handleManageBilling} disabled={loadingPortal}>
                {loadingPortal ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Gestionar facturación
              </Button>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Suscripción cancelada</AlertTitle>
                <AlertDescription>
                  Tu suscripción finalizará el {formatDate(subscription.currentPeriodEnd)}.
                  Puedes reactivarla desde el portal de facturación.
                </AlertDescription>
              </Alert>
            )}

            {!subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Próxima renovación: {formatDate(subscription.currentPeriodEnd)}</span>
              </div>
            )}

            {/* Features */}
            {subscription.plan?.features && subscription.plan.features.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Incluido en tu plan:</p>
                <ul className="grid grid-cols-2 gap-2">
                  {(subscription.plan.features as string[]).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Sin suscripción activa</AlertTitle>
          <AlertDescription>
            Elige un plan para desbloquear todas las funcionalidades de Clousadmin.
          </AlertDescription>
        </Alert>
      )}

      {/* Plans */}
      {products.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Planes disponibles</h2>
            <Tabs
              value={billingInterval}
              onValueChange={(v) => setBillingInterval(v as 'month' | 'year')}
            >
              <TabsList>
                <TabsTrigger value="month">Mensual</TabsTrigger>
                <TabsTrigger value="year">Anual</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((product) => {
              const price = product.precios.find((p) => p.intervalo === billingInterval);
              const isCurrentPlan = subscription.price?.id === price?.id;
              const monthlyPrice = product.precios.find((p) => p.intervalo === 'month');
              const yearlyPrice = product.precios.find((p) => p.intervalo === 'year');

              // Calcular ahorro anual
              let savings = 0;
              if (monthlyPrice && yearlyPrice && billingInterval === 'year') {
                const monthlyTotal = monthlyPrice.unitAmount * 12;
                savings = Math.round(((monthlyTotal - yearlyPrice.unitAmount) / monthlyTotal) * 100);
              }

              return (
                <Card
                  key={product.id}
                  className={`relative ${isCurrentPlan ? 'border-primary ring-2 ring-primary' : ''}`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge>Plan actual</Badge>
                    </div>
                  )}
                  {savings > 0 && billingInterval === 'year' && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="secondary">Ahorra {savings}%</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{product.nombre}</CardTitle>
                    <CardDescription>{product.descripcion}</CardDescription>
                    <div className="pt-2">
                      <span className="text-3xl font-bold">
                        {price ? formatPrice(price.unitAmount, price.currency) : '-'}
                      </span>
                      <span className="text-muted-foreground">
                        /{billingInterval === 'month' ? 'mes' : 'año'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {product.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {price && !isCurrentPlan && (
                      <Button
                        className="w-full"
                        onClick={() => handleSubscribe(price.id)}
                        disabled={loadingPriceId === price.id}
                      >
                        {loadingPriceId === price.id && (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        )}
                        {subscription.hasSubscription ? 'Cambiar a este plan' : 'Suscribirse'}
                      </Button>
                    )}

                    {isCurrentPlan && (
                      <Button className="w-full" variant="outline" disabled>
                        Plan actual
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {products.length === 0 && !subscription.hasSubscription && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No hay planes disponibles en este momento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
