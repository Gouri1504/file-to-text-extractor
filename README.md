# ClaimScribe - AI Medical Claim Document Extractor

A full-stack web application that turns scanned medical insurance claim
documents (PDFs or photos) into clean, structured Markdown using Google
Gemini. Authenticated users can upload, browse history, and run
AI-powered side-by-side comparisons across multiple claims.

This project started as a single-page React prototype and was rebuilt as
a proper full-stack MVC platform: a Node/Express/MongoDB backend that
owns all secrets and AI calls, and a refreshed React frontend with
routing, authentication, and animations.

---

## Architecture

```mermaid
flowchart LR
    user[User Browser] -->|HTTPS| fe[React Frontend]
    fe -->|"REST + JWT cookie"| be[Express Backend]
    be -->|Mongoose| db[(MongoDB)]
    be -->|GridFS| db
    be -->|REST| gemini[Google Gemini API]
    fe -->|Google popup| firebase[Firebase Auth]
    be -->|verify ID token| firebase
```

**Why the rewrite mattered**

| Problem in v1 (single-page prototype)   | Solution in v2 (this repo)                          |
|-----------------------------------------|------------------------------------------------------|
| Gemini API key shipped to the browser   | Key lives only in backend env, never sent to client  |
| Heavy PDF rendering on the client       | Gemini natively accepts PDFs - no pdfjs-dist needed  |
| No persistence - results lost on reload | MongoDB + GridFS stores history per user             |
| No accounts, no privacy boundary        | JWT-cookie auth (email/password and Google/Firebase) |
| One 412-line monolith                   | Layered backend, page-per-route frontend             |

Backend uses an **MVC + service layer** pattern:

- **Routes**: declare HTTP shape and validation (Zod).
- **Controllers**: thin - parse `req`, call a service, return `ApiResponse`.
- **Services**: business logic, no Express objects. Reusable from any caller.
- **Models**: Mongoose schemas (`User`, `Document`, `Comparison`).
- **Config**: env validation, DB + GridFS, Firebase Admin, Gemini, Pinecone clients.
- **Middleware**: JWT verification, multer upload, central error handler.

---

## Features

- Email + password signup/login with bcrypt-hashed credentials
- Google sign-in via Firebase Authentication (auto-links to existing
  email accounts when the Google email is verified)
- Drag-and-drop upload (PDF or image, up to 10 MB)
- AI extraction into structured Markdown (claim info, patient, hospital,
  diagnosis, billing table, summary)
- Provider fallback: Gemini (primary) auto-falls-back to Groq's
  Llama 4 Scout (multimodal) on failure or rate-limit, when `GROQ_API_KEY`
  is configured
- Per-user upload history persisted in MongoDB
- Original file storage via GridFS (re-downloadable any time)
- AI multi-document comparison: pick 2-5 past claims, get a markdown
  report with similarities, differences, anomalies, and a recommendation
- **Ask your documents** (optional): semantic Q&A over your extracted
  claims with numbered citations linking back to the source document and
  section. Pinecone (free Starter) stores the vectors; embeddings come from
  `all-MiniLM-L6-v2`, which runs locally in the backend (no API key). Set
  `PINECONE_API_KEY` (see `backend/.env.example`) to enable it.
- Animated UI with framer-motion: page transitions, staggered card lists,
  skeleton loaders, toast notifications
- Hardened backend: helmet, CORS allow-list, rate limiting on auth and
  upload routes, Zod validation, central error envelope
- Graceful shutdown, env validation that fails fast on misconfig

---

## Tech Stack

### Frontend

