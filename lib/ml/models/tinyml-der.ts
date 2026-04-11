// TinyML On-Device + Federated Learning for DER Attack Detection
// Lightweight model for solar inverters, EV chargers, battery systems

import type { DERAttackDetection } from '@/lib/types/database';

interface DERData {
  deviceId: string;
  powerOutput: number[];
  setpoints: number[];
  frequency: number[];
  voltage: number[];
  communicationPatterns: { timestamp: string; messageType: string }[];
}

interface TinyMLConfig {
  modelSizeKB: number;
  inferenceTimeMs: number;
  quantizationBits: number;
  federatedRounds: number;
  privacyBudget: number;
}

// Attack signatures for DER devices
const DER_ATTACK_SIGNATURES = {
  demand_manipulation: {
    patterns: ['rapid_setpoint_change', 'coordinated_power_shift', 'abnormal_ramp_rate'],
    thresholds: { setpointChangeRate: 0.3, coordinationScore: 0.7 }
  },
  frequency_attack: {
    patterns: ['inverter_disconnect', 'frequency_deviation', 'reactive_power_anomaly'],
    thresholds: { frequencyDeviation: 0.5, disconnectRate: 0.2 }
  },
  data_exfiltration: {
    patterns: ['unusual_comm_pattern', 'high_frequency_polling', 'unknown_destination'],
    thresholds: { commAnomalyScore: 0.6, dataVolume: 1000 }
  },
  firmware_tampering: {
    patterns: ['execution_deviation', 'timing_anomaly', 'response_pattern_change'],
    thresholds: { executionDeviation: 0.4, timingAnomaly: 0.5 }
  }
};

export class DERAttackDetector {
  private config: TinyMLConfig;
  private isInitialized: boolean = false;
  private modelWeights: Float32Array | null = null;
  private quantizedWeights: Int8Array | null = null;
  private deviceBaselines: Map<string, DeviceBaseline> = new Map();

  constructor(config?: Partial<TinyMLConfig>) {
    this.config = {
      modelSizeKB: 100,
      inferenceTimeMs: 10,
      quantizationBits: 8,
      federatedRounds: 10,
      privacyBudget: 1.0,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize quantized model weights
    this.initializeQuantizedModel();
    
    this.isInitialized = true;
  }

  private initializeQuantizedModel(): void {
    // Depthwise separable convolution weights
    // Model architecture: Input -> DWConv -> PWConv -> Pool -> Dense -> Output
    
    const weightCount = Math.floor((this.config.modelSizeKB * 1024) / 4); // Float32
    this.modelWeights = new Float32Array(weightCount);
    
    // Xavier initialization
    const scale = Math.sqrt(2.0 / weightCount);
    for (let i = 0; i < weightCount; i++) {
      this.modelWeights[i] = (Math.random() * 2 - 1) * scale;
    }
    
    // INT8 quantization
    this.quantizedWeights = new Int8Array(weightCount);
    const maxAbs = Math.max(...Array.from(this.modelWeights).map(Math.abs));
    const quantScale = 127 / maxAbs;
    
    for (let i = 0; i < weightCount; i++) {
      this.quantizedWeights[i] = Math.round(this.modelWeights[i] * quantScale);
    }
  }

  async detect(data: DERData): Promise<DERAttackDetection> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Get or create device baseline
    let baseline = this.deviceBaselines.get(data.deviceId);
    if (!baseline) {
      baseline = this.createBaseline(data);
      this.deviceBaselines.set(data.deviceId, baseline);
    }

    // Extract features
    const features = this.extractFeatures(data, baseline);
    
    // Run quantized inference
    const prediction = this.runQuantizedInference(features);
    
    // Detect specific attack type
    const attackAnalysis = this.analyzeAttackType(data, baseline, prediction);
    
    // Update baseline with new data (federated learning simulation)
    this.updateBaseline(data.deviceId, data, prediction);

    return {
      isAnomaly: attackAnalysis.isAnomaly,
      anomalyScore: attackAnalysis.anomalyScore,
      attackType: attackAnalysis.attackType,
      confidence: attackAnalysis.confidence,
      affectedDevices: attackAnalysis.isAnomaly ? [data.deviceId] : []
    };
  }

  private createBaseline(data: DERData): DeviceBaseline {
    return {
      deviceId: data.deviceId,
      meanPower: this.mean(data.powerOutput),
      stdPower: this.std(data.powerOutput),
      meanSetpoint: this.mean(data.setpoints),
      stdSetpoint: this.std(data.setpoints),
      meanFrequency: this.mean(data.frequency),
      stdFrequency: this.std(data.frequency),
      meanVoltage: this.mean(data.voltage),
      stdVoltage: this.std(data.voltage),
      typicalCommPatterns: this.analyzeCommPatterns(data.communicationPatterns),
      sampleCount: 1,
      lastUpdated: new Date().toISOString()
    };
  }

