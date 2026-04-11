# oci (ShieldOT)

OT/ICS cybersecurity dashboard + telemetry ingestion + ML model catalog, built with Next.js and Supabase.

## Docs

- `USER_GUIDE.md` — how to use the UI (alerts, incidents, assets, data sources, models, playbooks).
- `DEVELOPER_GUIDE.md` — local setup, environment variables, repo structure, API routes, and extension points.
- `DEPLOYMENT_GUIDE.md` — deployment/ops guide (local, Docker, Kubernetes).

## Quick start (local)

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.
