import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CreateDidnotreaditForm from './CreateDidnotreaditForm';

export default async function CreateDidnotreaditPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  return <CreateDidnotreaditForm />;
}
