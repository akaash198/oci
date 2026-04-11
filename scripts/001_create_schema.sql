-- OT/ICS Cybersecurity Platform Database Schema
-- Complete schema for multi-tenant security operations

-- ============================================
-- CORE TABLES
-- ============================================

-- Organizations (multi-tenant support)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sector TEXT NOT NULL CHECK (sector IN ('energy', 'transport', 'banking', 'manufacturing', 'water', 'oil_gas', 'healthcare', 'other')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'analyst', 'operator', 'viewer')),
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ASSET MANAGEMENT (CMDB)
-- ============================================

-- Asset types for categorization
CREATE TABLE IF NOT EXISTS public.asset_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('plc', 'rtu', 'hmi', 'scada', 'sensor', 'actuator', 'network', 'workstation', 'server', 'der', 'other')),
  icon TEXT,
  schema JSONB DEFAULT '{}', -- Custom fields schema
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets (PLCs, RTUs, Sensors, etc.)
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_type_id UUID REFERENCES public.asset_types(id),
  name TEXT NOT NULL,
  description TEXT,
  ip_address INET,
  mac_address MACADDR,
  serial_number TEXT,
  firmware_version TEXT,
  vendor TEXT,
  model TEXT,
  location TEXT,
  zone TEXT, -- Network zone (DMZ, Control, Field, etc.)
  criticality TEXT DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),
  properties JSONB DEFAULT '{}',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset relationships (network topology)
CREATE TABLE IF NOT EXISTS public.asset_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  target_asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('connected_to', 'controls', 'monitors', 'depends_on', 'communicates_with')),
  protocol TEXT, -- Modbus, DNP3, OPC-UA, etc.
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DATA SOURCES & TELEMETRY
-- ============================================

-- Data source configurations
CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('modbus_tcp', 'modbus_rtu', 'opcua', 'dnp3', 'mqtt', 'kafka', 'api', 'csv', 'simulator')),
  config JSONB NOT NULL DEFAULT '{}', -- Connection settings (encrypted sensitive fields)
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'connecting')),
  last_connected_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telemetry data (time-series)
CREATE TABLE IF NOT EXISTS public.telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  unit TEXT,
  quality TEXT DEFAULT 'good' CHECK (quality IN ('good', 'bad', 'uncertain')),
  tags JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable-like index for time-series queries
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON public.telemetry (organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_asset ON public.telemetry (asset_id, timestamp DESC);

-- ============================================
-- THREAT DETECTION & ALERTS
-- ============================================

-- ML Models registry
CREATE TABLE IF NOT EXISTS public.ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pinn_fdi', 'cgan_ransomware', 'tinyml_der', 'yolo_physical', 'graph_mamba_firmware', 'drl_ddos', 'behavioral_dna', 'federated_aggregator')),
  version TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}',
  weights_url TEXT, -- URL to model weights
  accuracy DOUBLE PRECISION,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'training', 'evaluating')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detection rules
CREATE TABLE IF NOT EXISTS public.detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  threat_type TEXT NOT NULL CHECK (threat_type IN ('fdi', 'ransomware', 'der_attack', 'physical_sabotage', 'firmware_tampering', 'ddos', 'insider_threat', 'model_poisoning', 'custom')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  ml_model_id UUID REFERENCES public.ml_models(id),
  rule_logic JSONB NOT NULL DEFAULT '{}', -- Threshold, conditions, etc.
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  detection_rule_id UUID REFERENCES public.detection_rules(id),
  asset_id UUID REFERENCES public.assets(id),
  threat_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title TEXT NOT NULL,
  description TEXT,
  confidence DOUBLE PRECISION, -- ML confidence score
  evidence JSONB DEFAULT '{}', -- Supporting data
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'investigating', 'resolved', 'false_positive', 'escalated')),
  assigned_to UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert timeline/history
