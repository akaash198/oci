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

ShieldOT includes multiple OT/ICS-focused ML detectors and integrity checks. The **ML Models** area is where you:
- See which models exist in your environment (inventory).
- Check runtime status and basic performance stats.
- Understand what each model detects and which datasets it is usually trained/validated against.
- Use model output to drive investigations (alerts → incidents → playbooks).

Important: the exact set of models, their configuration options, and whether “retraining”/“download weights” is enabled depends on your deployment and permissions.

### 8.1 Model inventory (the ML Models page)
The inventory is your “control tower” for model operations.

What you can do there:
- **Search** models by name/type.
- **Confirm status** at a glance (active/training/degraded/offline depending on your deployment).
- **Compare accuracy** (if populated in your environment).
- **Review runtime stats** (e.g., inferences today, average latency, alerts generated).
- **Open a model** to see details (click a row).

How to read common columns:
- **Model Name**: human label (e.g., “PINN FDI Detector”).
- **Typology / Type**: the internal family (e.g., `pinn_fdi`, `drl_ddos`).
- **Status**: operational state (see below).
- **Accuracy**: a deployment-provided metric; treat as a relative indicator unless you know the evaluation method.
- **Inferences (24h)**: how many times the model was invoked.
- **Latency**: average inference time; spikes can indicate overload or upstream data issues.

### 8.2 Model detail page (what it tells you)
The detail page is intended for triage and explainability.

Typical sections you may see:
- **Core stats**: accuracy, inferences today, detections/alerts generated.
- **Training datasets**: recommended reference datasets and links to dataset details (useful for validation and QA).
- **Architecture / purpose**: a short description of what the model is designed to detect.
- **Security assessment**: deployment-provided metadata about robustness/integrity checks.

If your deployment enables it, you may also see actions such as:
- **Retrain model**: triggers a training pipeline (usually non-production first).
- **Download weights**: exports model artifacts for audit/backup (often restricted).

### 8.3 Status meanings (operational guidance)
Statuses vary by deployment, but these are common interpretations:
- **Active**: the model is enabled and expected to run; alerts may be generated.
- **Training**: model is being trained/retrained or warming up; detections may be unstable.
- **Degraded**: model is running but not healthy (resource pressure, missing inputs, dependency issues).
- **Offline/Inactive**: model is disabled or unavailable; no detections should be expected.

If you see a degraded/offline state:
1. Check whether telemetry is arriving for the relevant assets/data sources.
2. Ask an operator to check `/api/health` and application logs.
3. Confirm configuration/keys are present (Supabase, model toggles).

### 8.4 Confidence, thresholds, and alert severity
Most models emit a **confidence score** (or an anomaly/threat score). ShieldOT uses that score plus model-specific rules to decide whether to generate an alert and how severe it should be.

General guidance:
- Higher confidence usually means stronger evidence, not certainty.
- Thresholds trade **noise vs. sensitivity**:
  - Raise thresholds to reduce false positives (may miss subtle attacks).
  - Lower thresholds to catch more suspicious behavior (more analyst workload).

Severity mapping is deployment-specific, but a common pattern is:
- **Critical**: immediate safety/availability risk or very high confidence.
- **High**: credible threat; investigate quickly.
- **Medium/Low**: anomaly worth validating; collect more context.

### 8.5 The model families in this platform (what each one is for)
Your environment may include some or all of these model types.

#### 8.5.1 `pinn_fdi` — False data injection / sensor spoofing
Detects inconsistencies between measurements and expected system physics.

Typical signals used:
- Sensor measurements over time.
- A topology representation (how measurements relate to the system).

What to do when it fires:
- Validate whether the suspected sensors share a common network path, PLC, or gateway.
- Compare against maintenance windows and calibration events.
- Cross-check independent measurements (redundant sensors / historian / manual readings).

#### 8.5.2 `cgan_ransomware` — Pre-encryption ransomware activity
Detects behavioral indicators that often occur *before* mass encryption.

Typical signals used:
- API calls, process behaviors, file operations (including entropy changes), registry changes, network connections.

What to do when it fires:
- Identify the host/asset and isolate if necessary (especially engineering workstations/historians).
- Collect process tree and file I/O evidence.
- Check for shadow copy deletion, backup tampering, or security tool interference.

#### 8.5.3 `tinyml_der` — DER & edge device attacks (inverters, chargers, batteries)
Detects anomalies in DER telemetry and communication patterns (setpoint manipulation, frequency/voltage anomalies, unusual polling/exfil patterns).

