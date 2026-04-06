'use client';

import { useFormState } from 'react-dom';
import { createDidnotreadit } from '@/actions/didnotreadits';
import SubmitButton from '@/components/SubmitButton';

export default function CreateDidnotreaditPage() {
  const [state, formAction] = useFormState(createDidnotreadit, null);

  return (
    <div className="form-page">
      <h1>create a didnotreadit</h1>
      <form action={formAction} className="create-form">
        <label>
          name <span className="label-hint">(lowercase letters, numbers, underscores, hyphens)</span>
          <div className="input-prefix-wrap">
            <span className="input-prefix">d/</span>
            <input
              type="text"
              name="name"
              required
              minLength={3}
              maxLength={50}
              pattern="[a-z0-9_\-]+"
              title="Lowercase letters, numbers, underscores, and hyphens only"
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
        <SubmitButton label="create didnotreadit" pendingLabel="creating..." />
      </form>
    </div>
  );
}
