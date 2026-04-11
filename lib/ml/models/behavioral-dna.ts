// Behavioral DNA Profiling for Insider Threat Detection
// Siamese network with triplet loss for per-operator profiling

import type { InsiderThreatDetection } from '@/lib/types/database';

interface BehaviorData {
  userId: string;
  keystrokes: { key: string; duration: number; interval: number }[];
  mouseMovements: { x: number; y: number; dx: number; dy: number }[];
  commands: string[];
  sessionInfo: { startTime: string; duration: number; actions: number };
  storedProfile?: number[];
}

interface SiameseConfig {
  keystrokeEmbedDim: number;
  mouseEmbedDim: number;
  commandEmbedDim: number;
  fusionDim: number;
  dnaDim: number;
  margin: number;
}

export class InsiderThreatDetector {
  private config: SiameseConfig;
  private isInitialized: boolean = false;
  
  // Encoders
  private keystrokeEncoder: number[][] = [];
  private mouseEncoder: number[][] = [];
  private commandEncoder: number[][] = [];
  
  // Fusion network
  private fusionWeights: number[][] = [];
  private dnaProjection: number[][] = [];
  
  // User profiles storage
  private userProfiles: Map<string, UserProfile> = new Map();
  
  // Command vocabulary
  private commandVocab: Map<string, number> = new Map();

  constructor(config?: Partial<SiameseConfig>) {
    this.config = {
      keystrokeEmbedDim: 64,
      mouseEmbedDim: 64,
      commandEmbedDim: 64,
      fusionDim: 192,
      dnaDim: 128,
      margin: 0.5,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize encoders
    this.initializeKeystrokeEncoder();
    this.initializeMouseEncoder();
    this.initializeCommandEncoder();
    
    // Initialize fusion network
    this.initializeFusionNetwork();
    
    // Initialize command vocabulary with common OT commands
    this.initializeCommandVocab();
    
    this.isInitialized = true;
  }

  private initializeKeystrokeEncoder(): void {
    // Temporal CNN for keystroke dynamics
    // Input: [dwell_time, flight_time, key_category, modifier_flags] per keystroke
    this.keystrokeEncoder = [
      this.createWeightMatrix(4, 32),   // Conv layer 1
      this.createWeightMatrix(32, 64),  // Conv layer 2
      this.createWeightMatrix(64, this.config.keystrokeEmbedDim) // Output
    ];
  }

  private initializeMouseEncoder(): void {
    // Trajectory LSTM for mouse movements
    // Input: [x, y, dx, dy, speed, acceleration] per point
    this.mouseEncoder = [
      this.createWeightMatrix(6, 32),
      this.createWeightMatrix(32, 64),
      this.createWeightMatrix(64, this.config.mouseEmbedDim)
    ];
  }

  private initializeCommandEncoder(): void {
    // Transformer-like encoder for command sequences
    this.commandEncoder = [
      this.createWeightMatrix(100, 64), // Embedding
      this.createWeightMatrix(64, 64),  // Self-attention (simplified)
      this.createWeightMatrix(64, this.config.commandEmbedDim)
    ];
  }

  private initializeFusionNetwork(): void {
    const totalEmbedDim = this.config.keystrokeEmbedDim + 
                          this.config.mouseEmbedDim + 
                          this.config.commandEmbedDim;
    
    this.fusionWeights = [
      this.createWeightMatrix(totalEmbedDim, this.config.fusionDim),
      this.createWeightMatrix(this.config.fusionDim, this.config.fusionDim)
    ];
    
    this.dnaProjection = [
      this.createWeightMatrix(this.config.fusionDim, this.config.dnaDim)
    ];
  }

  private initializeCommandVocab(): void {
    const commonCommands = [
      // SCADA/HMI commands
      'read', 'write', 'set', 'get', 'start', 'stop', 'reset',
      'acknowledge', 'force', 'unforce', 'enable', 'disable',
      // Modbus
      'read_coils', 'read_registers', 'write_single', 'write_multiple',
      // DNP3
      'direct_operate', 'select', 'operate', 'freeze', 'clear',
      // OPC-UA
      'browse', 'read_value', 'write_value', 'subscribe', 'call_method',
      // System
      'login', 'logout', 'admin', 'config', 'download', 'upload',
      'view', 'edit', 'delete', 'create', 'export', 'import'
    ];
    
    commonCommands.forEach((cmd, idx) => {
      this.commandVocab.set(cmd.toLowerCase(), idx);
    });
  }

  private createWeightMatrix(inputDim: number, outputDim: number): number[] {
    const scale = Math.sqrt(2.0 / (inputDim + outputDim));
    const weights: number[] = [];
    
    for (let i = 0; i < inputDim * outputDim; i++) {
      weights.push((Math.random() * 2 - 1) * scale);
    }
    
    return weights;
  }

  async detect(data: BehaviorData): Promise<InsiderThreatDetection> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Extract behavioral DNA from current session
    const currentDNA = this.extractDNA(data);
    
    // Get or create stored profile
    let storedProfile = data.storedProfile;
    if (!storedProfile) {
      const userProfile = this.userProfiles.get(data.userId);
      storedProfile = userProfile?.dna;
    }
    
    // If no stored profile, create initial profile and return low risk
    if (!storedProfile || storedProfile.length === 0) {
      this.updateProfile(data.userId, currentDNA, true);
      return {
        authScore: 1.0,
        isAnomalous: false,
        deviationFactors: [],
        riskLevel: 'none',
        recommendedAction: 'allow'
      };
    }
    
    // Compute similarity between current and stored DNA
    const similarity = this.cosineSimilarity(currentDNA, storedProfile);
    
    // Analyze deviation factors
    const deviationFactors = this.analyzeDeviations(data, currentDNA, storedProfile);
    
    // Determine risk level and action
    const { riskLevel, recommendedAction } = this.assessRisk(similarity, deviationFactors);
    
    // Update profile if behavior is normal
    if (similarity > 0.8) {
      this.updateProfile(data.userId, currentDNA, false);
    }

    return {
      authScore: similarity,
      isAnomalous: similarity < 0.7,
      deviationFactors,
      riskLevel,
      recommendedAction
    };
  }

