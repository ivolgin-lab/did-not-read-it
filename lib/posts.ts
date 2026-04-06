import { db } from '@/db';
import { post, postVote, user, didnotreadit } from '@/db/schema';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { getUser } from './auth';

const POSTS_PER_PAGE = 25;

export interface PostWithMeta {
  id: string;
  title: string;
  url: string | null;
  type: 'text' | 'link';
  score: number;
  commentCount: number;
  createdAt: Date;
  authorUsername: string;
  didnotreaditName: string;
}

interface FetchPostsOptions {
  didnotreaditId?: string;
  authorId?: string;
  sort?: 'hot' | 'new' | 'top';
  page?: number;
}

export async function fetchPosts(options: FetchPostsOptions = {}) {
  const { didnotreaditId, authorId, sort = 'hot', page = 1 } = options;
  const offset = (page - 1) * POSTS_PER_PAGE;

  const conditions = [];
  if (didnotreaditId) conditions.push(eq(post.didnotreaditId, didnotreaditId));
  if (authorId) conditions.push(eq(post.authorId, authorId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy;
  switch (sort) {
    case 'new':
      orderBy = desc(post.createdAt);
      break;
    case 'top':
      orderBy = desc(post.score);
      break;
    case 'hot':
    default:
      orderBy = desc(
        sql`log(greatest(abs(${post.score}), 1)) + extract(epoch from ${post.createdAt}) / 45000`
      );
      break;
  }

  const [posts, countResult] = await Promise.all([
    db.select({
      id: post.id,
      title: post.title,
      url: post.url,
      type: post.type,
      score: post.score,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
      authorUsername: user.username,
      didnotreaditName: didnotreadit.name,
    })
      .from(post)
      .innerJoin(user, eq(post.authorId, user.id))
      .innerJoin(didnotreadit, eq(post.didnotreaditId, didnotreadit.id))
      .where(where)
      .orderBy(orderBy)
      .limit(POSTS_PER_PAGE)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(post).where(where),
  ]);

  const totalCount = Number(countResult[0].count);
  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE));

  // Get user votes
  const currentUser = await getUser();
  let userVotes: Record<string, number> = {};
  if (currentUser && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const votes = await db.select().from(postVote)
      .where(and(eq(postVote.userId, currentUser.userId), inArray(postVote.postId, postIds)));
    userVotes = Object.fromEntries(votes.map((v) => [v.postId, v.value]));
  }

  return { posts, userVotes, page, totalPages };
}
