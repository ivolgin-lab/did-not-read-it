import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId?: string;
  username?: string;
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, {
    password: process.env.SESSION_SECRET || 'dev-secret-change-in-production-min-32-chars!!',
    cookieName: 'didnotreadit-session',
    cookieOptions: {
      secure: process.env.COOKIE_SECURE === 'true',
    },
  });
}
