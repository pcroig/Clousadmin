import { redirect } from 'next/navigation';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

// Redirige la vista base de horario de HR a la pestaña principal (fichajes)
export default function HrHorarioIndexPage() {
  redirect('/hr/horario/fichajes');
}

