// Database types for OT/ICS Security Platform

export type ThreatType = 
  | 'fdi_sensor_spoofing'
  | 'ransomware'
  | 'der_attack'
  | 'physical_sabotage'
  | 'firmware_supply_chain'
  | 'ddos'
  | 'insider_threat'
  | 'model_poisoning';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertStatus = 'new' | 'investigating' | 'confirmed' | 'resolved' | 'false_positive';

export type IncidentStatus = 'open' | 'investigating' | 'contained' | 'eradicated' | 'recovered' | 'closed';

export type AssetType = 
  | 'plc'
  | 'rtu'
  | 'hmi'
  | 'scada_server'
  | 'historian'
  | 'engineering_workstation'
  | 'network_device'
  | 'sensor'
  | 'actuator'
  | 'der_inverter'
  | 'der_battery'
  | 'der_ev_charger';

export type AssetStatus = 'online' | 'offline' | 'maintenance' | 'compromised' | 'unknown';

export type DataSourceType = 
  | 'modbus_tcp'
  | 'modbus_rtu'
  | 'opcua'
  | 'dnp3'
  | 'mqtt'
  | 'kafka'
  | 'api'
  | 'csv'
  | 'simulator';

export type ModelStatus = 'active' | 'training' | 'inactive' | 'deprecated';

export type PlaybookStatus = 'active' | 'draft' | 'archived';

export type ActionType = 
  | 'isolate_asset'
  | 'block_ip'
  | 'notify_team'
  | 'create_ticket'
  | 'run_script'
  | 'quarantine'
  | 'snapshot'
  | 'escalate';

