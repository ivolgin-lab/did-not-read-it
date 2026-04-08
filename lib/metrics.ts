import { db } from '@/db';
import { user, post, comment } from '@/db/schema';
import { sql } from 'drizzle-orm';

const SDK_URL = process.env.REPLICATED_SDK_URL || 'http://didnotreadit-sdk:3000';

export async function reportMetrics() {
  try {
    const [users] = await db.select({ count: sql<number>`count(*)` }).from(user);
    const [posts] = await db.select({ count: sql<number>`count(*)` }).from(post);
    const [comments] = await db.select({ count: sql<number>`count(*)` }).from(comment);

    await fetch(`${SDK_URL}/api/v1/app/custom-metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          total_users: users.count,
          total_posts: posts.count,
          total_comments: comments.count,
        },
      }),
    });

    console.log(`[metrics] reported: users=${users.count} posts=${posts.count} comments=${comments.count}`);
  } catch (err) {
    console.error('[metrics] failed to report:', err);
  }
}