  private extractFeatures(data: DERData, baseline: DeviceBaseline): number[] {
    const features: number[] = [];
    
    // Power output features
    const currentMeanPower = this.mean(data.powerOutput);
    const currentStdPower = this.std(data.powerOutput);
    features.push(
      (currentMeanPower - baseline.meanPower) / (baseline.stdPower || 1),
      currentStdPower / (baseline.stdPower || 1),
      this.computeRampRate(data.powerOutput)
    );
    
    // Setpoint features
    const setpointChanges = this.computeChanges(data.setpoints);
    features.push(
      this.mean(setpointChanges),
      Math.max(...setpointChanges.map(Math.abs)),
      this.computeChangeFrequency(data.setpoints)
    );
    
    // Frequency features
    const freqDeviation = data.frequency.map(f => Math.abs(f - 60)); // 60Hz nominal
    features.push(
      this.mean(freqDeviation),
      Math.max(...freqDeviation),
      this.std(data.frequency) / (baseline.stdFrequency || 1)
    );
    
    // Voltage features
    const voltageDeviation = data.voltage.map(v => Math.abs(v - baseline.meanVoltage));
    features.push(
      this.mean(voltageDeviation) / (baseline.stdVoltage || 1),
      Math.max(...voltageDeviation) / (baseline.stdVoltage || 1)
    );
    
    // Communication pattern features
    const commFeatures = this.extractCommFeatures(data.communicationPatterns, baseline);
    features.push(...commFeatures);
    
    // Correlation features
    features.push(
      this.correlation(data.powerOutput, data.setpoints),
      this.correlation(data.frequency, data.voltage)
    );
    
    // Pad to fixed size for model input
    while (features.length < 32) {
      features.push(0);
    }
    
    return features.slice(0, 32);
  }

  private runQuantizedInference(features: number[]): number[] {
    if (!this.quantizedWeights) {
      return [0, 0, 0, 0, 0]; // [normal, demand_manip, freq_attack, exfil, firmware]
    }

    // Quantize input features
    const maxInput = Math.max(...features.map(Math.abs)) || 1;
    const inputScale = 127 / maxInput;
    const quantizedInput = features.map(f => Math.round(f * inputScale));
    
    // Simplified depthwise separable conv + dense inference
    // Layer 1: Depthwise conv (simulate)
    let hidden = this.depthwiseConv(quantizedInput, 0);
    hidden = this.relu(hidden);
    
    // Layer 2: Pointwise conv
    hidden = this.pointwiseConv(hidden, 1000);
    hidden = this.relu(hidden);
    
    // Layer 3: Global average pooling
    const pooled = this.globalAvgPool(hidden, 16);
    
    // Layer 4: Dense to output
    const output = this.denseLayer(pooled, 2000, 5);
    
    // Softmax
    return this.softmax(output);
  }

  private depthwiseConv(input: number[], weightOffset: number): number[] {
    const kernelSize = 3;
    const output: number[] = [];
    
    for (let i = 0; i < input.length - kernelSize + 1; i++) {
      let sum = 0;
      for (let k = 0; k < kernelSize; k++) {
        const weightIdx = weightOffset + k;
        const weight = this.quantizedWeights![weightIdx % this.quantizedWeights!.length];
        sum += input[i + k] * weight;
      }
      output.push(sum >> 7); // Dequantize
    }
    
    return output;
  }

  private pointwiseConv(input: number[], weightOffset: number): number[] {
    const outputChannels = 64;
    const output: number[] = [];
    
    for (let o = 0; o < outputChannels; o++) {
      let sum = 0;
      for (let i = 0; i < Math.min(input.length, 32); i++) {
        const weightIdx = weightOffset + o * 32 + i;
        const weight = this.quantizedWeights![weightIdx % this.quantizedWeights!.length];
        sum += input[i] * weight;
      }
      output.push(sum >> 7);
    }
    
    return output;
  }

  private globalAvgPool(input: number[], outputSize: number): number[] {
    const poolSize = Math.ceil(input.length / outputSize);
    const output: number[] = [];
    
    for (let i = 0; i < outputSize; i++) {
      const start = i * poolSize;
      const end = Math.min(start + poolSize, input.length);
      const slice = input.slice(start, end);
      output.push(slice.length > 0 ? this.mean(slice) : 0);
    }
    
    return output;
  }

  private denseLayer(input: number[], weightOffset: number, outputSize: number): number[] {
    const output: number[] = [];
    
    for (let o = 0; o < outputSize; o++) {
      let sum = 0;
      for (let i = 0; i < input.length; i++) {
        const weightIdx = weightOffset + o * input.length + i;
        const weight = this.quantizedWeights![weightIdx % this.quantizedWeights!.length];
        sum += input[i] * weight;
      }
      output.push(sum >> 7);
    }
    
    return output;
  }

