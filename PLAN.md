# did-not-read-it — Implementation Plan

A Reddit clone built with Next.js (App Router) and PostgreSQL, using server-side rendering and server actions. Styled after old.reddit.com.

---

## Naming Convention

| Reddit term | did-not-read-it term |
|---|---|
| subreddit | didnotreadit |
| r/something | d/something |
| /r/all | /d/all |
| redditor | didnotreader |

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Use Drizzle ORM
- **Auth:** Custom username/password auth using bcrypt + iron-session (cookie-based sessions)
- **Styling:** Plain CSS inspired by old.reddit.com (no Tailwind — old Reddit didn't use utility CSS; we want that classic look)
- **Search:** PostgreSQL full-text search (tsvector/tsquery)
- **Forms/Mutations:** Next.js Server Actions (no API routes)

---

## Database Schema

### Tables

**user**
- `id` — random primary key
- `username` — varchar(20), unique, not null
- `password_hash` — text, not null
- `created_at` — timestamp, default now()

**didnotreadit**
- `id` — random primary key
- `name` — varchar(50), unique, not null (lowercase, alphanumeric + underscores)
- `title` — varchar(100), not null
- `description` — text
- `creator_id` — int, references users(id)
- `created_at` — timestamp, default now()

**post**
- `id` — random primary key
- `title` — varchar(300), not null
- `body` — text (for text posts)
- `url` — text (for link posts)
- `type` — enum('text', 'link'), not null
- `author_id` — int, references users(id)
- `didnotreadit_id` — int, references didnotreadits(id)
- `score` — int, default 0 (denormalized)
- `comment_count` — int, default 0 (denormalized)
- `created_at` — timestamp, default now()
- `search_vector` — tsvector (generated from title + body)

**comment**
- `id` — random primary key
- `body` — text, not null
- `author_id` — int, references users(id)
- `post_id` — int, references posts(id)
- `parent_id` — int, references comments(id) (null for top-level)
- `score` — int, default 0 (denormalized)
- `created_at` — timestamp, default now()

**post_vote**
- `id` — random primary key
- `user_id` — int, references users(id)
- `post_id` — int, references posts(id)
- `value` — smallint (1 or -1)
- unique constraint on (user_id, post_id)

**comment_vote**
- `id` — serial primary key
- `user_id` — int, references users(id)
- `comment_id` — int, references comments(id)
- `value` — smallint (1 or -1)
- unique constraint on (user_id, comment_id)

### Indexes
- `post.search_vector` — GIN index for full-text search
- `post.didnotreadit_id` + `created_at` — for listing posts in a didnotreadit
- `comment.post_id` — for loading comment trees
- `comment.parent_id` — for threading
- `post_vote(user_id, post_id)` — unique, for vote lookups
- `comment_vote(user_id, comment_id)` — unique, for vote lookups

---

## Project Structure

```
/
├── drizzle/
│   └── migrations/          # SQL migration files
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout with header/nav
│   │   ├── page.tsx         # Homepage → redirects to /d/all
│   │   ├── globals.css      # Old-reddit-style CSS
│   │   ├── d/
│   │   │   ├── all/
│   │   │   │   └── page.tsx           # /d/all — all posts feed
│   │   │   ├── new/
│   │   │   │   └── page.tsx           # /d/new — all posts sorted newest first, paginated
│   │   │   ├── [name]/
│   │   │   │   ├── page.tsx           # /d/:name — didnotreadit feed
│   │   │   │   └── submit/
│   │   │   │       └── page.tsx       # Submit post form
│   │   │   └── create/
│   │   │       └── page.tsx           # Create didnotreadit form
│   │   ├── post/
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Post detail + comment tree
│   │   ├── user/
│   │   │   └── [username]/
│   │   │       └── page.tsx           # User profile (posts list)
│   │   ├── login/
│   │   │   └── page.tsx               # Login form
│   │   ├── register/
│   │   │   └── page.tsx               # Register form
│   │   └── search/
│   │       └── page.tsx               # Search results
│   ├── actions/
│   │   ├── auth.ts          # login, register, logout
│   │   ├── posts.ts         # create post, vote on post
│   │   ├── comments.ts      # create comment, vote on comment
│   │   ├── didnotreadits.ts # create didnotreadit
│   │   └── search.ts        # search action
│   ├── db/
│   │   ├── index.ts         # Drizzle client
│   │   └── schema.ts        # Drizzle schema definitions
│   ├── lib/
│   │   ├── session.ts       # iron-session config & helpers
│   │   ├── auth.ts          # getUser() helper for SSR
│   │   └── time.ts          # relative time formatting
│   └── components/
│       ├── Header.tsx        # Top nav bar
│       ├── PostList.tsx      # List of posts (used on feeds)
│       ├── PostRow.tsx       # Single post row (vote + title + meta)
│       ├── CommentTree.tsx   # Recursive comment renderer
│       ├── CommentForm.tsx   # Reply form (client component)
│       ├── VoteButtons.tsx   # Upvote/downvote arrows (client component)
│       ├── Sidebar.tsx       # Didnotreadit sidebar info
│       └── Pagination.tsx    # Page-based pagination
├── docker-stack.yml         # Docker Compose dev stack
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## Development Environment

Docker Compose stack with two services:

**docker-stack.yml:**
- **db** — PostgreSQL 16 container, port 5432 internal, persistent volume for data
- **ui** — Node.js container running `next dev`, port 3000 mapped to host, source code bind-mounted from host for hot reload, runs as root (privileged) to avoid file-watching permission issues with inotify

The UI container:
- Bind-mounts the project root into the container
- Runs `npm install && npx drizzle-kit push && next dev` on start
- Uses `NODE_ENV=development`
- Depends on `db` being healthy
- Hot reload works via Next.js file watching on the mounted volume

**Startup:** `docker stack deploy -c docker-stack.yml didnotreadit`

---

## Implementation (Single Phase)

All work is done in one pass:

### 1. Project scaffolding ✅
- Initialize Next.js project with TypeScript
- Install dependencies: drizzle-orm, drizzle-kit, pg, bcrypt, iron-session
- Set up Drizzle config and database connection
- Create database schema and generate migration
- Create `docker-stack.yml` for Compose dev environment

### 2. Global CSS + Layout ✅
- Set up old-reddit-style CSS foundations
- Root layout with Header component (nav bar, search, login/register links)

### 3. Authentication ✅
- Register page — server action hashes password, creates user, sets session cookie
- Login page — server action verifies password, sets session cookie
- `getUser()` SSR helper that reads session cookie
- Header shows login/register or username/logout
- Logout server action

### 4. Didnotreadits + Posts + Comments + Voting ✅
- `/d/all` — default feed, all posts ranked by "hot" (score + recency), paginated
- `/d/new` — all posts sorted by created_at desc, paginated
- `/d/[name]` — didnotreadit feed with sidebar
- `/d/create` — create didnotreadit form (auth required)
- `/d/[name]/submit` — submit text or link post (auth required)
- `/post/[id]` — post detail with full comment tree
- Recursive CommentTree component for nested comments
- Comment form + reply UI (client component for toggle)
- VoteButtons client component for posts and comments
- Server actions for all mutations (create post, comment, vote)
- Denormalized score updates in transactions

### 5. Search + Profiles + Polish ✅
- tsvector + GIN index on posts, trigger to keep updated
- `/search?q=` page with full-text search
- Search form in header
- `/user/[username]` — user's posts, join date
- Pagination on all feeds (`?page=1`)
- Sort options: hot, new, top
- Error handling and form validation
- Empty states

---

## Key Design Decisions

### Server Actions over API Routes
All mutations (login, register, vote, post, comment, create didnotreadit) use Next.js server actions invoked from forms or `useActionState`. No `/api/*` routes.

### SSR-First
All pages are server components by default. Only interactive bits (vote buttons, reply toggle, comment form) are client components. Data fetching happens in server components using Drizzle queries directly.

### /d/all and /d/new as Virtual Aggregates
Neither `/d/all` nor `/d/new` are real didnotreadits in the database. They are special routes that query all posts across all didnotreadits.
- `/d/all` ranks by "hot": `log10(max(|score|, 1)) + (created_at_epoch / 45000)` — balances score and recency so popular recent posts rise to the top.
- `/d/new` sorts purely by `created_at` descending.

### Denormalized Scores
`posts.score` and `comments.score` are denormalized counters updated atomically in the vote server action (inside a transaction with the vote insert/update). This avoids COUNT queries on every page load.

### Comment Threading & Sorting
Comments use adjacency list (`parent_id`). The server fetches all comments for a post in one query, then the component builds the tree in memory. This is simple and works well for typical thread sizes.

Comments support two sort modes via `?sort=` query param:
- **best** (default) — Wilson score confidence interval: `(p̂ + z²/2n - z√(p̂(1-p̂)/n + z²/4n²)) / (1 + z²/n)` where p̂ = upvotes/total, z = 1.96 (95% confidence). This favors comments with high upvote ratios and penalizes low sample sizes.
- **new** — sorted by `created_at` descending.

Sibling comments at each nesting level are sorted independently using the chosen mode.

### Old Reddit Styling
- White/light gray background, blue links, small font
- Compact post rows with vote arrows on the left
- No card layout — dense, information-rich listing
- Fixed-width content area (~960px), centered
- Simple header bar with nav links

### Session Management
iron-session stores an encrypted session cookie. No database session table needed. Cookie contains `{ userId, username }`.

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "drizzle-orm": "latest",
    "pg": "latest",
    "@types/pg": "latest",
    "bcrypt": "latest",
    "iron-session": "latest"
  },
  "devDependencies": {
    "drizzle-kit": "latest",
    "typescript": "^5",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/bcrypt": "latest"
  }
}
```

---

## Environment Variables

Set inside `docker-stack.yml` (no `.env` file needed for dev):

```
DATABASE_URL=postgresql://didnotreadit:password@db:5432/didnotreadit
SESSION_SECRET=dev-secret-change-in-production-min-32-chars
```
