'use client';

import { useActionState, useState } from 'react';
import { createPost } from '@/actions/posts';

interface SubmitFormProps {
  didnotreaditId: string;
  didnotreaditName: string;
}

export default function SubmitForm({ didnotreaditId }: SubmitFormProps) {
  const [postType, setPostType] = useState<'text' | 'link'>('text');
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction} className="create-form">
      <input type="hidden" name="didnotreaditId" value={didnotreaditId} />
      <input type="hidden" name="type" value={postType} />

      <div className="tab-selector">
        <button
          type="button"
          className={`tab ${postType === 'text' ? 'active' : ''}`}
          onClick={() => setPostType('text')}
        >
          text
        </button>
        <button
          type="button"
          className={`tab ${postType === 'link' ? 'active' : ''}`}
          onClick={() => setPostType('link')}
        >
          link
        </button>
      </div>

      <label>
        title
        <input type="text" name="title" required maxLength={300} autoFocus />
      </label>

      {postType === 'text' ? (
        <label>
          text (optional)
          <textarea name="body" rows={8} />
        </label>
      ) : (
        <label>
          url
          <input type="url" name="url" required placeholder="https://" />
        </label>
      )}

      {state?.error && <div className="form-error">{state.error}</div>}
      <button type="submit" className="btn" disabled={isPending}>
        {isPending ? 'submitting...' : 'submit'}
      </button>
    </form>
  );
}
