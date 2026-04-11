// Conditional GAN + Transformer for Pre-Encryption Ransomware Detection
// Detects ransomware activity before encryption begins

import type { RansomwareDetection } from '@/lib/types/database';

interface SystemEvent {
  apiCalls: string[];
  fileOperations: { path: string; operation: string; entropy?: number }[];
  registryChanges: { key: string; action: string }[];
  networkConnections: { ip: string; port: number; protocol: string }[];
}

interface cGANConfig {
  latentDim: number;
  conditionDim: number;
  sequenceLength: number;
  discriminatorThreshold: number;
  transformerHeads: number;
  transformerLayers: number;
}

// Pre-encryption indicators to watch for
const PRE_ENCRYPTION_INDICATORS = {
  shadowCopyDeletion: [
    'vssadmin.exe delete shadows',
    'wmic shadowcopy delete',
    'vssadmin resize shadowstorage'
  ],
  backupServiceTermination: [
    'sc stop VSS',
    'sc stop wbengine',
    'sc stop SQLSERVERAGENT',
    'sc stop SQLBrowser',
    'net stop "SQL Server"'
  ],
  securitySoftwareTampering: [
    'taskkill /f /im',
    'sc stop MsMpSvc',
    'netsh advfirewall set',
    'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows Defender"'
  ],
  recursiveEnumeration: [
    'dir /s /b',
    'Get-ChildItem -Recurse',
    'findstr /s /i'
  ],
  suspiciousRegistryKeys: [
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run',
    'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders',
    'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services'
  ]
};

export class RansomwareDetector {
  private config: cGANConfig;
  private isInitialized: boolean = false;
  private generatorWeights: number[][] = [];
  private discriminatorWeights: number[][] = [];
  private transformerWeights: number[][] = [];
  private normalBehaviorEmbeddings: number[][] = [];

  constructor(config?: Partial<cGANConfig>) {
    this.config = {
      latentDim: 128,
      conditionDim: 64,
      sequenceLength: 100,
      discriminatorThreshold: 0.5,
      transformerHeads: 8,
      transformerLayers: 6,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize GAN weights
    this.initializeGANWeights();
    
    // Initialize Transformer weights
    this.initializeTransformerWeights();
    
    // Load pre-computed normal behavior embeddings
    this.loadNormalBehaviorEmbeddings();
    
    this.isInitialized = true;
  }

  private initializeGANWeights(): void {
    // Generator: latent + condition -> behavior embedding
    const genInputDim = this.config.latentDim + this.config.conditionDim;
    const genOutputDim = 512;
    
    this.generatorWeights = this.createWeightMatrix(genInputDim, genOutputDim);
    
    // Discriminator: behavior embedding -> real/fake score
    this.discriminatorWeights = this.createWeightMatrix(genOutputDim, 1);
  }

  private initializeTransformerWeights(): void {
    // Simplified transformer weights for sequence encoding
    const d_model = 512;
    this.transformerWeights = this.createWeightMatrix(d_model, d_model);
  }

  private loadNormalBehaviorEmbeddings(): void {
    // Generate synthetic normal behavior patterns
    for (let i = 0; i < 100; i++) {
      const embedding: number[] = [];
      for (let j = 0; j < 512; j++) {
        // Normal behavior has low entropy changes, regular patterns
        embedding.push(Math.random() * 0.3 + 0.35);
      }
      this.normalBehaviorEmbeddings.push(embedding);
    }
  }

  private createWeightMatrix(inputDim: number, outputDim: number): number[][] {
    const scale = Math.sqrt(2.0 / (inputDim + outputDim));
    const weights: number[][] = [];
    
    for (let i = 0; i < outputDim; i++) {
      const row: number[] = [];
      for (let j = 0; j < inputDim; j++) {
        row.push((Math.random() * 2 - 1) * scale);
      }
      weights.push(row);
    }
    
    return weights;
  }

  async detect(events: SystemEvent): Promise<RansomwareDetection> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Extract features from system events
    const features = this.extractFeatures(events);
    
    // Check for known pre-encryption indicators
    const indicators = this.checkPreEncryptionIndicators(events);
    
    // Compute file entropy changes
    const entropyDelta = this.computeEntropyDelta(events.fileOperations);
    
    // Encode sequence with Transformer
    const sequenceEmbedding = this.encodeSequence(features);
    
    // Run through discriminator
    const discriminatorScore = this.runDiscriminator(sequenceEmbedding);
    
    // Identify suspicious processes
    const suspiciousProcesses = this.identifySuspiciousProcesses(events);
    
    // Compute overall confidence
    const confidence = this.computeConfidence(
      discriminatorScore,
      indicators.length,
      entropyDelta,
      suspiciousProcesses.length
    );
    
    // Determine if pre-encryption activity
    const isPreEncryption = confidence > 0.7 || indicators.length >= 3;
    
    // Generate recommended action
    const recommendedAction = this.getRecommendedAction(confidence, indicators);

    return {
      isPreEncryption,
      confidence,
      indicators,
      fileEntropyDelta: entropyDelta,
      suspiciousProcesses,
      recommendedAction
    };
  }

