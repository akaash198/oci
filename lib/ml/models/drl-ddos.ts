// Deep Reinforcement Learning for Adaptive DDoS Traffic Shaping
// Soft Actor-Critic (SAC) agent for protocol-aware rate limiting

import type { DDoSMitigation } from '@/lib/types/database';

interface TrafficData {
  packetRates: Record<string, number>; // Protocol -> packets per second
  connectionCounts: number;
  latencyMs: number;
  queueUtilization: number;
  protocolDistribution: Record<string, number>;
}

interface SACConfig {
  stateDim: number;
  actionDim: number;
  hiddenDim: number;
  learningRate: number;
  gamma: number;
  tau: number;
  alpha: number; // Temperature parameter for entropy
}

// Protocol baselines for OT environments
const PROTOCOL_BASELINES: Record<string, { normalPPS: number; burstFactor: number }> = {
  modbus: { normalPPS: 100, burstFactor: 3 },
  dnp3: { normalPPS: 50, burstFactor: 2 },
  opcua: { normalPPS: 200, burstFactor: 4 },
  iec61850: { normalPPS: 1000, burstFactor: 5 },
  mqtt: { normalPPS: 500, burstFactor: 3 },
  http: { normalPPS: 1000, burstFactor: 10 },
  https: { normalPPS: 2000, burstFactor: 10 }
};

export class DDoSMitigator {
  private config: SACConfig;
  private isInitialized: boolean = false;
  
  // Actor network (policy)
  private actorMean: number[][] = [];
  private actorLogStd: number[][] = [];
  
  // Twin Q-networks (critics)
  private critic1: number[][] = [];
  private critic2: number[][] = [];
  
  // Target networks
  private targetCritic1: number[][] = [];
  private targetCritic2: number[][] = [];
  
  // Experience replay buffer (simplified)
  private replayBuffer: ReplayEntry[] = [];
  private maxBufferSize: number = 10000;
  
  // Running statistics for normalization
  private stateMean: number[] = [];
  private stateStd: number[] = [];
  
  // Current rate limits
  private currentRateLimits: Record<string, number> = {};
  private blockedIPs: Set<string> = new Set();

  constructor(config?: Partial<SACConfig>) {
    this.config = {
      stateDim: 20,
      actionDim: 7, // Rate limits for 7 protocols
      hiddenDim: 256,
      learningRate: 0.0003,
      gamma: 0.99,
      tau: 0.005,
      alpha: 0.2,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize networks
    this.initializeActorNetwork();
    this.initializeCriticNetworks();
    
    // Initialize statistics
    this.stateMean = new Array(this.config.stateDim).fill(0);
    this.stateStd = new Array(this.config.stateDim).fill(1);
    
    // Initialize rate limits to baseline
    for (const protocol of Object.keys(PROTOCOL_BASELINES)) {
      this.currentRateLimits[protocol] = PROTOCOL_BASELINES[protocol].normalPPS * 2;
    }
    
    this.isInitialized = true;
  }

  private initializeActorNetwork(): void {
    const { stateDim, actionDim, hiddenDim } = this.config;
    
    // Mean network
    this.actorMean = [
      this.createWeightMatrix(stateDim, hiddenDim),
      this.createWeightMatrix(hiddenDim, hiddenDim),
      this.createWeightMatrix(hiddenDim, actionDim)
    ];
    
    // Log standard deviation network
    this.actorLogStd = [
      this.createWeightMatrix(stateDim, hiddenDim),
      this.createWeightMatrix(hiddenDim, hiddenDim),
      this.createWeightMatrix(hiddenDim, actionDim)
    ];
  }

  private initializeCriticNetworks(): void {
    const { stateDim, actionDim, hiddenDim } = this.config;
    const inputDim = stateDim + actionDim;
    
    // Q1 network
    this.critic1 = [
      this.createWeightMatrix(inputDim, hiddenDim),
      this.createWeightMatrix(hiddenDim, hiddenDim),
      this.createWeightMatrix(hiddenDim, 1)
    ];
    
    // Q2 network
    this.critic2 = [
      this.createWeightMatrix(inputDim, hiddenDim),
      this.createWeightMatrix(hiddenDim, hiddenDim),
      this.createWeightMatrix(hiddenDim, 1)
    ];
    
    // Target networks (copy of critics)
    this.targetCritic1 = this.critic1.map(layer => layer.map(row => [...row]));
    this.targetCritic2 = this.critic2.map(layer => layer.map(row => [...row]));
  }

  private createWeightMatrix(inputDim: number, outputDim: number): number[] {
    const scale = Math.sqrt(2.0 / (inputDim + outputDim));
    const weights: number[] = [];
    
    for (let i = 0; i < inputDim * outputDim; i++) {
      weights.push((Math.random() * 2 - 1) * scale);
    }
    
    return weights;
  }

  async analyze(data: TrafficData): Promise<DDoSMitigation> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Extract state from traffic data
    const state = this.extractState(data);
    
    // Normalize state
    const normalizedState = this.normalizeState(state);
    
    // Detect attack type and severity
    const { isAttack, attackType, severity } = this.detectAttack(data);
    
    // Select action using policy
    const action = this.selectAction(normalizedState);
    
    // Convert action to rate limits
    const rateLimits = this.actionToRateLimits(action);
    
    // Identify IPs to block (if attack detected)
    const newBlockedIPs = isAttack ? this.identifyMaliciousIPs(data, attackType) : [];
    
    // Compute traffic reduction
    const trafficReduction = this.computeTrafficReduction(data, rateLimits, isAttack);
    
    // Update current rate limits
    this.currentRateLimits = rateLimits;
    for (const ip of newBlockedIPs) {
      this.blockedIPs.add(ip);
    }
    
    // Store experience for learning
    this.storeExperience(state, action, isAttack, severity);

    return {
      isAttack,
      attackType,
      severity,
      rateLimits,
      blockedIPs: newBlockedIPs,
      trafficReduction
    };
  }

