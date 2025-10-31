// ========================================
// API Route: Logout
// ========================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('clousadmin-session');
  
  return NextResponse.json({ success: true });
}

