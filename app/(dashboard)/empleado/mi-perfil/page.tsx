import { redirect } from 'next/navigation';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function MiPerfilPage(props: {
  searchParams: Promise<{ modal?: string }>;
}) {
  const searchParams = await props.searchParams;
  const modal = searchParams?.modal ? `?modal=${searchParams.modal}` : '';
  redirect(`/empleado/mi-espacio/datos${modal}`);
}

