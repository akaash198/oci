# ShieldOT Developer Guide

This guide covers local development, configuration, repo structure, and the main extension points (API routes, connectors, and ML model integration).

For deployment/ops, see `DEPLOYMENT_GUIDE.md`.

## Table of contents

1. Tech stack
2. Prerequisites
3. Local setup
4. Environment variables
5. Database & Supabase
6. Repo structure
7. API routes
8. Data source connectors
9. ML models & datasets
10. Docker/Kubernetes notes
11. Security notes (secrets)
12. Contributing guidelines

---

## 1) Tech stack

- **Next.js (App Router)**: UI + server route handlers (`app/`)
- **TypeScript + React**
- **Supabase**: auth + database access
- **Tailwind CSS + Radix UI**: UI components
- Optional services (depending on deployment): Redis, Prometheus, Grafana, protocol simulators

---

## 2) Prerequisites

- Node.js 18+ (20+ recommended)
- `pnpm` (repo uses a `pnpm-lock.yaml`)
- A Supabase project (URL + keys)

Optional:
- Docker + Docker Compose
- kubectl / Helm (Kubernetes)

---

## 3) Local setup

### Install and run

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

### Lint / build

```bash
pnpm lint
pnpm build
pnpm start
```

---

## 4) Environment variables

Reference file: `.env.example`

Supabase is required for most API routes. The app returns a `503` error with code `SUPABASE_NOT_CONFIGURED` until these are set to real values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

See `lib/supabase/config.ts` for placeholder detection behavior.

---

## 5) Database & Supabase

### Apply schema and seed data

SQL scripts live in `scripts/`:
- `scripts/001_create_schema.sql`
- `scripts/002_seed_data.sql`
- `scripts/003_profile_trigger.sql`

Apply them in order via Supabase SQL editor (or via Supabase CLI if you use it in your environment).

### Supabase clients used

- Browser/client usage: `lib/supabase/client.ts`
- Server/admin usage (service role): `lib/supabase/admin.ts`
- Middleware helpers: `lib/supabase/middleware.ts`

Many API routes use the admin client and therefore require `SUPABASE_SERVICE_ROLE_KEY`.

---

## 6) Repo structure

High-level layout:
- `app/`: Next.js App Router pages and API route handlers (`app/api/**/route.ts`)
- `components/`: reusable UI components (Radix + Tailwind)
- `lib/`: platform logic (Supabase clients, connectors, ML catalog/engine, types)
- `hooks/`: React hooks
- `scripts/`: SQL migrations/seed
- `k8s/`: Kubernetes manifests and Helm values
- `scratch/`: local scripts for seeding/checking telemetry (dev utilities)

---

## 7) API routes

API routes live under `app/api/*/route.ts`. They are implemented as Next.js route handlers.

### Health
- `GET /api/health` → `app/api/health/route.ts`

### Telemetry
- `POST /api/telemetry` → `app/api/telemetry/route.ts`
  - Current implementation expects:
    - `asset_id`
    - `organization_id`
    - `data_points`: array of `{ metric_name, metric_value, quality?, timestamp? }`
- `GET /api/telemetry` supports query params:
  - `asset_id`, `source_id`, `metric_name`, `start_time`, `end_time`, `limit`

### Alerts / incidents / assets / sources / stats / playbooks
See:
- `app/api/alerts/route.ts`
- `app/api/incidents/route.ts`
- `app/api/assets/route.ts`
- `app/api/sources/route.ts`
- `app/api/stats/route.ts`
- `app/api/playbooks/route.ts`

### ML endpoints
See:
- `app/api/ml/models/route.ts`
- `app/api/ml/datasets/route.ts`
- `app/api/ml/inference/route.ts`

Note: some example payloads in `DEPLOYMENT_GUIDE.md` are illustrative; for exact request/response shapes, treat the route handler source as the canonical reference.

---

## 8) Data source connectors

Connector code lives in `lib/data-sources/`:
- `lib/data-sources/index.ts`
- `lib/data-sources/manager.ts`
- `lib/data-sources/connectors/` (protocol implementations)
  - `modbus.ts`
  - `opcua.ts`
  - `dnp3.ts`
  - `mqtt.ts`
  - `simulator.ts`

