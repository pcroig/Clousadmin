import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Datos inválidos';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!usuario || !usuario.password) {
      return NextResponse.json(
        { error: 'El usuario no tiene contraseña configurada' },
        { status: 400 }
      );
    }

    const isValid = await verifyPassword(parsed.data.password, usuario.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[VerifyPasswordAPI] Error verificando contraseña:', error);
    return NextResponse.json(
      { error: 'Error al verificar la contraseña' },
      { status: 500 }
    );
  }
}









