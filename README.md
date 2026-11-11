# StudioSpace Server

Express + MongoDB + Better Auth API for the StudioSpace client.

## Local development

```bash
cp .env.example .env   # then fill in the values
npm install
npm run dev
```

The API runs at `http://localhost:5000`.

## Deploy to Vercel

Vercel detects the Express app from `index.js` automatically, so no custom
build command is required.

1. Push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Keep **Root Directory** as the repository root (the folder containing
   `package.json`). Do not set a build command or output directory.
4. Add the environment variables below in **Project Settings → Environment
   Variables**.
5. Deploy, then open `https://<your-server>.vercel.app/api/health` to confirm
   the API and database are working.

### Required environment variables

| Name                   | Example                                             | Notes                                                                 |
| ---------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| `MONGODB_URI`          | `mongodb+srv://user:pass@cluster.mongodb.net/...`   | MongoDB Atlas connection string.                                      |
| `BETTER_AUTH_SECRET`   | `openssl rand -hex 32`                              | Use a new, long random value for production.                          |
| `CLIENT_URLS`          | `https://your-client.vercel.app`                    | Comma-separated list of browser origins allowed to call the API. Supports `*` (for example `https://your-client-*.vercel.app`). |
| `BETTER_AUTH_URL`      | `https://your-server.vercel.app`                    | Optional on Vercel; it is detected automatically. Avoid localhost URLs. |
| `MONGODB_DB_NAME`      | `StudioSpace`                                       | Optional. Defaults to `StudioSpace`.                                  |

Also set these on the **client** Vercel project:

```env
NEXT_PUBLIC_SERVER_URL=https://your-server.vercel.app
```

> `NEXT_PUBLIC_*` variables are inlined at build time, so redeploy the client
> after changing them.

### MongoDB Atlas network access

Vercel functions use dynamic IP addresses. In Atlas, go to
**Network Access → IP Access List** and allow `0.0.0.0/0` (or configure a
dedicated static egress solution).

### Cookies and domains

The client and API are on different domains (`*.vercel.app` hosts are treated
as separate sites). In production the server therefore sets the session cookie
with `SameSite=None; Secure; Partitioned`, and CORS allows the exact origins
listed in `CLIENT_URLS`.

If a browser blocks third-party cookies entirely (for example, Safari with
"Prevent cross-site tracking"), the safest alternative is to proxy `/api/*`
through the client's own domain with a Next.js rewrite. Everything else works
without changes.

## Endpoints

| Method | Path                        | Auth | Description                    |
| ------ | --------------------------- | ---- | ------------------------------ |
| POST   | `/api/auth/*`               | No   | Better Auth (sign-up / sign-in) |
| GET    | `/api/health`               | No   | Health and database check      |
| GET    | `/api/studios`              | No   | List all studios               |
| GET    | `/api/studios/my`           | Yes  | Studios owned by current user  |
| GET    | `/api/studios/:id`          | No   | Single studio                  |
| POST   | `/api/studios`              | Yes  | Create a studio                |
| PUT    | `/api/studios/:id`          | Yes  | Update an owned studio         |
| DELETE | `/api/studios/:id`          | Yes  | Delete an owned studio         |
| POST   | `/api/bookings`             | Yes  | Create a booking               |
| GET    | `/api/bookings/my`          | Yes  | Current user's bookings        |
| PATCH  | `/api/bookings/:id/cancel`  | Yes  | Cancel a pending booking       |