### Adding a new connector (suggested approach)
1. Create a connector module in `lib/data-sources/connectors/` following the existing pattern.
2. Register it in `lib/data-sources/index.ts` (or where connectors are mapped).
3. Add configuration surface (env vars and/or source config schema).
4. Ensure telemetry is normalized before insertion (align `metric_name`, `metric_value`, timestamps).

---

## 9) ML models & datasets

Model catalog/logic is under `lib/ml/`:
- `lib/ml/dataset-catalog.ts`
- `lib/ml/engine.ts`
- `lib/ml/models/*`

### Reality check: “training” vs. “inference” in this repo

- The TypeScript implementations in `lib/ml/models/*` are lightweight, in-process detectors that simulate model behavior (feature extraction + scoring).
- The `ml_models` table (served by `GET /api/ml/models`) stores model **metadata** like status/accuracy/runtime stats.
- For **real training** (fitting on data and persisting artifacts), use the Python `ml-engine/` service added to this repo.

### Python ML engine (real training + persisted artifacts)

The `ml-engine/` directory contains a minimal FastAPI service that can:
- train a sample model type (`tinyml_der`) and save artifacts (`.joblib` + metadata JSON)
- run inference using the trained artifact

This is intentionally small and meant as a starting point you can extend per model family.

#### Run the ML engine locally

```bash
cd ml-engine
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Health check: `GET http://localhost:8000/health`

#### Train `tinyml_der` (example)

`tinyml_der` is implemented as a simple anomaly detector (IsolationForest) over DER telemetry windows.

Send training windows as JSON:

```bash
curl -X POST http://localhost:8000/train/tinyml_der ^
  -H "content-type: application/json" ^
  -d "{\"samples\":[{\"deviceId\":\"INV-001\",\"powerOutput\":[1,2,3],\"setpoints\":[1,2,3],\"frequency\":[60,60,60],\"voltage\":[230,230,230],\"communicationPatterns\":[]}]}"
```

Then infer:

```bash
curl -X POST http://localhost:8000/infer/tinyml_der ^
  -H "content-type: application/json" ^
  -d "{\"data\":{\"deviceId\":\"INV-001\",\"powerOutput\":[1,2,100],\"setpoints\":[1,2,3],\"frequency\":[60,58,60],\"voltage\":[230,200,230],\"communicationPatterns\":[]}}"
```

Artifacts are written under `ml-engine/models/` by default (ignored by git).

#### Wire Next.js to the external engine

1. Set `ML_ENGINE_URL=http://localhost:8000` in `.env.local`.
2. Restart the Next.js dev server.

When configured, `POST /api/ml/inference` will call the external ML engine for supported model types (currently `tinyml_der`).

### Adding a model (suggested approach)
1. Implement model logic/config under `lib/ml/models/`.
2. Register it in the catalog/engine (`lib/ml/dataset-catalog.ts`, `lib/ml/engine.ts` as applicable).
3. Expose it via `app/api/ml/models/route.ts` (and inference route if needed).
4. Add UI surface under `app/dashboard/models/` (status, enable/disable, thresholds).

---

## 10) Docker/Kubernetes notes

### Docker Compose
`docker-compose.yml` includes services that assume extra local directories exist (for example `./ml-engine` and `./config/*`).

If you plan to use Docker Compose:
- create the missing directories/configs (recommended for production), or
- edit `docker-compose.yml` to disable those services for a minimal setup.

### Kubernetes
See the `k8s/` folder and `DEPLOYMENT_GUIDE.md` for suggested manifests/values.

---

## 11) Security notes (secrets)

- Do not commit secrets (API keys, service role keys, webhook URLs, credentials).
- Use `.env.local` for local development; it is ignored by `.gitignore`.
- GitHub push protection will block pushes that include detected secrets (this repo is configured to do so).

---

## 12) Contributing guidelines

- Prefer small, focused PRs.
- Keep API handlers consistent: validate inputs, return JSON with clear errors, and avoid leaking secrets in responses/logs.
- Reuse existing UI primitives under `components/ui/` and styling patterns used in `app/`.
- Run `pnpm lint` before pushing changes.
