import { db } from '@/db';
import { didnotreadit } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import SubmitForm from './SubmitForm';

export const dynamic = 'force-dynamic';

export default async function SubmitPage({ params }: { params: { name: string } }) {
  const [dnri] = await db.select().from(didnotreadit).where(eq(didnotreadit.name, params.name)).limit(1);
  if (!dnri) notFound();

  return (
    <div className="form-page">
      <h1>submit to d/{dnri.name}</h1>
      <SubmitForm didnotreaditId={dnri.id} didnotreaditName={dnri.name} />
    </div>
  );
}
