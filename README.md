# GymOS — Gym & Personal Training Management System

GymOS is a multi-branch gym operations platform with dedicated personal-training
(PT) revenue segregation, trainer commission splitting, session tracking, and
financial ledgers.

## Features

- **Multi-branch operations** — a single global branch selector scopes every data
  section (dashboards, trainees, trainers, payments, attendance, reports, audit).
- **Personal Training engine** — configurable packages, revenue-sharing rules
  (percentage / fixed / per-session / hybrid), settlements, and refund clawbacks.
- **Role-based access** — Super Admin, Branch Manager, PT Trainer, and Member.
  Managers and admins approve trainer/member sign-ups and link each login to its
  operational record.
- **Self-service portals**
  - *Trainer portal:* salary statement (PDF), advance statement, dues, PT
    sessions and attendance downloads.
  - *Member portal:* account statement (PDF), payment history, PT packages, and
    attendance downloads.
- **Period reviews everywhere** — monthly / quarterly / yearly (with month & year
  pickers) or a custom from/to date range on payments, attendance, expenses, PT
  sessions, reports, audit trail, and both portals.
- **Admin data backup** — download a full JSON snapshot of every collection and
  restore from it (Settings → Full Data Backup & Restore, admin only).
- **Biometric attendance** bridge simulation and thermal / PDF receipts.
- **Firebase Auth + Firestore** real-time sync with an offline-capable local
  store, plus an instant demo mode.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Firebase (Auth + Firestore) ·
Recharts · lucide-react.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Firebase web config
   (`VITE_FIREBASE_*`) from Firebase console → Project settings → Your apps.
3. Optionally set `GEMINI_API_KEY` in `.env.local` for Gemini API calls.
4. Start the dev server:
   `npm run dev`

## Build & deploy

- Production build: `npm run build` (output in `dist/`)
- Type-check: `npm run lint`
- Netlify: `netlify.toml` is included — connect the repo, add the `VITE_FIREBASE_*`
  environment variables (Site settings → Environment variables), and deploy.

## License

Proprietary. Copyright © 2026 Rahul Pahuja and Mobile1x. All rights reserved.
See [LICENSE](LICENSE) — copying, downloading, or distribution without prior
written approval from Rahul Pahuja or Mobile1x is prohibited.