  private extractState(data: TrafficData): number[] {
    const state: number[] = [];
    
    // Protocol-specific packet rates (7 features)
    const protocols = ['modbus', 'dnp3', 'opcua', 'iec61850', 'mqtt', 'http', 'https'];
    for (const protocol of protocols) {
      const rate = data.packetRates[protocol] || 0;
      const baseline = PROTOCOL_BASELINES[protocol]?.normalPPS || 100;
      state.push(rate / baseline); // Normalized rate
    }
    
    // Aggregate metrics (6 features)
    const totalPPS = Object.values(data.packetRates).reduce((a, b) => a + b, 0);
    state.push(totalPPS / 5000); // Normalized total PPS
    state.push(data.connectionCounts / 10000);
    state.push(data.latencyMs / 100);
    state.push(data.queueUtilization);
    
    // Protocol distribution entropy
    const totalProto = Object.values(data.protocolDistribution).reduce((a, b) => a + b, 0) || 1;
    const probs = Object.values(data.protocolDistribution).map(v => v / totalProto);
    const entropy = -probs.reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0);
    state.push(entropy / 3); // Normalized entropy
    
    // Rate of change indicators (use current rate limits as proxy)
    for (const protocol of protocols.slice(0, 3)) {
      const rate = data.packetRates[protocol] || 0;
      const limit = this.currentRateLimits[protocol] || 200;
      state.push(rate / limit);
    }
    
    // Pad to state dimension
    while (state.length < this.config.stateDim) {
      state.push(0);
    }
    
