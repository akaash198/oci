-- Seed data for OT/ICS Cybersecurity Platform

-- ============================================
-- ASSET TYPES
-- ============================================
INSERT INTO public.asset_types (id, name, category, icon) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Programmable Logic Controller', 'plc', 'cpu'),
  ('a1000000-0000-0000-0000-000000000002', 'Remote Terminal Unit', 'rtu', 'radio'),
  ('a1000000-0000-0000-0000-000000000003', 'Human Machine Interface', 'hmi', 'monitor'),
  ('a1000000-0000-0000-0000-000000000004', 'SCADA Server', 'scada', 'server'),
  ('a1000000-0000-0000-0000-000000000005', 'Temperature Sensor', 'sensor', 'thermometer'),
  ('a1000000-0000-0000-0000-000000000006', 'Pressure Sensor', 'sensor', 'gauge'),
  ('a1000000-0000-0000-0000-000000000007', 'Flow Meter', 'sensor', 'droplets'),
  ('a1000000-0000-0000-0000-000000000008', 'Motor Actuator', 'actuator', 'cog'),
  ('a1000000-0000-0000-0000-000000000009', 'Valve Actuator', 'actuator', 'valve'),
  ('a1000000-0000-0000-0000-000000000010', 'Industrial Switch', 'network', 'network'),
  ('a1000000-0000-0000-0000-000000000011', 'Industrial Firewall', 'network', 'shield'),
  ('a1000000-0000-0000-0000-000000000012', 'Engineering Workstation', 'workstation', 'laptop'),
  ('a1000000-0000-0000-0000-000000000013', 'Historian Server', 'server', 'database'),
  ('a1000000-0000-0000-0000-000000000014', 'Solar Inverter', 'der', 'sun'),
  ('a1000000-0000-0000-0000-000000000015', 'Battery Storage', 'der', 'battery'),
  ('a1000000-0000-0000-0000-000000000016', 'EV Charger', 'der', 'plug'),
  ('a1000000-0000-0000-0000-000000000017', 'Smart Meter', 'sensor', 'zap')
ON CONFLICT DO NOTHING;

-- ============================================
-- ML MODELS
-- ============================================
INSERT INTO public.ml_models (id, name, type, version, description, accuracy, status) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'PINN-FDI-PowerGrid', 'pinn_fdi', '1.0.0', 
   'Physics-Informed Neural Network for False Data Injection detection in power grids. Uses AC power flow equations as physics constraints.',
   0.967, 'active'),
  
  ('b1000000-0000-0000-0000-000000000002', 'cGAN-Ransomware-Detector', 'cgan_ransomware', '1.0.0',
   'Conditional GAN with Transformer encoder for pre-encryption ransomware detection. Trained on OT workstation behavior.',
   0.943, 'active'),
  
  ('b1000000-0000-0000-0000-000000000003', 'TinyML-DER-Anomaly', 'tinyml_der', '1.0.0',
   'Lightweight model for DER attack detection. INT8 quantized for edge deployment on ESP32/STM32.',
   0.891, 'active'),
  
  ('b1000000-0000-0000-0000-000000000004', 'YOLOv9-Physical-Threat', 'yolo_physical', '1.0.0',
   'YOLOv9 fine-tuned for physical threat detection in OT environments. Detects persons, vehicles, drones, tools.',
   0.958, 'active'),
  
  ('b1000000-0000-0000-0000-000000000005', 'GraphMamba-Firmware', 'graph_mamba_firmware', '1.0.0',
   'Graph Mamba model for CFG fingerprinting. Uses selective state spaces for efficient firmware analysis.',
   0.934, 'active'),
  
  ('b1000000-0000-0000-0000-000000000006', 'SAC-DDoS-Mitigator', 'drl_ddos', '1.0.0',
   'Soft Actor-Critic agent for adaptive traffic shaping. Learns optimal rate limiting policies.',
   0.912, 'active'),
  
  ('b1000000-0000-0000-0000-000000000007', 'BehavioralDNA-Profiler', 'behavioral_dna', '1.0.0',
   'Siamese network for per-operator behavioral profiling. Extracts 128-dim DNA vectors from interaction patterns.',
   0.978, 'active'),
  
  ('b1000000-0000-0000-0000-000000000008', 'Krum-Federated-Aggregator', 'federated_aggregator', '1.0.0',
   'Byzantine-resilient aggregator using Krum algorithm with PGD adversarial training.',
   0.956, 'active')
ON CONFLICT DO NOTHING;
