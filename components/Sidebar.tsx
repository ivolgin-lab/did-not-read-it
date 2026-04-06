import Link from 'next/link';
import { timeAgo } from '@/lib/time';

interface SidebarProps {
  didnotreadit: {
    name: string;
    title: string;
    description: string | null;
    createdAt: Date;
    creatorUsername: string;
    subscriberCount?: number;
  };
}

export default function Sidebar({ didnotreadit }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>d/{didnotreadit.name}</h2>
      </div>
      <div className="sidebar-content">
        <h3>{didnotreadit.title}</h3>
        {didnotreadit.description && (
          <p className="sidebar-description">{didnotreadit.description}</p>
        )}
        <div className="sidebar-meta">
          <p>created {timeAgo(didnotreadit.createdAt)} by{' '}
            <Link href={`/user/${didnotreadit.creatorUsername}`}>
              {didnotreadit.creatorUsername}
            </Link>
          </p>
        </div>
        <Link href={`/d/${didnotreadit.name}/submit`} className="btn sidebar-submit-btn">
          Submit a post
        </Link>
      </div>
    </div>
  );
}
