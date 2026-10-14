# Sai Space CRM: Workflow Guide

Sources: README.md, PLAN.md, docs/DEPLOY-AWS.md and package.json. Read these for full detail.

## 1. Business workflow

```
Lead source ──▶ Lead (New) ──▶ Contacted ──▶ Qualified ──▶ Visit Scheduled ──▶ Visit Done
                                                                                    │
        Incentive paid ◀── Incentive (pending→approved) ◀── Booking approved ◀── Negotiation ──▶ Booked
                                                                                    │
                                                                       any stage ──▶ Lost (reason required)
```

| Step | What happens |
|---|---|
| Capture | Webhook `POST /lead-intake/{source}?key=SECRET` (website forms, Google Ads, Zapier), CSV import, or manual entry. |
| Duplicate check | Phone normalised to 10 digits and matched through an HMAC blind index. A duplicate becomes an activity on the existing lead and notifies the owner. |
| Work the lead | Owner follows up (call/WhatsApp links are logged), moves stages (Kanban drag logs an activity), notes, tasks. Overdue follow-ups show on the dashboard and notify at 9 AM. |
| Site visit | Scheduled with an executive, check-in with GPS, feedback recorded. |
| Booking | Unit is held (auto-released after N hours), then booked with payment milestones and KYC documents (private storage, 5-minute signed URLs). |
| Approval | Manager or Admin with `bookings.approve` approves the booking. |
| Incentive | The most specific rule applies (user, then project, then role) and creates a `pending` incentive for `closed_by`. Admin approves, then marks it paid. |
| Daily ops | Attendance with GPS check-in/out, pings every 3 minutes while the app is open, live team map, reports. |

## 2. Roles

Effective permission = role preset, then per-user overrides. Data scope is own, team or all.

| Role | Scope | Notes |
|---|---|---|
| Owner/Admin | all | All modules and flags. MFA (authenticator app) required. |
| Manager | team | Everything except settings. Assigns, imports, exports, approves bookings. |
| Sales Person | own | Leads, visits, bookings, clients, tasks, attendance. |
| Telecaller | own | Leads, visits, tasks, attendance. Phone numbers masked. |
| Digital Marketing | all (leads read) | Leads, reports, import. |
| Analyst | all (read-only) | Dashboard, reports, export. |

Enforced in three places: the UI, Edge Functions, and Postgres RLS (the real gate). Nobody can edit their own role.

## 3. Architecture and data flow

```
Browser (frontend/, React) ──▶ Edge Functions (login, admin-users, change-password,
   │                                upload-document, lead-intake)
   │                                      │
   └──── direct reads/realtime ───────────▼
         (limited by RLS + JWT)     Postgres (RLS, encrypted columns, audit_log)
                                    Vault (encryption key) · Storage (private) · Auth + MFA
```

- Phones, emails, KYC, amounts, notes and GPS are encrypted in Postgres (pgcrypto, OpenPGP AES-256). The key is in Supabase Vault.
- The browser has no grant on encrypted columns. Decrypting goes through `SECURITY DEFINER` functions that check permission and write to `audit_log`.
- Migrations in `backend/supabase/migrations/` build it in order: crypto, schema, RLS, storage/retention, auth hardening, admin RPCs, leads, inventory/visits/bookings, attendance/tasks/incentives, dashboard/reports, webhook rate limit, key rotation, MFA (WhatsApp, SMS, TOTP).

## 4. Run it locally

Needs Node.js and Docker Desktop (running). Run from the repo root.

```bash
npm run install:all
npm run db:start      # local Supabase + migrations; copy API_URL / ANON_KEY into frontend/.env.local
                      # and backend/.env.scripts.local (see frontend/.env.example)
npm run functions     # leave running
npm run db:seed       # test team + sample data; logins in backend/scripts/.dev-users.json
npm run dev           # http://localhost:5173
```

Owner sign-in needs an authenticator app code (scan the QR at first sign-in).

## 5. Test and check

| Command | Checks |
|---|---|
| `npm run test:db` | 230 database tests (encryption, role access, lead to booking to incentive, rotation, MFA). No setup needed. |
| `npm run test:e2e` | 42 API tests. Needs the local stack, functions and seed. |
| `npm run lint` · `typecheck` · `build` | Code checks. The linter blocks XSS-prone patterns. |

## 6. Deploy

Two parts, deployed separately.

**Backend (Supabase), from `backend/`:** `npx supabase db push`, `npx supabase config push`, `npx supabase functions deploy ...`, then `npm run create-owner` for the first Owner account.

**Frontend (AWS Amplify, details in docs/DEPLOY-AWS.md):**
1. Connect the GitHub repo, branch `main`, monorepo folder `frontend`. `amplify.yml` is picked up.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon/publishable key only, never `service_role`).
3. Add the single-page-app rewrite rule so direct links like `/leads` work.
4. Run `npx supabase secrets set ALLOWED_ORIGINS=<amplify URL>` so the CORS allowlist accepts it.
5. If the Supabase project changes, run `node frontend/scripts/set-csp.mjs <project-ref>`, then commit and push (regenerates `customHttp.yml`).

Vercel alternative: docs/DEPLOY.md.

## 7. Known limits

- Phone browsers pause GPS in the background, so tracking shows "last seen" times. Reliable tracking needs a native app (v2).
- Encrypted fields cannot be partially searched. Search by name, project, stage or exact phone.
- Portals like 99acres have no push API on most plans: use CSV export then import.
