'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { createComment } from '@/actions/comments';
import SubmitButton from './SubmitButton';

interface CommentFormProps {
  postId: string;
  parentId?: string;
}

export default function CommentForm({ postId, parentId }: CommentFormProps) {
  const [showForm, setShowForm] = useState(!parentId);
  const [state, formAction] = useFormState(createComment, null);

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
        <SubmitButton label={parentId ? 'reply' : 'comment'} pendingLabel="submitting..." />
        {parentId && (
          <button type="button" className="link-button" onClick={() => setShowForm(false)}>
            cancel
          </button>
        )}
      </div>
    </form>
  );
}
