export interface DatasetColumn {
  name: string;
  type: string;
  description: string;
}

export interface TrainingDatasetRecommendation {
  id: string;
  attack_threat_type: string;
  recommended_model: string;
  datasets: string[];
  columns?: DatasetColumn[];
  sample_data?: Record<string, any>[];
}

const DATASET_CATALOG: TrainingDatasetRecommendation[] = [
  {
    id: "fdi_sensor_spoofing",
    attack_threat_type: "FDI & Sensor Spoofing",
    recommended_model: "PINN (Physics-Informed)",
    datasets: ["IEEE Power System FDI Dataset (30-bus, 118-bus)"],
    columns: [
      { name: "bus_id", type: "integer", description: "IEEE Bus identification number" },
      { name: "p_mw", type: "float", description: "Active power in Megawatts" },
      { name: "q_mvar", type: "float", description: "Reactive power in Megavolt-Amperes" },
      { name: "va_deg", type: "float", description: "Voltage angle in degrees" },
      { name: "fdi_label", type: "boolean", description: "Injection attack indicator" }
    ],
    sample_data: [
      { bus_id: 1, p_mw: 14.2, q_mvar: 2.1, va_deg: 0.0, fdi_label: false },
      { bus_id: 2, p_mw: 22.4, q_mvar: 4.5, va_deg: -1.2, fdi_label: true },
      { bus_id: 3, p_mw: 18.1, q_mvar: 3.2, va_deg: -0.5, fdi_label: false }
    ]
  },
  {
    id: "ransomware",
    attack_threat_type: "OT Ransomware",
    recommended_model: "cGAN + Transformer",
    datasets: ["UGRansome Dataset"],
    columns: [
      { name: "timestamp", type: "datetime", description: "Network capture time" },
      { name: "protocol", type: "string", description: "Industrial protocol (SMB/RDP/RPC)" },
      { name: "entropy_ratio", type: "float", description: "Data entropy (encryption indicator)" },
      { name: "file_access_freq", type: "integer", description: "I/O frequency per second" },
      { name: "threat_score", type: "float", description: "ML-computed risk level" }
    ],
    sample_data: [
      { timestamp: "2026-04-09 10:11:02", protocol: "SMBv3", entropy_ratio: 0.12, file_access_freq: 4, threat_score: 0.01 },
      { timestamp: "2026-04-09 10:11:05", protocol: "SMBv3", entropy_ratio: 0.94, file_access_freq: 852, threat_score: 0.98 },
      { timestamp: "2026-04-09 10:11:08", protocol: "RDP", entropy_ratio: 0.55, file_access_freq: 12, threat_score: 0.15 }
    ]
  },
  {
    id: "der_attack",
    attack_threat_type: "DER & Edge Attacks",
    recommended_model: "TinyML + Federated Learning",
    datasets: ["CIC-IoMT2024"],
    columns: [
      { name: "device_id", type: "string", description: "Smart inverter/Edge device ID" },
      { name: "current_l1", type: "float", description: "Phase L1 current output" },
      { name: "frequency_hz", type: "float", description: "Grid frequency measurement" },
      { name: "modbus_func", type: "integer", description: "Last Modbus function code" },
      { name: "is_anomaly", type: "boolean", description: "Ground truth anomaly tag" }
    ],
    sample_data: [
      { device_id: "INV-001", current_l1: 45.2, frequency_hz: 60.01, modbus_func: 3, is_anomaly: false },
      { device_id: "INV-001", current_l1: 12.0, frequency_hz: 58.42, modbus_func: 16, is_anomaly: true },
      { device_id: "INV-002", current_l1: 44.8, frequency_hz: 59.99, modbus_func: 3, is_anomaly: false }
    ]
  },
  {
    id: "physical_sabotage",
    attack_threat_type: "Physical Sabotage",
    recommended_model: "YOLOv9 + LSTM",
    datasets: ["Industrial Package Dataset", "UCF-Crime"],
    columns: [
      { name: "frame_id", type: "integer", description: "Video frame sequence index" },
      { name: "object_class", type: "string", description: "Detected object (Human/Tool/Valve)" },
      { name: "zone_breach", type: "boolean", description: "Proximity alarm status" },
      { name: "motion_vector", type: "float", description: "Velocity of movement" }
    ],
    sample_data: [
      { frame_id: 1042, object_class: "Toolbox", zone_breach: false, motion_vector: 0.2 },
      { frame_id: 1045, object_class: "Human", zone_breach: true, motion_vector: 4.8 },
      { frame_id: 1048, object_class: "Wrench", zone_breach: true, motion_vector: 8.5 }
    ]
  },
  {
    id: "firmware_supply_chain",
    attack_threat_type: "Firmware & Supply Chain",
    recommended_model: "Graph Mamba (CFG)",
    datasets: ["HUST-FIRM (CFG Firmware Dataset)"],
    columns: [
      { name: "binary_hash", type: "string", description: "Firmware binary SHA-256" },
      { name: "node_count", type: "integer", description: "Control Flow Graph nodes" },
      { name: "edge_count", type: "integer", description: "Control Flow Graph edges" },
      { name: "cyclomatic_complexity", type: "integer", description: "Software complexity metric" },
      { name: "malicious_entry", type: "boolean", description: "Backdoor detection label" }
    ],
    sample_data: [
      { binary_hash: "a4f2...e31", node_count: 450, edge_count: 820, cyclomatic_complexity: 12, malicious_entry: false },
      { binary_hash: "8c12...f92", node_count: 120, edge_count: 240, cyclomatic_complexity: 45, malicious_entry: true }
    ]
  },
  {
    id: "ddos",
    attack_threat_type: "DoS/DDoS Traffic",
    recommended_model: "DRL Adaptive Shaping",
    datasets: ["CIC-DDoS2019"],
    columns: [
      { name: "src_ip", type: "string", description: "Source IPv4 mapping" },
      { name: "pps", type: "float", description: "Packets per second" },
      { name: "flow_duration_ms", type: "integer", description: "Total connection time" },
      { name: "attack_type", type: "string", description: "DDoS category (UDP/SYN/ICMP)" }
    ],
    sample_data: [
      { src_ip: "10.0.5.122", pps: 120.5, flow_duration_ms: 450, attack_type: "Benign" },
      { src_ip: "192.168.1.50", pps: 1250000.0, flow_duration_ms: 12, attack_type: "UDP-Flood" }
    ]
  },
  {
    id: "insider_threat",
    attack_threat_type: "Insider Threat",
    recommended_model: "Behavioral DNA Profiling",
    datasets: ["CERT Insider Threat Dataset"],
    columns: [
      { name: "user_id", type: "string", description: "Employee pseudonymized ID" },
      { name: "action", type: "string", description: "System action (Logon/File/USB)" },
      { name: "work_day_delta", type: "float", description: "Deviation from standard hours" },
      { name: "file_sensitivity", type: "integer", description: "Tier of accessed documentation" },
      { name: "is_threat", type: "boolean", description: "Insider threat flag" }
    ],
    sample_data: [
      { user_id: "USR-412", action: "Logon", work_day_delta: 0.2, file_sensitivity: 1, is_threat: false },
      { user_id: "USR-412", action: "FileExport", work_day_delta: 6.5, file_sensitivity: 5, is_threat: true },
      { user_id: "USR-291", action: "USBConnect", work_day_delta: -0.1, file_sensitivity: 2, is_threat: false }
    ]
  },
  {
    id: "general_ot_anomalies",
    attack_threat_type: "General OT Anomalies",
    recommended_model: "UEBA & CMDB",
    datasets: ["SWaT", "HAI (HIL-augmented ICS)"],
    columns: [
      { name: "p_tank_level", type: "float", description: "Primary water tank level sensor" },
      { name: "v_pump_status", type: "boolean", description: "Main intake pump state" },
      { name: "flow_rate", type: "float", description: "Liters per second throughput" },
      { name: "p1_state", type: "integer", description: "PLC stage 1 operational code" }
    ],
    sample_data: [
      { p_tank_level: 0.85, v_pump_status: true, flow_rate: 12.5, p1_state: 1 },
      { p_tank_level: 0.12, v_pump_status: true, flow_rate: 0.0, p1_state: 4 },
      { p_tank_level: 0.92, v_pump_status: false, flow_rate: 0.0, p1_state: 2 }
    ]
  },
  {
    id: "model_poisoning",
    attack_threat_type: "Model Poisoning",
    recommended_model: "Merkle + Krum + PGD",
    datasets: ["MNIST/CIFAR (Adversarial variants)"],
    columns: [
      { name: "delta_l2", type: "float", description: "L2 norm perturbation distance" },
      { name: "gradient_noise", type: "float", description: "Stochastic variance in updates" },
      { name: "weight_id", type: "string", description: "Neural layer identification" },
      { name: "is_poisoned", type: "boolean", description: "Adversarial update indicator" }
    ],
    sample_data: [
      { delta_l2: 0.001, gradient_noise: 0.05, weight_id: "conv2d_1", is_poisoned: false },
      { delta_l2: 0.452, gradient_noise: 8.42, weight_id: "dense_out", is_poisoned: true }
    ]
  },
];

