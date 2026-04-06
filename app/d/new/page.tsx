import { fetchPosts } from '@/lib/posts';
import PostList from '@/components/PostList';

export const dynamic = 'force-dynamic';

export default async function NewPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const { posts, userVotes, totalPages } = await fetchPosts({ sort: 'new', page });

  return (
    <div className="feed-page">
      <h1 className="feed-title">d/new</h1>
      <PostList
        posts={posts}
        userVotes={userVotes}
        page={page}
        totalPages={totalPages}
        baseUrl="/d/new"
      />
    </div>
  );
}
