import { redirect } from 'next/navigation';

// Redirige la vista base de horario de HR a la pestaña principal (fichajes)
export default function HrHorarioIndexPage() {
  redirect('/hr/horario/fichajes');
}

