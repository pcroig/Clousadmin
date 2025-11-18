import { redirect } from 'next/navigation';

export default function MiPerfilPage({
  searchParams,
}: {
  searchParams?: { modal?: string };
}) {
  const modal = searchParams?.modal ? `?modal=${searchParams.modal}` : '';
  redirect(`/empleado/mi-espacio/datos${modal}`);
}

