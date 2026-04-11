// YOLOv9 + LSTM AND-Gate Fusion for Physical Sabotage Detection
// Combines visual detection with sensor fusion

import type { PhysicalThreatDetection } from '@/lib/types/database';

interface PhysicalData {
  videoFrame?: ArrayBuffer;
  sensorReadings: {
    motion: number[];
    vibration: number[];
    acoustic: number[];
    thermal: number[];
  };
}

interface DetectedObject {
  class: string;
  confidence: number;
  boundingBox: [number, number, number, number]; // [x, y, width, height]
}

interface YOLOConfig {
  confidenceThreshold: number;
  nmsThreshold: number;
  inputSize: [number, number];
  classes: string[];
}

interface LSTMConfig {
  hiddenSize: number;
  numLayers: number;
  sequenceLength: number;
  dropout: number;
}

interface FusionConfig {
  visualThreshold: number;
  sensorThreshold: number;
  combinedThreshold: number;
  andGateRequired: boolean;
}

// Object classes for OT environment detection
const OT_CLASSES = [
  'person',
  'vehicle',
  'drone',
  'tool',
  'suspicious_package',
  'weapon',
  'climbing_equipment',
  'electronic_device',
  'camera',
  'uniform_authorized',
  'uniform_unknown'
];

export class PhysicalThreatDetector {
  private yoloConfig: YOLOConfig;
  private lstmConfig: LSTMConfig;
  private fusionConfig: FusionConfig;
  private isInitialized: boolean = false;
  
  // YOLO weights (simplified)
  private yoloWeights: Float32Array | null = null;
  
  // LSTM weights
  private lstmWeightsIh: number[][] = [];
  private lstmWeightsHh: number[][] = [];
  private lstmBias: number[] = [];
  private hiddenState: number[] = [];
  private cellState: number[] = [];

  constructor(
    yoloConfig?: Partial<YOLOConfig>,
    lstmConfig?: Partial<LSTMConfig>,
    fusionConfig?: Partial<FusionConfig>
  ) {
    this.yoloConfig = {
      confidenceThreshold: 0.5,
      nmsThreshold: 0.4,
      inputSize: [640, 640],
      classes: OT_CLASSES,
      ...yoloConfig
    };

    this.lstmConfig = {
      hiddenSize: 128,
      numLayers: 3,
      sequenceLength: 50,
      dropout: 0.2,
      ...lstmConfig
    };

    this.fusionConfig = {
      visualThreshold: 0.7,
      sensorThreshold: 0.65,
      combinedThreshold: 0.8,
      andGateRequired: true,
      ...fusionConfig
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize YOLO weights
    this.initializeYOLO();
    
    // Initialize LSTM weights
    this.initializeLSTM();
    
    this.isInitialized = true;
  }

  private initializeYOLO(): void {
    // Simplified YOLO backbone weights
    const numWeights = 1000000; // ~4MB for simplified model
    this.yoloWeights = new Float32Array(numWeights);
    
    const scale = Math.sqrt(2.0 / numWeights);
    for (let i = 0; i < numWeights; i++) {
      this.yoloWeights[i] = (Math.random() * 2 - 1) * scale;
    }
  }

  private initializeLSTM(): void {
    const inputSize = 64; // Sensor feature dimension
    const hiddenSize = this.lstmConfig.hiddenSize;
    
    // Input-to-hidden weights
    this.lstmWeightsIh = this.createWeightMatrix(inputSize, 4 * hiddenSize);
    
    // Hidden-to-hidden weights
    this.lstmWeightsHh = this.createWeightMatrix(hiddenSize, 4 * hiddenSize);
    
    // Bias
    this.lstmBias = new Array(4 * hiddenSize).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    
    // Initialize states
    this.hiddenState = new Array(hiddenSize).fill(0);
    this.cellState = new Array(hiddenSize).fill(0);
  }

  private createWeightMatrix(rows: number, cols: number): number[][] {
    const scale = Math.sqrt(2.0 / (rows + cols));
    const matrix: number[][] = [];
    
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = (Math.random() * 2 - 1) * scale;
      }
    }
    
