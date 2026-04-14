import Link from 'next/link';

const MESSAGES: Record<string, { title: string; body: string }> = {
  ok: { title: 'email verified', body: 'Your email address has been confirmed.' },
  expired: { title: 'link expired', body: 'This verification link has expired. Request a new one from your profile.' },
  invalid: { title: 'invalid link', body: 'This verification link is not valid. It may have already been used.' },
  missing: { title: 'missing token', body: 'No verification token was provided.' },
};

export default async function VerifyEmailResultPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'invalid' } = await searchParams;
  const msg = MESSAGES[status] || MESSAGES.invalid;
  return (
    <div className="auth-page">
      <h1>{msg.title}</h1>
      <p>{msg.body}</p>
      <p><Link href="/d/all">back to didnotreadit</Link></p>
    </div>
  );
}
