import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { fetchPosts } from '@/lib/posts';
import PostList from '@/components/PostList';
import { formatDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function UserPage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { page?: string };
}) {
  const [userData] = await db.select().from(user).where(eq(user.username, params.username)).limit(1);
  if (!userData) notFound();

  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const { posts, userVotes, totalPages } = await fetchPosts({ authorId: userData.id, sort: 'new', page });

  return (
    <div className="feed-page">
      <div className="user-profile-header">
        <h1>{userData.username}</h1>
        <p className="user-meta">didnotreader since {formatDate(userData.createdAt)}</p>
      </div>
      <h2 className="section-title">posts</h2>
      <PostList
        posts={posts}
        userVotes={userVotes}
        page={page}
        totalPages={totalPages}
        baseUrl={`/user/${userData.username}`}
      />
    </div>
  );
}
