// ML Engine Core - Orchestrates all threat detection models
import { PINNDetector } from './models/pinn-fdi';
import { RansomwareDetector } from './models/cgan-ransomware';
import { DERAttackDetector } from './models/tinyml-der';
import { PhysicalThreatDetector } from './models/yolo-physical';
import { FirmwareAnalyzer } from './models/graph-mamba-firmware';
import { DDoSMitigator } from './models/drl-ddos';
import { InsiderThreatDetector } from './models/behavioral-dna';
import { ModelIntegrityDefense } from './models/model-poisoning-defense';
import type { 
  ThreatType, 
  Alert,
  PINNPrediction,
  RansomwareDetection,
  DERAttackDetection,
  PhysicalThreatDetection,
  FirmwareAnalysis,
  DDoSMitigation,
  InsiderThreatDetection,
  ModelIntegrityCheck
} from '@/lib/types/database';

export interface MLEngineConfig {
  enablePINN: boolean;
  enableRansomware: boolean;
  enableDER: boolean;
  enablePhysical: boolean;
  enableFirmware: boolean;
  enableDDoS: boolean;
  enableInsider: boolean;
  enableModelDefense: boolean;
  alertThreshold: number;
  batchSize: number;
}

export interface DetectionResult {
  threatType: ThreatType;
  detected: boolean;
  confidence: number;
  details: Record<string, unknown>;
  timestamp: string;
  processingTimeMs: number;
}

export class MLEngine {
  private config: MLEngineConfig;
  private pinnDetector: PINNDetector;
  private ransomwareDetector: RansomwareDetector;
  private derDetector: DERAttackDetector;
  private physicalDetector: PhysicalThreatDetector;
  private firmwareAnalyzer: FirmwareAnalyzer;
  private ddosMitigator: DDoSMitigator;
  private insiderDetector: InsiderThreatDetector;
  private modelDefense: ModelIntegrityDefense;
  private isInitialized: boolean = false;

  constructor(config: Partial<MLEngineConfig> = {}) {
    this.config = {
      enablePINN: true,
      enableRansomware: true,
      enableDER: true,
      enablePhysical: true,
      enableFirmware: true,
      enableDDoS: true,
      enableInsider: true,
      enableModelDefense: true,
      alertThreshold: 0.7,
      batchSize: 32,
      ...config
    };

    this.pinnDetector = new PINNDetector();
    this.ransomwareDetector = new RansomwareDetector();
    this.derDetector = new DERAttackDetector();
    this.physicalDetector = new PhysicalThreatDetector();
    this.firmwareAnalyzer = new FirmwareAnalyzer();
    this.ddosMitigator = new DDoSMitigator();
    this.insiderDetector = new InsiderThreatDetector();
    this.modelDefense = new ModelIntegrityDefense();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const initPromises: Promise<void>[] = [];

    if (this.config.enablePINN) {
      initPromises.push(this.pinnDetector.initialize());
    }
    if (this.config.enableRansomware) {
      initPromises.push(this.ransomwareDetector.initialize());
    }
    if (this.config.enableDER) {
      initPromises.push(this.derDetector.initialize());
    }
    if (this.config.enablePhysical) {
      initPromises.push(this.physicalDetector.initialize());
    }
    if (this.config.enableFirmware) {
      initPromises.push(this.firmwareAnalyzer.initialize());
    }
    if (this.config.enableDDoS) {
      initPromises.push(this.ddosMitigator.initialize());
    }
    if (this.config.enableInsider) {
      initPromises.push(this.insiderDetector.initialize());
    }
    if (this.config.enableModelDefense) {
      initPromises.push(this.modelDefense.initialize());
    }

    await Promise.all(initPromises);
    this.isInitialized = true;
  }

