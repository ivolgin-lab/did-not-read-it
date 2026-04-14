'use server';

import { db } from '@/db';
import { user } from '@/db/schema';
import { getUser } from '@/lib/auth';
import {
  EMAIL_RE,
  VERIFICATION_TTL_MS,
  generateVerificationToken,
  isSmtpEnabled,
  sendVerificationEmail,
} from '@/lib/email';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateEmail(_prevState: unknown, formData: FormData) {
  const currentUser = await getUser();
  if (!currentUser) {
    return { error: 'You must be logged in.' };
  }
  if (!isSmtpEnabled()) {
    return { error: 'Email is not configured on this server.' };
  }

  const raw = (formData.get('email') as string)?.trim() || '';
  const email = raw ? raw.toLowerCase() : null;

  if (email && !EMAIL_RE.test(email)) {
    return { error: 'Please enter a valid email address.' };
  }

  const [existing] = await db.select().from(user).where(eq(user.id, currentUser.userId)).limit(1);
  if (!existing) {
    return { error: 'User not found.' };
  }

  if (email === existing.email) {
    return { success: 'No change.' };
  }

  if (!email) {
    await db.update(user).set({
      email: null,
      emailVerified: null,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    }).where(eq(user.id, currentUser.userId));
    revalidatePath('/profile');
    return { success: 'Email removed.' };
  }

  const token = generateVerificationToken();
  const expires = new Date(Date.now() + VERIFICATION_TTL_MS);
  await db.update(user).set({
    email,
    emailVerified: null,
    emailVerificationToken: token,
    emailVerificationExpiresAt: expires,
  }).where(eq(user.id, currentUser.userId));

  await sendVerificationEmail(email, token);
  revalidatePath('/profile');
  return { success: 'Verification email sent. Check your inbox.' };
}

export async function resendVerificationEmail() {
  const currentUser = await getUser();
  if (!currentUser) {
    return { error: 'You must be logged in.' };
  }
  if (!isSmtpEnabled()) {
    return { error: 'Email is not configured on this server.' };
  }
  const [found] = await db.select().from(user).where(eq(user.id, currentUser.userId)).limit(1);
  if (!found || !found.email) {
    return { error: 'No email on file.' };
  }
  if (found.emailVerified) {
    return { success: 'Email is already verified.' };
  }

  const token = generateVerificationToken();
  const expires = new Date(Date.now() + VERIFICATION_TTL_MS);
  await db.update(user).set({
    emailVerificationToken: token,
    emailVerificationExpiresAt: expires,
  }).where(eq(user.id, currentUser.userId));

  await sendVerificationEmail(found.email, token);
  revalidatePath('/profile');
  return { success: 'Verification email sent.' };
}
