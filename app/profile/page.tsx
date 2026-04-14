import { redirect } from 'next/navigation';
import { db } from '@/db';
import { user } from '@/db/schema';
import { getUser } from '@/lib/auth';
import { isSmtpEnabled } from '@/lib/email';
import { eq } from 'drizzle-orm';
import EmailForm from './EmailForm';

export default async function ProfilePage() {
  const current = await getUser();
  if (!current) {
    redirect('/login');
  }

  const [me] = await db.select().from(user).where(eq(user.id, current.userId)).limit(1);
  if (!me) {
    redirect('/login');
  }

  return (
    <div className="auth-page">
      <h1>profile</h1>
      <section>
        <p><strong>username:</strong> {me.username}</p>
        <p><strong>member since:</strong> {me.createdAt.toISOString().slice(0, 10)}</p>
      </section>
      {isSmtpEnabled() && (
        <section>
          <h2>email</h2>
          {me.email ? (
            <p>
              current: {me.email}{' '}
              {me.emailVerified ? (
                <span style={{ color: 'green' }}>(verified)</span>
              ) : (
                <span style={{ color: 'orange' }}>(unverified)</span>
              )}
            </p>
          ) : (
            <p>no email on file</p>
          )}
          <EmailForm currentEmail={me.email} verified={!!me.emailVerified} />
        </section>
      )}
    </div>
  );
}