  // FDI & Sensor Spoofing Detection
  async detectFDI(sensorData: {
    measurements: number[];
    topology: number[][];
    timestamps: string[];
  }): Promise<DetectionResult> {
    const startTime = Date.now();
    
    if (!this.config.enablePINN) {
      return this.createEmptyResult('fdi_sensor_spoofing', startTime);
    }

    const prediction = await this.pinnDetector.predict(sensorData);
    
    return {
      threatType: 'fdi_sensor_spoofing',
      detected: prediction.attackProbability > this.config.alertThreshold,
      confidence: prediction.attackProbability,
      details: {
        stateEstimate: prediction.stateEstimate,
        physicsResidual: prediction.physicsResidual,
        anomalyScore: prediction.anomalyScore,
        suspectedSensors: prediction.suspectedSensors
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    };
  }

  // Ransomware Pre-Encryption Detection
  async detectRansomware(systemEvents: {
    apiCalls: string[];
    fileOperations: { path: string; operation: string; entropy?: number }[];
    registryChanges: { key: string; action: string }[];
    networkConnections: { ip: string; port: number; protocol: string }[];
  }): Promise<DetectionResult> {
    const startTime = Date.now();
    
    if (!this.config.enableRansomware) {
      return this.createEmptyResult('ransomware', startTime);
    }

    const detection = await this.ransomwareDetector.detect(systemEvents);
    
    return {
      threatType: 'ransomware',
      detected: detection.isPreEncryption,
      confidence: detection.confidence,
      details: {
        indicators: detection.indicators,
        fileEntropyDelta: detection.fileEntropyDelta,
        suspiciousProcesses: detection.suspiciousProcesses,
        recommendedAction: detection.recommendedAction
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    };
  }

  // DER Attack Detection
  async detectDERAttack(derData: {
    deviceId: string;
    powerOutput: number[];
    setpoints: number[];
    frequency: number[];
    voltage: number[];
    communicationPatterns: { timestamp: string; messageType: string }[];
  }): Promise<DetectionResult> {
    const startTime = Date.now();
    
    if (!this.config.enableDER) {
      return this.createEmptyResult('der_attack', startTime);
    }

    const detection = await this.derDetector.detect(derData);
    
    return {
      threatType: 'der_attack',
      detected: detection.isAnomaly,
      confidence: detection.confidence,
      details: {
        attackType: detection.attackType,
        anomalyScore: detection.anomalyScore,
        affectedDevices: detection.affectedDevices
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    };
  }

  // Physical Sabotage Detection
  async detectPhysicalThreat(data: {
    videoFrame?: ArrayBuffer;
    sensorReadings: {
      motion: number[];
      vibration: number[];
      acoustic: number[];
      thermal: number[];
    };
  }): Promise<DetectionResult> {
    const startTime = Date.now();
    
    if (!this.config.enablePhysical) {
      return this.createEmptyResult('physical_sabotage', startTime);
    }

    const detection = await this.physicalDetector.detect(data);
    
    return {
      threatType: 'physical_sabotage',
      detected: detection.isThreat,
      confidence: detection.threatScore,
      details: {
        visualConfidence: detection.visualConfidence,
        sensorConfidence: detection.sensorConfidence,
        detectedObjects: detection.detectedObjects,
        fusionResult: detection.fusionResult
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    };
  }

  // Firmware & Supply Chain Analysis
  async analyzeFirmware(firmwareData: {
    binary: ArrayBuffer;
    vendor: string;
    model: string;
    expectedVersion: string;
    baselineFingerprint?: number[];
  }): Promise<DetectionResult> {
    const startTime = Date.now();
    
    if (!this.config.enableFirmware) {
      return this.createEmptyResult('firmware_supply_chain', startTime);
    }

    const analysis = await this.firmwareAnalyzer.analyze(firmwareData);
    
    return {
      threatType: 'firmware_supply_chain',
      detected: analysis.isSuspicious,
      confidence: 1 - analysis.similarity,
      details: {
        similarity: analysis.similarity,
        fingerprint: analysis.fingerprint,
        riskScore: analysis.riskScore,
        deviations: analysis.deviations,
        recommendation: analysis.recommendation
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    };
  }

  // DDoS Mitigation
  async mitigateDDoS(trafficData: {
    packetRates: Record<string, number>;
    connectionCounts: number;
    latencyMs: number;
    queueUtilization: number;
    protocolDistribution: Record<string, number>;
  }): Promise<DetectionResult> {
    const startTime = Date.now();
    
    if (!this.config.enableDDoS) {
      return this.createEmptyResult('ddos', startTime);
    }

    const mitigation = await this.ddosMitigator.analyze(trafficData);
    
    return {
      threatType: 'ddos',
      detected: mitigation.isAttack,
      confidence: mitigation.severity,
      details: {
        attackType: mitigation.attackType,
        rateLimits: mitigation.rateLimits,
        blockedIPs: mitigation.blockedIPs,
        trafficReduction: mitigation.trafficReduction
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    };
  }

  // Insider Threat Detection
  async detectInsiderThreat(behaviorData: {
    userId: string;
    keystrokes: { key: string; duration: number; interval: number }[];
    mouseMovements: { x: number; y: number; dx: number; dy: number }[];
    commands: string[];
    sessionInfo: { startTime: string; duration: number; actions: number };
    storedProfile?: number[];
  }): Promise<DetectionResult> {
    const startTime = Date.now();
    
    if (!this.config.enableInsider) {
      return this.createEmptyResult('insider_threat', startTime);
    }

    const detection = await this.insiderDetector.detect(behaviorData);
    
    return {
      threatType: 'insider_threat',
      detected: detection.isAnomalous,
      confidence: 1 - detection.authScore,
      details: {
        authScore: detection.authScore,
        deviationFactors: detection.deviationFactors,
        riskLevel: detection.riskLevel,
        recommendedAction: detection.recommendedAction
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    };
  }

  // Model Poisoning Defense
  async checkModelIntegrity(data: {
    modelUpdates: number[][];
    clientIds: string[];
    trainingData?: { hash: string; source: string }[];
  }): Promise<DetectionResult> {
    const startTime = Date.now();
    
    if (!this.config.enableModelDefense) {
      return this.createEmptyResult('model_poisoning', startTime);
    }

    const check = await this.modelDefense.verify(data);
    
    return {
      threatType: 'model_poisoning',
      detected: check.isCompromised,
      confidence: 1 - check.integrityScore,
      details: {
        integrityScore: check.integrityScore,
        suspiciousUpdates: check.suspiciousUpdates,
        byzantineClients: check.byzantineClients,
        recommendation: check.recommendation
      },
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    };
  }

  // Run all detectors on comprehensive data
  async runAllDetectors(data: {
    sensorData?: Parameters<typeof this.detectFDI>[0];
    systemEvents?: Parameters<typeof this.detectRansomware>[0];
    derData?: Parameters<typeof this.detectDERAttack>[0];
    physicalData?: Parameters<typeof this.detectPhysicalThreat>[0];
    firmwareData?: Parameters<typeof this.analyzeFirmware>[0];
    trafficData?: Parameters<typeof this.mitigateDDoS>[0];
    behaviorData?: Parameters<typeof this.detectInsiderThreat>[0];
    modelData?: Parameters<typeof this.checkModelIntegrity>[0];
  }): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    const promises: Promise<DetectionResult>[] = [];

    if (data.sensorData) {
      promises.push(this.detectFDI(data.sensorData));
    }
    if (data.systemEvents) {
      promises.push(this.detectRansomware(data.systemEvents));
    }
    if (data.derData) {
      promises.push(this.detectDERAttack(data.derData));
    }
    if (data.physicalData) {
      promises.push(this.detectPhysicalThreat(data.physicalData));
    }
    if (data.firmwareData) {
      promises.push(this.analyzeFirmware(data.firmwareData));
    }
    if (data.trafficData) {
      promises.push(this.mitigateDDoS(data.trafficData));
    }
    if (data.behaviorData) {
      promises.push(this.detectInsiderThreat(data.behaviorData));
    }
    if (data.modelData) {
      promises.push(this.checkModelIntegrity(data.modelData));
    }

    const resolvedResults = await Promise.all(promises);
    results.push(...resolvedResults);

    return results;
  }

  // Convert detection result to alert
  resultToAlert(result: DetectionResult, organizationId: string, assetId?: string): Partial<Alert> {
    const severityMap: Record<number, Alert['severity']> = {
      0.9: 'critical',
      0.7: 'high',
      0.5: 'medium',
      0.3: 'low',
      0: 'info'
    };

    let severity: Alert['severity'] = 'info';
    for (const [threshold, sev] of Object.entries(severityMap)) {
      if (result.confidence >= parseFloat(threshold)) {
        severity = sev;
        break;
      }
    }

    const threatTitles: Record<ThreatType, string> = {
      fdi_sensor_spoofing: 'False Data Injection Attack Detected',
      ransomware: 'Pre-Encryption Ransomware Activity Detected',
      der_attack: 'DER/Inverter Attack Detected',
      physical_sabotage: 'Physical Security Threat Detected',
      firmware_supply_chain: 'Suspicious Firmware Detected',
      ddos: 'DDoS Attack Detected',
      insider_threat: 'Insider Threat Behavior Detected',
      model_poisoning: 'Model Poisoning Attempt Detected'
    };

    return {
      organization_id: organizationId,
      threat_type: result.threatType,
      severity,
      status: 'new',
      title: threatTitles[result.threatType],
      description: this.generateAlertDescription(result),
      asset_id: assetId || null,
      confidence: result.confidence,
      raw_data: result.details,
      mitre_tactics: this.getMitreTactics(result.threatType),
      mitre_techniques: this.getMitreTechniques(result.threatType),
      created_at: result.timestamp
    };
  }

  private createEmptyResult(threatType: ThreatType, startTime: number): DetectionResult {
    return {
      threatType,
      detected: false,
      confidence: 0,
      details: { disabled: true },
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    };
  }

  private generateAlertDescription(result: DetectionResult): string {
    const descriptions: Record<ThreatType, (d: Record<string, unknown>) => string> = {
      fdi_sensor_spoofing: (d) => 
        `Physics-informed analysis detected anomalous sensor readings with residual ${d.physicsResidual}. ` +
        `Suspected sensors: ${(d.suspectedSensors as string[])?.join(', ') || 'unknown'}`,
      ransomware: (d) =>
        `Pre-encryption indicators detected: ${(d.indicators as string[])?.join(', ')}. ` +
        `File entropy change: ${d.fileEntropyDelta}. Recommended action: ${d.recommendedAction}`,
      der_attack: (d) =>
        `DER attack type: ${d.attackType}. Affected devices: ${(d.affectedDevices as string[])?.join(', ')}`,
      physical_sabotage: (d) =>
        `Physical threat detected via ${d.fusionResult} analysis. ` +
        `Visual confidence: ${d.visualConfidence}, Sensor confidence: ${d.sensorConfidence}`,
      firmware_supply_chain: (d) =>
        `Firmware analysis shows ${((1 - (d.similarity as number)) * 100).toFixed(1)}% deviation from baseline. ` +
        `Recommendation: ${d.recommendation}`,
      ddos: (d) =>
        `${d.attackType} DDoS attack detected. Traffic reduction applied: ${d.trafficReduction}%`,
      insider_threat: (d) =>
        `Behavioral anomaly detected. Auth score: ${d.authScore}. Risk level: ${d.riskLevel}. ` +
        `Deviation factors: ${(d.deviationFactors as string[])?.join(', ')}`,
      model_poisoning: (d) =>
        `Model integrity compromised. ${(d.byzantineClients as string[])?.length || 0} suspicious clients identified. ` +
        `${d.recommendation}`
    };

    return descriptions[result.threatType](result.details);
  }

  private getMitreTactics(threatType: ThreatType): string[] {
    const tacticsMap: Record<ThreatType, string[]> = {
      fdi_sensor_spoofing: ['TA0040', 'TA0009'],
      ransomware: ['TA0040', 'TA0002'],
      der_attack: ['TA0040', 'TA0011'],
      physical_sabotage: ['TA0001', 'TA0040'],
      firmware_supply_chain: ['TA0001', 'TA0003'],
      ddos: ['TA0040', 'TA0011'],
      insider_threat: ['TA0001', 'TA0006'],
      model_poisoning: ['TA0042', 'TA0040']
    };
    return tacticsMap[threatType];
  }

  private getMitreTechniques(threatType: ThreatType): string[] {
    const techniquesMap: Record<ThreatType, string[]> = {
      fdi_sensor_spoofing: ['T0830', 'T0832'],
      ransomware: ['T0828', 'T0831'],
      der_attack: ['T0855', 'T0857'],
      physical_sabotage: ['T0879', 'T0880'],
      firmware_supply_chain: ['T0839', 'T0862'],
      ddos: ['T0814', 'T0813'],
      insider_threat: ['T0859', 'T0863'],
      model_poisoning: ['T0889', 'T0890']
    };
    return techniquesMap[threatType];
  }

  getConfig(): MLEngineConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<MLEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Singleton instance
let mlEngineInstance: MLEngine | null = null;

export function getMLEngine(config?: Partial<MLEngineConfig>): MLEngine {
  if (!mlEngineInstance) {
    mlEngineInstance = new MLEngine(config);
  }
  return mlEngineInstance;
}

export async function initializeMLEngine(config?: Partial<MLEngineConfig>): Promise<MLEngine> {
  const engine = getMLEngine(config);
  await engine.initialize();
  return engine;
}
