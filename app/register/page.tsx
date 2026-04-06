'use client';

import { useActionState } from 'react';
import { register } from '@/actions/auth';
import Link from 'next/link';

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, null);

  return (
    <div className="auth-page">
      <h1>register</h1>
      <form action={formAction} className="auth-form">
        <label>
          username
          <input type="text" name="username" required autoFocus minLength={3} maxLength={20} />
        </label>
        <label>
          password
          <input type="password" name="password" required minLength={6} />
        </label>
        {state?.error && <div className="form-error">{state.error}</div>}
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? 'registering...' : 'register'}
        </button>
      </form>
      <p className="auth-switch">
        already a didnotreader? <Link href="/login">login</Link>
      </p>
    </div>
  );
}