  private extractDNA(data: BehaviorData): number[] {
    // Encode keystrokes
    const keystrokeEmbed = this.encodeKeystrokes(data.keystrokes);
    
    // Encode mouse movements
    const mouseEmbed = this.encodeMouseMovements(data.mouseMovements);
    
    // Encode commands
    const commandEmbed = this.encodeCommands(data.commands);
    
    // Encode session metadata
    const sessionEmbed = this.encodeSessionInfo(data.sessionInfo);
    
    // Fuse embeddings
    const combined = [...keystrokeEmbed, ...mouseEmbed, ...commandEmbed];
    
    // Apply fusion network
    let fused = this.linearForward(combined, this.fusionWeights[0], this.config.fusionDim);
    fused = fused.map(v => Math.max(0, v)); // ReLU
    fused = this.linearForward(fused, this.fusionWeights[1], this.config.fusionDim);
    fused = fused.map(v => Math.max(0, v));
    
    // Add session context
    for (let i = 0; i < Math.min(sessionEmbed.length, fused.length); i++) {
      fused[i] += sessionEmbed[i] * 0.1;
    }
    
    // Project to DNA space
    const dna = this.linearForward(fused, this.dnaProjection[0], this.config.dnaDim);
    
    // L2 normalize
    return this.l2Normalize(dna);
  }

  private encodeKeystrokes(keystrokes: BehaviorData['keystrokes']): number[] {
    if (keystrokes.length === 0) {
      return new Array(this.config.keystrokeEmbedDim).fill(0);
    }

    // Extract features from keystroke dynamics
    const features: number[] = [];
    
    // Dwell time statistics
    const dwellTimes = keystrokes.map(k => k.duration);
    features.push(
      this.mean(dwellTimes),
      this.std(dwellTimes),
      Math.min(...dwellTimes),
      Math.max(...dwellTimes)
    );
    
    // Flight time (interval) statistics
    const intervals = keystrokes.map(k => k.interval);
    features.push(
      this.mean(intervals),
      this.std(intervals),
      Math.min(...intervals),
      Math.max(...intervals)
    );
    
    // Key category distribution
    const categories = this.categorizeKeys(keystrokes);
    features.push(
      categories.alpha / keystrokes.length,
      categories.numeric / keystrokes.length,
      categories.special / keystrokes.length,
      categories.modifier / keystrokes.length
    );
    
    // Typing rhythm features
    const rhythmFeatures = this.extractRhythmFeatures(dwellTimes, intervals);
    features.push(...rhythmFeatures);
    
    // Digraph timing (common key pairs)
    const digraphFeatures = this.extractDigraphFeatures(keystrokes);
    features.push(...digraphFeatures);
    
    // Pad or truncate to fixed size
    while (features.length < 64) {
      features.push(0);
    }
    
    // Apply encoder
    let encoded = features.slice(0, 64);
    for (let i = 0; i < this.keystrokeEncoder.length; i++) {
      const outputDim = i === this.keystrokeEncoder.length - 1 
        ? this.config.keystrokeEmbedDim 
        : 64;
      encoded = this.linearForward(encoded, this.keystrokeEncoder[i], outputDim);
      if (i < this.keystrokeEncoder.length - 1) {
        encoded = encoded.map(v => Math.tanh(v));
      }
    }
    
    return encoded;
  }

