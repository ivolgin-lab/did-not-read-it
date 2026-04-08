'use server';

import { db } from '@/db';
import { post, postVote } from '@/db/schema';
import { getUser } from '@/lib/auth';
import { checkLicenseValid } from '@/lib/entitlements';
import { eq, and, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function createPost(_prevState: unknown, formData: FormData) {
  if (!(await checkLicenseValid())) {
    return { error: 'License expired. Posting is disabled.' };
  }
  const currentUser = await getUser();
  if (!currentUser) {
    return { error: 'You must be logged in to submit a post.' };
  }

  const title = (formData.get('title') as string)?.trim();
  const type = formData.get('type') as 'text' | 'link';
  const body = (formData.get('body') as string)?.trim() || null;
  const url = (formData.get('url') as string)?.trim() || null;
  const didnotreaditId = formData.get('didnotreaditId') as string;

  if (!title || title.length < 1 || title.length > 300) {
    return { error: 'Title must be between 1 and 300 characters.' };
  }

  if (type === 'link' && !url) {
    return { error: 'URL is required for link posts.' };
  }

  if (type === 'link' && url) {
    try {
      new URL(url);
    } catch {
      return { error: 'Please enter a valid URL.' };
    }
  }

  const [newPost] = await db.insert(post).values({
    title,
    type,
    body: type === 'text' ? body : null,
    url: type === 'link' ? url : null,
    authorId: currentUser.userId,
    didnotreaditId,
  }).returning();

  // Auto-upvote own post
  await db.transaction(async (tx) => {
    const locked = await tx.execute(sql`SELECT id FROM post WHERE id = ${newPost.id} FOR UPDATE`);
    if (locked.rows.length === 0) throw new Error('Post not found');
    await tx.insert(postVote).values({
      userId: currentUser.userId,
      postId: newPost.id,
      value: 1,
    });
    await tx.update(post).set({ score: 1 }).where(eq(post.id, newPost.id));
  });

  redirect(`/post/${newPost.id}`);
}

export async function voteOnPost(postId: string, value: number) {
  if (!(await checkLicenseValid())) return { error: 'License expired.' };
  const currentUser = await getUser();
  if (!currentUser) return { error: 'Must be logged in to vote.' };

  const vote = value as 1 | -1;
  if (vote !== 1 && vote !== -1) return { error: 'Invalid vote.' };

  await db.transaction(async (tx) => {
    const locked = await tx.execute(sql`SELECT id FROM post WHERE id = ${postId} FOR UPDATE`);
    if (locked.rows.length === 0) return;

    const [existing] = await tx.select().from(postVote)
      .where(and(eq(postVote.userId, currentUser.userId), eq(postVote.postId, postId)));

    if (existing) {
      if (existing.value === vote) {
        // Remove vote
        await tx.delete(postVote).where(eq(postVote.id, existing.id));
        await tx.update(post).set({
          score: sql`${post.score} - ${existing.value}`,
        }).where(eq(post.id, postId));
      } else {
        // Change vote
        await tx.update(postVote).set({ value: vote }).where(eq(postVote.id, existing.id));
        await tx.update(post).set({
          score: sql`${post.score} + ${vote - existing.value}`,
        }).where(eq(post.id, postId));
      }
    } else {
      // New vote
      await tx.insert(postVote).values({
        userId: currentUser.userId,
        postId,
        value: vote,
      });
      await tx.update(post).set({
        score: sql`${post.score} + ${vote}`,
      }).where(eq(post.id, postId));
    }
  });
}
