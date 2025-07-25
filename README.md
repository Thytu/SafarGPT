# SafarGPT

Full-stack conversational AI platform inspired by ChatGPT and branded for *Safar*.

* Chat with an OpenAI-powered assistant through a web UI.
* Public visitors can experiment freely — no login required.
* Signed-in users (Supabase Auth) get persistent conversation history across devices.
* An admin back-office lets admins review and search all stored conversations.

---

## ✨ Tech Stack

| Layer | Technologies |
|-------|--------------|
| Front-end | React 18 · TypeScript · Vite · Tailwind CSS |
| Back-end | NestJS (Node 18) |
| Auth & Storage | Supabase (PostgreSQL + Row Level Security) |
| AI | OpenAI Node SDK (no 3rd-party wrappers) |

---

## 📁 Repository Structure

```
SafarGPT/
│  README.md          ← you are here
├─ frontend/          ← React + Vite SPA
└─ backend/           ← NestJS REST API
```

* frontend – Houses all UI code (`src/`), Tailwind config, and Vite dev server configuration.
* backend  – Exposes `/api/chat`, auth guards, and an `/admin` module secured by role-based guards.

---

## 🎯 Features

1. Conversational UI – Stream-like interface, keyboard shortcuts, markdown support.
2. Anonymous & Authenticated Modes
   * Guests: temporary in-memory chat.
   * Logged-in users: messages saved to Supabase and auto-synced on reconnect.
3. Model Switcher – Toggle between `gpt-4o` and the open-source `o3` model (demo purpose).
4. Admin Dashboard
   * List & search all conversations.
   * View message threads.
   * Requires `admin` role (Supabase RLS + backend guard).
5. Type-Safe End-to-End – Shared DTOs and strict TypeScript across front & back.

---

## 🗄️ Database Schema

SafarGPT stores all persistent data in three Postgres tables managed by Supabase. All tables have **Row-Level Security** policies so that a user can only read / write their own rows (admins can be given global read access).

### `chats`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key, `uuid_generate_v4()` |
| `user_id` | `uuid` | FK → `auth.users(id)`, **cascade on delete** |
| `title` | `text` | First ~80 characters of the very first user message |
| `created_at` | `timestamptz` | Defaults to `now()` |

Each row represents one conversation thread (regardless of which LLMs are used inside). The `title` is purely convenience for the UI sidebar.

### `messages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint` | Identity primary key |
| `chat_id` | `uuid` | FK → `chats(id)`, **cascade on delete** |
| `role` | `text` | One of `'user' | 'assistant' | 'system'` |
| `content` | `text` | The raw message text |
| `model` | `text` | Which LLM produced / received the message (`gpt-4o`, `o3`, …) |
| `created_at` | `timestamptz` | Defaults to `now()` |

### `profile`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key, matches `auth.users(id)` |
| `email` | `text` | Unique user email |
| `role` | `text` | `'user'` (default) or `'admin'` |

Helpful indexes

```sql
create index if not exists chats_user_id_created_idx   on public.chats(user_id, created_at desc);
create index if not exists messages_chat_id_created_idx on public.messages(chat_id, created_at);
```

> **Tip** When working in the Supabase Dashboard you can create these columns and indexes via the GUI; no migrations required.

---

## 🛠️ Local Development

### Prerequisites

* Node.js 18+
* npm 9+
* An OpenAI API key
* A Supabase project (set up `anon` & `service_role` keys)

### Environment Variables

Create the following `.env` files:

backend/.env
```
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=change-me
```

frontend/.env
```
VITE_BACKEND_URL=http://localhost:3000/api
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 1. Start the API server
```bash
cd backend
npm install
npm run start:dev         # http://localhost:3000
```

### 2. Start the Vite dev server
```bash
cd ../frontend
npm install
npm run dev               # http://localhost:5173
```
The SPA proxies API calls to `/api/*` → `localhost:3000` during development.

---

## 🚀 Deployment

Any platform that supports Node 18 works (Vercel, Render, Fly, Railway, DigitalOcean, etc.).

1. Backend – Deploy the NestJS service, ensure environment variables are set, and expose the port.
2. Frontend – `npm run build` in `/frontend` then serve the static assets (Vercel, Netlify) or use the built-in preview server.
3. Supabase – Keep the database URL & keys private; configure RLS policies as in `supabase/migrations/`.
