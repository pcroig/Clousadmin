/**
 * Legacy Google OAuth callback (compatibility)
 * Redirects to the NextAuth callback handler preserving query params.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const originalUrl = new URL(req.url);
  const nextAuthCallback = new URL('/api/auth/callback/google', req.url);

  originalUrl.searchParams.forEach((value, key) => {
    nextAuthCallback.searchParams.set(key, value);
  });

  return NextResponse.redirect(nextAuthCallback);
}
