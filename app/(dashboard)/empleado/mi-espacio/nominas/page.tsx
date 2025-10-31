import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MiEspacioNominasClient } from './nominas-client';

export default async function MiEspacioNominasPage() {
  const session = await getSession();

  if (!session || session.user.rol === 'hr_admin') {
    redirect('/login');
  }

  // Mock data - aquí se obtendría de la base de datos
  const nominas = [
    { id: 1, mes: 'Octubre', año: 2025, importe: 2450.50, fecha: '2025-10-31' },
    { id: 2, mes: 'Septiembre', año: 2025, importe: 2450.50, fecha: '2025-09-30' },
    { id: 3, mes: 'Agosto', año: 2025, importe: 2450.50, fecha: '2025-08-31' },
    { id: 4, mes: 'Julio', año: 2025, importe: 2450.50, fecha: '2025-07-31' },
  ];

  return <MiEspacioNominasClient nominas={nominas} />;
}
