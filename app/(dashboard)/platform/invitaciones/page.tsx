// ========================================
// Platform Admin - Invitaciones, Empresas y Billing
// ========================================

import { startOfMonth } from 'date-fns';
import { redirect } from 'next/navigation';

import {
  type CompanyStatusRow,
  CompanyStatusTable,
} from '@/components/platform/CompanyStatusTable';
import { InviteSignupConsole } from '@/components/platform/InviteSignupConsole';
import { WidgetCard } from '@/components/shared/widget-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { hasSubscriptionTable } from '@/lib/platform/subscriptions';
import { prisma } from '@/lib/prisma';

type PlatformMetrics = {
  totalCompanies: number;
  newCompaniesThisMonth: number;
  totalUsers: number;
  newUsersThisMonth: number;
  totalInvitationsPending: number;
  totalWaitlistEntries: number;
};

async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [
    totalCompanies,
    newCompaniesThisMonth,
    totalUsers,
    newUsersThisMonth,
    totalInvitationsPending,
    totalWaitlistEntries,
  ] = await Promise.all([
    prisma.empresas.count({ where: { activo: true } }),
    prisma.empresas.count({ where: { activo: true, createdAt: { gte: monthStart } } }),
    prisma.usuarios.count({ where: { activo: true } }),
    prisma.usuarios.count({ where: { activo: true, createdAt: { gte: monthStart } } }),
    prisma.invitaciones_signup.count({
      where: {
        usada: false,
        expiraEn: { gt: now },
      },
    }),
    prisma.waitlist.count({
      where: {
        invitado: false,
      },
    }),
  ]);

  return {
    totalCompanies,
    newCompaniesThisMonth,
    totalUsers,
    newUsersThisMonth,
    totalInvitationsPending,
    totalWaitlistEntries,
  };
}

type CompanyQueryRow = {
  id: string;
  nombre: string;
  activo: boolean;
  createdAt: Date;
  subscriptions?: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
  }[];
};

async function getCompanyRows(): Promise<CompanyStatusRow[]> {
  const includeSubscriptions = await hasSubscriptionTable();

  const [companies, activeEmployees] = await Promise.all([
    prisma.empresas
      .findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          nombre: true,
          activo: true,
          createdAt: true,
          ...(includeSubscriptions
            ? {
                subscriptions: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  select: {
                    id: true,
                    status: true,
                    cancelAtPeriodEnd: true,
                    currentPeriodEnd: true,
                  },
                },
              }
            : {}),
        },
      })
      .then((rows) => rows as CompanyQueryRow[]),
    prisma.empleados.groupBy({
      by: ['empresaId'],
      where: {
        estadoEmpleado: 'activo',
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const employeeMap = activeEmployees.reduce<Record<string, number>>((acc, item) => {
    acc[item.empresaId] = item._count._all;
    return acc;
  }, {});

  return companies.map((company) => {
    const latestSubscription = company.subscriptions?.[0];

    return {
      id: company.id,
      nombre: company.nombre,
      activo: company.activo,
      createdAt: company.createdAt.toISOString(),
      activeEmployees: employeeMap[company.id] ?? 0,
      subscription: latestSubscription
        ? {
            id: latestSubscription.id,
            status: latestSubscription.status,
            cancelAtPeriodEnd: latestSubscription.cancelAtPeriodEnd,
            currentPeriodEnd: latestSubscription.currentPeriodEnd
              ? latestSubscription.currentPeriodEnd.toISOString()
              : null,
          }
        : null,
    };
  });
}

export default async function PlatformInvitationsPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.platform_admin) {
    redirect('/login');
  }

  const [metrics, companyRows, invitaciones, waitlist] = await Promise.all([
    getPlatformMetrics(),
    getCompanyRows(),
    prisma.invitaciones_signup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        token: true,
        createdAt: true,
        expiraEn: true,
        usada: true,
        usadoEn: true,
        invitadoPor: true,
      },
    }),
    prisma.waitlist.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        nombre: true,
        empresa: true,
        mensaje: true,
        invitado: true,
        invitadoEn: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Platform admin · {session.user.email}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Panel de la plataforma</h1>
        <p className="text-base text-muted-foreground">
          Controla métricas globales, estado de empresas y pagos desde un solo lugar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <WidgetCard title="Empresas activas" contentClassName="flex flex-col justify-center gap-2">
          <span className="text-3xl font-semibold">{metrics.totalCompanies}</span>
          <span className="text-sm text-muted-foreground">
            +{metrics.newCompaniesThisMonth} este mes
          </span>
        </WidgetCard>
        <WidgetCard title="Usuarios activos" contentClassName="flex flex-col justify-center gap-2">
          <span className="text-3xl font-semibold">{metrics.totalUsers}</span>
          <span className="text-sm text-muted-foreground">
            +{metrics.newUsersThisMonth} este mes
          </span>
        </WidgetCard>
        <WidgetCard
          title="Invitaciones pendientes"
          contentClassName="flex flex-col justify-center gap-2"
        >
          <span className="text-3xl font-semibold">{metrics.totalInvitationsPending}</span>
          <span className="text-sm text-muted-foreground">Incluye enlaces vigentes</span>
        </WidgetCard>
        <WidgetCard title="Waitlist" contentClassName="flex flex-col justify-center gap-2">
          <span className="text-3xl font-semibold">{metrics.totalWaitlistEntries}</span>
          <span className="text-sm text-muted-foreground">Solicitudes por aprobar</span>
        </WidgetCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empresas y facturación</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyStatusTable companies={companyRows} />
        </CardContent>
      </Card>

      <InviteSignupConsole
        adminEmail={session.user.email}
        invitaciones={invitaciones.map((invitacion) => ({
          ...invitacion,
          createdAt: invitacion.createdAt.toISOString(),
          expiraEn: invitacion.expiraEn.toISOString(),
          usadoEn: invitacion.usadoEn ? invitacion.usadoEn.toISOString() : null,
        }))}
        waitlist={waitlist.map((entry) => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          invitadoEn: entry.invitadoEn ? entry.invitadoEn.toISOString() : null,
        }))}
      />
    </div>
  );
}
