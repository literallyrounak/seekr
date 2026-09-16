# 🎯 Seekr — Real-World Social Party Game

A mobile-first web app for a live social party game where 30–40 players join via QR code, answer personal questions, receive a random target, and physically find them by matching answers in the room.

## 🕹️ Core Game Loop

```
JOIN → ANSWER → FIND → SUBMIT → SCORE → LEADERBOARD
```

1. **Host Creates Event**: Sets up event name, timer, and displays the auto-generated QR code.
2. **Players Join**: Scan the QR code, enter a unique username, and wait in the lobby.
3. **Answer Phase**: All players answer 5 personal questions against a synchronized server timer.
4. **Target Assignment**: Server generates a random one-to-one derangement (no self-assignments).
5. **Finding Phase**: Players see their target's answers (not their name) and physically walk around the venue to find them.
6. **Guess Submission**: Players enter the username of the person they found.
7. **Scoring**: Server awards points (+100 to finder, +50 to person found).
8. **Real-time Leaderboard**: Live standings update across all connected devices.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database & Realtime**: Supabase (PostgreSQL + Realtime Subscriptions)
- **Styling**: Tailwind CSS
- **QR Code**: `qrcode.react`
- **Validation**: Zod

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (Free tier is sufficient)

### 1. Clone & Install

```bash
git clone <repository-url>
cd some1
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Run the SQL migration located at `supabase/migrations/001_initial_schema.sql`.
4. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep secret)

### 3. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 User Flows

### Host Flow

1. Go to `/create`
2. Enter event name, max players, and timer limits
3. View the **Host Dashboard** (`/host/[code]`) with the QR code
4. Wait for players to join in the lobby
5. Click **"Start Game"** to begin the answering phase
6. Monitor the real-time leaderboard and game progress

### Player Flow

1. Scan the QR code or go to `/join/[code]`
2. Enter a unique username
3. Wait in the lobby for the host to start
4. Answer the 5 questions before the timer runs out
5. See the target's clues and physically find them in the venue
6. Submit their username to claim points
7. View live standings on the leaderboard

---

## 🔒 Security & Fair Play

- **Server-Authoritative Timing**: Timestamps and deadlines are validated strictly server-side.
- **Hidden Identities**: Players only see their target's answers, never their username or profile.
- **Tamper-Proof Scoring**: All scores are computed and awarded by the server.
- **Deduplication**: Unique constraints prevent duplicate score awards or double guesses.
- **Row Level Security**: Supabase RLS policies protect database records.

---

## 🧪 Testing Edge Cases

- **Late Answer Submissions**: Automatically rejected with server timestamp comparison.
- **Duplicate Usernames**: Rejected at join time with user-friendly error.
- **Double Scoring**: Idempotent database constraints prevent awarding points twice.
- **Self-Targeting**: Guaranteed impossible by the derangement shuffle algorithm.

---

## 🚢 Deployment

Deploy easily to **Vercel**:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Make sure to set the environment variables in your Vercel project settings.
