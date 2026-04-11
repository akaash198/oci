-- Seed data for OT/ICS Security Platform
-- Run this after the schema migration to populate with demo data

-- First, seed ML Models (no org dependency)
INSERT INTO ml_models (name, type, version, description, status, accuracy, config) VALUES
('Physics-Informed FDI Detection', 'pinn_fdi', '2.1.0', 'Detects false data injection attacks using physics-based neural networks', 'active', 0.967, '{"threshold": 0.85, "window_size": 100}'),
('cGAN Ransomware Detection', 'cgan_ransomware', '1.5.0', 'Detects pre-encryption ransomware activity using conditional GANs', 'active', 0.943, '{"sensitivity": "high"}'),
('TinyML DER Attack Detection', 'tinyml_der', '1.2.0', 'Edge-deployed model for DER manipulation detection', 'active', 0.891, '{"edge_compatible": true}'),
('YOLOv9 Physical Threat', 'yolo_physical', '9.0.1', 'Real-time physical intrusion detection via camera feeds', 'active', 0.958, '{"confidence_threshold": 0.7}'),
('Graph Mamba Firmware Analysis', 'graph_mamba_firmware', '1.0.0', 'Firmware tampering detection via control flow analysis', 'training', 0.934, '{"analysis_depth": "deep"}'),
('DRL DDoS Mitigation', 'drl_ddos', '2.0.0', 'Deep reinforcement learning for DDoS detection and mitigation', 'active', 0.912, '{"action_space": "discrete"}'),
('Behavioral DNA Profiler', 'behavioral_dna', '1.3.0', 'Insider threat detection via behavioral pattern analysis', 'active', 0.978, '{"profile_window_days": 30}'),
('Krum Federated Aggregator', 'federated_aggregator', '1.1.0', 'Byzantine-resilient model aggregation for distributed learning', 'active', 0.956, '{"byzantine_threshold": 0.3}')
ON CONFLICT DO NOTHING;

-- Seed Asset Types (no org dependency)
-- Valid categories: plc, rtu, hmi, scada, sensor, actuator, network, workstation, server, der, other
INSERT INTO asset_types (id, name, category, icon) VALUES
('a1000000-0000-0000-0000-000000000001', 'PLC', 'plc', 'cpu'),
('a1000000-0000-0000-0000-000000000002', 'RTU', 'rtu', 'server'),
('a1000000-0000-0000-0000-000000000003', 'HMI', 'hmi', 'monitor'),
('a1000000-0000-0000-0000-000000000004', 'SCADA Server', 'scada', 'database'),
('a1000000-0000-0000-0000-000000000005', 'Historian', 'server', 'hard-drive'),
('a1000000-0000-0000-0000-000000000006', 'Sensor', 'sensor', 'activity'),
('a1000000-0000-0000-0000-000000000007', 'Network Device', 'network', 'network'),
('a1000000-0000-0000-0000-000000000008', 'DER Inverter', 'der', 'zap')
ON CONFLICT DO NOTHING;

-- Create a demo organization
INSERT INTO organizations (id, name, slug, sector, settings) VALUES
('d1000000-0000-0000-0000-000000000001', 'Energy Corp Demo', 'energy-corp-demo', 'energy', '{"timezone": "UTC", "alerting_enabled": true}')
ON CONFLICT DO NOTHING;

