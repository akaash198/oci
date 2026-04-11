# OT/ICS Cybersecurity ML Platform - Deployment & Operations Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Local Development](#local-development)
5. [Docker Deployment](#docker-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Data Source Configuration](#data-source-configuration)
8. [ML Models Overview](#ml-models-overview)
9. [API Reference](#api-reference)
10. [Monitoring & Observability](#monitoring--observability)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Option A: Local Development (Fastest)
```bash
# 1. Clone/Download the project
# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local

# 4. Start development server
pnpm dev

# 5. Open http://localhost:3000
```

### Option B: Docker (Recommended for Production)
```bash
# 1. Build and run with Docker Compose
docker-compose up -d

# 2. Open http://localhost:3000
```

### Option C: Kubernetes (Enterprise)
```bash
# 1. Apply Kubernetes manifests
kubectl apply -f k8s/

# 2. Or use Helm
helm install ot-security ./k8s/helm -f k8s/helm/values.yaml
```

---

## Prerequisites

### System Requirements
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 20 GB | 100+ GB SSD |
| Node.js | 18.x | 20.x LTS |

### Required Software
```bash
# Node.js (v18 or later)
node --version  # Should be >= 18.0.0

# pnpm (package manager)
npm install -g pnpm
pnpm --version

# Docker (for containerized deployment)
docker --version
docker-compose --version

# kubectl (for Kubernetes deployment)
kubectl version --client
```

### Supabase Account
1. Create account at https://supabase.com
2. Create a new project
3. Note your project URL and API keys

---

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the project root:

```bash
# ===========================================
# SUPABASE CONFIGURATION (Required)
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Supabase Auth Redirect (for v0 development)
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=

# ===========================================
# APPLICATION SETTINGS
# ===========================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# ===========================================
# ML MODEL CONFIGURATION
# ===========================================
# Enable/disable specific ML models
ML_PINN_FDI_ENABLED=true
ML_CGAN_RANSOMWARE_ENABLED=true
ML_TINYML_DER_ENABLED=true
ML_YOLO_PHYSICAL_ENABLED=true
ML_GRAPH_MAMBA_ENABLED=true
ML_DRL_DDOS_ENABLED=true
ML_BEHAVIORAL_DNA_ENABLED=true
ML_MODEL_DEFENSE_ENABLED=true

# Model inference thresholds
ML_ALERT_THRESHOLD=0.7
ML_CRITICAL_THRESHOLD=0.9

# ===========================================
# DATA SOURCE CONFIGURATION
# ===========================================
# Modbus
MODBUS_DEFAULT_PORT=502
MODBUS_TIMEOUT_MS=5000

# OPC-UA
OPCUA_DEFAULT_PORT=4840
OPCUA_SECURITY_MODE=SignAndEncrypt

# DNP3
DNP3_DEFAULT_PORT=20000

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Kafka (optional)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ot-security-platform

# ===========================================
# MONITORING & LOGGING
# ===========================================
LOG_LEVEL=info
ENABLE_METRICS=true
PROMETHEUS_PORT=9090

# ===========================================
# SECURITY
# ===========================================
# Session timeout in minutes
SESSION_TIMEOUT=60

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# NOTIFICATION CHANNELS (Optional)
# ===========================================
# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
ALERT_EMAIL_FROM=alerts@yourdomain.com

# Slack
SLACK_WEBHOOK_URL=

# PagerDuty
PAGERDUTY_API_KEY=
PAGERDUTY_SERVICE_ID=
```

### Database Schema Setup

Run the SQL migration scripts in order:

```bash
# Using Supabase CLI
supabase db push

# Or manually via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Run scripts/001_create_schema.sql
# 3. Run scripts/002_seed_data.sql
# 4. Run scripts/003_profile_trigger.sql
```

---

## Local Development

### Step-by-Step Setup

```bash
# 1. Navigate to project directory
cd ot-security-platform

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Run database migrations (if not done via v0)
# Copy SQL from scripts/ to Supabase SQL Editor

# 5. Start development server
pnpm dev

# 6. Open browser
open http://localhost:3000
```

### Development Commands

```bash
# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Type checking
pnpm type-check

# Run tests (if configured)
pnpm test
```

### Project Structure

```
ot-security-platform/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── alerts/               # Alert management
│   │   ├── health/               # Health check endpoint
│   │   ├── ml/inference/         # ML model inference
│   │   ├── sources/              # Data source management
│   │   └── telemetry/            # Telemetry ingestion
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # Dashboard pages
│   │   ├── alerts/               # Alerts management
│   │   ├── assets/               # Asset inventory
│   │   ├── incidents/            # Incident response
│   │   ├── models/               # ML model management
│   │   ├── playbooks/            # SOAR playbooks
│   │   ├── settings/             # Platform settings
│   │   └── sources/              # Data source config
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── dashboard/                # Dashboard components
│   │   └── widgets/              # Dashboard widgets
│   └── ui/                       # shadcn/ui components
├── lib/                          # Core libraries
│   ├── data-sources/             # Data source connectors
│   │   └── connectors/           # Protocol implementations
│   ├── ml/                       # ML engine
│   │   └── models/               # 8 ML model implementations
│   ├── supabase/                 # Supabase clients
│   └── types/                    # TypeScript types
├── k8s/                          # Kubernetes manifests
│   └── helm/                     # Helm chart
├── scripts/                      # Database migrations
├── Dockerfile                    # Container image
├── docker-compose.yml            # Local Docker setup
└── DEPLOYMENT_GUIDE.md           # This file
```

---

## Docker Deployment

### Build Docker Image

```bash
# Build production image
docker build -t ot-security-platform:latest .

# Build with specific tag
docker build -t ot-security-platform:v1.0.0 .

# Build for specific platform
docker build --platform linux/amd64 -t ot-security-platform:latest .
```

### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| `app` | 3000 | Main application |
| `redis` | 6379 | Caching & sessions |
| `mqtt` | 1883, 9001 | MQTT broker |
| `prometheus` | 9090 | Metrics collection |
| `grafana` | 3001 | Dashboards |
| `modbus-sim` | 5020 | Modbus simulator |
| `opcua-sim` | 4840 | OPC-UA simulator |
| `dnp3-sim` | 20000 | DNP3 simulator |

### Production Docker Configuration

```bash
# Create production docker-compose.prod.yml
version: '3.8'
services:
  app:
    image: ot-security-platform:latest
    restart: always
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

---

## Kubernetes Deployment

### Prerequisites

```bash
# Ensure kubectl is configured
kubectl cluster-info

# Create namespace
kubectl create namespace ot-security
```

### Deploy with kubectl

```bash
# Apply all manifests
kubectl apply -f k8s/deployment.yaml

# Check deployment status
kubectl get pods -n ot-security
kubectl get services -n ot-security

# View logs
kubectl logs -f deployment/ot-security-app -n ot-security
```

### Deploy with Helm

```bash
# Install chart
helm install ot-security ./k8s/helm \
  -f k8s/helm/values.yaml \
  -n ot-security \
  --create-namespace

# Upgrade deployment
helm upgrade ot-security ./k8s/helm \
  -f k8s/helm/values.yaml \
  -n ot-security

# Uninstall
helm uninstall ot-security -n ot-security
```

### Customize Helm Values

Edit `k8s/helm/values.yaml`:

```yaml
# Replica count
replicaCount: 3

# Resource limits
resources:
  limits:
    cpu: 2000m
    memory: 4Gi
  requests:
    cpu: 500m
    memory: 1Gi

# Horizontal Pod Autoscaler
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

# Ingress configuration
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: security.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: security-tls
      hosts:
        - security.yourdomain.com
```

### Create Secrets

```bash
# Create Supabase secrets
kubectl create secret generic supabase-secrets \
  --from-literal=url='https://your-project.supabase.co' \
  --from-literal=anon-key='your-anon-key' \
  --from-literal=service-role-key='your-service-role-key' \
  -n ot-security
```

---

## Data Source Configuration

### Modbus TCP/RTU

```typescript
// Configuration example
const modbusConfig = {
  type: 'modbus',
  name: 'PLC-001',
  config: {
    host: '192.168.1.100',
    port: 502,
    unitId: 1,
    timeout: 5000,
    registers: [
      { address: 0, type: 'holding', count: 10, name: 'temperature' },
      { address: 10, type: 'input', count: 5, name: 'pressure' }
    ]
  }
};
```

**API Endpoint:**
```bash
POST /api/sources
Content-Type: application/json

{
  "type": "modbus",
  "name": "PLC-001",
  "config": {
    "host": "192.168.1.100",
    "port": 502,
    "unitId": 1
  }
}
```

### OPC-UA

```typescript
const opcuaConfig = {
  type: 'opcua',
  name: 'SCADA-Server',
  config: {
    endpointUrl: 'opc.tcp://192.168.1.50:4840',
    securityMode: 'SignAndEncrypt',
    securityPolicy: 'Basic256Sha256',
    credentials: {
      type: 'username',
      username: 'operator',
      password: 'secure-password'
    },
    nodeIds: [
      'ns=2;s=Temperature',
      'ns=2;s=Pressure',
      'ns=2;s=FlowRate'
    ]
  }
};
```

### DNP3

```typescript
const dnp3Config = {
  type: 'dnp3',
  name: 'RTU-Substation',
  config: {
    host: '192.168.1.200',
    port: 20000,
    masterAddress: 1,
    outstationAddress: 10,
    dataPoints: {
      binary: [0, 1, 2, 3],
      analog: [0, 1, 2],
      counter: [0]
    }
  }
};
```

### MQTT

```typescript
const mqttConfig = {
  type: 'mqtt',
  name: 'IoT-Gateway',
  config: {
    brokerUrl: 'mqtt://broker.example.com:1883',
    username: 'iot-user',
    password: 'secure-password',
    topics: [
      'plant/sensors/+/temperature',
      'plant/sensors/+/pressure',
      'plant/alarms/#'
    ],
    qos: 1
  }
};
```

### Simulated Data (Testing)

```typescript
const simulatorConfig = {
  type: 'simulator',
  name: 'Test-Simulator',
  config: {
    scenario: 'power_grid', // or 'oil_gas', 'water_treatment', 'manufacturing'
    assetCount: 50,
    updateIntervalMs: 1000,
    anomalyProbability: 0.05,
    attackScenarios: ['fdi', 'ddos', 'ransomware']
  }
};
```

---

## ML Models Overview

### 1. PINN-FDI (Physics-Informed Neural Network)
**Purpose:** Detect False Data Injection attacks on sensor readings

```typescript
// Inference request
POST /api/ml/inference
{
  "modelType": "pinn_fdi",
  "data": {
    "measurements": [230.5, 231.2, 229.8, ...],
    "topology": { /* grid topology matrix */ },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

// Response
{
  "threatType": "fdi_sensor_spoofing",
  "confidence": 0.94,
  "isAttack": true,
  "details": {
    "physicsResidual": 0.87,
    "affectedBuses": [3, 7, 12],
    "estimatedInjectionMagnitude": 15.2
  }
}
```

### 2. cGAN-Ransomware
**Purpose:** Pre-encryption ransomware detection

```typescript
POST /api/ml/inference
{
  "modelType": "cgan_ransomware",
  "data": {
    "systemCalls": ["CreateFile", "WriteFile", ...],
    "fileOperations": [...],
    "networkActivity": [...],
    "processTree": {...}
  }
}
```

### 3. TinyML-DER
**Purpose:** Distributed Energy Resource attack detection

```typescript
POST /api/ml/inference
{
  "modelType": "tinyml_der",
  "data": {
    "deviceId": "inverter-001",
    "powerOutput": 4500,
    "voltage": 240.5,
    "frequency": 60.01,
    "setpointChanges": [...]
  }
}
```

### 4. YOLO-Physical
**Purpose:** Physical intrusion and sabotage detection

```typescript
POST /api/ml/inference
{
  "modelType": "yolo_physical",
  "data": {
    "imageBase64": "...",
    "sensorReadings": {
      "motion": true,
      "vibration": 0.3,
      "acoustic": 45
    }
  }
}
```

### 5. Graph-Mamba-Firmware
**Purpose:** Supply chain and firmware integrity

```typescript
POST /api/ml/inference
{
  "modelType": "graph_mamba_firmware",
  "data": {
    "firmwareBinary": "base64-encoded-binary",
    "deviceType": "plc",
    "vendor": "siemens",
    "expectedVersion": "2.1.0"
  }
}
```

### 6. SAC-DDoS
**Purpose:** Adaptive DDoS mitigation

```typescript
POST /api/ml/inference
{
  "modelType": "drl_ddos",
  "data": {
    "trafficStats": {
      "packetsPerSecond": 150000,
      "bytesPerSecond": 125000000,
      "connectionCount": 5000,
      "protocolDistribution": {...}
    }
  }
}
```

### 7. Behavioral-DNA
**Purpose:** Insider threat detection via behavioral profiling

```typescript
POST /api/ml/inference
{
  "modelType": "behavioral_dna",
  "data": {
    "operatorId": "op-123",
    "sessionData": {
      "keystrokes": [...],
      "mouseMovements": [...],
      "commandSequence": [...],
      "accessPatterns": [...]
    }
  }
}
```

### 8. Model-Poisoning-Defense
**Purpose:** Protect ML models from adversarial attacks

```typescript
POST /api/ml/inference
{
  "modelType": "model_defense",
  "data": {
    "modelUpdates": [...],
    "clientIds": ["client-1", "client-2", ...],
    "validationSet": [...]
  }
}
```

---

## API Reference

### Authentication

All API endpoints require authentication via Supabase JWT tokens.

```bash
# Include in headers
Authorization: Bearer <your-jwt-token>
```

### Telemetry Ingestion

```bash
# Single data point
POST /api/telemetry
{
  "assetId": "plc-001",
  "sourceId": "modbus-source-1",
  "dataPoint": "temperature",
  "value": 75.5,
  "unit": "celsius",
  "quality": "good"
}

# Batch ingestion
POST /api/telemetry
{
  "batch": [
    { "assetId": "plc-001", "dataPoint": "temp", "value": 75.5 },
    { "assetId": "plc-001", "dataPoint": "pressure", "value": 101.3 }
  ]
}
```

### Alerts

```bash
# Get alerts
GET /api/alerts?severity=critical&status=open&limit=50

# Create alert
POST /api/alerts
{
  "title": "High Temperature Detected",
  "severity": "high",
  "source": "PINN-FDI Model",
  "assetId": "plc-001",
  "description": "Temperature exceeds threshold"
}

# Update alert status
PATCH /api/alerts/{id}
{
  "status": "acknowledged",
  "assignedTo": "user-uuid"
}
```

### Data Sources

```bash
# List sources
GET /api/sources

# Create source
POST /api/sources
{
  "type": "modbus",
  "name": "PLC-Production-Line",
  "config": { ... }
}

# Test connection
POST /api/sources/{id}/test

# Start/Stop collection
POST /api/sources/{id}/start
POST /api/sources/{id}/stop
```

### Health Check

```bash
GET /api/health

# Response
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "mlEngine": "ready",
    "dataIngestion": "active"
  }
}
```

---

## Monitoring & Observability

### Prometheus Metrics

Available at `/api/metrics`:

```
# ML Model metrics
ot_ml_inference_total{model="pinn_fdi"} 15234
ot_ml_inference_latency_ms{model="pinn_fdi",quantile="0.99"} 45
ot_ml_detections_total{model="pinn_fdi",severity="critical"} 12

# Data ingestion metrics
ot_telemetry_points_total{source="modbus"} 1523456
ot_telemetry_errors_total{source="modbus"} 23

# Alert metrics
ot_alerts_total{severity="critical"} 45
ot_alerts_acknowledged_total 38
ot_alerts_resolved_total 32
```

### Grafana Dashboards

Access Grafana at `http://localhost:3001` (default credentials: admin/admin)

Pre-configured dashboards:
- **Overview** - System health and key metrics
- **ML Models** - Model performance and detections
- **Data Sources** - Connector status and throughput
- **Alerts** - Alert trends and response times

### Log Aggregation

```bash
# View application logs
docker-compose logs -f app

# Kubernetes logs
kubectl logs -f deployment/ot-security-app -n ot-security

# Structured log format
{
  "level": "info",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "ml-engine",
  "model": "pinn_fdi",
  "message": "Inference completed",
  "latencyMs": 23,
  "result": "normal"
}
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check Supabase credentials
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test connection
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"
```

#### 2. ML Models Not Loading
```bash
# Check model configuration
curl http://localhost:3000/api/health

# Verify model files exist
ls -la lib/ml/models/
```

#### 3. Data Source Connection Issues
```bash
# Test Modbus connectivity
nc -zv 192.168.1.100 502

# Test OPC-UA
openssl s_client -connect 192.168.1.50:4840

# Check MQTT broker
mosquitto_sub -h localhost -t "test/#" -v
```

#### 4. Kubernetes Pod Crashes
```bash
# Get pod status
kubectl describe pod <pod-name> -n ot-security

# Check resource limits
kubectl top pods -n ot-security

# View events
kubectl get events -n ot-security --sort-by=.metadata.creationTimestamp
```

#### 5. High Memory Usage
```bash
# Check Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" pnpm start

# Monitor memory in Docker
docker stats ot-security-app
```

### Support

For issues and feature requests:
1. Check logs for error messages
2. Review this guide for configuration
3. Open an issue with:
   - Error message/logs
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)

---

## Security Considerations

### Production Hardening

1. **Enable TLS/HTTPS** for all connections
2. **Rotate secrets** regularly
3. **Enable audit logging** for compliance
4. **Configure network policies** in Kubernetes
5. **Use service mesh** (Istio/Linkerd) for mTLS
6. **Regular security scans** with Trivy/Snyk

### Compliance

The platform supports compliance with:
- IEC 62443 (Industrial Cybersecurity)
- NERC CIP (Energy Sector)
- NIST Cybersecurity Framework
- ISO 27001

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial release with 8 ML models |

---

**Built with Next.js, Supabase, and TensorFlow.js**
