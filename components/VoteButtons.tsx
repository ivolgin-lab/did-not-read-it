'use client';

import { useTransition } from 'react';
import { voteOnPost } from '@/actions/posts';
import { voteOnComment } from '@/actions/comments';
import { useRouter } from 'next/navigation';

interface VoteButtonsProps {
  id: string;
  type: 'post' | 'comment';
  score: number;
  userVote: number;
}

export default function VoteButtons({ id, type, score, userVote }: VoteButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleVote(value: number) {
    startTransition(async () => {
      if (type === 'post') {
        await voteOnPost(id, value);
      } else {
        await voteOnComment(id, value);
      }
      router.refresh();
    });
  }

  return (
    <div className={`vote-buttons ${isPending ? 'voting' : ''}`}>
      <button
        className={`vote-arrow vote-up ${userVote === 1 ? 'active' : ''}`}
        onClick={() => handleVote(1)}
        disabled={isPending}
        aria-label="upvote"
      >
        &#9650;
      </button>
      <span className="vote-score">{score}</span>
      <button
        className={`vote-arrow vote-down ${userVote === -1 ? 'active' : ''}`}
        onClick={() => handleVote(-1)}
        disabled={isPending}
        aria-label="downvote"
      >
        &#9660;
      </button>
    </div>
  );
}