-- Seed Assets (with organization_id and asset_type_id)
-- Valid statuses: active, inactive, maintenance, decommissioned
INSERT INTO assets (name, organization_id, asset_type_id, ip_address, mac_address, location, criticality, vendor, model, firmware_version, status, zone, properties) VALUES
('PLC-001', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '192.168.1.10', '00:1B:44:11:3A:B7', 'Zone 1 - Production', 'critical', 'Siemens', 'S7-1500', '2.9.3', 'active', 'Zone 1', '{"rack": 1, "slot": 1, "protocol": "profinet"}'),
('PLC-002', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '192.168.1.11', '00:1B:44:11:3A:B8', 'Zone 1 - Production', 'critical', 'Allen-Bradley', 'ControlLogix 5580', '33.011', 'maintenance', 'Zone 1', '{"alerts": 3, "protocol": "ethernet_ip"}'),
('RTU-Gateway-01', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', '192.168.1.20', '00:1B:44:11:3A:C1', 'Zone 2 - Substation', 'high', 'ABB', 'RTU560', '12.1.0', 'active', 'Zone 2', '{"protocol": "dnp3"}'),
('RTU-Gateway-02', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', '192.168.1.21', '00:1B:44:11:3A:C2', 'Zone 2 - Substation', 'high', 'ABB', 'RTU560', '12.1.0', 'active', 'Zone 2', '{"protocol": "dnp3"}'),
('HMI-Control-Room', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', '192.168.1.30', '00:1B:44:11:3A:D1', 'Zone 1 - Control Room', 'high', 'Rockwell', 'PanelView Plus 7', '12.0', 'active', 'Zone 1', '{"protocol": "ethernet_ip"}'),
('SCADA-Server-01', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', '192.168.1.100', '00:1B:44:11:3A:E1', 'Zone 3 - DMZ', 'critical', 'GE Digital', 'iFIX 6.5', '6.5.1', 'active', 'Zone 3', '{"protocol": "opc_ua"}'),
('Historian-Server', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', '192.168.1.101', '00:1B:44:11:3A:E2', 'Zone 3 - DMZ', 'medium', 'OSIsoft', 'PI Server', '2021', 'active', 'Zone 3', '{"protocol": "opc_da"}'),
('Smart-Meter-001', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', '192.168.1.50', '00:1B:44:11:3A:F1', 'Zone 2 - Metering', 'low', 'Schneider', 'ION9000', '4.0', 'inactive', 'Zone 2', '{"protocol": "modbus_tcp"}'),
('Smart-Meter-002', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', '192.168.1.51', '00:1B:44:11:3A:F2', 'Zone 2 - Metering', 'low', 'Schneider', 'ION9000', '4.0', 'active', 'Zone 2', '{"protocol": "modbus_tcp"}'),
('Firewall-OT', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000007', '192.168.1.1', '00:1B:44:11:3A:01', 'Zone 0 - Perimeter', 'critical', 'Fortinet', 'FortiGate 60F', '7.2.4', 'active', 'Zone 0', '{"protocol": "snmp"}'),
('Switch-Core-01', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000007', '192.168.1.2', '00:1B:44:11:3A:02', 'Zone 0 - Core', 'critical', 'Cisco', 'Catalyst 9300', '17.6.3', 'active', 'Zone 0', '{"protocol": "snmp"}'),
('Solar-Inverter-01', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000008', '192.168.2.10', '00:1B:44:22:AA:01', 'Zone 2 - Solar Farm', 'medium', 'SMA', 'Sunny Tripower', '3.2.1', 'active', 'Zone 2', '{"protocol": "modbus_tcp"}')
ON CONFLICT DO NOTHING;

-- Seed Alerts (with proper column names matching schema)
-- Valid statuses: open, acknowledged, investigating, resolved, false_positive, escalated
INSERT INTO alerts (organization_id, asset_id, threat_type, severity, title, description, status, confidence, evidence) 
SELECT 
    'd1000000-0000-0000-0000-000000000001',
    a.id,
    'fdi_sensor_spoofing',
    'critical',
    'FDI Attack Detected - Voltage Sensor Manipulation',
    'Physics-informed neural network detected anomalous state estimation residuals indicating potential false data injection attack on voltage sensors.',
    'open',
    0.967,
    '{"residual": 0.847, "threshold": 0.5, "sensor_id": "VS-001"}'
FROM assets a WHERE a.name = 'PLC-001' LIMIT 1;

INSERT INTO alerts (organization_id, asset_id, threat_type, severity, title, description, status, confidence, evidence)
SELECT 
    'd1000000-0000-0000-0000-000000000001',
    a.id,
    'ransomware_staging',
    'critical',
    'Pre-encryption Ransomware Activity Detected',
    'cGAN model detected file system reconnaissance patterns and shadow copy deletion attempts consistent with ransomware staging behavior.',
    'acknowledged',
    0.943,
    '{"pattern": "shadow_copy_deletion", "confidence": 0.943}'
FROM assets a WHERE a.name = 'HMI-Control-Room' LIMIT 1;

INSERT INTO alerts (organization_id, asset_id, threat_type, severity, title, description, status, confidence, evidence)
SELECT 
    'd1000000-0000-0000-0000-000000000001',
    a.id,
    'ddos_flood',
    'high',
    'Modbus Protocol Flood Detected',
    'DRL-based DDoS detection identified abnormal Modbus/TCP traffic patterns exceeding baseline by 340%.',
    'investigating',
    0.912,
    '{"traffic_increase": 340, "baseline_pps": 1000, "current_pps": 4400}'
FROM assets a WHERE a.name = 'PLC-002' LIMIT 1;

INSERT INTO alerts (organization_id, asset_id, threat_type, severity, title, description, status, confidence, evidence)
SELECT 
    'd1000000-0000-0000-0000-000000000001',
    a.id,
    'insider_threat',
    'high',
    'Anomalous Operator Behavior Detected',
    'Behavioral DNA profiler detected significant deviation from established operator patterns including unusual access times and command sequences.',
    'open',
    0.978,
    '{"deviation_score": 0.89, "anomalous_commands": 7}'
FROM assets a WHERE a.name = 'SCADA-Server-01' LIMIT 1;

INSERT INTO alerts (organization_id, asset_id, threat_type, severity, title, description, status, confidence, evidence)
SELECT 
    'd1000000-0000-0000-0000-000000000001',
    a.id,
    'firmware_tampering',
    'medium',
    'Firmware Integrity Deviation',
    'Graph Mamba analysis detected control flow graph deviations from baseline firmware indicating potential tampering.',
    'resolved',
    0.934,
    '{"cfg_deviation": 0.23, "suspicious_functions": 2}'
FROM assets a WHERE a.name = 'RTU-Gateway-01' LIMIT 1;

INSERT INTO alerts (organization_id, asset_id, threat_type, severity, title, description, status, confidence, evidence)
SELECT 
    'd1000000-0000-0000-0000-000000000001',
    a.id,
    'physical_intrusion',
    'medium',
    'Unauthorized Personnel in Restricted Zone',
    'YOLOv9 physical threat detection identified unrecognized individual in restricted substation area.',
    'investigating',
    0.958,
    '{"camera_zone": 7, "person_id": "unknown", "confidence": 0.958}'
FROM assets a WHERE a.name = 'RTU-Gateway-02' LIMIT 1;

INSERT INTO alerts (organization_id, asset_id, threat_type, severity, title, description, status, confidence, evidence)
SELECT 
    'd1000000-0000-0000-0000-000000000001',
    a.id,
    'der_manipulation',
    'low',
    'DER Setpoint Anomaly Detected',
    'TinyML edge model detected unusual power setpoint changes in solar inverter that deviate from expected patterns.',
    'resolved',
    0.891,
    '{"setpoint_deviation": 15.2, "expected_range": [95, 105]}'
FROM assets a WHERE a.name = 'Solar-Inverter-01' LIMIT 1;

-- Seed Data Sources (with organization_id)
-- Valid types: modbus_tcp, modbus_rtu, opcua, dnp3, mqtt, kafka, api, csv, simulator
-- Valid statuses: active, inactive, error, connecting
INSERT INTO data_sources (organization_id, name, type, status, config) VALUES
('d1000000-0000-0000-0000-000000000001', 'Modbus Gateway 1', 'modbus_tcp', 'active', '{"host": "192.168.1.100", "port": 502, "unit_id": 1, "polling_interval_ms": 1000}'),
('d1000000-0000-0000-0000-000000000001', 'OPC-UA Server', 'opcua', 'active', '{"endpoint": "opc.tcp://192.168.1.100:4840", "security_mode": "SignAndEncrypt", "namespace": "ns=2"}'),
('d1000000-0000-0000-0000-000000000001', 'DNP3 Outstation', 'dnp3', 'active', '{"host": "192.168.1.20", "port": 20000, "master_address": 1, "outstation_address": 10}'),
('d1000000-0000-0000-0000-000000000001', 'MQTT Broker', 'mqtt', 'active', '{"broker": "mqtt://192.168.1.150:1883", "topic": "ot/telemetry/#", "qos": 1}'),
('d1000000-0000-0000-0000-000000000001', 'Historian REST API', 'api', 'active', '{"url": "https://historian.local/api/v1", "auth": "bearer", "refresh_interval_s": 60}'),
('d1000000-0000-0000-0000-000000000001', 'Data Simulator', 'simulator', 'active', '{"mode": "realistic", "assets": ["PLC-001", "PLC-002", "RTU-Gateway-01"]}')
ON CONFLICT DO NOTHING;

-- Seed Playbooks (with organization_id)
INSERT INTO playbooks (organization_id, name, description, trigger_conditions, steps, enabled, trigger_type) VALUES
('d1000000-0000-0000-0000-000000000001', 'FDI Attack Response', 'Automated response to detected false data injection attacks', 
 '{"threat_type": "fdi_sensor_spoofing", "severity": ["critical", "high"]}',
 '[{"action": "isolate_sensor", "params": {"duration_minutes": 5}}, {"action": "alert_operator", "params": {"priority": "urgent"}}, {"action": "switch_to_backup", "params": {}}, {"action": "forensic_capture", "params": {"duration_seconds": 300}}]',
 true, 'alert'),

('d1000000-0000-0000-0000-000000000001', 'Ransomware Containment', 'Immediate containment for ransomware detection',
 '{"threat_type": "ransomware_staging", "severity": ["critical"]}',
 '[{"action": "network_isolate", "params": {"scope": "asset"}}, {"action": "snapshot_disk", "params": {}}, {"action": "alert_soc", "params": {"channel": "emergency"}}, {"action": "block_c2", "params": {"dynamic": true}}]',
 true, 'alert'),

('d1000000-0000-0000-0000-000000000001', 'DDoS Mitigation', 'Traffic filtering and rate limiting for DDoS attacks',
 '{"threat_type": "ddos_flood", "severity": ["critical", "high", "medium"]}',
 '[{"action": "rate_limit", "params": {"threshold_pps": 1000}}, {"action": "enable_geo_filter", "params": {}}, {"action": "scale_resources", "params": {"factor": 2}}, {"action": "notify_upstream", "params": {}}]',
 true, 'alert'),

('d1000000-0000-0000-0000-000000000001', 'Insider Threat Investigation', 'Investigation workflow for insider threat alerts',
 '{"threat_type": "insider_threat", "severity": ["high", "medium"]}',
 '[{"action": "session_record", "params": {"retention_days": 90}}, {"action": "privilege_review", "params": {}}, {"action": "alert_hr", "params": {}}, {"action": "create_investigation", "params": {"priority": "high"}}]',
 false, 'alert'),

('d1000000-0000-0000-0000-000000000001', 'Physical Security Response', 'Response to physical intrusion detection',
 '{"threat_type": "physical_intrusion", "severity": ["critical", "high", "medium"]}',
 '[{"action": "lock_doors", "params": {"zone": "affected"}}, {"action": "alert_security", "params": {}}, {"action": "start_recording", "params": {"cameras": "all_zone"}}, {"action": "notify_local_authorities", "params": {"auto": false}}]',
 false, 'alert'),

('d1000000-0000-0000-0000-000000000001', 'Model Poisoning Defense', 'Automated defense against ML model poisoning attempts',
 '{"threat_type": "model_poisoning", "severity": ["critical", "high"]}',
 '[{"action": "quarantine_update", "params": {}}, {"action": "run_integrity_check", "params": {"method": "merkle"}}, {"action": "notify_ml_ops", "params": {}}, {"action": "rollback_model", "params": {"auto": false}}]',
 true, 'alert'),

('d1000000-0000-0000-0000-000000000001', 'Firmware Verification', 'Verification workflow for firmware updates',
 '{"threat_type": "firmware_tampering", "severity": ["high", "medium"]}',
 '[{"action": "hold_update", "params": {}}, {"action": "analyze_cfg", "params": {"method": "graph_mamba"}}, {"action": "compare_baseline", "params": {}}, {"action": "approve_or_reject", "params": {"manual": true}}]',
 true, 'alert'),

('d1000000-0000-0000-0000-000000000001', 'DER Attack Response', 'Response to attacks on distributed energy resources',
 '{"threat_type": "der_manipulation", "severity": ["critical", "high"]}',
 '[{"action": "isolate_der", "params": {}}, {"action": "verify_setpoints", "params": {}}, {"action": "notify_grid_operator", "params": {}}, {"action": "restore_safe_state", "params": {}}]',
 true, 'alert')
ON CONFLICT DO NOTHING;

-- Seed some telemetry data for charts
INSERT INTO telemetry (organization_id, asset_id, metric_name, metric_value, unit, timestamp)
SELECT 
    'd1000000-0000-0000-0000-000000000001',
    a.id,
    'voltage',
    119.5 + (random() * 2 - 1),
    'V',
    NOW() - (n || ' minutes')::interval
FROM assets a, generate_series(1, 60) n
WHERE a.name = 'PLC-001';

INSERT INTO telemetry (organization_id, asset_id, metric_name, metric_value, unit, timestamp)
SELECT 
    'd1000000-0000-0000-0000-000000000001',
    a.id,
    'current',
    45.0 + (random() * 5 - 2.5),
    'A',
    NOW() - (n || ' minutes')::interval
FROM assets a, generate_series(1, 60) n
WHERE a.name = 'PLC-001';

INSERT INTO telemetry (organization_id, asset_id, metric_name, metric_value, unit, timestamp)
SELECT 
    'd1000000-0000-0000-0000-000000000001',
    a.id,
    'power',
    5000 + (random() * 500 - 250),
    'W',
    NOW() - (n || ' minutes')::interval
FROM assets a, generate_series(1, 60) n
WHERE a.name = 'Solar-Inverter-01';

-- Seed Incidents
-- Valid statuses: open, investigating, contained, eradicated, recovered, closed
INSERT INTO incidents (organization_id, title, description, severity, status, started_at)
VALUES
('d1000000-0000-0000-0000-000000000001', 'Coordinated FDI Attack on Substation A', 'Multiple FDI attacks detected across voltage sensors in Substation A. Physics-based detection identified coordinated manipulation pattern.', 'critical', 'investigating', NOW() - interval '2 hours'),
('d1000000-0000-0000-0000-000000000001', 'Ransomware Containment - HMI Workstation', 'Pre-encryption ransomware activity detected and contained on HMI workstation. No encryption occurred, system isolated for forensics.', 'critical', 'contained', NOW() - interval '1 day'),
('d1000000-0000-0000-0000-000000000001', 'Suspicious Operator Activity Investigation', 'Behavioral DNA profiler flagged unusual command patterns from operator account. Investigation ongoing.', 'high', 'investigating', NOW() - interval '6 hours')
ON CONFLICT DO NOTHING;
