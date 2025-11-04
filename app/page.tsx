import { redirect } from 'next/navigation';

export default function Home() {
  // Redirigir a login por defecto
  redirect('/login');
}
