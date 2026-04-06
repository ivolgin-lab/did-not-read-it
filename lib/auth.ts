import { getSession } from './session';

export async function getUser() {
  const session = await getSession();
  if (!session.userId || !session.username) {
    return null;
  }
  return { userId: session.userId, username: session.username };
}