  private relu(values: number[]): number[] {
    return values.map(v => Math.max(0, v));
  }

  private softmax(values: number[]): number[] {
    const maxVal = Math.max(...values);
    const expValues = values.map(v => Math.exp(v - maxVal));
    const sumExp = expValues.reduce((a, b) => a + b, 0) || 1;
    return expValues.map(v => v / sumExp);
  }

  private analyzeAttackType(
    data: DERData,
    baseline: DeviceBaseline,
    prediction: number[]
  ): {
    isAnomaly: boolean;
    anomalyScore: number;
    attackType: DERAttackDetection['attackType'];
    confidence: number;
  } {
    // Find highest probability attack type
    const attackTypes: DERAttackDetection['attackType'][] = [
      'none', 'demand_manipulation', 'frequency_attack', 'data_exfiltration', 'firmware_tampering'
    ];
    
    let maxIdx = 0;
    let maxProb = prediction[0];
    
    for (let i = 1; i < prediction.length; i++) {
      if (prediction[i] > maxProb) {
        maxProb = prediction[i];
        maxIdx = i;
      }
    }
    
    // Additional rule-based checks
    const ruleBasedScore = this.ruleBasedDetection(data, baseline);
    
    // Combine ML prediction with rule-based detection
    const combinedScore = 0.6 * maxProb + 0.4 * ruleBasedScore.score;
    
    const isAnomaly = combinedScore > 0.5 || maxIdx > 0;
    
    // If rule-based detection is stronger, use its attack type
    let attackType = attackTypes[maxIdx];
    if (ruleBasedScore.score > maxProb && ruleBasedScore.attackType !== 'none') {
      attackType = ruleBasedScore.attackType;
    }
    
    return {
      isAnomaly,
      anomalyScore: combinedScore,
      attackType,
      confidence: maxProb
    };
  }

  private ruleBasedDetection(data: DERData, baseline: DeviceBaseline): {
    score: number;
    attackType: DERAttackDetection['attackType'];
  } {
    let maxScore = 0;
    let detectedType: DERAttackDetection['attackType'] = 'none';
    
    // Check demand manipulation
    const setpointChangeRate = this.computeChangeRate(data.setpoints);
    if (setpointChangeRate > DER_ATTACK_SIGNATURES.demand_manipulation.thresholds.setpointChangeRate) {
      const score = Math.min(setpointChangeRate / 0.5, 1);
      if (score > maxScore) {
        maxScore = score;
        detectedType = 'demand_manipulation';
      }
    }
    
    // Check frequency attack
    const freqDeviation = Math.max(...data.frequency.map(f => Math.abs(f - 60))) / 60;
    if (freqDeviation > DER_ATTACK_SIGNATURES.frequency_attack.thresholds.frequencyDeviation) {
      const score = Math.min(freqDeviation / 0.1, 1);
      if (score > maxScore) {
        maxScore = score;
        detectedType = 'frequency_attack';
      }
    }
    
    // Check data exfiltration
    const commAnomaly = this.detectCommAnomaly(data.communicationPatterns, baseline);
    if (commAnomaly > DER_ATTACK_SIGNATURES.data_exfiltration.thresholds.commAnomalyScore) {
      if (commAnomaly > maxScore) {
        maxScore = commAnomaly;
        detectedType = 'data_exfiltration';
      }
    }
    
    // Check firmware tampering (timing-based)
    const timingAnomaly = this.detectTimingAnomaly(data, baseline);
    if (timingAnomaly > DER_ATTACK_SIGNATURES.firmware_tampering.thresholds.timingAnomaly) {
      if (timingAnomaly > maxScore) {
        maxScore = timingAnomaly;
        detectedType = 'firmware_tampering';
      }
    }
    
    return { score: maxScore, attackType: detectedType };
  }

  private updateBaseline(deviceId: string, data: DERData, prediction: number[]): void {
    const baseline = this.deviceBaselines.get(deviceId);
    if (!baseline) return;
    
    // Only update if not under attack
    if (prediction[0] > 0.7) { // High confidence normal
      const alpha = 0.1; // Learning rate
      
      baseline.meanPower = alpha * this.mean(data.powerOutput) + (1 - alpha) * baseline.meanPower;
      baseline.stdPower = alpha * this.std(data.powerOutput) + (1 - alpha) * baseline.stdPower;
      baseline.meanFrequency = alpha * this.mean(data.frequency) + (1 - alpha) * baseline.meanFrequency;
      baseline.stdFrequency = alpha * this.std(data.frequency) + (1 - alpha) * baseline.stdFrequency;
      baseline.sampleCount++;
      baseline.lastUpdated = new Date().toISOString();
    }
  }

