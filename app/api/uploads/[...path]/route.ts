import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { shouldUseCloudStorage } from '@/lib/s3';
import { UsuarioRol } from '@/lib/constants/enums';
import path from 'path';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  if (shouldUseCloudStorage()) {
    return NextResponse.json({ error: 'Recurso no disponible' }, { status: 404 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { path: pathSegments = [] } = await context.params;
  const segments = Array.isArray(pathSegments) ? pathSegments : [pathSegments];
  const relativePath = segments.join('/');

  if (!relativePath || relativePath.includes('..')) {
    return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
    }

  // Determinar empresa asociada a la ruta
  const parts = relativePath.split('/');
  let empresaEnRuta = parts[0];
  if (empresaEnRuta === 'exports') {
    empresaEnRuta = parts[1];
  }

  if (
    session.user.rol !== UsuarioRol.hr_admin &&
    empresaEnRuta &&
    empresaEnRuta !== session.user.empresaId
  ) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const baseDir = path.join(process.cwd(), 'uploads');
  const filePath = path.join(baseDir, relativePath);

  try {
    const buffer = await fs.readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
        headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        },
      });
  } catch (error) {
    console.error('[API uploads] Error leyendo archivo:', error);
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  }
}
