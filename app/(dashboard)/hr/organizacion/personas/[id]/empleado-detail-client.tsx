// ========================================
// Empleado Detail Client Component
// ========================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Calendar, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/shared/loading-button';
import { CompensacionModal } from '@/components/hr/compensacion-modal';
import { getAvatarStyle } from '@/lib/design-system';
import type { Empleado, Usuario, Puesto } from '@/types/empleado';

interface EmpleadoDetailClientProps {
  empleado: Empleado;
  usuario: Usuario;
}

export function EmpleadoDetailClient({ empleado, usuario }: EmpleadoDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');

  // Función helper para actualizar campos del empleado
  const handleFieldUpdate = async (field: string, value: any) => {
    try {
      const response = await fetch(`/api/empleados/${empleado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar campo');
      }

      toast.success('Campo actualizado correctamente');
      router.refresh();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar campo');
    }
  };

  const getInitials = () => {
    return `${empleado.nombre.charAt(0)}${empleado.apellidos.charAt(0)}`.toUpperCase();
  };

  const avatarStyle = getAvatarStyle(`${empleado.nombre} ${empleado.apellidos || ''}`);

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'fichajes', label: 'Fichajes' },
    { id: 'ausencias', label: 'Ausencias' },
    { id: 'contratos', label: 'Contratos' },
    { id: 'documentos', label: 'Documentos' },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header con avatar y nombre */}
      <div className="mb-6">
        <Link
          href="/hr/organizacion/personas"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver</span>
        </Link>

        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {empleado.fotoUrl && <AvatarImage src={empleado.fotoUrl} />}
            <AvatarFallback
              className="text-lg font-semibold uppercase"
              style={avatarStyle}
            >
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {empleado.nombre} {empleado.apellidos}
            </h1>
            <p className="text-sm text-gray-500">{empleado.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'general' && <GeneralTab empleado={empleado} onFieldUpdate={handleFieldUpdate} />}
        {activeTab === 'fichajes' && <FichajesTab empleado={empleado} />}
        {activeTab === 'ausencias' && <AusenciasTab empleado={empleado} />}
        {activeTab === 'contratos' && <ContratosTab empleado={empleado} onFieldUpdate={handleFieldUpdate} />}
        {activeTab === 'documentos' && <DocumentosTab empleado={empleado} />}
      </div>
    </div>
  );
}

// ========================================
// GeneralTab Component
// ========================================
interface GeneralTabProps {
  empleado: Empleado;
  onFieldUpdate: (field: string, value: any) => Promise<void>;
}

function GeneralTab({ empleado, onFieldUpdate }: GeneralTabProps) {
  const [puestos, setPuestos] = useState<Puesto[]>([]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Información Personal */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DNI/NIE</label>
            <input
              type="text"
              defaultValue={empleado.nif || ''}
              placeholder="No especificado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de Seguridad Social</label>
            <input
              type="text"
              defaultValue={empleado.nss || ''}
              placeholder="No especificado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
            <input
              type="date"
              defaultValue={empleado.fechaNacimiento ? new Date(empleado.fechaNacimiento).toISOString().split('T')[0] : ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" defaultValue={empleado.estadoCivil || ''}>
              <option value="">Seleccionar</option>
              <option value="soltero">Soltero/a</option>
              <option value="casado">Casado/a</option>
              <option value="divorciado">Divorciado/a</option>
              <option value="viudo">Viudo/a</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de Hijos</label>
            <input
              type="number"
              defaultValue={empleado.numeroHijos || 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Información de Contacto */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              defaultValue={empleado.email}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              defaultValue={empleado.telefono || ''}
              placeholder="No especificado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              defaultValue={empleado.direccion || ''}
              placeholder="No especificado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
              <input
                type="text"
                defaultValue={empleado.codigoPostal || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input
                type="text"
                defaultValue={empleado.ciudad || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Información Laboral */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Laboral</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label>
            <Select
              value={empleado.puestoId || ''}
              onValueChange={(value) => onFieldUpdate('puestoId', value || null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar puesto" />
              </SelectTrigger>
              <SelectContent>
                {puestos.map((puesto) => (
                  <SelectItem key={puesto.id} value={puesto.id}>
                    {puesto.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <input
              type="text"
              defaultValue={empleado.departamento || ''}
              placeholder="No especificado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Alta</label>
            <input
              type="date"
              defaultValue={new Date(empleado.fechaAlta).toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contrato</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" defaultValue={empleado.tipoContrato}>
              <option value="indefinido">Indefinido</option>
              <option value="temporal">Temporal</option>
              <option value="practicas">Prácticas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
            <input
              type="text"
              defaultValue={empleado.manager?.nombre || 'Sin manager'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Información Bancaria */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Bancaria</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
            <input
              type="text"
              defaultValue={empleado.iban || ''}
              placeholder="No especificado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titular de la Cuenta</label>
            <input
              type="text"
              defaultValue={empleado.titularCuenta || ''}
              placeholder="No especificado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salario Bruto Anual</label>
            <input
              type="number"
              defaultValue={empleado.salarioBrutoAnual || ''}
              placeholder="No especificado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salario Bruto Mensual</label>
            <input
              type="number"
              defaultValue={empleado.salarioBrutoMensual || ''}
              placeholder="No especificado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// FichajesTab Component
// ========================================
interface FichajesTabProps {
  empleado: Empleado;
}

function FichajesTab({ empleado }: FichajesTabProps) {
  const [balanceData, setBalanceData] = useState<any>(null);
  const [promediosData, setPromediosData] = useState<any>(null);
  const [compensaciones, setCompensaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalCompensacion, setModalCompensacion] = useState<any>(null);

  // Cargar datos al montar
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar balance acumulado
        const balanceRes = await fetch(`/api/fichajes/balance?empleadoId=${empleado.id}`);
        if (balanceRes.ok) {
          const balance = await balanceRes.json();
          setBalanceData(balance);
        }

        // Cargar promedios
        const promediosRes = await fetch(`/api/fichajes/promedios?empleadoId=${empleado.id}&dias=30`);
        if (promediosRes.ok) {
          const promedios = await promediosRes.json();
          setPromediosData(promedios);
        }

        // Cargar compensaciones pendientes
        const compRes = await fetch(`/api/compensaciones-horas-extra?empleadoId=${empleado.id}&estado=pendiente`);
        if (compRes.ok) {
          const comps = await compRes.json();
          setCompensaciones(comps);
        }
      } catch (error) {
        console.error('[FichajesTab] Error cargando datos:', error);
        toast.error('Error al cargar datos de fichajes');
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [empleado.id]);

  const formatearHoras = (horas: number) => {
    const h = Math.floor(Math.abs(horas));
    const m = Math.round((Math.abs(horas) - h) * 60);
    return `${h}h ${m}m`;
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Cargando datos de fichajes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Tiempo */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-base font-semibold text-gray-900">Tiempo</h3>
            </div>
            {balanceData && (
              <span className="text-xs text-gray-500">
                Desde {new Date(balanceData.fechaDesde).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 flex-1">
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-1">Horas trabajadas</p>
              <p className="text-xl font-bold text-gray-900">
                {balanceData ? formatearHoras(balanceData.horasTrabajadas) : '-'}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-1">Horas esperadas</p>
              <p className="text-xl font-bold text-gray-900">
                {balanceData ? formatearHoras(balanceData.horasEsperadas) : '-'}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-1">Balance</p>
              <p className={`text-xl font-bold ${
                balanceData && balanceData.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {balanceData
                  ? `${balanceData.balance >= 0 ? '+' : '-'}${formatearHoras(balanceData.balance)}`
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Card Horarios */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-base font-semibold text-gray-900">Horarios</h3>
          </div>

          <div className="flex items-center justify-between gap-4 flex-1">
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-1">Hora media de entrada</p>
              <p className="text-xl font-bold text-gray-900">
                {promediosData?.horaMediaEntrada || '-'}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-1">Hora media de salida</p>
              <p className="text-xl font-bold text-gray-900">
                {promediosData?.horaMediaSalida || '-'}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-1">Horas promedio</p>
              <p className="text-xl font-bold text-gray-900">
                {promediosData ? `${promediosData.horasPromedio}h` : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Compensaciones pendientes */}
      {compensaciones.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Compensaciones Pendientes</h3>
          <div className="space-y-3">
            {compensaciones.map((comp) => (
              <div key={comp.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatearHoras(Number(comp.horasBalance))} → {comp.tipoCompensacion === 'ausencia' ? 'Ausencia' : 'Nómina'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Solicitado el {new Date(comp.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <Button size="sm" onClick={() => setModalCompensacion(comp)}>
                  Gestionar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de fichajes */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Fichajes Recientes</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {(empleado.fichajes || []).slice(0, 10).map((fichaje: any, index: number) => {
            const fecha = new Date(fichaje.fecha);
            const entrada = fichaje.eventos?.find((e: any) => e.tipo === 'entrada');
            const salida = fichaje.eventos?.find((e: any) => e.tipo === 'salida');
            
            const horaEntrada = entrada ? new Date(entrada.hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-';
            const horaSalida = salida ? new Date(salida.hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-';

            return (
              <div key={fichaje.id || index} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  {/* Fecha */}
                  <div className="w-32">
                    <p className="text-sm font-medium text-gray-900">
                      {fecha.toLocaleDateString('es-ES', { day: 'numeric' })} {fecha.toLocaleDateString('es-ES', { month: 'short' })}.
                    </p>
                    <p className="text-xs text-gray-500">
                      {fecha.toLocaleDateString('es-ES', { weekday: 'long' })}
                    </p>
                  </div>

                  {/* Horas entrada/salida */}
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-900">{horaEntrada}</p>
                    <span className="text-gray-400">→</span>
                    <p className="text-sm text-gray-900">{horaSalida}</p>
                  </div>

                  {/* Horas trabajadas */}
                  <div className="text-sm font-medium text-gray-900">
                    {fichaje.horasTrabajadas ? formatearHoras(Number(fichaje.horasTrabajadas)) : '-'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de gestión de compensación */}
      {modalCompensacion && (
        <CompensacionModal
          compensacion={modalCompensacion}
          open={!!modalCompensacion}
          onClose={() => setModalCompensacion(null)}
          onSuccess={() => {
            setModalCompensacion(null);
            // Recargar compensaciones
            fetch(`/api/compensaciones-horas-extra?empleadoId=${empleado.id}&estado=pendiente`)
              .then((res) => res.json())
              .then((comps) => setCompensaciones(comps))
              .catch((err) => console.error('Error recargando compensaciones:', err));
          }}
        />
      )}
    </div>
  );
}

// ========================================
// AusenciasTab Component
// ========================================
interface AusenciasTabProps {
  empleado: Empleado;
}

function AusenciasTab({ empleado }: AusenciasTabProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Calcular saldo de ausencias
  const calcularSaldo = () => {
    const totalDias = empleado.diasVacaciones || 22;
    const ausencias = empleado.ausencias || [];

    const diasUsados = ausencias
      .filter((a: any) => a.estado === 'approved')
      .reduce((sum: number, a: any) => sum + (a.diasLaborables || 0), 0);

    const diasPendientes = ausencias
      .filter((a: any) => a.estado === 'pending')
      .reduce((sum: number, a: any) => sum + (a.diasLaborables || 0), 0);

    const diasDisponibles = totalDias - diasUsados - diasPendientes;

    return {
      diasTotales: totalDias,
      diasUsados,
      diasPendientes,
      diasDisponibles,
    };
  };

  const saldo = calcularSaldo();

  // Próximas ausencias
  const proximasAusencias = (empleado.ausencias || [])
    .filter((a: any) => new Date(a.fechaInicio) >= new Date())
    .sort((a: any, b: any) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Columna izquierda */}
      <div className="space-y-6">
        {/* Card de saldo */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900">Saldo de ausencias</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            De enero {new Date().getFullYear()} a diciembre {new Date().getFullYear()}
          </p>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">{saldo.diasTotales}</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{saldo.diasUsados}</div>
              <div className="text-xs text-gray-500 mt-1">Usados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{saldo.diasPendientes}</div>
              <div className="text-xs text-gray-500 mt-1">Pendientes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{saldo.diasDisponibles}</div>
              <div className="text-xs text-gray-500 mt-1">Disponibles</div>
            </div>
          </div>
        </div>

        {/* Próximas ausencias */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900">Próximas ausencias</h3>
          </div>

          <div className="space-y-3">
            {proximasAusencias.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay ausencias próximas</p>
            ) : (
              proximasAusencias.map((ausencia: any) => (
                <div key={ausencia.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(ausencia.fechaInicio).toLocaleDateString('es-ES')} → {new Date(ausencia.fechaFin).toLocaleDateString('es-ES')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ausencia.diasLaborables} {ausencia.diasLaborables === 1 ? 'día' : 'días'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={ausencia.estado === 'approved' ? 'default' : 'secondary'}>
                    {ausencia.estado === 'approved' ? 'Aprobado' : ausencia.estado === 'rejected' ? 'Rechazado' : 'Pendiente'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Columna derecha - Calendario */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-end mb-4">
          <Button>Abrir ausencia</Button>
        </div>
        <div className="text-center text-gray-500">
          <p className="text-sm">Calendario de ausencias</p>
          <p className="text-xs mt-2">(En desarrollo)</p>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ContratosTab Component
// ========================================
interface ContratosTabProps {
  empleado: Empleado;
  onFieldUpdate: (field: string, value: any) => Promise<void>;
}

function ContratosTab({ empleado, onFieldUpdate }: ContratosTabProps) {
  const [jornadas, setJornadas] = useState<Puesto[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [jornadaSeleccionadaId, setJornadaSeleccionadaId] = useState<string | null>(empleado.jornadaId || null);
  const [diasLaborables, setDiasLaborables] = useState({
    lun: true,
    mar: true,
    mie: true,
    jue: true,
    vie: true,
    sab: false,
    dom: false,
  });
  const [showFinalizarDialog, setShowFinalizarDialog] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const handleFinalizarContrato = async () => {
    setFinalizando(true);
    try {
      const response = await fetch(`/api/empleados/${empleado.id}/finalizar-contrato`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaFin: new Date().toISOString().split('T')[0],
        }),
      });

      if (!response.ok) throw new Error('Error al finalizar contrato');

      toast.success('Contrato finalizado correctamente');
      setShowFinalizarDialog(false);
    } catch (error) {
      console.error('Error finalizando contrato:', error);
      toast.error('Error al finalizar contrato');
    } finally {
      setFinalizando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header con botón Finalizar Contrato */}
      <div className="flex justify-end mb-4">
        <Button
          variant="destructive"
          onClick={() => setShowFinalizarDialog(true)}
        >
          Finalizar Contrato
        </Button>
      </div>

      {/* Información básica y Jurídico y laboral */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información básica */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información básica</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de contrato</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="indefinido">Indefinido</option>
                <option value="temporal">Temporal</option>
                <option value="practicas">Prácticas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label>
              <Select
                value={empleado.puestoId || ''}
                onValueChange={(value) => onFieldUpdate('puestoId', value || null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar puesto" />
                </SelectTrigger>
                <SelectContent>
                  {puestos.map((puesto) => (
                    <SelectItem key={puesto.id} value={puesto.id}>
                      {puesto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Jurídico y laboral */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jurídico y laboral</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría profesional</label>
              <input
                type="text"
                defaultValue={empleado.categoriaProfesional || ''}
                placeholder="No informado"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                onBlur={(e) => {
                  const newValue = e.target.value;
                  if (newValue !== (empleado.categoriaProfesional || '')) {
                    onFieldUpdate('categoriaProfesional', newValue || null);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grupo de cotización</label>
              <input
                type="text"
                defaultValue={empleado.grupoCotizacion || ''}
                placeholder="No informado"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                onBlur={(e) => {
                  const newValue = e.target.value;
                  if (newValue !== (empleado.grupoCotizacion || '')) {
                    onFieldUpdate('grupoCotizacion', newValue || null);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Jornada */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Jornada</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar jornada</label>
            <Select
              value={jornadaSeleccionadaId || ''}
              onValueChange={(value) => {
                setJornadaSeleccionadaId(value || null);
                onFieldUpdate('jornadaId', value || null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar jornada" />
              </SelectTrigger>
              <SelectContent>
                {jornadas.map((jornada) => (
                  <SelectItem key={jornada.id} value={jornada.id}>
                    {jornada.nombre} ({jornada.horasSemanales}h/semana)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Días laborables</label>
            <div className="flex gap-2">
              {[
                { key: 'lun', label: 'Lun' },
                { key: 'mar', label: 'Mar' },
                { key: 'mie', label: 'Mie' },
                { key: 'jue', label: 'Jue' },
                { key: 'vie', label: 'Vie' },
                { key: 'sab', label: 'Sab' },
                { key: 'dom', label: 'Dom' },
              ].map((dia) => (
                <button
                  key={dia.key}
                  type="button"
                  disabled
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    diasLaborables[dia.key as keyof typeof diasLaborables]
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600'
                  } opacity-60 cursor-not-allowed`}
                >
                  {dia.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Los días laborables se obtienen de la jornada seleccionada.
            </p>
          </div>
        </div>
      </div>

      {/* Dialog Finalizar Contrato */}
      <Dialog open={showFinalizarDialog} onOpenChange={setShowFinalizarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Contrato</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              ¿Estás seguro de que deseas finalizar el contrato de{' '}
              <strong>{empleado.nombre} {empleado.apellidos}</strong>?
            </p>
            <p className="text-sm text-red-600 mb-2">Esta acción:</p>
            <ul className="text-sm text-gray-600 list-disc list-inside mb-4 space-y-1">
              <li>Marcará la fecha de fin del contrato</li>
              <li>Desactivará el empleado</li>
              <li>Deshabilitará el acceso a la plataforma</li>
            </ul>
            <p className="text-sm font-semibold text-red-600">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFinalizarDialog(false)}
              disabled={finalizando}
            >
              Cancelar
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={handleFinalizarContrato}
              loading={finalizando}
            >
              Finalizar Contrato
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========================================
// DocumentosTab Component
// ========================================
interface DocumentosTabProps {
  empleado: Empleado;
}

function DocumentosTab({ empleado }: DocumentosTabProps) {
  const [activeDocTab, setActiveDocTab] = useState<'personales' | 'compartidos'>('personales');

  return (
    <div>
      {/* Toggle Personales/Compartidos */}
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setActiveDocTab('personales')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeDocTab === 'personales'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Personales
          </button>
          <button
            onClick={() => setActiveDocTab('compartidos')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeDocTab === 'compartidos'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Compartidos
          </button>
        </div>

        <Button variant="default">Cargar documentos</Button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-500">
          Cuando el administrador comparte contigo un documento, este quedará almacenado en la carpeta correspondiente.
        </p>
      </div>

      {/* Grid de carpetas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {activeDocTab === 'personales' ? (
          (empleado.carpetas || []).map((carpeta: any) => (
            <div key={carpeta.id} className="flex flex-col items-center cursor-pointer group">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-2 group-hover:bg-gray-200 transition-colors">
                <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 text-center">{carpeta.nombre}</p>
              {carpeta.numeroDocumentos > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {carpeta.numeroDocumentos} documento{carpeta.numeroDocumentos !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-sm text-gray-500">No hay documentos compartidos</p>
          </div>
        )}
      </div>
    </div>
  );
}