CREATE TABLE IF NOT EXISTS public.alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'assigned', 'status_changed', 'comment', 'escalated', 'resolved', 'automation_triggered')),
  actor_id UUID REFERENCES public.profiles(id),
  old_value JSONB,
  new_value JSONB,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INCIDENT RESPONSE & SOAR
-- ============================================

-- Incidents (grouped alerts)
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'eradicated', 'recovered', 'closed')),
  lead_analyst UUID REFERENCES public.profiles(id),
  impact_assessment TEXT,
  root_cause TEXT,
  lessons_learned TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  contained_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link alerts to incidents
CREATE TABLE IF NOT EXISTS public.incident_alerts (
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, alert_id)
);

-- SOAR Playbooks
CREATE TABLE IF NOT EXISTS public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'alert', 'schedule', 'webhook')),
  trigger_conditions JSONB DEFAULT '{}', -- When to auto-trigger
  steps JSONB NOT NULL DEFAULT '[]', -- Ordered list of actions
  enabled BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playbook executions
CREATE TABLE IF NOT EXISTS public.playbook_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.alerts(id),
  incident_id UUID REFERENCES public.incidents(id),
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  triggered_by UUID REFERENCES public.profiles(id),
  trigger_type TEXT NOT NULL,
  steps_completed INTEGER DEFAULT 0,
  steps_total INTEGER NOT NULL,
  execution_log JSONB DEFAULT '[]',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- BEHAVIORAL ANALYSIS (UEBA)
-- ============================================

-- Operator behavioral profiles (DNA)
CREATE TABLE IF NOT EXISTS public.behavioral_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dna_vector JSONB NOT NULL DEFAULT '[]', -- 128-dim behavioral embedding
  keystroke_patterns JSONB DEFAULT '{}',
  mouse_patterns JSONB DEFAULT '{}',
  command_patterns JSONB DEFAULT '{}',
  session_patterns JSONB DEFAULT '{}',
  baseline_confidence DOUBLE PRECISION DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session activity logs
CREATE TABLE IF NOT EXISTS public.session_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'logout', 'command', 'navigation', 'asset_access', 'config_change', 'alert_action')),
  details JSONB DEFAULT '{}',
  risk_score DOUBLE PRECISION DEFAULT 0,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FIRMWARE & SUPPLY CHAIN
-- ============================================

-- Firmware baselines
CREATE TABLE IF NOT EXISTS public.firmware_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor TEXT NOT NULL,
  model TEXT NOT NULL,
  version TEXT NOT NULL,
  fingerprint JSONB NOT NULL DEFAULT '[]', -- 256-dim CFG fingerprint
  hash_sha256 TEXT NOT NULL,
  cfg_node_count INTEGER,
  cfg_edge_count INTEGER,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Firmware verification logs
CREATE TABLE IF NOT EXISTS public.firmware_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  baseline_id UUID REFERENCES public.firmware_baselines(id),
  new_fingerprint JSONB NOT NULL DEFAULT '[]',
  similarity_score DOUBLE PRECISION NOT NULL,
  is_suspicious BOOLEAN NOT NULL,
  verification_details JSONB DEFAULT '{}',
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MODEL INTEGRITY (Poisoning Defense)
-- ============================================

-- Merkle audit logs
CREATE TABLE IF NOT EXISTS public.merkle_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('data_sample', 'model_update', 'training_round', 'gradient_update')),
  entry_hash TEXT NOT NULL,
  parent_hash TEXT,
  root_hash TEXT,
  entry_data JSONB NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Federated learning rounds
