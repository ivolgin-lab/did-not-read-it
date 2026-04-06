import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { logout } from '@/actions/auth';

export default async function Header() {
  const user = await getUser();

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <Link href="/d/all" className="header-logo">
            did-not-read-it
          </Link>
          <nav className="header-nav">
            <Link href="/d/all">hot</Link>
            <Link href="/d/new">new</Link>
            <Link href="/d/create">create</Link>
          </nav>
        </div>
        <div className="header-right">
          <form action="/search" method="get" className="search-form">
            <input type="text" name="q" placeholder="search" className="search-input" />
          </form>
          {user ? (
            <span className="user-menu">
              <Link href={`/user/${user.username}`}>{user.username}</Link>
              <form action={logout} style={{ display: 'inline' }}>
                <button type="submit" className="link-button">logout</button>
              </form>
            </span>
          ) : (
            <span className="auth-links">
              <Link href="/login">login</Link>
              {' / '}
              <Link href="/register">register</Link>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
