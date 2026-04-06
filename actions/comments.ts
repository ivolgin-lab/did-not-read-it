'use server';

import { db } from '@/db';
import { comment, commentVote, post } from '@/db/schema';
import { getUser } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createComment(_prevState: unknown, formData: FormData) {
  const currentUser = await getUser();
  if (!currentUser) {
    return { error: 'You must be logged in to comment.' };
  }

  const body = (formData.get('body') as string)?.trim();
  const postId = formData.get('postId') as string;
  const parentId = (formData.get('parentId') as string) || null;

  if (!body || body.length < 1) {
    return { error: 'Comment cannot be empty.' };
  }

  if (body.length > 10000) {
    return { error: 'Comment is too long (max 10,000 characters).' };
  }

  const [newComment] = await db.insert(comment).values({
    body,
    authorId: currentUser.userId,
    postId,
    parentId,
  }).returning();

  // Increment comment count on post
  await db.update(post).set({
    commentCount: sql`${post.commentCount} + 1`,
  }).where(eq(post.id, postId));

  // Auto-upvote own comment
  await db.insert(commentVote).values({
    userId: currentUser.userId,
    commentId: newComment.id,
    value: 1,
  });
  await db.update(comment).set({ score: 1, upvotes: 1 }).where(eq(comment.id, newComment.id));

  revalidatePath(`/post/${postId}`);
  return { success: true };
}

export async function voteOnComment(commentId: string, value: number) {
  const currentUser = await getUser();
  if (!currentUser) return { error: 'Must be logged in to vote.' };

  const vote = value as 1 | -1;
  if (vote !== 1 && vote !== -1) return { error: 'Invalid vote.' };

  const [existing] = await db.select().from(commentVote)
    .where(and(eq(commentVote.userId, currentUser.userId), eq(commentVote.commentId, commentId)));

  if (existing) {
    if (existing.value === vote) {
      // Remove vote
      await db.delete(commentVote).where(eq(commentVote.id, existing.id));
      const upDelta = existing.value === 1 ? -1 : 0;
      const downDelta = existing.value === -1 ? -1 : 0;
      await db.update(comment).set({
        score: sql`${comment.score} - ${existing.value}`,
        upvotes: sql`${comment.upvotes} + ${upDelta}`,
        downvotes: sql`${comment.downvotes} + ${downDelta}`,
      }).where(eq(comment.id, commentId));
    } else {
      // Change vote
      await db.update(commentVote).set({ value: vote }).where(eq(commentVote.id, existing.id));
      await db.update(comment).set({
        score: sql`${comment.score} + ${vote - existing.value}`,
        upvotes: sql`${comment.upvotes} + ${vote === 1 ? 1 : -1}`,
        downvotes: sql`${comment.downvotes} + ${vote === -1 ? 1 : -1}`,
      }).where(eq(comment.id, commentId));
    }
  } else {
    // New vote
    await db.insert(commentVote).values({
      userId: currentUser.userId,
      commentId,
      value: vote,
    });
    await db.update(comment).set({
      score: sql`${comment.score} + ${vote}`,
      upvotes: sql`${comment.upvotes} + ${vote === 1 ? 1 : 0}`,
      downvotes: sql`${comment.downvotes} + ${vote === -1 ? 1 : 0}`,
    }).where(eq(comment.id, commentId));
  }
}
