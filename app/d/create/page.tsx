'use client';

import { useActionState } from 'react';
import { createDidnotreadit } from '@/actions/didnotreadits';

export default function CreateDidnotreaditPage() {
  const [state, formAction, isPending] = useActionState(createDidnotreadit, null);

  return (
    <div className="form-page">
      <h1>create a didnotreadit</h1>
      <form action={formAction} className="create-form">
        <label>
          name
          <div className="input-prefix-wrap">
            <span className="input-prefix">d/</span>
            <input
              type="text"
              name="name"
              required
              minLength={3}
              maxLength={50}
              pattern="[a-z0-9_]+"
              placeholder="my_didnotreadit"
              autoFocus
            />
          </div>
        </label>
        <label>
          title
          <input type="text" name="title" required maxLength={100} placeholder="A descriptive title" />
        </label>
        <label>
          description (optional)
          <textarea name="description" rows={4} placeholder="What is this didnotreadit about?" />
        </label>
        {state?.error && <div className="form-error">{state.error}</div>}
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? 'creating...' : 'create didnotreadit'}
        </button>
      </form>
    </div>
  );
}