CREATE TABLE IF NOT EXISTS public.federated_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.ml_models(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  participating_clients INTEGER NOT NULL,
  aggregation_method TEXT DEFAULT 'krum' CHECK (aggregation_method IN ('fedavg', 'krum', 'trimmed_mean', 'median')),
  byzantine_detected INTEGER DEFAULT 0,
  global_accuracy DOUBLE PRECISION,
  privacy_budget_spent DOUBLE PRECISION, -- Differential privacy epsilon
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT & COMPLIANCE
-- ============================================

-- Audit trail
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_org ON public.assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_alerts_org_status ON public.alerts(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON public.alerts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_org ON public.incidents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_telemetry_metric ON public.telemetry(organization_id, metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_session_activities_profile ON public.session_activities(profile_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firmware_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firmware_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merkle_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.federated_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Organizations: users can see their own org
CREATE POLICY "org_select_own" ON public.organizations FOR SELECT 
  USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Profiles: users can manage their own profile
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Profiles: users can see others in their org
CREATE POLICY "profiles_select_org" ON public.profiles FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Asset types: global read access
CREATE POLICY "asset_types_select_all" ON public.asset_types FOR SELECT TO authenticated USING (true);

-- Organization-scoped tables: check user's org membership
CREATE POLICY "assets_select_org" ON public.assets FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "assets_insert_org" ON public.assets FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "assets_update_org" ON public.assets FOR UPDATE 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "assets_delete_org" ON public.assets FOR DELETE 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "asset_rels_select_org" ON public.asset_relationships FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "asset_rels_insert_org" ON public.asset_relationships FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "data_sources_select_org" ON public.data_sources FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "data_sources_insert_org" ON public.data_sources FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "data_sources_update_org" ON public.data_sources FOR UPDATE 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "data_sources_delete_org" ON public.data_sources FOR DELETE 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "telemetry_select_org" ON public.telemetry FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "telemetry_insert_org" ON public.telemetry FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- ML Models: global read for authenticated users
CREATE POLICY "ml_models_select_all" ON public.ml_models FOR SELECT TO authenticated USING (true);

CREATE POLICY "detection_rules_select_org" ON public.detection_rules FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "detection_rules_insert_org" ON public.detection_rules FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "detection_rules_update_org" ON public.detection_rules FOR UPDATE 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "alerts_select_org" ON public.alerts FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "alerts_insert_org" ON public.alerts FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "alerts_update_org" ON public.alerts FOR UPDATE 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "alert_events_select" ON public.alert_events FOR SELECT 
  USING (alert_id IN (SELECT id FROM public.alerts WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "alert_events_insert" ON public.alert_events FOR INSERT 
  WITH CHECK (alert_id IN (SELECT id FROM public.alerts WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "incidents_select_org" ON public.incidents FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "incidents_insert_org" ON public.incidents FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "incidents_update_org" ON public.incidents FOR UPDATE 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "incident_alerts_select" ON public.incident_alerts FOR SELECT 
  USING (incident_id IN (SELECT id FROM public.incidents WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "incident_alerts_insert" ON public.incident_alerts FOR INSERT 
  WITH CHECK (incident_id IN (SELECT id FROM public.incidents WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "playbooks_select_org" ON public.playbooks FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "playbooks_insert_org" ON public.playbooks FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "playbooks_update_org" ON public.playbooks FOR UPDATE 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "playbook_execs_select" ON public.playbook_executions FOR SELECT 
  USING (playbook_id IN (SELECT id FROM public.playbooks WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "playbook_execs_insert" ON public.playbook_executions FOR INSERT 
  WITH CHECK (playbook_id IN (SELECT id FROM public.playbooks WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "behavioral_profiles_select_org" ON public.behavioral_profiles FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "behavioral_profiles_insert_org" ON public.behavioral_profiles FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "session_activities_select_org" ON public.session_activities FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "session_activities_insert_org" ON public.session_activities FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "firmware_baselines_select_org" ON public.firmware_baselines FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "firmware_baselines_insert_org" ON public.firmware_baselines FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "firmware_verifications_select_org" ON public.firmware_verifications FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "firmware_verifications_insert_org" ON public.firmware_verifications FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "merkle_logs_select_org" ON public.merkle_audit_logs FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "merkle_logs_insert_org" ON public.merkle_audit_logs FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "federated_rounds_select_org" ON public.federated_rounds FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "federated_rounds_insert_org" ON public.federated_rounds FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "audit_logs_select_org" ON public.audit_logs FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "audit_logs_insert_org" ON public.audit_logs FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