const MODEL_TO_DATASET_IDS: Record<string, string[]> = {
  pinn_fdi: ["fdi_sensor_spoofing"],
  cgan_ransomware: ["ransomware"],
  tinyml_der: ["der_attack", "general_ot_anomalies"],
  yolo_physical: ["physical_sabotage"],
  graph_mamba_firmware: ["firmware_supply_chain"],
  drl_ddos: ["ddos"],
  behavioral_dna: ["insider_threat", "general_ot_anomalies"],
  federated_aggregator: ["model_poisoning"],
};

function normalize(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

export function getAllTrainingDatasets(): TrainingDatasetRecommendation[] {
  return DATASET_CATALOG;
}

export function getTrainingDatasetsForModel(
  modelType?: string | null,
  modelName?: string | null
): TrainingDatasetRecommendation[] {
  const normalizedType = normalize(modelType);
  const normalizedName = normalize(modelName);

  const datasetIds = new Set<string>();

  for (const [knownType, ids] of Object.entries(MODEL_TO_DATASET_IDS)) {
    if (
      normalizedType === knownType ||
      normalizedName.includes(knownType) ||
      normalizedName.includes(knownType.replaceAll("_", " "))
    ) {
      ids.forEach((id) => datasetIds.add(id));
    }
  }

  return DATASET_CATALOG.filter((item) => datasetIds.has(item.id));
}