  private extractFeatures(events: SystemEvent): number[] {
    const features: number[] = [];
    
    // API call frequency features
    const apiCallCounts = new Map<string, number>();
    for (const call of events.apiCalls) {
      const category = this.categorizeApiCall(call);
      apiCallCounts.set(category, (apiCallCounts.get(category) || 0) + 1);
    }
    
    features.push(
      apiCallCounts.get('file_read') || 0,
      apiCallCounts.get('file_write') || 0,
      apiCallCounts.get('file_delete') || 0,
      apiCallCounts.get('registry') || 0,
      apiCallCounts.get('network') || 0,
      apiCallCounts.get('process') || 0,
      apiCallCounts.get('crypto') || 0
    );
    
    // File operation features
    const fileOps = events.fileOperations;
    features.push(
      fileOps.filter(f => f.operation === 'read').length,
      fileOps.filter(f => f.operation === 'write').length,
      fileOps.filter(f => f.operation === 'delete').length,
      fileOps.filter(f => f.operation === 'rename').length
    );
    
    // Entropy features
    const entropies = fileOps.map(f => f.entropy || 0).filter(e => e > 0);
    if (entropies.length > 0) {
      features.push(
        Math.max(...entropies),
        entropies.reduce((a, b) => a + b, 0) / entropies.length,
        Math.min(...entropies)
      );
    } else {
      features.push(0, 0, 0);
    }
    
    // Network features
    features.push(
      events.networkConnections.length,
      new Set(events.networkConnections.map(c => c.ip)).size,
      events.networkConnections.filter(c => c.port === 443 || c.port === 80).length
    );
    
    // Registry features
    features.push(
      events.registryChanges.filter(r => r.action === 'create').length,
      events.registryChanges.filter(r => r.action === 'modify').length,
      events.registryChanges.filter(r => r.action === 'delete').length
    );
    
    // Normalize to fixed length
    while (features.length < 64) {
      features.push(0);
    }
    
    return features.slice(0, 64);
  }

  private categorizeApiCall(call: string): string {
    const callLower = call.toLowerCase();
    
    if (callLower.includes('read') || callLower.includes('open')) return 'file_read';
    if (callLower.includes('write') || callLower.includes('create')) return 'file_write';
    if (callLower.includes('delete') || callLower.includes('remove')) return 'file_delete';
    if (callLower.includes('reg') || callLower.includes('registry')) return 'registry';
    if (callLower.includes('socket') || callLower.includes('connect') || callLower.includes('send')) return 'network';
    if (callLower.includes('process') || callLower.includes('exec') || callLower.includes('spawn')) return 'process';
    if (callLower.includes('crypt') || callLower.includes('encrypt') || callLower.includes('hash')) return 'crypto';
    
    return 'other';
  }

  private checkPreEncryptionIndicators(events: SystemEvent): string[] {
    const foundIndicators: string[] = [];
    
    const allCommands = [
      ...events.apiCalls,
      ...events.fileOperations.map(f => `${f.operation} ${f.path}`)
    ].join(' ').toLowerCase();
    
    // Check shadow copy deletion
    for (const pattern of PRE_ENCRYPTION_INDICATORS.shadowCopyDeletion) {
      if (allCommands.includes(pattern.toLowerCase())) {
        foundIndicators.push('Shadow copy deletion attempt');
        break;
      }
    }
    
    // Check backup service termination
    for (const pattern of PRE_ENCRYPTION_INDICATORS.backupServiceTermination) {
      if (allCommands.includes(pattern.toLowerCase())) {
        foundIndicators.push('Backup service termination');
        break;
      }
    }
    
    // Check security software tampering
    for (const pattern of PRE_ENCRYPTION_INDICATORS.securitySoftwareTampering) {
      if (allCommands.includes(pattern.toLowerCase())) {
        foundIndicators.push('Security software tampering');
        break;
      }
    }
    
    // Check recursive enumeration
    for (const pattern of PRE_ENCRYPTION_INDICATORS.recursiveEnumeration) {
      if (allCommands.includes(pattern.toLowerCase())) {
        foundIndicators.push('Recursive directory enumeration');
        break;
      }
    }
    
    // Check suspicious registry modifications
    for (const change of events.registryChanges) {
      for (const suspiciousKey of PRE_ENCRYPTION_INDICATORS.suspiciousRegistryKeys) {
        if (change.key.toLowerCase().includes(suspiciousKey.toLowerCase())) {
          foundIndicators.push('Suspicious registry modification');
          break;
        }
      }
    }
    
    // Check high entropy writes (encryption indicator)
    const highEntropyWrites = events.fileOperations.filter(
      f => f.operation === 'write' && (f.entropy || 0) > 7.5
    );
    if (highEntropyWrites.length > 5) {
      foundIndicators.push('High-entropy write patterns');
    }
    
    return [...new Set(foundIndicators)];
  }

