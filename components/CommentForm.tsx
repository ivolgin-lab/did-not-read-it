'use client';

import { useActionState, useState } from 'react';
import { createComment } from '@/actions/comments';

interface CommentFormProps {
  postId: string;
  parentId?: string;
}

export default function CommentForm({ postId, parentId }: CommentFormProps) {
  const [showForm, setShowForm] = useState(!parentId);
  const [state, formAction, isPending] = useActionState(createComment, null);

  if (parentId && !showForm) {
    return (
      <button className="link-button reply-button" onClick={() => setShowForm(true)}>
        reply
      </button>
    );
  }

  return (
    <form action={formAction} className="comment-form">
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea
        name="body"
        placeholder="Write a comment..."
        rows={parentId ? 3 : 5}
        required
      />
      {state?.error && <div className="form-error">{state.error}</div>}
      <div className="comment-form-actions">
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? 'submitting...' : parentId ? 'reply' : 'comment'}
        </button>
        {parentId && (
          <button type="button" className="link-button" onClick={() => setShowForm(false)}>
            cancel
          </button>
        )}
      </div>
    </form>
  );
}