    return state.slice(0, this.config.stateDim);
  }

  private normalizeState(state: number[]): number[] {
    return state.map((v, i) => {
      const mean = this.stateMean[i] || 0;
      const std = this.stateStd[i] || 1;
      return (v - mean) / std;
    });
  }

  private detectAttack(data: TrafficData): {
    isAttack: boolean;
    attackType: DDoSMitigation['attackType'];
    severity: number;
  } {
    let isAttack = false;
    let attackType: DDoSMitigation['attackType'] = 'none';
    let severity = 0;
    
    const totalPPS = Object.values(data.packetRates).reduce((a, b) => a + b, 0);
    
    // Check for volumetric attack
    const volumetricThreshold = Object.values(PROTOCOL_BASELINES)
      .reduce((sum, b) => sum + b.normalPPS * b.burstFactor, 0);
    
    if (totalPPS > volumetricThreshold * 1.5) {
      isAttack = true;
      attackType = 'volumetric';
      severity = Math.min((totalPPS / volumetricThreshold - 1) / 2, 1);
    }
    
    // Check for protocol-specific attack
    for (const [protocol, rate] of Object.entries(data.packetRates)) {
      const baseline = PROTOCOL_BASELINES[protocol];
      if (baseline && rate > baseline.normalPPS * baseline.burstFactor * 2) {
        if (!isAttack || severity < 0.5) {
          isAttack = true;
          attackType = 'protocol';
          severity = Math.max(severity, Math.min((rate / (baseline.normalPPS * baseline.burstFactor) - 1), 1));
        }
      }
    }
    
    // Check for application-layer attack (high connections, low bandwidth)
    if (data.connectionCounts > 5000 && totalPPS < volumetricThreshold * 0.5) {
      if (!isAttack) {
        isAttack = true;
        attackType = 'application';
        severity = Math.min(data.connectionCounts / 10000, 1);
      }
    }
    
    // Check latency-based indicators
    if (data.latencyMs > 50 && data.queueUtilization > 0.8) {
      severity = Math.max(severity, 0.5);
      if (!isAttack) {
        isAttack = true;
        attackType = 'volumetric';
      }
    }
    
    return { isAttack, attackType, severity };
  }

  private selectAction(state: number[]): number[] {
    // Forward pass through actor network to get mean and log_std
    let hidden = state;
    
    // Mean network
    for (let i = 0; i < this.actorMean.length; i++) {
      hidden = this.linearForward(hidden, this.actorMean[i], 
        i < this.actorMean.length - 1 ? this.config.hiddenDim : this.config.actionDim);
      if (i < this.actorMean.length - 1) {
        hidden = hidden.map(v => Math.max(0, v)); // ReLU
      }
    }
    const mean = hidden;
    
    // Log std network (simplified: use fixed log_std)
    const logStd = new Array(this.config.actionDim).fill(-1);
    
    // Sample action from Gaussian
    const action = mean.map((m, i) => {
      const std = Math.exp(logStd[i]);
      const noise = this.gaussianNoise(0, std);
      return Math.tanh(m + noise); // Squash to [-1, 1]
    });
    
    return action;
  }

  private linearForward(input: number[], weights: number[], outputDim: number): number[] {
    const inputDim = input.length;
    const output = new Array(outputDim).fill(0);
    
    for (let i = 0; i < outputDim; i++) {
      for (let j = 0; j < inputDim; j++) {
        const idx = i * inputDim + j;
        output[i] += input[j] * (weights[idx] || 0);
      }
    }
    
    return output;
  }

  private actionToRateLimits(action: number[]): Record<string, number> {
    const protocols = ['modbus', 'dnp3', 'opcua', 'iec61850', 'mqtt', 'http', 'https'];
    const rateLimits: Record<string, number> = {};
    
    for (let i = 0; i < protocols.length && i < action.length; i++) {
      const protocol = protocols[i];
      const baseline = PROTOCOL_BASELINES[protocol];
      
      // Map action [-1, 1] to rate limit range
      // -1 = aggressive limiting, 1 = permissive
      const minLimit = baseline.normalPPS * 0.5;
      const maxLimit = baseline.normalPPS * baseline.burstFactor * 2;
      
      const actionNormalized = (action[i] + 1) / 2; // Map to [0, 1]
      rateLimits[protocol] = Math.round(minLimit + actionNormalized * (maxLimit - minLimit));
    }
    
    return rateLimits;
  }

  private identifyMaliciousIPs(data: TrafficData, attackType: string): string[] {
    // In production, this would analyze flow data
    // Here we generate synthetic suspicious IPs based on attack pattern
    const suspiciousIPs: string[] = [];
    
    if (attackType === 'volumetric') {
      // Simulate high-volume senders
      const numMalicious = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < numMalicious; i++) {
        suspiciousIPs.push(`192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`);
      }
    } else if (attackType === 'protocol') {
      // Simulate protocol abusers
      const numMalicious = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numMalicious; i++) {
        suspiciousIPs.push(`10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`);
      }
    }
    
    return suspiciousIPs;
  }

  private computeTrafficReduction(
    data: TrafficData,
    rateLimits: Record<string, number>,
    isAttack: boolean
  ): number {
    if (!isAttack) return 0;
    
    let totalOriginal = 0;
    let totalLimited = 0;
    
    for (const [protocol, rate] of Object.entries(data.packetRates)) {
      totalOriginal += rate;
      const limit = rateLimits[protocol] || rate;
      totalLimited += Math.min(rate, limit);
    }
    
    if (totalOriginal === 0) return 0;
    
    return Math.round((1 - totalLimited / totalOriginal) * 100);
  }

  private storeExperience(
    state: number[],
    action: number[],
    isAttack: boolean,
    severity: number
  ): void {
    // Compute reward
    // High reward for blocking attacks with low legitimate traffic impact
    const reward = isAttack 
      ? severity * 0.7 - 0.3 // Positive for attack mitigation
      : -0.1 * action.reduce((sum, a) => sum + Math.abs(a), 0); // Small penalty for over-limiting
    
    const entry: ReplayEntry = {
      state,
      action,
      reward,
      nextState: state, // Simplified: same state
      done: false
    };
    
    this.replayBuffer.push(entry);
    
    // Remove old entries if buffer is full
    if (this.replayBuffer.length > this.maxBufferSize) {
      this.replayBuffer.shift();
    }
    
    // Update running statistics
    for (let i = 0; i < state.length; i++) {
      const alpha = 0.01;
      this.stateMean[i] = alpha * state[i] + (1 - alpha) * (this.stateMean[i] || 0);
      const diff = state[i] - this.stateMean[i];
      this.stateStd[i] = Math.sqrt(
        alpha * diff * diff + (1 - alpha) * Math.pow(this.stateStd[i] || 1, 2)
      );
    }
  }

  private gaussianNoise(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Manual rate limit override
  setRateLimit(protocol: string, limit: number): void {
    this.currentRateLimits[protocol] = limit;
  }

  // Clear blocked IPs
  clearBlockedIPs(): void {
    this.blockedIPs.clear();
  }

  // Get current state
  getState(): { rateLimits: Record<string, number>; blockedIPs: string[] } {
    return {
      rateLimits: { ...this.currentRateLimits },
      blockedIPs: Array.from(this.blockedIPs)
    };
  }

  // Training step (simplified online learning)
  async trainStep(): Promise<void> {
    if (this.replayBuffer.length < 100) return;
    
    // Sample batch
    const batchSize = 32;
    const batch: ReplayEntry[] = [];
    for (let i = 0; i < batchSize; i++) {
      const idx = Math.floor(Math.random() * this.replayBuffer.length);
      batch.push(this.replayBuffer[idx]);
    }
    
    // Compute critic loss and update (simplified)
    // In production, this would use proper gradient descent
    const criticLearningRate = 0.001;
    
    for (const entry of batch) {
      const stateAction = [...entry.state, ...entry.action];
      const q1 = this.linearForward(stateAction, this.critic1[0], this.config.hiddenDim);
      
      // Simple weight update based on TD error
      const targetQ = entry.reward + (entry.done ? 0 : this.config.gamma * entry.reward);
      const tdError = targetQ - q1[0];
      
      // Update critic weights
      for (let i = 0; i < this.critic1[0].length; i++) {
        this.critic1[0][i] += criticLearningRate * tdError * (stateAction[i % stateAction.length] || 0);
      }
    }
    
    // Soft update target networks
    for (let l = 0; l < this.critic1.length; l++) {
      for (let i = 0; i < this.critic1[l].length; i++) {
        this.targetCritic1[l][i] = this.config.tau * this.critic1[l][i] + 
          (1 - this.config.tau) * this.targetCritic1[l][i];
        this.targetCritic2[l][i] = this.config.tau * this.critic2[l][i] + 
          (1 - this.config.tau) * this.targetCritic2[l][i];
      }
    }
  }
}

interface ReplayEntry {
  state: number[];
  action: number[];
  reward: number;
  nextState: number[];
  done: boolean;
}
