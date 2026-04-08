'use server';

import { db } from '@/db';
import { didnotreadit } from '@/db/schema';
import { getUser } from '@/lib/auth';
import { checkLicenseValid } from '@/lib/entitlements';
import { redirect } from 'next/navigation';

export async function createDidnotreadit(_prevState: unknown, formData: FormData) {
  if (!(await checkLicenseValid())) {
    return { error: 'License expired. Creating didnotreadits is disabled.' };
  }
  const currentUser = await getUser();
  if (!currentUser) {
    return { error: 'You must be logged in to create a didnotreadit.' };
  }

  const name = (formData.get('name') as string)?.trim().toLowerCase();
  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;

  if (!name || name.length < 3 || name.length > 50) {
    return { error: 'Name must be between 3 and 50 characters.' };
  }

  if (!/^[a-z0-9_\-]+$/.test(name)) {
    return { error: 'Name can only contain lowercase letters, numbers, underscores, and hyphens.' };
  }

  if (name === 'all' || name === 'new' || name === 'create') {
    return { error: 'That name is reserved.' };
  }

  if (!title || title.length < 1 || title.length > 100) {
    return { error: 'Title must be between 1 and 100 characters.' };
  }

  try {
    await db.insert(didnotreadit).values({
      name,
      title,
      description,
      creatorId: currentUser.userId,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('unique')) {
      return { error: 'A didnotreadit with that name already exists.' };
    }
    throw e;
  }

  redirect(`/d/${name}`);
}
