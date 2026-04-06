'use server';

import { db } from '@/db';
import { user } from '@/db/schema';
import { getSession } from '@/lib/session';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function register(_prevState: unknown, formData: FormData) {
  const username = (formData.get('username') as string)?.trim();
  const password = formData.get('password') as string;

  if (!username || username.length < 3 || username.length > 20) {
    return { error: 'Username must be between 3 and 20 characters.' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: 'Username can only contain letters, numbers, and underscores.' };
  }

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }

  const existing = await db.select().from(user).where(eq(user.username, username)).limit(1);
  if (existing.length > 0) {
    return { error: 'Username is already taken.' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [newUser] = await db.insert(user).values({ username, passwordHash }).returning();

  const session = await getSession();
  session.userId = newUser.id;
  session.username = newUser.username;
  await session.save();

  redirect('/d/all');
}

export async function login(_prevState: unknown, formData: FormData) {
  const username = (formData.get('username') as string)?.trim();
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Username and password are required.' };
  }

  const [found] = await db.select().from(user).where(eq(user.username, username)).limit(1);
  if (!found) {
    return { error: 'Invalid username or password.' };
  }

  const valid = await bcrypt.compare(password, found.passwordHash);
  if (!valid) {
    return { error: 'Invalid username or password.' };
  }

  const session = await getSession();
  session.userId = found.id;
  session.username = found.username;
  await session.save();

  redirect('/d/all');
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect('/d/all');
}
