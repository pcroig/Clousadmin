'use client';

// ========================================
// Horario Mi Espacio Client Component
// ========================================
// Muestra fichajes y ausencias en una vista consolidada

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { EstadoAusencia } from '@/lib/constants/enums';

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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Horario</h1>
        <p className="text-muted-foreground">Gestiona tus fichajes y ausencias</p>
      </div>

      {/* Balance Resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <TabsList>
          <TabsTrigger value="fichajes">Fichajes</TabsTrigger>
          <TabsTrigger value="ausencias">Ausencias</TabsTrigger>
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
                              ausencia.estado === EstadoAusencia.en_curso || ausencia.estado === EstadoAusencia.completada || ausencia.estado === EstadoAusencia.auto_aprobada
                                ? 'default'
                                : ausencia.estado === EstadoAusencia.rechazada
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {ausencia.estado}
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
      <div className="flex gap-4">
        <Button onClick={() => window.location.href = '/empleado/horario/fichajes'}>
          Ver fichajes completos
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.href = '/empleado/horario/ausencias'}
        >
          Ver ausencias completas
        </Button>
      </div>
    </div>
  );
}


