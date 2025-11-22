'use client';

// ========================================
// Platform Admin Console - Invitaciones & Waitlist
// ========================================

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, Copy, Loader2, RefreshCcw, Send, UserPlus2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { convertirWaitlistEntryAction, generarInvitacionSignupAction } from '@/app/(dashboard)/platform/invitaciones/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';


type SerializedInvitation = {
  id: string;
  email: string;
  token: string;
  createdAt: string;
  expiraEn: string;
  usada: boolean;
  usadoEn: string | null;
  invitadoPor: string | null;
};

type SerializedWaitlistEntry = {
  id: string;
  email: string;
  nombre: string | null;
  empresa: string | null;
  mensaje: string | null;
  invitado: boolean;
  invitadoEn: string | null;
  createdAt: string;
};

interface InviteSignupConsoleProps {
  adminEmail: string;
  invitaciones: SerializedInvitation[];
  waitlist: SerializedWaitlistEntry[];
}

export function InviteSignupConsole({
  adminEmail,
  invitaciones,
  waitlist,
}: InviteSignupConsoleProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [lastLink, setLastLink] = useState<{ email: string; url: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [convertingEmail, setConvertingEmail] = useState<string | null>(null);

  const [creatingInvitation, startCreatingInvitation] = useTransition();
  const [convertingWaitlist, startConvertingWaitlist] = useTransition();

  // Capturar timestamp una vez para comparaciones de expiración
  const [now] = useState(() => Date.now());

  const stats = useMemo(() => {
    const activas = invitaciones.filter((inv) => !inv.usada && new Date(inv.expiraEn).getTime() > now).length;
    const expiradas = invitaciones.filter((inv) => inv.usada || new Date(inv.expiraEn).getTime() <= now).length;

    return {
      activas,
      expiradas,
      waitlistPendiente: waitlist.filter((entry) => !entry.invitado).length,
    };
  }, [invitaciones, waitlist]);

  const copyInvitationUrl = async (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/signup?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success('Enlace de invitación copiado');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleInviteSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const trimmedEmail = email.trim();

    startCreatingInvitation(async () => {
      const result = await generarInvitacionSignupAction(trimmedEmail);

      if (!result.success || !result.url) {
        setFormError(result.error || 'Error al generar la invitación');
        toast.error(result.error || 'Error al generar la invitación');
        return;
      }

      setLastLink({ email: trimmedEmail, url: result.url });
      setEmail('');
      toast.success('Invitación creada y enviada');
      router.refresh();
    });
  };

  const handleConvertWaitlist = (entryEmail: string) => {
    setConvertingEmail(entryEmail);
    startConvertingWaitlist(async () => {
      const result = await convertirWaitlistEntryAction(entryEmail);

      if (!result.success) {
        toast.error(result.error || 'No se pudo convertir la solicitud');
        setConvertingEmail(null);
        return;
      }

      toast.success('Waitlist convertida en invitación');
      setConvertingEmail(null);
      router.refresh();
    });
  };

  const renderInvitationStatus = (invitation: SerializedInvitation) => {
    const expired = new Date(invitation.expiraEn).getTime() <= now;

    if (invitation.usada) {
      return <Badge variant="secondary">Usada</Badge>;
    }

    if (expired) {
      return <Badge variant="destructive">Expirada</Badge>;
    }

    return <Badge variant="outline">Activa</Badge>;
  };

  const formatRelative = (value: string) =>
    formatDistanceToNow(new Date(value), { addSuffix: true, locale: es });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Platform admin · {adminEmail}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Invitaciones y waitlist</h1>
        <p className="text-base text-muted-foreground">
          Genera invitaciones para nuevas empresas y convierte solicitudes pendientes en un solo lugar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Invitaciones activas</CardDescription>
            <CardTitle className="text-3xl font-semibold">{stats.activas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expiradas o usadas</CardDescription>
            <CardTitle className="text-3xl font-semibold">{stats.expiradas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Waitlist pendiente</CardDescription>
            <CardTitle className="text-3xl font-semibold">{stats.waitlistPendiente}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invitar una nueva empresa</CardTitle>
            <CardDescription>
              Envía una invitación directa. El enlace caduca en 7 días y requiere email corporativo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="invite-email" className="text-sm font-medium text-gray-700">
                  Email del HR admin
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="admin@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              {formError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={creatingInvitation}>
                {creatingInvitation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando invitación...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar invitación
                  </>
                )}
              </Button>
            </form>

            {lastLink && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Última invitación generada</p>
                <p className="text-sm text-muted-foreground">{lastLink.email}</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={lastLink.url} className="text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(lastLink.url);
                      toast.success('Enlace copiado');
                    }}
                    aria-label="Copiar último enlace"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invitaciones recientes</CardTitle>
            <CardDescription>Copiar enlace o revisar estado de las últimas invitaciones.</CardDescription>
          </CardHeader>
          <CardContent>
            {invitaciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay invitaciones registradas.</p>
            ) : (
              <ScrollArea className="h-[360px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitaciones.slice(0, 10).map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>{renderInvitationStatus(invitation)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatRelative(invitation.expiraEn)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInvitationUrl(invitation.token)}
                          >
                            {copiedToken === invitation.token ? (
                              <>
                                <Check className="mr-1 h-4 w-4 text-emerald-500" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="mr-1 h-4 w-4" />
                                Copiar
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Card id="waitlist">
        <CardHeader>
          <CardTitle>Solicitudes de waitlist</CardTitle>
          <CardDescription>
            Cuando apruebes una empresa, se generará automáticamente una nueva invitación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {waitlist.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
          ) : (
            <ScrollArea className="h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Recibido</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitlist.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{entry.email}</span>
                          {entry.nombre && (
                            <span className="text-xs text-muted-foreground">{entry.nombre}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.empresa || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelative(entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        {entry.invitado ? (
                          <Badge variant="secondary">Invitado</Badge>
                        ) : (
                          <Badge variant="outline">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={entry.invitado || convertingWaitlist}
                          onClick={() => handleConvertWaitlist(entry.email)}
                        >
                          {convertingWaitlist && convertingEmail === entry.email ? (
                            <>
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              Convirtiendo
                            </>
                          ) : entry.invitado ? (
                            <>
                              <Check className="mr-1 h-4 w-4 text-emerald-500" />
                              Listo
                            </>
                          ) : (
                            <>
                              <UserPlus2 className="mr-1 h-4 w-4" />
                              Invitar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sincronizar datos</CardTitle>
          <CardDescription>Si realizas cambios fuera de este panel, actualiza la vista.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => router.refresh()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <p className="text-sm text-muted-foreground">
            Se muestran las últimas 100 invitaciones y todas las solicitudes recientes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


