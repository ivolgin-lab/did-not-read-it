'use client';

import { useActionState } from 'react';
import { login } from '@/actions/auth';
import Link from 'next/link';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

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
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? 'logging in...' : 'login'}
        </button>
      </form>
      <p className="auth-switch">
        new to did-not-read-it? <Link href="/register">register</Link>
      </p>
    </div>
  );
}
