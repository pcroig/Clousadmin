import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'openapi', 'openapi.yaml');
    const fileContent = fs.readFileSync(filePath, 'utf8');

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'OpenAPI specification not found' },
      { status: 404 }
    );
  }
}
