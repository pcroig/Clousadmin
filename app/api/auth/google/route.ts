/**
 * Google OAuth entrypoint
 * Redirects to NextAuth sign-in handler to centralize OAuth logic
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        {
          error:
            'Google OAuth not configured. Please set up GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
        },
        { status: 500 }
      );
    }

    const nextAuthUrl = new URL('/api/auth/signin/google', req.url);

    const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
    if (callbackUrl) {
      nextAuthUrl.searchParams.set('callbackUrl', callbackUrl);
    }

    return NextResponse.redirect(nextAuthUrl);
  } catch (error) {
    console.error('[Google OAuth] Error redirecting to NextAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth' },
      { status: 500 }
    );
  }
}