| Tech              | Why                                                              |
|-------------------|------------------------------------------------------------------|
| React 19 + Vite   | Fast dev server, HMR, native ES modules                          |
| React Router 7    | SPA routing with nested routes and guards                        |
| Axios             | Cookie-based auth via `withCredentials`, interceptors            |
| Framer Motion     | Declarative page transitions and component animations            |
| React Dropzone    | Battle-tested drag-and-drop file uploads                         |
| React Markdown + remark-gfm | Renders extraction output incl. GFM tables             |
| react-hot-toast   | Non-blocking notifications (replaces `alert()`)                  |
| Firebase Auth (web SDK) | Google sign-in popup; lazy-loaded only when used           |

### Backend

| Tech              | Why                                                              |
|-------------------|------------------------------------------------------------------|
| Node.js + Express | Mature, batteries-included HTTP framework                        |
| MongoDB + Mongoose| Flexible schema for evolving document/comparison data            |
| GridFS            | Streams large files in chunks, no separate object store needed   |
| JWT in httpOnly cookie | XSS-resistant session token; SameSite/Secure set via env      |
| Pinecone          | Free serverless vector DB for document Q&A (optional)            |
| @huggingface/transformers | Runs the MiniLM embedding model in-process (ONNX, CPU)   |
| firebase-admin    | Verifies Firebase ID tokens from Google sign-in (no service key) |
| bcryptjs          | Industry-standard password hashing                               |
| Multer (memory)   | Parses multipart bodies straight into a Buffer for GridFS        |
| Zod               | Validation for env, request body, params, query                  |
| Helmet, CORS, rate-limit | Standard hardening primitives                             |
| @google/generative-ai | Official Gemini SDK; supports multimodal `inlineData` parts |
| Groq (Llama 4 Scout) | Optional fallback provider; OpenAI-compatible API, multimodal text+image |
| pdfjs-dist + @napi-rs/canvas | Server-side PDF rasterization for the Groq fallback (Groq has no native PDF support) |

### Infra (local + deploy)

| Tech              | Why                                                              |
|-------------------|------------------------------------------------------------------|
| MongoDB Atlas (or local Mongo) | Hosted DB with free tier; works locally too        |
| Vercel / Netlify  | Static SPA hosting for the frontend                              |
| Render / Railway / Fly | Container hosting for the Express backend                   |

---

## Folder Structure

```
file-to-text-extractor/
├── backend/
│   ├── src/
│   │   ├── config/         env, db (+GridFS), firebase, gemini, pinecone
│   │   ├── controllers/    thin HTTP wrappers (incl. chat)
│   │   ├── middleware/     auth, upload, validate, error
│   │   ├── models/         User, Document, Comparison
│   │   ├── prompts/        extractClaim, compareClaims, answerQuestion
│   │   ├── routes/         /auth, /documents, /comparisons, /chat
│   │   ├── scripts/        downloadModel (prefetch embedder), reindex (backfill vectors)
│   │   ├── services/       auth, storage, gemini, groq, ai, document,
│   │   │                   pdfRasterize, chunking, embedding, vector, chat
│   │   ├── utils/          ApiError, ApiResponse, asyncHandler
│   │   ├── app.js          Express composition
│   │   └── server.js       process entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/            client + per-domain API wrappers (auth, documents, comparisons, chat)
│   │   ├── components/
│   │   │   ├── auth/       ProtectedRoute, GoogleSignIn
│   │   │   ├── chat/       ChatPanel (Ask your documents UI)
│   │   │   ├── documents/  Dropzone, DocumentCard/List, MarkdownViewer
│   │   │   ├── layout/     Navbar, PageTransition
│   │   │   └── ui/         Button, Spinner, ProgressBar, Skeleton
│   │   ├── config/         firebase (client SDK init)
│   │   ├── context/        AuthContext + useAuth
│   │   ├── hooks/          useDocuments
│   │   ├── pages/          Login, Signup, Dashboard, DocumentDetail, Compare, Ask, NotFound
│   │   ├── routes/         AppRoutes (with AnimatePresence)
│   │   ├── styles/         globals.css, animations.css
│   │   ├── utils/          format, download
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## Request Flow Walkthrough

### Upload + extraction

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Express
    participant GFS as GridFS
    participant AI as Gemini
    participant DB as MongoDB

    FE->>API: POST /api/documents (multipart, JWT cookie)
    API->>API: verifyJWT + multer memory parse
    API->>GFS: stream Buffer to GridFSBucket
    GFS-->>API: fileId
    API->>DB: create Document(status=pending)
    API->>AI: generateContent(prompt + inlineData)
    AI-->>API: markdown text
    API->>DB: update Document(markdown, status=done)
    API-->>FE: 201 { document }
```

