'use client';

// ========================================
// Ausencias Empleado Client Component
// ========================================

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableHeader as PageHeader } from '@/components/shared/table-header';
import { SolicitarAusenciaModal } from '@/components/empleado/solicitar-ausencia-modal';
import { Calendar, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Ausencia {
  id: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  diasLaborables: number;
  diasSolicitados: number;
  estado: string;
  motivo: string | null;
  motivoRechazo: string | null;
  createdAt: string;
}

interface SaldoData {
  diasTotales: number;
  diasUsados: number;
  diasPendientes: number;
  diasDisponibles: number;
}

interface CampanaData {
  id: string;
  titulo: string;
  fechaInicioObjetivo: string;
  fechaFinObjetivo: string;
  miPreferencia: {
    id: string;
    completada: boolean;
    aceptada: boolean;
    diasIdeales: any;
    diasPrioritarios: any;
    diasAlternativos: any;
    propuestaIA: any;
  } | null;
}

interface Props {
  saldo: SaldoData;
  campanas?: CampanaData[];
}

export function AusenciasEmpleadoClient({ saldo, campanas = [] }: Props) {
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalSolicitud, setModalSolicitud] = useState(false);
  const [campanasExpandidas, setCampanasExpandidas] = useState(false);

  useEffect(() => {
    fetchAusencias();
  }, []);

  async function fetchAusencias() {
    setLoading(true);
    try {
      const response = await fetch('/api/ausencias');
      const data = await response.json();
      setAusencias(data);
    } catch (error) {
      console.error('Error fetching ausencias:', error);
    } finally {
      setLoading(false);
    }
  }

  function getEstadoBadge(estado: string) {
    const variants: Record<string, { label: string; className: string }> = {
      pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      aprobada: { label: 'Aprobada', className: 'bg-green-100 text-green-800' },
      rechazada: { label: 'Rechazada', className: 'bg-red-100 text-red-800' },
      cancelada: { label: 'Cancelada', className: 'bg-gray-100 text-gray-800' },
    };

    const variant = variants[estado] || variants.pendiente;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  }

  function getTipoBadge(tipo: string) {
    const tipos: Record<string, string> = {
      vacaciones: 'Vacaciones',
      enfermedad: 'Enfermedad',
      enfermedad_familiar: 'Enfermedad Familiar',
      maternidad_paternidad: 'Maternidad/Paternidad',
      otro: 'Otro',
    };
    return tipos[tipo] || tipo;
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <PageHeader
        title="Mis Ausencias"
        actionButton={{
          label: '+ Nueva Ausencia',
          onClick: () => setModalSolicitud(true),
        }}
      />

      {/* Widget Saldo */}
      <div className="mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#F26C21]" />
              Saldo de Vacaciones {new Date().getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{saldo.diasTotales}</div>
                <div className="text-xs text-gray-500 mt-1">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{saldo.diasUsados}</div>
                <div className="text-xs text-gray-500 mt-1">Usados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{saldo.diasPendientes}</div>
                <div className="text-xs text-gray-500 mt-1">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{saldo.diasDisponibles}</div>
                <div className="text-xs text-gray-500 mt-1">Disponibles</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel de Campañas Activas */}
      {campanas.length > 0 && (
        <Card className="mb-6">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setCampanasExpandidas(!campanasExpandidas)}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {campanas.length === 1 ? 'Campaña de Vacaciones Activa' : 'Campañas de Vacaciones Activas'}
                </h3>
                <p className="text-sm text-gray-500">
                  {campanas.length} campaña{campanas.length !== 1 ? 's' : ''} disponible{campanas.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-800 border-0">
                Activas
              </Badge>
              {campanasExpandidas ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {campanasExpandidas && (
            <div className="border-t border-gray-200 p-4 space-y-3">
              {campanas.map((campana) => (
                <div
                  key={campana.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{campana.titulo}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        <Calendar className="w-3.5 h-3.5 inline mr-1" />
                        {format(new Date(campana.fechaInicioObjetivo), 'dd MMM', { locale: es })} -{' '}
                        {format(new Date(campana.fechaFinObjetivo), 'dd MMM yyyy', { locale: es })}
                      </span>
                      {campana.miPreferencia && (
                        <Badge variant={campana.miPreferencia.aceptada ? 'success' : 'warning'} className="text-xs">
                          {campana.miPreferencia.aceptada ? 'Participando' : 'Pendiente'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Aquí se podría abrir un modal con más detalles
                      window.location.href = `/empleado/horario/vacaciones/${campana.id}`;
                    }}
                  >
                    Ver detalles
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Solicitado</TableHead>
                <TableHead>Motivo/Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : ausencias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No tienes ausencias registradas
                  </TableCell>
                </TableRow>
              ) : (
                ausencias.map((ausencia) => (
                  <TableRow key={ausencia.id}>
                    <TableCell>
                      <span className="font-medium">{getTipoBadge(ausencia.tipo)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(ausencia.fechaInicio), 'dd MMM', { locale: es })}</div>
                        <div className="text-gray-500">
                          a {format(new Date(ausencia.fechaFin), 'dd MMM yyyy', { locale: es })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{ausencia.diasSolicitados}</span> días
                    </TableCell>
                    <TableCell>{getEstadoBadge(ausencia.estado)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(ausencia.createdAt), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {ausencia.estado === 'rechazada' && ausencia.motivoRechazo ? (
                        <span className="text-red-600 text-sm">{ausencia.motivoRechazo}</span>
                      ) : (
                        <span className="text-gray-500 text-sm">{ausencia.motivo || '-'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Modal Nueva Ausencia */}
      <SolicitarAusenciaModal
        open={modalSolicitud}
        onClose={() => setModalSolicitud(false)}
        onSuccess={() => {
          setModalSolicitud(false);
          fetchAusencias();
        }}
        saldoDisponible={saldo.diasDisponibles}
      />
    </div>
  );
}

