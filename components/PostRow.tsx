import Link from 'next/link';
import { timeAgo } from '@/lib/time';
import VoteButtons from './VoteButtons';

interface PostRowProps {
  post: {
    id: string;
    title: string;
    url: string | null;
    type: 'text' | 'link';
    score: number;
    commentCount: number;
    createdAt: Date;
    authorUsername: string;
    didnotreaditName: string;
  };
  index: number;
  userVote?: number;
  showDidnotreadit?: boolean;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export default function PostRow({ post, index, userVote, showDidnotreadit = true }: PostRowProps) {
  return (
    <div className="post-row">
      <span className="post-rank">{index}.</span>
      <VoteButtons
        id={post.id}
        type="post"
        score={post.score}
        userVote={userVote || 0}
      />
      <div className="post-content">
        <div className="post-title-line">
          {post.type === 'link' && post.url ? (
            <>
              <a href={post.url} className="post-title" rel="noopener noreferrer">
                {post.title}
              </a>
              <span className="post-domain">({getDomain(post.url)})</span>
            </>
          ) : (
            <Link href={`/post/${post.id}`} className="post-title">
              {post.title}
            </Link>
          )}
        </div>
        <div className="post-meta">
          submitted {timeAgo(post.createdAt)} by{' '}
          <Link href={`/user/${post.authorUsername}`}>{post.authorUsername}</Link>
          {showDidnotreadit && (
            <>
              {' '}to{' '}
              <Link href={`/d/${post.didnotreaditName}`}>d/{post.didnotreaditName}</Link>
            </>
          )}
          {' '}&mdash;{' '}
          <Link href={`/post/${post.id}`}>{post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}</Link>
        </div>
      </div>
    </div>
  );
}
