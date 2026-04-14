'use server';

import { db } from '@/db';
import { comment, commentVote, post, user } from '@/db/schema';
import { getUser } from '@/lib/auth';
import { checkLicenseValid } from '@/lib/entitlements';
import { sendReplyNotification } from '@/lib/email';
import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createComment(_prevState: unknown, formData: FormData) {
  if (!(await checkLicenseValid())) {
    return { error: 'License expired. Commenting is disabled.' };
  }
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

  let newCommentId: string | null = null;
  await db.transaction(async (tx) => {
    const locked = await tx.execute(sql`SELECT id FROM post WHERE id = ${postId} FOR UPDATE`);
    if (locked.rows.length === 0) throw new Error('Post not found');

    const [newComment] = await tx.insert(comment).values({
      body,
      authorId: currentUser.userId,
      postId,
      parentId,
    }).returning();
    newCommentId = newComment.id;

    // Increment comment count on post
    await tx.update(post).set({
      commentCount: sql`${post.commentCount} + 1`,
    }).where(eq(post.id, postId));

    // Auto-upvote own comment
    await tx.execute(sql`SELECT id FROM comment WHERE id = ${newComment.id} FOR UPDATE`);
    await tx.insert(commentVote).values({
      userId: currentUser.userId,
      commentId: newComment.id,
      value: 1,
    });
    await tx.update(comment).set({ score: 1, upvotes: 1 }).where(eq(comment.id, newComment.id));
  });

  try {
    await notifyOnReply({
      postId,
      parentCommentId: parentId,
      replierId: currentUser.userId,
      replierUsername: currentUser.username,
      snippet: body.slice(0, 300),
    });
  } catch (err) {
    console.error('[notify] reply notification failed:', err);
  }

  revalidatePath(`/post/${postId}`);
  return { success: true };
}

async function notifyOnReply(opts: {
  postId: string;
  parentCommentId: string | null;
  replierId: string;
  replierUsername: string;
  snippet: string;
}) {
  const [parentPost] = await db.select().from(post).where(eq(post.id, opts.postId)).limit(1);
  if (!parentPost) return;

  let recipientId: string;
  let kind: 'post' | 'comment';

  if (opts.parentCommentId) {
    const [parentComment] = await db.select().from(comment).where(eq(comment.id, opts.parentCommentId)).limit(1);
    if (!parentComment) return;
    recipientId = parentComment.authorId;
    kind = 'comment';
  } else {
    recipientId = parentPost.authorId;
    kind = 'post';
  }

  if (recipientId === opts.replierId) return;

  const [recipient] = await db.select().from(user)
    .where(and(eq(user.id, recipientId), isNotNull(user.email), isNotNull(user.emailVerified)))
    .limit(1);
  if (!recipient || !recipient.email) return;

  await sendReplyNotification({
    to: recipient.email,
    recipientUsername: recipient.username,
    replierUsername: opts.replierUsername,
    kind,
    postId: opts.postId,
    postTitle: parentPost.title,
    snippet: opts.snippet,
  });
}

export async function voteOnComment(commentId: string, value: number) {
  if (!(await checkLicenseValid())) return { error: 'License expired.' };
  const currentUser = await getUser();
  if (!currentUser) return { error: 'Must be logged in to vote.' };

  const vote = value as 1 | -1;
  if (vote !== 1 && vote !== -1) return { error: 'Invalid vote.' };

  await db.transaction(async (tx) => {
    const locked = await tx.execute(sql`SELECT id FROM comment WHERE id = ${commentId} FOR UPDATE`);
    if (locked.rows.length === 0) return;

    const [existing] = await tx.select().from(commentVote)
      .where(and(eq(commentVote.userId, currentUser.userId), eq(commentVote.commentId, commentId)));

    if (existing) {
      if (existing.value === vote) {
        // Remove vote
        await tx.delete(commentVote).where(eq(commentVote.id, existing.id));
        const upDelta = existing.value === 1 ? -1 : 0;
        const downDelta = existing.value === -1 ? -1 : 0;
        await tx.update(comment).set({
          score: sql`${comment.score} - ${existing.value}`,
          upvotes: sql`${comment.upvotes} + ${upDelta}`,
          downvotes: sql`${comment.downvotes} + ${downDelta}`,
        }).where(eq(comment.id, commentId));
      } else {
        // Change vote
        await tx.update(commentVote).set({ value: vote }).where(eq(commentVote.id, existing.id));
        await tx.update(comment).set({
          score: sql`${comment.score} + ${vote - existing.value}`,
          upvotes: sql`${comment.upvotes} + ${vote === 1 ? 1 : -1}`,
          downvotes: sql`${comment.downvotes} + ${vote === -1 ? 1 : -1}`,
        }).where(eq(comment.id, commentId));
      }
    } else {
      // New vote
      await tx.insert(commentVote).values({
        userId: currentUser.userId,
        commentId,
        value: vote,
      });
      await tx.update(comment).set({
        score: sql`${comment.score} + ${vote}`,
        upvotes: sql`${comment.upvotes} + ${vote === 1 ? 1 : 0}`,
        downvotes: sql`${comment.downvotes} + ${vote === -1 ? 1 : 0}`,
      }).where(eq(comment.id, commentId));
    }
  });
}
