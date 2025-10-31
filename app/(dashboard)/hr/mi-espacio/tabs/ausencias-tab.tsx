'use client';

import { useState, useEffect } from 'react';
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
import { Calendar } from 'lucide-react';
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

export function AusenciasTab({ empleadoId }: { empleadoId: string }) {
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [saldo, setSaldo] = useState<SaldoData>({
    diasTotales: 0,
    diasUsados: 0,
    diasPendientes: 0,
    diasDisponibles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [modalSolicitud, setModalSolicitud] = useState(false);

  useEffect(() => {
    fetchAusencias();
  }, [empleadoId]);

  async function fetchAusencias() {
    setLoading(true);
    try {
      const response = await fetch('/api/ausencias');
      if (!response.ok) {
        throw new Error('Error al obtener ausencias');
      }
      const data = await response.json();
      setAusencias(data);
    } catch (error) {
      console.error('Error fetching ausencias:', error);
      setAusencias([]);
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
    <div className="space-y-6">
      {/* Widget Saldo */}
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

      {/* Botón Nueva Ausencia */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Mis Ausencias</h3>
        <button
          onClick={() => setModalSolicitud(true)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          + Nueva Ausencia
        </button>
      </div>

      {/* Tabla de Ausencias */}
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