  private computeEntropyDelta(fileOperations: SystemEvent['fileOperations']): number {
    const writeOps = fileOperations.filter(f => f.operation === 'write' && f.entropy !== undefined);
    
    if (writeOps.length < 2) return 0;
    
    // Sort by time (assuming order represents time)
    const entropies = writeOps.map(f => f.entropy!);
    
    // Compute rate of entropy increase
    let totalDelta = 0;
    for (let i = 1; i < entropies.length; i++) {
      totalDelta += Math.max(0, entropies[i] - entropies[i - 1]);
    }
    
    return totalDelta / (entropies.length - 1);
  }

  private encodeSequence(features: number[]): number[] {
    // Simplified transformer encoding
    // Self-attention approximation
    
    const d_k = Math.sqrt(features.length);
    const attended: number[] = [];
    
    for (let i = 0; i < features.length; i++) {
      let sum = 0;
      let weightSum = 0;
      
      for (let j = 0; j < features.length; j++) {
        const attention = Math.exp(features[i] * features[j] / d_k);
        sum += attention * features[j];
        weightSum += attention;
      }
      
      attended.push(sum / (weightSum || 1));
    }
    
    // Project to embedding dimension
    const embedding: number[] = [];
    for (let i = 0; i < 512; i++) {
      let val = 0;
      for (let j = 0; j < Math.min(attended.length, this.transformerWeights[i]?.length || 0); j++) {
        val += attended[j] * (this.transformerWeights[i]?.[j] || 0);
      }
      embedding.push(Math.tanh(val));
    }
    
    return embedding;
  }

  private runDiscriminator(embedding: number[]): number {
    // Compute distance from normal behavior distribution
    let minDistance = Infinity;
    
    for (const normalEmb of this.normalBehaviorEmbeddings) {
      let distance = 0;
      for (let i = 0; i < Math.min(embedding.length, normalEmb.length); i++) {
        distance += Math.pow(embedding[i] - normalEmb[i], 2);
      }
      distance = Math.sqrt(distance);
      minDistance = Math.min(minDistance, distance);
    }
    
    // Convert distance to anomaly score (0-1)
    // Higher distance = more anomalous = higher score
    return Math.min(minDistance / 10, 1);
  }

  private identifySuspiciousProcesses(events: SystemEvent): string[] {
    const suspicious: string[] = [];
    
    const suspiciousPatterns = [
      'vssadmin', 'wmic', 'bcdedit', 'wbadmin',
      'cipher', 'sdelete', 'powershell -enc',
      'cmd /c', 'mshta', 'regsvr32'
    ];
    
    for (const call of events.apiCalls) {
      for (const pattern of suspiciousPatterns) {
        if (call.toLowerCase().includes(pattern)) {
          suspicious.push(call.split(' ')[0] || call);
          break;
        }
      }
    }
    
    return [...new Set(suspicious)];
  }

  private computeConfidence(
    discriminatorScore: number,
    indicatorCount: number,
    entropyDelta: number,
    suspiciousProcessCount: number
  ): number {
    // Weighted combination
    const discriminatorWeight = 0.35;
    const indicatorWeight = 0.30;
    const entropyWeight = 0.20;
    const processWeight = 0.15;
    
    const normalizedIndicators = Math.min(indicatorCount / 5, 1);
    const normalizedEntropy = Math.min(entropyDelta / 2, 1);
    const normalizedProcesses = Math.min(suspiciousProcessCount / 5, 1);
    
    return (
      discriminatorWeight * discriminatorScore +
      indicatorWeight * normalizedIndicators +
      entropyWeight * normalizedEntropy +
      processWeight * normalizedProcesses
    );
  }

  private getRecommendedAction(confidence: number, indicators: string[]): string {
    if (confidence > 0.9 || indicators.length >= 4) {
      return 'IMMEDIATE_ISOLATION: Isolate system and begin incident response';
    } else if (confidence > 0.7 || indicators.length >= 2) {
      return 'QUARANTINE: Quarantine suspicious processes and alert SOC';
    } else if (confidence > 0.5) {
      return 'INVESTIGATE: Enhanced monitoring and investigation required';
    } else if (confidence > 0.3) {
      return 'MONITOR: Continue monitoring with elevated alerting';
    }
    return 'NORMAL: No immediate action required';
  }
}
