'use client';

import { useFormState } from 'react-dom';
import { login } from '@/actions/auth';
import Link from 'next/link';
import SubmitButton from '@/components/SubmitButton';

export default function LoginPage() {
  const [state, formAction] = useFormState(login, null);

  return (
    <div className="auth-page">
      <h1>login</h1>
      <form action={formAction} className="auth-form">
        <label>
          username
          <input type="text" name="username" required autoFocus />
        </label>
        <label>
          password
          <input type="password" name="password" required />
        </label>
        {state?.error && <div className="form-error">{state.error}</div>}
        <SubmitButton label="login" pendingLabel="logging in..." />
      </form>
      <p className="auth-switch">
        new to did-not-read-it? <Link href="/register">register</Link>
      </p>
    </div>
  );
}