    return matrix;
  }

  async detect(data: PhysicalData): Promise<PhysicalThreatDetection> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Visual detection (YOLO)
    let visualDetections: DetectedObject[] = [];
    let visualConfidence = 0;
    
    if (data.videoFrame) {
      visualDetections = await this.runYOLO(data.videoFrame);
      visualConfidence = this.computeVisualThreatScore(visualDetections);
    }
    
    // Sensor anomaly detection (LSTM)
    const sensorFeatures = this.extractSensorFeatures(data.sensorReadings);
    const sensorConfidence = this.runLSTM(sensorFeatures);
    
    // AND-Gate fusion
    const { isThreat, threatScore, fusionResult } = this.andGateFusion(
      visualConfidence,
      sensorConfidence,
      visualDetections
    );

    return {
      isThreat,
      threatScore,
      visualConfidence,
      sensorConfidence,
      detectedObjects: visualDetections,
      fusionResult
    };
  }

  private async runYOLO(frame: ArrayBuffer): Promise<DetectedObject[]> {
    // Simulate YOLO detection on frame
    // In production, this would use ONNX Runtime or TensorFlow.js
    
    const detections: DetectedObject[] = [];
    
    // Analyze frame data (simplified)
    const frameData = new Uint8Array(frame);
    const frameSize = frameData.length;
    
    // Compute simple statistics to simulate detection
    let brightness = 0;
    let motion = 0;
    
    for (let i = 0; i < Math.min(frameSize, 10000); i += 4) {
      brightness += frameData[i];
      if (i > 0) {
        motion += Math.abs(frameData[i] - frameData[i - 4]);
      }
    }
    
    brightness /= Math.min(frameSize / 4, 2500);
    motion /= Math.min(frameSize / 4, 2500);
    
    // Generate synthetic detections based on analysis
    // In production, this would be actual YOLO inference
    if (motion > 50 || brightness > 100) {
      // Simulate person detection
      if (Math.random() > 0.3) {
        detections.push({
          class: 'person',
          confidence: 0.6 + Math.random() * 0.35,
          boundingBox: [
            Math.random() * 400,
            Math.random() * 300,
            50 + Math.random() * 100,
            100 + Math.random() * 150
          ]
        });
      }
      
      // Simulate other detections with lower probability
      if (Math.random() > 0.7) {
        const otherClasses = ['vehicle', 'drone', 'tool', 'suspicious_package'];
        const randomClass = otherClasses[Math.floor(Math.random() * otherClasses.length)];
        detections.push({
          class: randomClass,
          confidence: 0.5 + Math.random() * 0.4,
          boundingBox: [
            Math.random() * 400,
            Math.random() * 300,
            30 + Math.random() * 80,
            30 + Math.random() * 80
          ]
        });
      }
    }
    
    // Apply NMS
    return this.nonMaxSuppression(detections);
  }

  private nonMaxSuppression(detections: DetectedObject[]): DetectedObject[] {
    // Sort by confidence
    detections.sort((a, b) => b.confidence - a.confidence);
    
    const kept: DetectedObject[] = [];
    const suppressed = new Set<number>();
    
    for (let i = 0; i < detections.length; i++) {
      if (suppressed.has(i)) continue;
      
      if (detections[i].confidence < this.yoloConfig.confidenceThreshold) continue;
      
      kept.push(detections[i]);
      
      // Suppress overlapping boxes
      for (let j = i + 1; j < detections.length; j++) {
        if (suppressed.has(j)) continue;
        
        const iou = this.computeIoU(detections[i].boundingBox, detections[j].boundingBox);
        if (iou > this.yoloConfig.nmsThreshold) {
          suppressed.add(j);
        }
      }
    }
    
    return kept;
  }

  private computeIoU(box1: [number, number, number, number], box2: [number, number, number, number]): number {
    const [x1, y1, w1, h1] = box1;
    const [x2, y2, w2, h2] = box2;
    
    const left = Math.max(x1, x2);
    const top = Math.max(y1, y2);
    const right = Math.min(x1 + w1, x2 + w2);
    const bottom = Math.min(y1 + h1, y2 + h2);
    
    if (right < left || bottom < top) return 0;
    
    const intersection = (right - left) * (bottom - top);
    const union = w1 * h1 + w2 * h2 - intersection;
    
    return intersection / union;
  }

  private computeVisualThreatScore(detections: DetectedObject[]): number {
    if (detections.length === 0) return 0;
    
    // Threat weights for different classes
    const threatWeights: Record<string, number> = {
      'person': 0.3,
      'vehicle': 0.4,
      'drone': 0.8,
      'tool': 0.5,
      'suspicious_package': 0.9,
      'weapon': 1.0,
      'climbing_equipment': 0.7,
      'electronic_device': 0.4,
      'camera': 0.6,
      'uniform_authorized': 0.1,
      'uniform_unknown': 0.5
    };
    
    let maxThreat = 0;
    let combinedThreat = 0;
    
    for (const detection of detections) {
      const weight = threatWeights[detection.class] || 0.3;
      const threat = weight * detection.confidence;
      maxThreat = Math.max(maxThreat, threat);
      combinedThreat += threat;
    }
    
    // Combine max and average threat
    const avgThreat = combinedThreat / detections.length;
    return 0.6 * maxThreat + 0.4 * avgThreat;
  }

  private extractSensorFeatures(sensors: PhysicalData['sensorReadings']): number[] {
    const features: number[] = [];
    
    // Motion features
    const motionFeatures = this.extractTimeSeriesFeatures(sensors.motion);
    features.push(...motionFeatures);
    
    // Vibration features (FFT-like analysis)
    const vibrationFeatures = this.extractSpectralFeatures(sensors.vibration);
    features.push(...vibrationFeatures);
    
    // Acoustic features
    const acousticFeatures = this.extractAcousticFeatures(sensors.acoustic);
    features.push(...acousticFeatures);
    
    // Thermal features
    const thermalFeatures = this.extractThermalFeatures(sensors.thermal);
    features.push(...thermalFeatures);
    
    // Pad or truncate to fixed size
    while (features.length < 64) {
      features.push(0);
    }
    
    return features.slice(0, 64);
  }

  private extractTimeSeriesFeatures(values: number[]): number[] {
    if (values.length === 0) return [0, 0, 0, 0, 0, 0];
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Rate of change
    let roc = 0;
    for (let i = 1; i < values.length; i++) {
      roc += Math.abs(values[i] - values[i - 1]);
    }
    roc /= values.length - 1 || 1;
    
    return [mean, std, max, min, roc, variance];
  }

  private extractSpectralFeatures(values: number[]): number[] {
    if (values.length === 0) return [0, 0, 0, 0, 0, 0];
    
    // Simplified DFT for frequency analysis
    const n = values.length;
    const frequencies: number[] = [];
    
    for (let k = 0; k < Math.min(n, 10); k++) {
      let real = 0;
      let imag = 0;
      
      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        real += values[t] * Math.cos(angle);
        imag -= values[t] * Math.sin(angle);
      }
      
      frequencies.push(Math.sqrt(real * real + imag * imag) / n);
    }
    
    // Extract spectral features
    const peakFreq = frequencies.indexOf(Math.max(...frequencies));
    const spectralCentroid = frequencies.reduce((sum, f, i) => sum + f * i, 0) / 
      (frequencies.reduce((a, b) => a + b, 0) || 1);
    const spectralSpread = Math.sqrt(
      frequencies.reduce((sum, f, i) => sum + f * Math.pow(i - spectralCentroid, 2), 0) /
      (frequencies.reduce((a, b) => a + b, 0) || 1)
    );
    
    return [
      peakFreq,
      Math.max(...frequencies),
      spectralCentroid,
      spectralSpread,
      frequencies.reduce((a, b) => a + b, 0),
      frequencies.filter(f => f > 0.1).length
    ];
  }

  private extractAcousticFeatures(values: number[]): number[] {
    if (values.length === 0) return [0, 0, 0, 0, 0, 0];
    
    // Convert to dB scale (simplified)
    const dbValues = values.map(v => Math.max(0, v) > 0 ? 20 * Math.log10(Math.max(0.001, v)) : -60);
    
    const meanDb = dbValues.reduce((a, b) => a + b, 0) / dbValues.length;
    const maxDb = Math.max(...dbValues);
    const dynamicRange = maxDb - Math.min(...dbValues);
    
    // Zero crossing rate
    let zcr = 0;
    for (let i = 1; i < values.length; i++) {
      if ((values[i] >= 0 && values[i - 1] < 0) || (values[i] < 0 && values[i - 1] >= 0)) {
        zcr++;
      }
    }
    zcr /= values.length - 1 || 1;
    
    // Energy
    const energy = values.reduce((sum, v) => sum + v * v, 0) / values.length;
    
    return [meanDb, maxDb, dynamicRange, zcr, energy, Math.sqrt(energy)];
  }

  private extractThermalFeatures(values: number[]): number[] {
    if (values.length === 0) return [0, 0, 0, 0];
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Temperature gradient
    let gradient = 0;
    for (let i = 1; i < values.length; i++) {
      gradient += values[i] - values[i - 1];
    }
    gradient /= values.length - 1 || 1;
    
    return [mean, max - min, gradient, max];
  }

  private runLSTM(features: number[]): number {
    const hiddenSize = this.lstmConfig.hiddenSize;
    
    // LSTM forward pass
    // Gates: forget, input, cell, output
    const gates: number[] = new Array(4 * hiddenSize).fill(0);
    
    // Input to hidden
    for (let i = 0; i < 4 * hiddenSize; i++) {
      for (let j = 0; j < Math.min(features.length, this.lstmWeightsIh.length); j++) {
        gates[i] += features[j] * (this.lstmWeightsIh[j]?.[i] || 0);
      }
    }
    
    // Hidden to hidden
    for (let i = 0; i < 4 * hiddenSize; i++) {
      for (let j = 0; j < hiddenSize; j++) {
        gates[i] += this.hiddenState[j] * (this.lstmWeightsHh[j]?.[i] || 0);
      }
      gates[i] += this.lstmBias[i];
    }
    
    // Apply activations
    const forgetGate = gates.slice(0, hiddenSize).map(v => this.sigmoid(v));
    const inputGate = gates.slice(hiddenSize, 2 * hiddenSize).map(v => this.sigmoid(v));
    const cellGate = gates.slice(2 * hiddenSize, 3 * hiddenSize).map(v => Math.tanh(v));
    const outputGate = gates.slice(3 * hiddenSize).map(v => this.sigmoid(v));
    
    // Update cell state
    for (let i = 0; i < hiddenSize; i++) {
      this.cellState[i] = forgetGate[i] * this.cellState[i] + inputGate[i] * cellGate[i];
      this.hiddenState[i] = outputGate[i] * Math.tanh(this.cellState[i]);
    }
    
    // Compute anomaly score from hidden state
    const hiddenMean = this.hiddenState.reduce((a, b) => a + b, 0) / hiddenSize;
    const hiddenStd = Math.sqrt(
      this.hiddenState.reduce((sum, v) => sum + Math.pow(v - hiddenMean, 2), 0) / hiddenSize
    );
    
    // Normalize to 0-1 anomaly score
    const rawScore = Math.abs(hiddenMean) + hiddenStd;
    return Math.min(rawScore / 2, 1);
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }

  private andGateFusion(
    visualConfidence: number,
    sensorConfidence: number,
    detections: DetectedObject[]
  ): {
    isThreat: boolean;
    threatScore: number;
    fusionResult: 'confirmed' | 'visual_only' | 'sensor_only' | 'none';
  } {
    const visualAboveThreshold = visualConfidence > this.fusionConfig.visualThreshold;
    const sensorAboveThreshold = sensorConfidence > this.fusionConfig.sensorThreshold;
    
    // AND-gate: both must be above threshold
    if (this.fusionConfig.andGateRequired) {
      if (visualAboveThreshold && sensorAboveThreshold) {
        const combinedScore = (visualConfidence + sensorConfidence) / 2;
        return {
          isThreat: combinedScore > this.fusionConfig.combinedThreshold,
          threatScore: combinedScore,
          fusionResult: 'confirmed'
        };
      }
      
      // Check for high-confidence single-modal detection
      if (visualConfidence > 0.9) {
        return {
          isThreat: true,
          threatScore: visualConfidence * 0.8, // Reduce confidence for single-modal
          fusionResult: 'visual_only'
        };
      }
      
      if (sensorConfidence > 0.9) {
        return {
          isThreat: true,
          threatScore: sensorConfidence * 0.8,
          fusionResult: 'sensor_only'
        };
      }
      
      return {
        isThreat: false,
        threatScore: Math.max(visualConfidence, sensorConfidence) * 0.5,
        fusionResult: 'none'
      };
    }
    
    // OR-gate: either above threshold
    if (visualAboveThreshold || sensorAboveThreshold) {
      const combinedScore = Math.max(visualConfidence, sensorConfidence);
      let fusionResult: 'confirmed' | 'visual_only' | 'sensor_only' = 'visual_only';
      
      if (visualAboveThreshold && sensorAboveThreshold) {
        fusionResult = 'confirmed';
      } else if (sensorAboveThreshold) {
        fusionResult = 'sensor_only';
      }
      
      return {
        isThreat: true,
        threatScore: combinedScore,
        fusionResult
      };
    }
    
    return {
      isThreat: false,
      threatScore: 0,
      fusionResult: 'none'
    };
  }

  // Reset LSTM state
  resetState(): void {
    this.hiddenState = new Array(this.lstmConfig.hiddenSize).fill(0);
    this.cellState = new Array(this.lstmConfig.hiddenSize).fill(0);
  }

  // Configure fusion thresholds
  setFusionConfig(config: Partial<FusionConfig>): void {
    this.fusionConfig = { ...this.fusionConfig, ...config };
  }
}
