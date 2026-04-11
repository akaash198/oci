# ShieldOT User Guide

This guide explains how to use the ShieldOT web UI to monitor OT/ICS telemetry, detect anomalies, and manage response workflows (alerts, incidents, and playbooks).

## Table of contents

1. Getting access & signing in
2. Navigation overview
3. Dashboard (home)
4. Alerts
5. Incidents
6. Assets
7. Data sources
8. ML models
9. Datasets
10. Playbooks
11. Settings
12. Troubleshooting
13. Glossary

---

## 1) Getting access & signing in

### Sign in
- Open the app URL (for local dev: `http://localhost:3000`).
- Use the **Login** page to sign in via Supabase Auth.
- If the app redirects back with an error, see **Troubleshooting → Login issues**.

### First-time environment checks
If you see “Supabase is not configured” or API calls fail:
- Confirm the operator/admin has configured Supabase environment variables (see `DEVELOPER_GUIDE.md`).
- Confirm database schema has been applied (SQL scripts in `scripts/`).

---

## 2) Navigation overview

Use the left sidebar to access major areas:
- **Dashboard**: overview widgets (telemetry, threat map, model status, recent alerts)
- **Alerts**: detected anomalies and policy violations
- **Incidents**: grouped investigations / response cases
- **Assets**: OT/ICS inventory and health
- **Data Sources**: telemetry collectors/connectors (Modbus, OPC-UA, DNP3, MQTT, simulator)
- **ML Models**: enabled models and operational status
- **Playbooks**: response procedures and runbooks
- **Settings**: organization configuration, thresholds, integrations

---

## 3) Dashboard (home)

The dashboard is designed for at-a-glance situational awareness. Typical widgets include:
- **Alerts feed**: newest alerts, severity, and status.
- **Asset health matrix**: health/availability across critical assets.
- **Telemetry chart**: recent metrics for selected assets/metrics.
- **Threat map**: quick visualization of potential attack/anomaly hotspots.
- **Model status**: which detections are enabled and their health.

Recommended daily workflow:
1. Review critical/high alerts.
2. Validate whether the alert impacts a critical asset.
3. Promote related alerts into an incident.
4. Apply a playbook to standardize response.

---

## 4) Alerts

Alerts represent detections (ML anomalies, threshold breaches, policy violations).

### Common tasks
- **Triage**: sort/filter by severity and time.
- **Acknowledge**: mark that an analyst has seen the alert.
- **Assign**: route to an owner/team (if enabled in your deployment).
- **Link to incident**: group multiple alerts into a single response case.

### Severity guidance (typical)
- **Critical**: immediate safety / availability risk; potential active compromise.
- **High**: credible malicious or unsafe condition; urgent investigation.
- **Medium**: anomalous behavior; needs validation.
- **Low**: informational; watch/collect context.

### What to check during triage
- Which **asset** and **data source** produced the signal.
- Whether similar alerts occurred recently (burst vs. isolated).
- Whether telemetry quality indicates bad sensor data (noise) vs. real changes.
- Whether the model is in “warming up” state after deployment/restart.

---

## 5) Incidents

Incidents are investigations and response containers that can group many alerts, assets, and response steps.

### When to create an incident
- Multiple related alerts (same asset, source, or time window).
- Alerts affecting a critical process or safety boundary.
- Any alert requiring escalation or cross-team coordination.

### Incident workflow (suggested)
1. Create incident and record a short summary.
2. Attach related alerts and affected assets.
3. Record containment actions (e.g., isolate segment, block broker topic, switch to manual).
4. Follow a playbook and document outcomes.
5. Close incident with lessons learned and preventive actions.

---

## 6) Assets

Assets represent OT/ICS entities (PLCs, HMIs, sensors, gateways, historians, brokers).

### Recommended asset metadata
- Name and unique identifier (tag, hostname, asset_id)
- Site / plant / line
- Criticality (safety impact and downtime cost)
- Owner/team
- Network zone / segment

### Troubleshooting no telemetry for an asset
- Confirm a data source is running and mapped to the asset.
- Confirm telemetry ingestion is succeeding (operator can check `/api/health` and logs).
- Validate time range filters on charts (you might be looking too far back/forward).

---

## 7) Data sources

Data sources are collectors/connectors that ingest telemetry from OT protocols and systems.

### Supported connector types (typical)
- **Modbus**
- **OPC-UA**
- **DNP3**
- **MQTT**
- **Simulator** (for demo/dev environments)

### Adding a data source (typical flow)
1. Go to **Data Sources**.
2. Click **Add**.
3. Choose connector type.
4. Fill host/port/credentials and protocol options.
5. **Test connection** (recommended).
6. **Start** collection.

### Safety notes
- Prefer read-only polling where possible.
- Use dedicated service accounts / least privilege for broker credentials.
- Restrict connector network access (firewall, network policy) to required endpoints only.

---

## 8) ML models

ML models generate detections from telemetry and context. The UI typically shows:
- Which models are enabled/disabled
- Health/status (ready, degraded, warming up)
- Basic performance indicators (if enabled by your deployment)

### Detection thresholds
If your deployment supports thresholds (e.g., alert vs. critical cutoffs), changing them impacts alert volume.
- Increase thresholds to reduce noise.
- Decrease thresholds to catch more anomalies (expect more false positives).

---

## 9) Datasets

Datasets provide reference data for training, benchmarking, or demos.

Typical actions:
- View dataset catalog and descriptions.
- Explore dataset details (features, expected telemetry fields).
- Use datasets for model validation in non-production environments.

---

## 10) Playbooks

Playbooks standardize response to common alert/incident patterns.

### Recommended playbook structure
- Objective (“what success looks like”)
- Preconditions (required access/tools)
- Steps (containment, investigation, eradication, recovery)
- Evidence to capture (logs, telemetry exports)
- Escalation criteria

---

## 11) Settings

Settings vary by deployment, but commonly include:
- Organization/workspace settings
- Telemetry/model thresholds
- Notification integrations (email, Slack, PagerDuty, Teams)
- Session/security preferences (timeouts, rate limits)

---

## 12) Troubleshooting

### “Supabase is not configured”
The backend APIs return a configuration error until these are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Ask your admin to follow `DEVELOPER_GUIDE.md` and apply the SQL schema in `scripts/`.

### Login issues / redirect errors
Common causes:
- Wrong Supabase redirect URL settings
- Missing `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` (some dev setups)
- Cookies blocked or browser privacy settings

### No alerts
Common causes:
- No telemetry ingestion yet (no data to detect on)
- Model disabled in environment configuration
- Thresholds too strict

### Charts show no data
Common causes:
- Wrong asset/metric selection
- Time range mismatch
- Telemetry ingestion failing (operator should check server logs and `/api/health`)

---

## 13) Glossary

- **Asset**: OT/ICS device/system being monitored (PLC, HMI, gateway, broker).
- **Data source**: connector that ingests telemetry (Modbus/OPC-UA/DNP3/MQTT/simulator).
- **Telemetry**: time-series data points (metrics) about an asset.
- **Alert**: a detection/notification about suspicious or unsafe conditions.
- **Incident**: a response case grouping alerts, investigation notes, and actions.
- **Playbook**: a structured response procedure/runbook.
