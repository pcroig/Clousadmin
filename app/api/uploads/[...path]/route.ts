// ========================================
// API Route: Serve Local Uploaded Files
// ========================================
// Serves files from local uploads directory (development fallback)
// Only used when S3 is not configured

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-handler';
import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Simple MIME type detection based on file extension
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Verificar autenticación (solo usuarios autenticados pueden descargar)
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const { path: pathSegments } = await params;
    const filePath = pathSegments.join('/');

    // Security: Prevent directory traversal attacks
    const resolvedPath = path.resolve(UPLOAD_DIR, filePath);
    if (!resolvedPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json(
        { error: 'Ruta no válida' },
        { status: 403 }
      );
    }

    // Check if file exists
    try {
      const fileBuffer = await fs.readFile(resolvedPath);
      
      // Determine content type
      const contentType = getContentType(resolvedPath);
      
      // Return file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${path.basename(resolvedPath)}"`,
          'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        },
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json(
          { error: 'Archivo no encontrado' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[Uploads API] Error sirviendo archivo:', error);
    return NextResponse.json(
      { error: 'Error al servir archivo' },
      { status: 500 }
    );
  }
}