  private categorizeKeys(keystrokes: BehaviorData['keystrokes']): Record<string, number> {
    const categories = { alpha: 0, numeric: 0, special: 0, modifier: 0 };
    
    for (const k of keystrokes) {
      const key = k.key.toLowerCase();
      if (/^[a-z]$/.test(key)) {
        categories.alpha++;
      } else if (/^[0-9]$/.test(key)) {
        categories.numeric++;
      } else if (['shift', 'ctrl', 'alt', 'meta', 'control'].includes(key)) {
        categories.modifier++;
      } else {
        categories.special++;
      }
    }
    
    return categories;
  }

  private extractRhythmFeatures(dwellTimes: number[], intervals: number[]): number[] {
    const features: number[] = [];
    
    // Typing speed (keys per second approximation)
    const avgInterval = this.mean(intervals);
    features.push(avgInterval > 0 ? 1000 / avgInterval : 0);
    
    // Rhythm consistency (coefficient of variation)
    const cvDwell = this.std(dwellTimes) / (this.mean(dwellTimes) || 1);
    const cvInterval = this.std(intervals) / (this.mean(intervals) || 1);
    features.push(cvDwell, cvInterval);
    
    // Pause detection (long intervals)
    const pauseThreshold = this.mean(intervals) + 2 * this.std(intervals);
    const pauseCount = intervals.filter(i => i > pauseThreshold).length;
    features.push(pauseCount / (intervals.length || 1));
    
    return features;
  }

  private extractDigraphFeatures(keystrokes: BehaviorData['keystrokes']): number[] {
    const features: number[] = [];
    const digraphTimings: Map<string, number[]> = new Map();
    
    // Common digraphs to track
    const commonDigraphs = ['th', 'he', 'in', 'er', 'an', 'en', 'to', 'it'];
    
    for (let i = 0; i < keystrokes.length - 1; i++) {
      const digraph = keystrokes[i].key.toLowerCase() + keystrokes[i + 1].key.toLowerCase();
      const timing = keystrokes[i + 1].interval;
      
      if (commonDigraphs.includes(digraph)) {
        if (!digraphTimings.has(digraph)) {
          digraphTimings.set(digraph, []);
        }
        digraphTimings.get(digraph)!.push(timing);
      }
    }
    
    // Extract mean timing for each common digraph
    for (const digraph of commonDigraphs) {
      const timings = digraphTimings.get(digraph) || [];
      features.push(timings.length > 0 ? this.mean(timings) / 100 : 0);
    }
    
    return features;
  }

  private encodeMouseMovements(movements: BehaviorData['mouseMovements']): number[] {
    if (movements.length === 0) {
      return new Array(this.config.mouseEmbedDim).fill(0);
    }

    const features: number[] = [];
    
    // Movement statistics
    const speeds = movements.map(m => Math.sqrt(m.dx * m.dx + m.dy * m.dy));
    features.push(
      this.mean(speeds),
      this.std(speeds),
      Math.max(...speeds)
    );
    
    // Direction changes
    let directionChanges = 0;
    for (let i = 1; i < movements.length; i++) {
      const prevAngle = Math.atan2(movements[i - 1].dy, movements[i - 1].dx);
      const currAngle = Math.atan2(movements[i].dy, movements[i].dx);
      if (Math.abs(currAngle - prevAngle) > Math.PI / 4) {
        directionChanges++;
      }
    }
    features.push(directionChanges / (movements.length || 1));
    
    // Curvature analysis
    const curvatures = this.computeCurvatures(movements);
    features.push(
      this.mean(curvatures),
      this.std(curvatures)
    );
    
    // Acceleration
    const accelerations: number[] = [];
    for (let i = 1; i < speeds.length; i++) {
      accelerations.push(Math.abs(speeds[i] - speeds[i - 1]));
    }
    features.push(
      this.mean(accelerations),
      Math.max(...accelerations, 0)
    );
    
    // Endpoint accuracy (how close to grid points)
    const endpointPrecision = movements.reduce((sum, m) => {
      return sum + (m.x % 10) + (m.y % 10);
    }, 0) / (movements.length * 20 || 1);
    features.push(endpointPrecision);
    
    // Pad to fixed size
    while (features.length < 64) {
      features.push(0);
    }
    
    // Apply encoder
    let encoded = features.slice(0, 64);
    for (let i = 0; i < this.mouseEncoder.length; i++) {
      const outputDim = i === this.mouseEncoder.length - 1 
        ? this.config.mouseEmbedDim 
        : 64;
      encoded = this.linearForward(encoded, this.mouseEncoder[i], outputDim);
      if (i < this.mouseEncoder.length - 1) {
        encoded = encoded.map(v => Math.tanh(v));
      }
    }
    
    return encoded;
  }

