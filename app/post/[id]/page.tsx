import { db } from '@/db';
import { post, user, didnotreadit, comment, commentVote, postVote } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { timeAgo } from '@/lib/time';
import { getUser } from '@/lib/auth';
import VoteButtons from '@/components/VoteButtons';
import CommentTree, { CommentData } from '@/components/CommentTree';
import CommentForm from '@/components/CommentForm';

export const dynamic = 'force-dynamic';

export default async function PostPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { sort?: string };
}) {
  const [postData] = await db.select({
    id: post.id,
    title: post.title,
    body: post.body,
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
    .where(eq(post.id, params.id))
    .limit(1);

  if (!postData) notFound();

  const sort = (searchParams.sort === 'new' ? 'new' : 'best') as 'best' | 'new';

  // Fetch comments with author usernames
  const comments = await db.select({
    id: comment.id,
    body: comment.body,
    score: comment.score,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    createdAt: comment.createdAt,
    authorUsername: user.username,
    parentId: comment.parentId,
  })
    .from(comment)
    .innerJoin(user, eq(comment.authorId, user.id))
    .where(eq(comment.postId, params.id));

  const currentUser = await getUser();
  let userCommentVotes: Record<string, number> = {};
  let userPostVote = 0;

  if (currentUser) {
    // Get user's post vote
    const [pv] = await db.select().from(postVote)
      .where(and(eq(postVote.userId, currentUser.userId), eq(postVote.postId, params.id)));
    if (pv) userPostVote = pv.value;

    // Get user's comment votes
    if (comments.length > 0) {
      const commentIds = comments.map((c) => c.id);
      const cvotes = await db.select().from(commentVote)
        .where(and(eq(commentVote.userId, currentUser.userId), inArray(commentVote.commentId, commentIds)));
      userCommentVotes = Object.fromEntries(cvotes.map((v) => [v.commentId, v.value]));
    }
  }

  return (
    <div className="post-detail-page">
      <div className="post-detail">
        <div className="post-detail-header">
          <VoteButtons id={postData.id} type="post" score={postData.score} userVote={userPostVote} />
          <div>
            <h1 className="post-detail-title">
              {postData.type === 'link' && postData.url ? (
                <a href={postData.url} rel="noopener noreferrer">{postData.title}</a>
              ) : (
                postData.title
              )}
            </h1>
            <div className="post-meta">
              submitted {timeAgo(postData.createdAt)} by{' '}
              <Link href={`/user/${postData.authorUsername}`}>{postData.authorUsername}</Link>
              {' '}to{' '}
              <Link href={`/d/${postData.didnotreaditName}`}>d/{postData.didnotreaditName}</Link>
            </div>
          </div>
        </div>
        {postData.body && (
          <div className="post-body">{postData.body}</div>
        )}
      </div>

      <div className="comments-section">
        <div className="comments-header">
          <span>{postData.commentCount} comment{postData.commentCount !== 1 ? 's' : ''}</span>
          <div className="sort-tabs sort-tabs-small">
            <a href={`/post/${postData.id}?sort=best`} className={sort === 'best' ? 'active' : ''}>best</a>
            <a href={`/post/${postData.id}?sort=new`} className={sort === 'new' ? 'active' : ''}>new</a>
          </div>
        </div>

        {currentUser && (
          <CommentForm postId={postData.id} />
        )}

        <CommentTree
          comments={comments as CommentData[]}
          postId={postData.id}
          userVotes={userCommentVotes}
          isLoggedIn={!!currentUser}
          sort={sort}
        />
      </div>
    </div>
  );
}
