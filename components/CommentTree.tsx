import { timeAgo } from '@/lib/time';
import Link from 'next/link';
import VoteButtons from './VoteButtons';
import CommentForm from './CommentForm';

export interface CommentData {
  id: string;
  body: string;
  score: number;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  authorUsername: string;
  parentId: string | null;
}

interface CommentTreeProps {
  comments: CommentData[];
  postId: string;
  userVotes: Record<string, number>;
  isLoggedIn: boolean;
  sort: 'best' | 'new';
}

function wilsonScore(upvotes: number, downvotes: number): number {
  const n = upvotes + downvotes;
  if (n === 0) return 0;
  const z = 1.96;
  const p = upvotes / n;
  const left = p + (z * z) / (2 * n);
  const right = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  const under = 1 + (z * z) / n;
  return (left - right) / under;
}

function sortComments(comments: CommentData[], sort: 'best' | 'new'): CommentData[] {
  return [...comments].sort((a, b) => {
    if (sort === 'new') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return wilsonScore(b.upvotes, b.downvotes) - wilsonScore(a.upvotes, a.downvotes);
  });
}

function buildTree(comments: CommentData[], sort: 'best' | 'new') {
  const byParent = new Map<string | null, CommentData[]>();
  for (const c of comments) {
    const key = c.parentId || 'root';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }
  // Sort each group
  for (const [key, group] of byParent) {
    byParent.set(key, sortComments(group, sort));
  }
  return byParent;
}

function CommentNode({
  comment,
  tree,
  postId,
  userVotes,
  isLoggedIn,
  depth,
}: {
  comment: CommentData;
  tree: Map<string | null, CommentData[]>;
  postId: string;
  userVotes: Record<string, number>;
  isLoggedIn: boolean;
  depth: number;
}) {
  const children = tree.get(comment.id) || [];

  return (
    <div className="comment" style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <div className="comment-header">
        <VoteButtons
          id={comment.id}
          type="comment"
          score={comment.score}
          userVote={userVotes[comment.id] || 0}
        />
        <span className="comment-meta">
          <Link href={`/user/${comment.authorUsername}`} className="comment-author">
            {comment.authorUsername}
          </Link>
          {' '}{comment.score} point{comment.score !== 1 ? 's' : ''}{' '}
          {timeAgo(comment.createdAt)}
        </span>
      </div>
      <div className="comment-body">{comment.body}</div>
      {isLoggedIn && (
        <CommentForm postId={postId} parentId={comment.id} />
      )}
      {children.map((child) => (
        <CommentNode
          key={child.id}
          comment={child}
          tree={tree}
          postId={postId}
          userVotes={userVotes}
          isLoggedIn={isLoggedIn}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function CommentTree({ comments, postId, userVotes, isLoggedIn, sort }: CommentTreeProps) {
  const tree = buildTree(comments, sort);
  const roots = tree.get('root') || [];

  if (comments.length === 0) {
    return <div className="empty-state">No comments yet. Be the first to share your thoughts!</div>;
  }

  return (
    <div className="comment-tree">
      {roots.map((c) => (
        <CommentNode
          key={c.id}
          comment={c}
          tree={tree}
          postId={postId}
          userVotes={userVotes}
          isLoggedIn={isLoggedIn}
          depth={0}
        />
      ))}
    </div>
  );
}
