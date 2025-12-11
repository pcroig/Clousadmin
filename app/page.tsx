import { redirect } from 'next/navigation';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default function Home() {
  // Redirigir a login por defecto
  redirect('/login');
}