  private computeCurvatures(movements: BehaviorData['mouseMovements']): number[] {
    const curvatures: number[] = [];
    
    for (let i = 1; i < movements.length - 1; i++) {
      const v1 = { x: movements[i].x - movements[i - 1].x, y: movements[i].y - movements[i - 1].y };
      const v2 = { x: movements[i + 1].x - movements[i].x, y: movements[i + 1].y - movements[i].y };
      
      const cross = v1.x * v2.y - v1.y * v2.x;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      
      const curvature = mag1 * mag2 > 0 ? Math.abs(cross) / (mag1 * mag2) : 0;
      curvatures.push(curvature);
    }
    
    return curvatures;
  }

  private encodeCommands(commands: string[]): number[] {
    if (commands.length === 0) {
      return new Array(this.config.commandEmbedDim).fill(0);
    }

    // Convert commands to vocabulary indices
    const indices = commands.map(cmd => {
      const normalized = cmd.toLowerCase().split(/\s+/)[0] || '';
      return this.commandVocab.get(normalized) ?? this.commandVocab.size;
    });
    
    // Create bag-of-commands representation
    const bow = new Array(100).fill(0);
    for (const idx of indices) {
      if (idx < bow.length) {
        bow[idx]++;
      }
    }
    
    // Normalize
    const total = indices.length || 1;
    for (let i = 0; i < bow.length; i++) {
      bow[i] /= total;
    }
    
    // Add sequence features
    const seqFeatures: number[] = [];
    
    // Command diversity
    const uniqueCommands = new Set(indices).size;
    seqFeatures.push(uniqueCommands / commands.length);
    
    // Repetition pattern
    let repetitions = 0;
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] === indices[i - 1]) {
        repetitions++;
      }
    }
    seqFeatures.push(repetitions / (commands.length - 1 || 1));
    
    // Command categories
    let readOps = 0, writeOps = 0, adminOps = 0;
    const readCommands = ['read', 'get', 'view', 'browse', 'read_coils', 'read_registers', 'read_value'];
    const writeCommands = ['write', 'set', 'edit', 'create', 'delete', 'write_single', 'write_multiple', 'write_value'];
    const adminCommands = ['admin', 'config', 'force', 'unforce', 'enable', 'disable', 'download', 'upload'];
    
    for (const cmd of commands) {
      const normalized = cmd.toLowerCase();
      if (readCommands.some(r => normalized.includes(r))) readOps++;
      if (writeCommands.some(w => normalized.includes(w))) writeOps++;
      if (adminCommands.some(a => normalized.includes(a))) adminOps++;
    }
    
    seqFeatures.push(
      readOps / commands.length,
      writeOps / commands.length,
      adminOps / commands.length
    );
    
    // Combine and encode
    const combined = [...bow.slice(0, 58), ...seqFeatures];
    
    let encoded = combined;
    for (let i = 0; i < this.commandEncoder.length; i++) {
      const outputDim = i === this.commandEncoder.length - 1 
        ? this.config.commandEmbedDim 
        : 64;
      encoded = this.linearForward(encoded, this.commandEncoder[i], outputDim);
      if (i < this.commandEncoder.length - 1) {
        encoded = encoded.map(v => Math.tanh(v));
      }
    }
    
    return encoded;
  }

  private encodeSessionInfo(info: BehaviorData['sessionInfo']): number[] {
    const features: number[] = [];
    
    // Time of day (normalized)
    const startDate = new Date(info.startTime);
    const hour = startDate.getHours();
    features.push(Math.sin(2 * Math.PI * hour / 24));
    features.push(Math.cos(2 * Math.PI * hour / 24));
    
    // Day of week
    const day = startDate.getDay();
    features.push(Math.sin(2 * Math.PI * day / 7));
    features.push(Math.cos(2 * Math.PI * day / 7));
    
    // Session duration (normalized to hours)
    features.push(info.duration / 3600000);
    
    // Actions per minute
    const minutes = info.duration / 60000 || 1;
    features.push(info.actions / minutes);
    
    return features;
  }

  private linearForward(input: number[], weights: number[], outputDim: number): number[] {
    const inputDim = input.length;
    const output = new Array(outputDim).fill(0);
    
    for (let i = 0; i < outputDim; i++) {
      for (let j = 0; j < inputDim; j++) {
        const idx = i * inputDim + j;
        if (idx < weights.length) {
          output[i] += input[j] * weights[idx];
        }
      }
    }
    
    return output;
  }

  private l2Normalize(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map(v => v / norm);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? (dotProduct / denom + 1) / 2 : 0; // Normalized to [0, 1]
  }

  private analyzeDeviations(
    data: BehaviorData,
    currentDNA: number[],
    storedDNA: number[]
  ): string[] {
    const deviations: string[] = [];
    
    // Analyze DNA dimension-wise deviations
    const dimDeviations = currentDNA.map((v, i) => Math.abs(v - storedDNA[i]));
    const avgDeviation = this.mean(dimDeviations);
    const maxDeviation = Math.max(...dimDeviations);
    
    if (avgDeviation > 0.3) {
      deviations.push(`Overall behavioral deviation: ${(avgDeviation * 100).toFixed(1)}%`);
    }
    
    // Check specific behavioral aspects
    // Keystroke timing deviation (first 32 dimensions)
    const keystrokeDeviation = this.mean(dimDeviations.slice(0, 32));
    if (keystrokeDeviation > 0.4) {
      deviations.push('Unusual keystroke timing patterns');
    }
    
    // Mouse behavior deviation (dimensions 32-64)
    const mouseDeviation = this.mean(dimDeviations.slice(32, 64));
    if (mouseDeviation > 0.4) {
      deviations.push('Unusual mouse movement patterns');
    }
    
    // Command pattern deviation (dimensions 64-96)
    const commandDeviation = this.mean(dimDeviations.slice(64, 96));
    if (commandDeviation > 0.4) {
      deviations.push('Unusual command usage patterns');
    }
    
    // Check for specific suspicious behaviors
    const adminCommands = data.commands.filter(c => 
      ['admin', 'config', 'force', 'delete', 'disable'].some(ac => 
        c.toLowerCase().includes(ac)
      )
    );
    
    if (adminCommands.length > data.commands.length * 0.3) {
      deviations.push('High proportion of administrative commands');
    }
    
    // Check session timing
    const sessionStart = new Date(data.sessionInfo.startTime);
    const hour = sessionStart.getHours();
    if (hour < 6 || hour > 22) {
      deviations.push('Unusual session timing (outside normal hours)');
    }
    
    return deviations;
  }

  private assessRisk(
    similarity: number,
    deviations: string[]
  ): {
    riskLevel: InsiderThreatDetection['riskLevel'];
    recommendedAction: InsiderThreatDetection['recommendedAction'];
  } {
    // High confidence match
    if (similarity > 0.9 && deviations.length === 0) {
      return { riskLevel: 'none', recommendedAction: 'allow' };
    }
    
    // Medium confidence or minor deviations
    if (similarity > 0.8 && deviations.length <= 1) {
      return { riskLevel: 'low', recommendedAction: 'allow' };
    }
    
    // Some deviations detected
    if (similarity > 0.7 && deviations.length <= 2) {
      return { riskLevel: 'medium', recommendedAction: 'monitor' };
    }
    
    // Significant deviations
    if (similarity > 0.5) {
      return { riskLevel: 'medium', recommendedAction: 'challenge' };
    }
    
    // Low similarity - potential impersonation
    return { riskLevel: 'high', recommendedAction: 'block' };
  }

  private updateProfile(userId: string, newDNA: number[], isInitial: boolean): void {
    const existing = this.userProfiles.get(userId);
    
    if (isInitial || !existing) {
      this.userProfiles.set(userId, {
        userId,
        dna: newDNA,
        sessionCount: 1,
        lastUpdated: new Date().toISOString()
      });
    } else {
      // Exponential moving average update
      const alpha = 0.1;
      const updatedDNA = existing.dna.map((v, i) => 
        alpha * newDNA[i] + (1 - alpha) * v
      );
      
      this.userProfiles.set(userId, {
        ...existing,
        dna: this.l2Normalize(updatedDNA),
        sessionCount: existing.sessionCount + 1,
        lastUpdated: new Date().toISOString()
      });
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

  // Export profile for storage
  exportProfile(userId: string): number[] | null {
    return this.userProfiles.get(userId)?.dna || null;
  }

  // Import profile from storage
  importProfile(userId: string, dna: number[]): void {
    this.userProfiles.set(userId, {
      userId,
      dna,
      sessionCount: 1,
      lastUpdated: new Date().toISOString()
    });
  }
}

interface UserProfile {
  userId: string;
  dna: number[];
  sessionCount: number;
  lastUpdated: string;
}
