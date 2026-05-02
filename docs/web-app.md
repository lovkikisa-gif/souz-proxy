# Souz Web App

## Architecture

The frontend web app lives in `frontend/` and is built with Vite + React + TypeScript.

It is served by the proxy container under `/app/**` as a static SPA.

## Path Structure

| Path | Handled By |
|------|-----------|
| `/app/**` | Frontend SPA (served by proxy as static files) |
| `/auth/**` | Proxy auth endpoints |
| `/v1/**` | Proxy → backend reverse proxy |

## Key Principles

- **Frontend lives in `frontend/`** — built separately, then bundled into the proxy Docker image.
- **Frontend served under `/app/**`** — Vite `base: "/app/"` ensures all assets load from `/app/assets/...`.
- **API paths are `/auth/**` and `/v1/**`** — all API calls use relative URLs, same-origin.
- **No direct backend access from browser** — backend is on a private Docker network only.
- **Auth uses HttpOnly cookie** — session cookie is set by proxy, frontend uses `credentials: "include"`.
- **Provider keys are never stored in frontend** — keys are submitted to backend and never displayed in full.
- **No proxy-trust headers from frontend** — `X-User-Id`, `X-Souz-Proxy-Auth`, `X-Forwarded-User` are never sent by frontend code.

## Local Development

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/auth/*` and `/v1/*` to `localhost:8080` (the proxy container).

## Production Build

Frontend is built as part of the Docker image (multi-stage build). See `Dockerfile`.
