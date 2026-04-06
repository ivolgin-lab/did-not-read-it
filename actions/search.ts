'use server';

import { redirect } from 'next/navigation';

export async function searchAction(_prevState: unknown, formData: FormData) {
  const q = (formData.get('q') as string)?.trim();
  if (!q) return { error: 'Please enter a search term.' };
  redirect(`/search?q=${encodeURIComponent(q)}`);
}
