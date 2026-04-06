import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  smallint,
  index,
  uniqueIndex,
  pgEnum,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

function randomId() {
  return crypto.randomBytes(12).toString('hex');
}

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const postTypeEnum = pgEnum('post_type', ['text', 'link']);

export const user = pgTable('user', {
  id: varchar('id', { length: 24 }).primaryKey().$defaultFn(randomId),
  username: varchar('username', { length: 20 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const didnotreadit = pgTable('didnotreadit', {
  id: varchar('id', { length: 24 }).primaryKey().$defaultFn(randomId),
  name: varchar('name', { length: 50 }).notNull().unique(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  creatorId: varchar('creator_id', { length: 24 }).references(() => user.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const post = pgTable('post', {
  id: varchar('id', { length: 24 }).primaryKey().$defaultFn(randomId),
  title: varchar('title', { length: 300 }).notNull(),
  body: text('body'),
  url: text('url'),
  type: postTypeEnum('type').notNull(),
  authorId: varchar('author_id', { length: 24 }).references(() => user.id).notNull(),
  didnotreaditId: varchar('didnotreadit_id', { length: 24 }).references(() => didnotreadit.id).notNull(),
  score: integer('score').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  searchVector: tsvector('search_vector'),
}, (table) => ({
  searchIdx: index('post_search_idx').using('gin', table.searchVector),
  didnotreaditCreatedIdx: index('post_didnotreadit_created_idx').on(table.didnotreaditId, table.createdAt),
}));

export const comment = pgTable('comment', {
  id: varchar('id', { length: 24 }).primaryKey().$defaultFn(randomId),
  body: text('body').notNull(),
  authorId: varchar('author_id', { length: 24 }).references(() => user.id).notNull(),
  postId: varchar('post_id', { length: 24 }).references(() => post.id).notNull(),
  parentId: varchar('parent_id', { length: 24 }),
  score: integer('score').default(0).notNull(),
  upvotes: integer('upvotes').default(0).notNull(),
  downvotes: integer('downvotes').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  postIdx: index('comment_post_idx').on(table.postId),
  parentIdx: index('comment_parent_idx').on(table.parentId),
}));

export const postVote = pgTable('post_vote', {
  id: varchar('id', { length: 24 }).primaryKey().$defaultFn(randomId),
  userId: varchar('user_id', { length: 24 }).references(() => user.id).notNull(),
  postId: varchar('post_id', { length: 24 }).references(() => post.id).notNull(),
  value: smallint('value').notNull(),
}, (table) => ({
  userPostIdx: uniqueIndex('post_vote_user_post_idx').on(table.userId, table.postId),
}));

export const commentVote = pgTable('comment_vote', {
  id: varchar('id', { length: 24 }).primaryKey().$defaultFn(randomId),
  userId: varchar('user_id', { length: 24 }).references(() => user.id).notNull(),
  commentId: varchar('comment_id', { length: 24 }).references(() => comment.id).notNull(),
  value: smallint('value').notNull(),
}, (table) => ({
  userCommentIdx: uniqueIndex('comment_vote_user_comment_idx').on(table.userId, table.commentId),
}));
