'use client';

import { useFormState } from 'react-dom';
import { register } from '@/actions/auth';
import Link from 'next/link';
import SubmitButton from '@/components/SubmitButton';

export default function RegisterPage() {
  const [state, formAction] = useFormState(register, null);

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
        <SubmitButton label="register" pendingLabel="registering..." />
      </form>
      <p className="auth-switch">
        already a didnotreader? <Link href="/login">login</Link>
      </p>
    </div>
  );
}