Typical signals used:
- Power output, setpoints, frequency/voltage time series.
- Communication pattern metadata.

What to do when it fires:
- Confirm whether the event coincides with grid disturbances or scheduled DER dispatch.
- Check for coordinated behavior across multiple devices.
- Validate comms endpoints and any recent firmware/config changes.

#### 8.5.4 `yolo_physical` — Physical intrusion/sabotage (video + sensor fusion)
Combines visual cues (objects/zones) with physical sensor anomalies (motion/vibration/acoustic/thermal).

Typical signals used:
- Optional video frame input.
- Motion/vibration/acoustic/thermal sensor readings.

What to do when it fires:
- Validate against access control logs and camera views (authorized vs. unknown presence).
- Correlate with safety alarms and perimeter sensors.
- If repeated, treat as a security control failure and escalate.

#### 8.5.5 `graph_mamba_firmware` — Firmware / supply chain anomalies
Creates a firmware “fingerprint” and compares it to a baseline to detect tampering/backdoors/unexpected changes.

Typical signals used:
- Firmware binary (or extracted bytes) and metadata (vendor/model/version).
- Optional baseline fingerprint for known-good comparison.

What to do when it fires:
- Quarantine the binary and stop propagation to other devices.
- Compare against vendor release notes and signed hashes if available.
- Escalate to firmware/OT engineering for controlled rollback/validation.

#### 8.5.6 `drl_ddos` — DDoS/DoS traffic shaping and mitigation guidance
Analyzes protocol traffic rates and recommends adaptive rate limits (and optionally blocks) to preserve critical OT traffic.

Typical signals used:
- Packets-per-second by protocol, connection counts, latency, queue utilization, protocol distribution.

What to do when it fires:
- Validate whether burst traffic is expected (maintenance, scanning, vendor remote access).
- Apply recommended shaping/limits in a safe, staged way (start with non-critical protocols).
- Confirm no safety-critical flows are impacted.

#### 8.5.7 `behavioral_dna` — Insider threat / anomalous operator behavior
Builds a per-user behavioral “DNA” from interaction patterns and detects significant deviation from baseline.

Typical signals used:
- Keystroke dynamics, mouse movement features, command/action sequences, session metadata.

What to do when it fires:
- Treat carefully: high false-positive risk during role changes, unusual shifts, or incident response itself.
- Validate identity assurance signals (MFA, VPN location, device posture).
- If suspicious, require step-up auth and tighten privileges temporarily.

#### 8.5.8 `model_defense` — Model poisoning / federated update integrity
Detects suspicious model updates (Byzantine clients, adversarial perturbations) and logs integrity evidence.

Typical signals used:
- Model update vectors from clients, client IDs, optional training data hashes/sources.

What to do when it fires:
- Quarantine suspect clients/updates.
- Require re-attestation for update sources.
- Roll back to last known-good model snapshot if integrity score is low.

### 8.6 Using training datasets (what they are and how to use them)
The “Training Datasets” section on a model helps you:
- Understand which public/standard datasets are commonly used to evaluate a detector.
- See expected column/feature shapes.
- Validate your telemetry mapping (do your fields resemble what the model expects?).

Recommended usage:
1. Use dataset recommendations in non-production environments first.
2. Confirm your telemetry normalization (units, timestamps, missing values).
3. Record a baseline period of “known good” operations before tuning thresholds.

### 8.7 Practical workflow: from model signal to response
1. **Model produces a detection** (often becomes an alert).
2. **Triage the alert**:
   - confirm asset/source/time window
   - check recent similar alerts (burst vs isolated)
   - assess safety/availability impact
3. **Create an incident** for anything requiring coordination.
4. **Attach a playbook** to standardize evidence capture and actions.
5. **Close the loop**: tune thresholds, improve telemetry quality, and document lessons learned.

### 8.8 Troubleshooting ML models (common symptoms)
**Models page is empty**
- Your database may not have model records yet (ask an operator/admin to seed `ml_models`).

**Model shows active but no alerts**
- Telemetry may not be arriving (check charts and data sources).
- Thresholds may be too strict.
- The model may require specific inputs not currently produced by your connectors.

**High false positives**
- Increase threshold(s) gradually and monitor alert volume.
- Verify telemetry quality and timestamp correctness (clock drift can cause artifacts).
- Exclude maintenance windows or known operational transients from evaluation.

**Latency spikes / degraded status**
- Resource pressure (CPU/RAM) or upstream spikes in telemetry volume.
- Too many concurrent inferences (ask operator to scale resources).

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
