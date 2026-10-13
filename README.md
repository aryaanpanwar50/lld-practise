# LLD Practice Platform

A practice-first app for low-level design interviews. Learners choose a problem, build a visual class diagram and file structure, save drafts, submit for deterministic checks and post-submission AI feedback, compare attempts, and optionally publish a design for community comments. The workspace keeps the problem brief at the left and a draggable class diagram/file structure editor at the right. The product intentionally offers no drafting hints or reference solutions.

## Stack

- Next.js App Router, React 19, TypeScript, Tailwind CSS 4
- Direct Google OAuth (Node backend on port 4000) and Supabase PostgreSQL
- Prisma 7 with the PostgreSQL driver adapter
- Zod validation, Vitest
- Gemini through LangChain for server-side evaluation

The codebase retains the initial `frontend/` and `backend/` structure. The Next.js app serves the UI and LLD product APIs. The existing Node backend on port 4000 handles Google OAuth, session endpoints, and Prisma-backed identity lookup. Backend auth follows a route → controller → service → repository flow, with CORS and cookie concerns in middleware. `server.ts` only loads configuration, connects Prisma, and starts the HTTP server.

Backend organization:

```text
backend/
  routes/       HTTP route dispatch
  controllers/  HTTP request and response handling
  middleware/   CORS and cookies
  services/     OAuth/session business logic and attempt workflows
  repositories/ Prisma-backed persistence and repository contracts
  models/       application data types
  domain/       attempt lifecycle rules
  evaluation/   deterministic and AI evaluators
  prisma/       schema, migrations, and seed data
```

## Prerequisites

Node.js 20+, npm, a Supabase project with PostgreSQL, a Google OAuth web client, and a Gemini API key/model for real AI feedback.

## Environment

Copy `.env.example` to `.env` in the repository root and set:

- `DATABASE_URL`: Supabase PostgreSQL pooler connection string (the existing configuration).
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: credentials from a Google OAuth 2.0 **Web application** client. These are server-only.
- `GOOGLE_OAUTH_REDIRECT_URI`: exact callback URL registered in Google Cloud. For local development: `http://localhost:4000/api/auth/google/callback`.
- `BACKEND_BASE_URL`: backend origin, such as `http://localhost:4000`; production must use HTTPS.
- `APP_BASE_URL`: frontend origin, such as `http://localhost:3000`; production must use HTTPS.
- `NEXT_PUBLIC_BACKEND_URL`: public backend origin used by the browser for sign-in and auth status (local default `http://localhost:4000`).
- `AUTH_SESSION_SECRET`: random server-only secret of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
- `GEMINI_API_KEY`, `LLM_MODEL`: server-only Gemini configuration through LangChain. `LLM_MODEL` defaults to `gemini-3.8-flash`.

Do not commit `.env` or expose the Google client secret, session secret, LLM key, or database credentials to browser code. If Google credentials are missing, sign-in displays a configuration message. Missing LLM configuration allows the rest of the app to work, but evaluation fails safely with a retry option. The app never returns mock feedback as a real evaluation.

## Google OAuth setup

1. In Google Cloud Console → Google Auth Platform, configure the consent screen and add your account as a test user if the app is in testing mode.
2. Create an OAuth client with application type **Web application**.
3. In **Authorized JavaScript origins**, add `http://localhost:3000`. For a deployed app, add its HTTPS frontend origin too.
4. In **Authorized redirect URIs**, add this exact backend URL: `http://localhost:4000/api/auth/google/callback`. For production, add `https://<YOUR_BACKEND_DOMAIN>/api/auth/google/callback`. Google requires an exact match with `GOOGLE_OAUTH_REDIRECT_URI`.
5. Copy the client ID and client secret to the root `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Set `APP_BASE_URL`, `BACKEND_BASE_URL`, `NEXT_PUBLIC_BACKEND_URL`, and `GOOGLE_OAUTH_REDIRECT_URI` to the matching environment URLs, and set a random `AUTH_SESSION_SECRET`. Restart both servers after changing env values.

The browser starts sign-in by navigating to `GET http://localhost:4000/api/auth/google`. Google returns directly to the Node backend callback at `http://localhost:4000/api/auth/google/callback`; the backend exchanges the authorization code, validates Google’s signed identity token, persists the local user, and sets an HttpOnly session cookie before redirecting to the frontend. `GET /api/auth/me` and `POST /api/auth/logout` are also served by the backend. Supabase Auth is not used; Supabase provides PostgreSQL through Prisma.

## Database

From the repository root:

```powershell
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

The migration is additive and preserves the initial `TestRecord` table/model. Review the target database before applying migrations. The seed uses stable problem slugs with upserts and is repeatable.

## Development

Install dependencies in both existing workspaces:

```powershell
cd backend
npm install
cd ../frontend
npm install
```

Ensure `.env` is present at the repository root. Run `npm run dev` in `backend/` on port 4000 and `npm run dev` in `frontend/` on port 3000, using separate terminals. The frontend’s browser auth requests use `NEXT_PUBLIC_BACKEND_URL`.

## Checks

```powershell
cd backend
npm run typecheck
cd ../frontend
npm run typecheck
npm run lint
npm test
npm run build
```

The LLM is mocked in automated tests. Do not point tests at a production Supabase database. Integration tests should use a disposable PostgreSQL database configured only for the test run.

## Deployment

Deploy `frontend/` as a Next.js App Router application and set the root directory/build context so the sibling `backend/` directory is included (the Next config already traces the workspace root). Provide the environment variables in the deployment secret manager. Apply `prisma migrate deploy` and run the idempotent seed from the backend workspace as an explicit deployment step. Register the production backend Google OAuth redirect URI as above. Set `BACKEND_BASE_URL`, `NEXT_PUBLIC_BACKEND_URL`, `APP_BASE_URL`, and `GOOGLE_OAUTH_REDIRECT_URI` to the matching HTTPS service URLs. If frontend and backend use different subdomains under the same parent domain, set `AUTH_COOKIE_DOMAIN` (for example, `.example.com`) so the session cookie is available to both. Keep both services on HTTPS and configure the backend CORS origin as the exact `APP_BASE_URL`. Do not expose `LLM_API_KEY` or database credentials as public variables.

## Known limitations

- Evaluation is synchronous and holds the request while the provider runs (30-second timeout); evaluation status is persisted and the UI polls after reload.
- The AI provider is Gemini through LangChain; structured output and server-side validation are required.
- Supabase PostgreSQL, Google OAuth credentials, and an LLM key are needed for the complete hosted learner journey. The Google OAuth and LLM variables are placeholders in `.env.example`.
- The research note mentions in-draft hints, but the shipped product follows the stricter product rule and performs no AI assistance before submission.