### Authentication (email + password)

1. `POST /api/auth/signup` validates body, bcrypt-hashes password, creates `User`.
2. Backend signs a JWT with `sub = user._id` and sets it as an
   `httpOnly` cookie named `token` whose `SameSite`/`Secure` attributes
   come from `COOKIE_SAMESITE`/`COOKIE_SECURE`.
3. Frontend's axios client always sends that cookie via `withCredentials`.
4. `verifyJWT` middleware reads the cookie, verifies it, and re-fetches
   the user from MongoDB on every request - so banned/deleted users are
   locked out immediately.

### Authentication (Google via Firebase)

1. The Google button is shown only when the frontend has the
   `VITE_FIREBASE_*` config and `GET /api/auth/config` reports `googleEnabled`.
2. Clicking it lazy-loads the Firebase SDK and opens a Google popup
   (`signInWithPopup`). Firebase returns a short-lived ID token.
3. The SPA sends it to `POST /api/auth/firebase`. The backend verifies it
   with `firebase-admin` (signature, expiry, project) and requires a
   `google.com` sign-in from the last 5 minutes.
4. `loginWithFirebase` upserts the user by Google account id (linking by
   email to an existing password user only when the email is verified).
5. The same JWT cookie as email login is set. No Firebase session is kept
   in the browser.

### AI provider fallback

```mermaid
flowchart LR
    req[extractClaim or compareClaims call] --> ai[ai.service]
    ai -->|primary| gemini[Gemini]
    gemini -- "ok" --> done[Return markdown]
    gemini -- "error / rate-limit" --> hasGroq{"GROQ_API_KEY?"}
    hasGroq -- "no" --> err1[Bubble Gemini error]
    hasGroq -- "yes" --> groq["Groq Llama 4 Scout"]
    groq -- "ok" --> done
    groq -- "error" --> err2[Combined error to caller]
```

All AI calls flow through [`backend/src/services/ai.service.js`](backend/src/services/ai.service.js).
Gemini is always primary. If `GROQ_API_KEY` is set and Gemini throws,
the same call is retried against Groq's Llama 4 Scout (multimodal)
using its OpenAI-compatible chat-completions endpoint.

Limits worth knowing:

- **Groq has no native PDF support**, so when the fallback handles a
  PDF, [`backend/src/services/pdfRasterize.service.js`](backend/src/services/pdfRasterize.service.js)
  renders each page to a JPEG (using `pdfjs-dist` + `@napi-rs/canvas`)
  and sends the images instead. This only runs in the fallback path -
  Gemini always gets the original PDF directly.
- **Page cap on PDFs through the fallback: 5 pages.** Groq accepts at
  most 5 image parts per message. If the PDF has more pages, only the
  first 5 are rendered and a notice is appended to the prompt so the
  model surfaces the truncation in the extracted markdown.
- **Per-image cap: ~4 MB.** Direct image uploads above this cap error
  out from the fallback. Rasterized PDF pages typically come in well
  under at scale 2.0 / JPEG 0.85.
- The fallback fires for *any* Gemini error - we don't try to classify
  retryable vs not. Worst case we waste one extra call; best case the
  request succeeds.

