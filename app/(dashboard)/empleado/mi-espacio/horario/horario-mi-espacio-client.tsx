'use client';

// ========================================
// Horario Mi Espacio Client Component
// ========================================
// Muestra fichajes y ausencias en una vista consolidada

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EstadoAusencia } from '@/lib/constants/enums';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { cn } from '@/lib/utils';

interface BalanceResumen {
  diario: number;
  semanal: number;
  mensual: number;
  acumulado: number;
}

interface Fichaje {
  id: string;
  fecha: Date;
  estado: string;
  horasTrabajadas: number | string | null;
  horasEnPausa: number | string | null;
  autoCompletado: boolean;
  eventos: FichajeEvento[];
}

interface FichajeEvento {
  id: string;
  tipo: string;
  hora: Date;
  editado: boolean;
  motivoEdicion: string | null;
}

interface Ausencia {
  id: string;
  tipo: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: string;
  diasSolicitados: number | { toString: () => string }; // Decimal de Prisma
}

interface HorarioMiEspacioClientProps {
  balanceInicial: BalanceResumen;
  fichajesIniciales: Fichaje[];
  ausenciasIniciales: Ausencia[];
}

export function HorarioMiEspacioClient({
  balanceInicial,
  fichajesIniciales,
  ausenciasIniciales,
}: HorarioMiEspacioClientProps) {
  return (
    <div className={cn(MOBILE_DESIGN.spacing.section, 'p-4 sm:p-6')}>
      <div className="mb-4 sm:mb-6">
        <h1 className={cn('font-bold tracking-tight', MOBILE_DESIGN.text.pageTitle, 'sm:text-3xl')}>
          Mi Horario
        </h1>
        <p className={cn('text-muted-foreground', MOBILE_DESIGN.text.body, 'sm:text-base')}>
          Gestiona tus fichajes y ausencias
        </p>
      </div>

      {/* Balance Resumen */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Diario</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balanceInicial.diario}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Semanal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balanceInicial.semanal}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Mensual</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balanceInicial.mensual}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Acumulado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balanceInicial.acumulado}h</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Fichajes y Ausencias */}
      <Tabs defaultValue="fichajes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fichajes" className={cn(MOBILE_DESIGN.text.bodyMedium)}>
            Fichajes
          </TabsTrigger>
          <TabsTrigger value="ausencias" className={cn(MOBILE_DESIGN.text.bodyMedium)}>
            Ausencias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fichajes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Fichajes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fichajesIniciales.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay fichajes registrados</p>
                ) : (
                  fichajesIniciales.map((fichaje) => {
                    const primeraHora = fichaje.eventos?.[0]?.hora;
                    const ultimaHora = fichaje.eventos?.[fichaje.eventos.length - 1]?.hora;
                    const tiposEventos = fichaje.eventos?.map(e => e.tipo).join(', ') || 'Sin eventos';
                    
                    return (
                      <div
                        key={fichaje.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tiposEventos}</span>
                            <Badge variant={fichaje.estado === 'finalizado' ? 'default' : 'secondary'}>
                              {fichaje.estado}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(fichaje.fecha, 'PPP', { locale: es })}
                            {primeraHora && ` - ${format(new Date(primeraHora), 'HH:mm')}`}
                            {ultimaHora && primeraHora !== ultimaHora && ` a ${format(new Date(ultimaHora), 'HH:mm')}`}
                          </p>
                          {fichaje.horasTrabajadas && (
                            <p className="text-xs text-muted-foreground">
                              {typeof fichaje.horasTrabajadas === 'string'
                                ? fichaje.horasTrabajadas
                                : fichaje.horasTrabajadas.toFixed(2)}h trabajadas
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ausencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Ausencias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ausenciasIniciales.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay ausencias registradas</p>
                ) : (
                  ausenciasIniciales.map((ausencia) => (
                    <div
                      key={ausencia.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ausencia.tipo}</span>
                          <Badge
                            variant={
                              ausencia.estado === EstadoAusencia.confirmada ||
                              ausencia.estado === EstadoAusencia.completada
                                ? 'default'
                                : ausencia.estado === EstadoAusencia.rechazada
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {getAusenciaEstadoLabel(ausencia.estado)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(ausencia.fechaInicio, 'PPP', { locale: es })} -{' '}
                          {format(ausencia.fechaFin, 'PPP', { locale: es })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {typeof ausencia.diasSolicitados === 'number' 
                            ? ausencia.diasSolicitados 
                            : ausencia.diasSolicitados.toString()} días
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Acciones rápidas */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <Button
          onClick={() => window.location.href = '/empleado/mi-espacio/fichajes'}
          className={cn(MOBILE_DESIGN.button.primary, 'w-full sm:w-auto')}
        >
          Ver fichajes completos
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.href = '/empleado/mi-espacio/ausencias'}
          className={cn(MOBILE_DESIGN.button.secondary, 'w-full sm:w-auto')}
        >
          Ver ausencias completas
        </Button>
      </div>
    </div>
  );
}