// Database row types
export interface Organization {
  id: string;
  name: string;
  sector: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'analyst' | 'operator' | 'viewer';
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  organization_id: string;
  name: string;
  type: AssetType;
  vendor: string | null;
  model: string | null;
  firmware_version: string | null;
  ip_address: string | null;
  mac_address: string | null;
  location: string | null;
  zone: string | null;
  criticality: number;
  status: AssetStatus;
  last_seen: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DataSource {
  id: string;
  organization_id: string;
  name: string;
  type: DataSourceType;
  config: DataSourceConfig;
  status: 'active' | 'inactive' | 'error';
  last_poll: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataSourceConfig {
  host?: string;
  port?: number;
  protocol?: string;
  topic?: string;
  broker?: string;
  polling_interval?: number;
  auth?: {
    type: 'none' | 'basic' | 'certificate' | 'token';
    username?: string;
    password?: string;
    certificate?: string;
    token?: string;
  };
  [key: string]: unknown;
}

export interface TelemetryPoint {
  id: string;
  organization_id: string;
  asset_id: string;
  data_source_id: string | null;
  timestamp: string;
  tag_name: string;
  value: number;
  quality: number;
  unit: string | null;
  metadata: Record<string, unknown>;
}

export interface Alert {
  id: string;
  organization_id: string;
  threat_type: ThreatType;
  severity: Severity;
  status: AlertStatus;
  title: string;
  description: string;
  asset_id: string | null;
  model_id: string | null;
  confidence: number;
  raw_data: Record<string, unknown>;
  mitre_tactics: string[];
  mitre_techniques: string[];
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  asset?: Asset;
  model?: MLModel;
  assignee?: UserProfile;
}

export interface Incident {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  lead_analyst: string | null;
  affected_assets: string[];
  related_alerts: string[];
  timeline: IncidentTimelineEntry[];
  containment_actions: string[];
  eradication_actions: string[];
  recovery_actions: string[];
  lessons_learned: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface IncidentTimelineEntry {
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

export interface Playbook {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  trigger_conditions: PlaybookTrigger;
  actions: PlaybookAction[];
  status: PlaybookStatus;
  execution_count: number;
  last_executed: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaybookTrigger {
  threat_types?: ThreatType[];
  severity_threshold?: Severity;
  asset_types?: AssetType[];
  confidence_threshold?: number;
  custom_conditions?: Record<string, unknown>;
}

export interface PlaybookAction {
  id: string;
  type: ActionType;
  order: number;
  config: Record<string, unknown>;
  condition?: string;
  timeout_seconds?: number;
  on_failure?: 'continue' | 'abort' | 'retry';
  retry_count?: number;
}

export interface PlaybookExecution {
  id: string;
  playbook_id: string;
  alert_id: string | null;
  incident_id: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  actions_executed: ExecutedAction[];
  error_message: string | null;
}

export interface ExecutedAction {
  action_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string;
  completed_at?: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface MLModel {
  id: string;
  name: string;
  type: string;
  version: string;
  description: string | null;
  config: Record<string, unknown>;
  accuracy: number | null;
  precision_score: number | null;
  recall: number | null;
  f1_score: number | null;
  status: ModelStatus;
  trained_at: string | null;
  training_data_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface ModelPrediction {
  id: string;
  model_id: string;
  organization_id: string;
  input_data: Record<string, unknown>;
  prediction: Record<string, unknown>;
  confidence: number;
  latency_ms: number;
  alert_generated: boolean;
  alert_id: string | null;
  created_at: string;
}

export interface BehavioralProfile {
  id: string;
  organization_id: string;
  user_id: string;
  profile_vector: number[];
  keystroke_patterns: Record<string, unknown>;
  mouse_patterns: Record<string, unknown>;
  command_patterns: Record<string, unknown>;
  session_patterns: Record<string, unknown>;
  baseline_sessions: number;
  last_updated: string;
  created_at: string;
}

export interface FirmwareBaseline {
  id: string;
  organization_id: string;
  asset_id: string;
  vendor: string;
  model: string;
  version: string;
  cfg_fingerprint: number[];
  hash_sha256: string;
  is_verified: boolean;
  verification_date: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalAssets: number;
  assetsOnline: number;
  assetsOffline: number;
  assetsCompromised: number;
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  openIncidents: number;
  activePlaybooks: number;
  telemetryPointsToday: number;
  modelPredictionsToday: number;
}

export interface ThreatDistribution {
  type: ThreatType;
  count: number;
  percentage: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface AlertTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// Real-time types
export interface RealtimeTelemetry {
  asset_id: string;
  tag_name: string;
  value: number;
  timestamp: string;
  anomaly_score?: number;
}

export interface RealtimeAlert {
  id: string;
  threat_type: ThreatType;
  severity: Severity;
  title: string;
  asset_name?: string;
  confidence: number;
  created_at: string;
}

// ML Engine types
export interface PINNPrediction {
  stateEstimate: number[];
  physicsResidual: number;
  anomalyScore: number;
  attackProbability: number;
  suspectedSensors: string[];
}

export interface RansomwareDetection {
  isPreEncryption: boolean;
  confidence: number;
  indicators: string[];
  fileEntropyDelta: number;
  suspiciousProcesses: string[];
  recommendedAction: string;
}

export interface DERAttackDetection {
  isAnomaly: boolean;
  anomalyScore: number;
  attackType: 'demand_manipulation' | 'frequency_attack' | 'data_exfiltration' | 'firmware_tampering' | 'none';
  confidence: number;
  affectedDevices: string[];
}

export interface PhysicalThreatDetection {
  isThreat: boolean;
  threatScore: number;
  visualConfidence: number;
  sensorConfidence: number;
  detectedObjects: {
    class: string;
    confidence: number;
    boundingBox: [number, number, number, number];
  }[];
  fusionResult: 'confirmed' | 'visual_only' | 'sensor_only' | 'none';
}

export interface FirmwareAnalysis {
  isSuspicious: boolean;
  similarity: number;
  fingerprint: number[];
  riskScore: number;
  deviations: string[];
  recommendation: 'approve' | 'quarantine' | 'reject';
}

export interface DDoSMitigation {
  isAttack: boolean;
  attackType: 'volumetric' | 'protocol' | 'application' | 'none';
  severity: number;
  rateLimits: Record<string, number>;
  blockedIPs: string[];
  trafficReduction: number;
}

export interface InsiderThreatDetection {
  authScore: number;
  isAnomalous: boolean;
  deviationFactors: string[];
  riskLevel: 'high' | 'medium' | 'low' | 'none';
  recommendedAction: 'block' | 'challenge' | 'monitor' | 'allow';
}

export interface ModelIntegrityCheck {
  isCompromised: boolean;
  integrityScore: number;
  suspiciousUpdates: string[];
  byzantineClients: string[];
  recommendation: string;
}
