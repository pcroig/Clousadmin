'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deactivateCompanyAction } from '@/app/(dashboard)/platform/invitaciones/actions';
import { Loader2, Power, ShieldAlert } from 'lucide-react';

export type CompanyStatusRow = {
  id: string;
  nombre: string;
  activo: boolean;
  createdAt: string;
  activeEmployees: number;
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  } | null;
};

interface CompanyStatusTableProps {
  companies: CompanyStatusRow[];
}

export function CompanyStatusTable({ companies }: CompanyStatusTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [targetId, setTargetId] = useState<string | null>(null);

  const formatDate = (value: string | null) => {
    if (!value) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  };

  const formatStatus = (row: CompanyStatusRow) => {
    if (!row.subscription) {
      return <Badge variant="outline">Sin suscripción</Badge>;
    }

    const status = row.subscription.status;
    if (status === 'active') {
      return <Badge className="bg-emerald-500 hover:bg-emerald-500">Activa</Badge>;
    }

    if (status === 'trialing') {
      return <Badge className="bg-blue-500 hover:bg-blue-500">Trial</Badge>;
    }

    if (status === 'past_due') {
      return <Badge variant="destructive">Pago pendiente</Badge>;
    }

    if (status === 'canceled' || status === 'incomplete_expired') {
      return <Badge variant="secondary">Cancelada</Badge>;
    }

    return <Badge variant="outline">{status}</Badge>;
  };

  const handleDeactivate = (companyId: string) => {
    setTargetId(companyId);
    startTransition(async () => {
      const result = await deactivateCompanyAction(companyId);
      if (!result.success) {
        toast.error(result.error ?? 'No se pudo desactivar la empresa');
      } else {
        toast.success('Empresa desactivada correctamente');
        router.refresh();
      }
      setTargetId(null);
    });
  };

  if (companies.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Todavía no hay empresas registradas desde la plataforma.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Empleados activos</TableHead>
            <TableHead>Suscripción</TableHead>
            <TableHead>Renovación</TableHead>
            <TableHead>Creada</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            const isInactive = !company.activo;
            const isLoading = pending && targetId === company.id;

            return (
              <TableRow key={company.id} className={isInactive ? 'opacity-60' : undefined}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{company.nombre}</span>
                    {isInactive ? (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Inactiva
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Activa</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {company.activo ? (
                    <Badge variant="outline">Activa</Badge>
                  ) : (
                    <Badge variant="secondary">Inactiva</Badge>
                  )}
                </TableCell>
                <TableCell>{company.activeEmployees}</TableCell>
                <TableCell className="space-y-1">
                  {formatStatus(company)}
                  {company.subscription?.cancelAtPeriodEnd && (
                    <p className="text-xs text-muted-foreground">Cancelada al fin de ciclo</p>
                  )}
                </TableCell>
                <TableCell>{formatDate(company.subscription?.currentPeriodEnd ?? null)}</TableCell>
                <TableCell>{formatDate(company.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!company.activo || isLoading}
                    onClick={() => handleDeactivate(company.id)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Desactivando
                      </>
                    ) : (
                      <>
                        <Power className="mr-2 h-4 w-4" />
                        Suspender
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

