import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET() {
  // Route Handlers podem modificar cookies
  const cookieStore = await cookies();
  cookieStore.delete('token');

  // Redireciona para o login após limpar
  redirect('/login');
}