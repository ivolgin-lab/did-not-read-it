import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/verify-email/result?status=missing', req.url));
  }

  const [found] = await db.select().from(user).where(eq(user.emailVerificationToken, token)).limit(1);
  if (!found) {
    return NextResponse.redirect(new URL('/verify-email/result?status=invalid', req.url));
  }

  if (found.emailVerificationExpiresAt && found.emailVerificationExpiresAt < new Date()) {
    return NextResponse.redirect(new URL('/verify-email/result?status=expired', req.url));
  }

  await db.update(user).set({
    emailVerified: new Date(),
    emailVerificationToken: null,
    emailVerificationExpiresAt: null,
  }).where(eq(user.id, found.id));

  return NextResponse.redirect(new URL('/verify-email/result?status=ok', req.url));
}
