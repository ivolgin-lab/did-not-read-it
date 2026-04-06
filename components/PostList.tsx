import PostRow from './PostRow';
import Pagination from './Pagination';

interface PostData {
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

interface PostListProps {
  posts: PostData[];
  userVotes: Record<string, number>;
  page: number;
  totalPages: number;
  baseUrl: string;
  showDidnotreadit?: boolean;
}

export default function PostList({ posts, userVotes, page, totalPages, baseUrl, showDidnotreadit }: PostListProps) {
  if (posts.length === 0) {
    return <div className="empty-state">No posts yet. Be the first to submit one!</div>;
  }

  const startIndex = (page - 1) * 25 + 1;

  return (
    <div>
      <div className="post-list">
        {posts.map((p, i) => (
          <PostRow
            key={p.id}
            post={p}
            index={startIndex + i}
            userVote={userVotes[p.id]}
            showDidnotreadit={showDidnotreadit}
          />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} baseUrl={baseUrl} />
    </div>
  );
}