  // Utility functions
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private std(values: number[]): number {
    if (values.length === 0) return 0;
    const m = this.mean(values);
    return Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length);
  }

  private computeChanges(values: number[]): number[] {
    const changes: number[] = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(values[i] - values[i - 1]);
    }
    return changes;
  }

  private computeRampRate(values: number[]): number {
    if (values.length < 2) return 0;
    const changes = this.computeChanges(values);
    return Math.max(...changes.map(Math.abs));
  }

  private computeChangeFrequency(values: number[]): number {
    if (values.length < 2) return 0;
    let changeCount = 0;
    for (let i = 1; i < values.length; i++) {
      if (Math.abs(values[i] - values[i - 1]) > 0.01) {
        changeCount++;
      }
    }
    return changeCount / (values.length - 1);
  }

  private computeChangeRate(values: number[]): number {
    const changes = this.computeChanges(values);
    return this.mean(changes.map(Math.abs));
  }

  private correlation(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    const meanA = this.mean(a);
    const meanB = this.mean(b);
    const stdA = this.std(a) || 1;
    const stdB = this.std(b) || 1;
    
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - meanA) * (b[i] - meanB);
    }
    
    return sum / (a.length * stdA * stdB);
  }

  private analyzeCommPatterns(patterns: DERData['communicationPatterns']): Map<string, number> {
    const typeCounts = new Map<string, number>();
    for (const p of patterns) {
      typeCounts.set(p.messageType, (typeCounts.get(p.messageType) || 0) + 1);
    }
    return typeCounts;
  }

  private extractCommFeatures(
    patterns: DERData['communicationPatterns'],
    baseline: DeviceBaseline
  ): number[] {
    const currentCounts = this.analyzeCommPatterns(patterns);
    const features: number[] = [];
    
    // Compare to baseline
    let totalDeviation = 0;
    let unknownTypes = 0;
    
    for (const [type, count] of currentCounts) {
      const baselineCount = baseline.typicalCommPatterns.get(type) || 0;
      if (baselineCount === 0) {
        unknownTypes++;
      } else {
        totalDeviation += Math.abs(count - baselineCount) / baselineCount;
      }
    }
    
    features.push(
      totalDeviation / (currentCounts.size || 1),
      unknownTypes / (currentCounts.size || 1),
      patterns.length / 100 // Normalized message count
    );
    
    return features;
  }

  private detectCommAnomaly(
    patterns: DERData['communicationPatterns'],
    baseline: DeviceBaseline
  ): number {
    const features = this.extractCommFeatures(patterns, baseline);
    return Math.min((features[0] + features[1]) / 2, 1);
  }

  private detectTimingAnomaly(data: DERData, baseline: DeviceBaseline): number {
    // Check if response patterns deviate from baseline
    // This is a simplified version - real implementation would analyze timing
    const powerVariability = this.std(data.powerOutput) / (baseline.stdPower || 1);
    return Math.min(Math.abs(powerVariability - 1), 1);
  }

  // Federated learning simulation
  async federatedUpdate(localGradients: number[][]): Promise<number[]> {
    // Clip gradients for differential privacy
    const clippedGradients = localGradients.map(g => 
      this.clipGradient(g, 1.0)
    );
    
    // Add Gaussian noise for privacy
    const noisyGradients = clippedGradients.map(g =>
      this.addNoise(g, this.config.privacyBudget)
    );
    
    // Aggregate (FedAvg)
    const aggregated = this.fedAvg(noisyGradients);
    
    return aggregated;
  }

  private clipGradient(gradient: number[], maxNorm: number): number[] {
    const norm = Math.sqrt(gradient.reduce((sum, g) => sum + g * g, 0));
    if (norm > maxNorm) {
      return gradient.map(g => g * maxNorm / norm);
    }
    return gradient;
  }

  private addNoise(gradient: number[], epsilon: number): number[] {
    const sigma = 1.0 / epsilon;
    return gradient.map(g => g + this.gaussianNoise(0, sigma));
  }

  private gaussianNoise(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private fedAvg(gradients: number[][]): number[] {
    if (gradients.length === 0) return [];
    
    const avgLength = gradients[0].length;
    const avg: number[] = new Array(avgLength).fill(0);
    
    for (const g of gradients) {
      for (let i = 0; i < Math.min(g.length, avgLength); i++) {
        avg[i] += g[i];
      }
    }
    
    return avg.map(v => v / gradients.length);
  }
}

interface DeviceBaseline {
  deviceId: string;
  meanPower: number;
  stdPower: number;
  meanSetpoint: number;
  stdSetpoint: number;
  meanFrequency: number;
  stdFrequency: number;
  meanVoltage: number;
  stdVoltage: number;
  typicalCommPatterns: Map<string, number>;
  sampleCount: number;
  lastUpdated: string;
}