---

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB running locally OR a MongoDB Atlas connection string
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- (Optional) A [Groq API key](https://console.groq.com/keys) as a fallback
  provider when Gemini fails or hits rate limits
- (Optional) A [Firebase](https://console.firebase.google.com) project with
  the Google sign-in provider enabled - set `FIREBASE_PROJECT_ID` (backend)
  and the `VITE_FIREBASE_*` values (frontend); see the `.env.example` files

### 1. Clone

```bash
git clone <your-fork-url>
cd file-to-text-extractor
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env, fill MONGO_URI, JWT_SECRET, GEMINI_API_KEY, (optionally FIREBASE_PROJECT_ID, PINECONE_API_KEY)
npm install
npm run dev
# -> "API listening on http://localhost:5000 (development)"
```

> Make sure `PORT=5000` so the frontend's Vite dev proxy (which targets
> `http://localhost:5000/api`) can reach the API. If you change it, also
> update `frontend/vite.config.js`.

### 3. Frontend (in a new terminal)

```bash
cd frontend
cp .env.example .env
# default VITE_API_URL=/api works because of vite's dev proxy
npm install
npm run dev
# -> "Local: http://localhost:5173"
```

Open `http://localhost:5173`, sign up, drop a claim PDF/image, watch the
markdown appear.

---

## API Reference

All `/api/documents/*` and `/api/comparisons/*` routes require an
authenticated session (the `token` cookie set by login/signup).

| Method | Path                              | Auth | Body / Query                                      | Description                                |
|--------|-----------------------------------|------|---------------------------------------------------|--------------------------------------------|
| GET    | `/api/health`                     | -    | -                                                 | Liveness probe                             |
| POST   | `/api/auth/signup`                | -    | `{ email, password, name? }`                      | Create account, sets cookie                |
| POST   | `/api/auth/login`                 | -    | `{ email, password }`                             | Log in, sets cookie                        |
| POST   | `/api/auth/logout`                | -    | -                                                 | Clears cookie                              |
| GET    | `/api/auth/me`                    | yes  | -                                                 | Current user                               |
| GET    | `/api/auth/config`                | -    | -                                                 | `{ googleEnabled }` for the login page     |
| POST   | `/api/auth/firebase`              | -    | `{ idToken }` (JSON only)                         | Exchange Firebase Google token for cookie  |
| GET    | `/api/documents`                  | yes  | -                                                 | List my documents (newest first)           |
| POST   | `/api/documents`                  | yes  | `multipart/form-data` field `file`                | Upload + extract                           |
| GET    | `/api/documents/:id`              | yes  | -                                                 | Get one (with markdown)                    |
| DELETE | `/api/documents/:id`              | yes  | -                                                 | Delete document + GridFS file              |
| GET    | `/api/documents/:id/file`         | yes  | -                                                 | Stream original file back                  |
| POST   | `/api/documents/:id/reindex`      | yes  | -                                                 | Rebuild the document's vectors             |
| POST   | `/api/chat`                       | yes  | `{ question, documentIds? }`                      | Answer with citations (needs Pinecone)     |
| GET    | `/api/comparisons`                | yes  | -                                                 | List my comparisons                        |
| POST   | `/api/comparisons`                | yes  | `{ documentIds: string[] }` (2-5)                 | Run AI comparison                          |
| GET    | `/api/comparisons/:id`            | yes  | -                                                 | Get one                                    |

All responses use the envelope:

```json
{ "success": true, "message": "...", "data": { ... } }
```

Errors:

```json
{ "success": false, "message": "...", "details": { ... } }
```

---

## Troubleshooting

### Vite shows `[vite] http proxy error: /api/auth/me` (`AggregateError` / `ECONNREFUSED`)

The frontend dev server is forwarding `/api/*` to `http://localhost:5000`,
but nothing is listening there. Start the backend in a second terminal
(`cd backend && npm run dev`) and confirm it logs
`API listening on http://localhost:5000 (development)`. Make sure the
backend's `PORT` matches the proxy target in
`frontend/vite.config.js` (default `5000`).

### Backend crashes with `querySrv ECONNREFUSED ...mongodb.net`

Node's DNS resolver can't reach a working DNS server. This happens when
your machine has a stale `127.0.0.1` entry in its resolver list (left
behind by tools like Pi-hole, AdGuard Home, an old VPN client, or some
corporate security agents). You can confirm with:

```bash
node -e "console.log(require('dns').getServers())"
# If this prints just [ '127.0.0.1' ], that's the bug.
```

The backend handles this automatically: on startup, [`backend/src/config/db.js`](backend/src/config/db.js)
detects loopback-only DNS and falls back to public resolvers
(`1.1.1.1`, `8.8.8.8`). You'll see a warning log:

```
DNS: only loopback resolvers configured; overriding with 1.1.1.1, 8.8.8.8
```

If you'd rather fix it system-wide, set DNS servers explicitly on your
network adapter (Windows: Settings -> Network -> Adapter -> Edit DNS;
macOS / Linux: configure `/etc/resolv.conf` or your DNS service).

### `Failed to start server: Error: querySrv ENOTFOUND ...`

Different problem: DNS works but the cluster name is wrong. Re-copy the
connection string from Atlas (Database -> Connect -> Drivers).

### Atlas connection fails with `bad auth` / `authentication failed`

The username or password in `MONGO_URI` is wrong, or the user lacks
access to the database. In Atlas: Database Access -> verify user; Network
Access -> ensure your current IP is allow-listed (or `0.0.0.0/0` for
development).

### Uploads return `502 AI extraction failed`

The error message tells you which provider(s) failed:

- `Primary (Gemini) failed: ...` only - Gemini failed and Groq fallback
  isn't configured. Either fix Gemini (check `GEMINI_API_KEY` at
  <https://aistudio.google.com/app/apikey>, check quota at
  <https://aistudio.google.com>) or set `GROQ_API_KEY` for an automatic
  fallback (free tier at <https://console.groq.com/keys>).
- `Primary (Gemini) failed: ... Fallback (Groq) also failed: ...` -
  both providers failed. Read both messages. PDF uploads are now
  supported on the fallback (we rasterize pages to JPEG server-side),
  but the cap is 5 pages and ~4 MB per page; multi-page PDFs beyond
  that limit are truncated, and the model is told so. Common Groq
  failures: "Rendered PDF page N too large for Groq" (rare; reduce PDF
  density or re-export at lower resolution) and "Image too large for
  Groq fallback" (cap is ~4 MB on direct image uploads).
- General sanity checks: files must be PDF or image, under 10 MB, and
  the backend must be able to reach `generativelanguage.googleapis.com`
  and (if configured) `api.groq.com`.

### Browser shows `CORS error` after deploying

Set `CLIENT_URL` on the backend to the exact deployed frontend origin
(no trailing slash, correct protocol). The CORS allow-list pulls from
that env var, and credentialed requests can't use a wildcard origin.

---

## Deployment Notes

### Backend

Render, Railway, Fly.io, or any Node host.

- Set every variable from `backend/.env.example` in the platform UI.
- `NODE_ENV=production`, `COOKIE_SECURE=true`, and `COOKIE_SAMESITE=none`
  if the frontend is on a different site than the API.
- Set `CLIENT_URL` to your deployed frontend URL.
- Set `FIREBASE_PROJECT_ID` (and the frontend's `VITE_FIREBASE_*` values),
  and add the frontend domain to Firebase's "Authorized domains".

### Frontend

Vercel or Netlify.

- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to the deployed backend URL (e.g.
  `https://api.example.com/api`).

### MongoDB

MongoDB Atlas free tier is sufficient. Whitelist the backend's egress IPs
(or `0.0.0.0/0` for serverless platforms with rotating IPs).

---

## Roadmap

- Email verification + password reset
- Refresh-token rotation
- Background worker queue for batch uploads
- Test suite (unit + integration)
- Docker + docker-compose for one-command local stack

---

