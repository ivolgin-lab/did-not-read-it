import { db } from '@/db';
import { didnotreadit, user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { fetchPosts } from '@/lib/posts';
import PostList from '@/components/PostList';
import Sidebar from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function DidnotreaditPage({
  params,
  searchParams,
}: {
  params: { name: string };
  searchParams: { page?: string; sort?: string };
}) {
  const [dnri] = await db.select({
    id: didnotreadit.id,
    name: didnotreadit.name,
    title: didnotreadit.title,
    description: didnotreadit.description,
    createdAt: didnotreadit.createdAt,
    creatorUsername: user.username,
  })
    .from(didnotreadit)
    .innerJoin(user, eq(didnotreadit.creatorId, user.id))
    .where(eq(didnotreadit.name, params.name))
    .limit(1);

  if (!dnri) notFound();

  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const sort = (['hot', 'new', 'top'].includes(searchParams.sort || '') ? searchParams.sort : 'hot') as 'hot' | 'new' | 'top';
  const { posts, userVotes, totalPages } = await fetchPosts({ didnotreaditId: dnri.id, sort, page });

  return (
    <div className="feed-page with-sidebar">
      <div className="feed-main">
        <div className="sort-tabs">
          <a href={`/d/${dnri.name}?sort=hot`} className={sort === 'hot' ? 'active' : ''}>hot</a>
          <a href={`/d/${dnri.name}?sort=new`} className={sort === 'new' ? 'active' : ''}>new</a>
          <a href={`/d/${dnri.name}?sort=top`} className={sort === 'top' ? 'active' : ''}>top</a>
        </div>
        <PostList
          posts={posts}
          userVotes={userVotes}
          page={page}
          totalPages={totalPages}
          baseUrl={`/d/${dnri.name}?sort=${sort}`}
          showDidnotreadit={false}
        />
      </div>
      <Sidebar didnotreadit={dnri} />
    </div>
  );
}
