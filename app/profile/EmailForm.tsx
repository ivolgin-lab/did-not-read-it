'use client';

import { useFormState } from 'react-dom';
import { updateEmail, resendVerificationEmail } from '@/actions/profile';
import SubmitButton from '@/components/SubmitButton';

type State = { error?: string; success?: string } | null;

const initial: State = null;

export default function EmailForm({ currentEmail, verified }: { currentEmail: string | null; verified: boolean }) {
  const [state, formAction] = useFormState<State, FormData>(async (_prev, data) => updateEmail(_prev, data), initial);
  const [resendState, resendAction] = useFormState<State, FormData>(async () => resendVerificationEmail(), initial);

  return (
    <>
      <form action={formAction} className="auth-form">
        <label>
          email address
          <input type="email" name="email" defaultValue={currentEmail || ''} maxLength={254} />
        </label>
        {state?.error && <div className="form-error">{state.error}</div>}
        {state?.success && <div className="form-success">{state.success}</div>}
        <SubmitButton label="save email" pendingLabel="saving..." />
      </form>
      {currentEmail && !verified && (
        <form action={resendAction} style={{ marginTop: '0.5rem' }}>
          {resendState?.error && <div className="form-error">{resendState.error}</div>}
          {resendState?.success && <div className="form-success">{resendState.success}</div>}
          <button type="submit" className="link-button">resend verification email</button>
        </form>
      )}
    </>
  );
}
