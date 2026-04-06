import { db } from '@/db';
import { post, user, didnotreadit, postVote } from '@/db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { getUser } from '@/lib/auth';
import PostList from '@/components/PostList';

export const dynamic = 'force-dynamic';

const POSTS_PER_PAGE = 25;

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const query = searchParams.q?.trim() || '';
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);

  if (!query) {
    return (
      <div className="feed-page">
        <h1 className="feed-title">search</h1>
        <div className="empty-state">Enter a search term to find posts.</div>
      </div>
    );
  }

  const tsQuery = query.split(/\s+/).filter(Boolean).join(' & ');
  const offset = (page - 1) * POSTS_PER_PAGE;

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
      .where(sql`${post.searchVector} @@ to_tsquery('english', ${tsQuery})`)
      .orderBy(sql`ts_rank(${post.searchVector}, to_tsquery('english', ${tsQuery})) desc`)
      .limit(POSTS_PER_PAGE)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(post)
      .where(sql`${post.searchVector} @@ to_tsquery('english', ${tsQuery})`),
  ]);

  const totalCount = Number(countResult[0].count);
  const totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE));

  const currentUser = await getUser();
  let userVotes: Record<string, number> = {};
  if (currentUser && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const votes = await db.select().from(postVote)
      .where(and(eq(postVote.userId, currentUser.userId), inArray(postVote.postId, postIds)));
    userVotes = Object.fromEntries(votes.map((v) => [v.postId, v.value]));
  }

  return (
    <div className="feed-page">
      <h1 className="feed-title">search results for &ldquo;{query}&rdquo;</h1>
      <PostList
        posts={posts}
        userVotes={userVotes}
        page={page}
        totalPages={totalPages}
        baseUrl={`/search?q=${encodeURIComponent(query)}`}
      />
    </div>
  );
}
