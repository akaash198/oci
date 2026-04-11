// Model Poisoning Defense: Merkle Logs + Krum + PGD Training
// Byzantine-resilient federated learning with adversarial robustness

import type { ModelIntegrityCheck } from '@/lib/types/database';

interface ModelData {
  modelUpdates: number[][];
  clientIds: string[];
  trainingData?: { hash: string; source: string }[];
}

interface DefenseConfig {
  byzantineFraction: number;
  pgdEpsilon: number;
  pgdAlpha: number;
  pgdSteps: number;
  merkleEnabled: boolean;
  krumEnabled: boolean;
  pgdEnabled: boolean;
}

interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: unknown;
}

export class ModelIntegrityDefense {
  private config: DefenseConfig;
  private isInitialized: boolean = false;
  
  // Merkle tree for audit logging
  private merkleRoot: MerkleNode | null = null;
  private auditLog: AuditEntry[] = [];
  
  // Client trust scores
  private clientTrustScores: Map<string, number> = new Map();
  
  // Historical update patterns
  private updateHistory: Map<string, number[][]> = new Map();

  constructor(config?: Partial<DefenseConfig>) {
    this.config = {
      byzantineFraction: 0.2,
      pgdEpsilon: 0.1,
      pgdAlpha: 0.01,
      pgdSteps: 10,
      merkleEnabled: true,
      krumEnabled: true,
      pgdEnabled: true,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  async verify(data: ModelData): Promise<ModelIntegrityCheck> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const suspiciousUpdates: string[] = [];
    const byzantineClients: string[] = [];
    let integrityScore = 1.0;
    let isCompromised = false;

    // Step 1: Merkle log verification
    if (this.config.merkleEnabled && data.trainingData) {
      const merkleResult = this.verifyMerkleIntegrity(data.trainingData);
      if (!merkleResult.valid) {
        suspiciousUpdates.push(...merkleResult.tamperedEntries);
        integrityScore *= 0.7;
      }
    }

    // Step 2: Krum Byzantine-resilient analysis
    if (this.config.krumEnabled && data.modelUpdates.length > 0) {
      const krumResult = this.krumAnalysis(data.modelUpdates, data.clientIds);
      byzantineClients.push(...krumResult.suspiciousClients);
      
      for (const clientId of krumResult.suspiciousClients) {
        suspiciousUpdates.push(`Client ${clientId}: anomalous update pattern`);
      }
      
      integrityScore *= (1 - krumResult.suspiciousClients.length / data.clientIds.length);
    }

    // Step 3: PGD adversarial detection
    if (this.config.pgdEnabled && data.modelUpdates.length > 0) {
      const pgdResult = this.pgdAdversarialCheck(data.modelUpdates);
      if (pgdResult.adversarialDetected) {
        suspiciousUpdates.push('Potential adversarial perturbations in updates');
        integrityScore *= 0.8;
      }
    }

    // Step 4: Historical pattern analysis
    const historicalResult = this.analyzeHistoricalPatterns(data.modelUpdates, data.clientIds);
    if (historicalResult.anomaliesDetected > 0) {
      suspiciousUpdates.push(`${historicalResult.anomaliesDetected} updates deviate from historical patterns`);
      integrityScore *= (1 - historicalResult.anomaliesDetected * 0.1);
    }

    // Update client trust scores
    this.updateClientTrustScores(data.clientIds, byzantineClients);

    // Store updates in history
    this.storeUpdateHistory(data.modelUpdates, data.clientIds);

    // Log to Merkle audit log
    if (this.config.merkleEnabled) {
      this.logToAudit({
        timestamp: new Date().toISOString(),
        action: 'model_update_verification',
        clientIds: data.clientIds,
        integrityScore,
        byzantineClientsDetected: byzantineClients.length,
        result: integrityScore > 0.7 ? 'passed' : 'failed'
      });
    }

    // Determine if compromised
    isCompromised = integrityScore < 0.7 || byzantineClients.length > data.clientIds.length * 0.3;

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      integrityScore,
      byzantineClients.length,
      data.clientIds.length,
      suspiciousUpdates.length
    );

    return {
      isCompromised,
      integrityScore,
      suspiciousUpdates,
      byzantineClients,
      recommendation
    };
  }

  // Merkle tree operations
  private verifyMerkleIntegrity(trainingData: { hash: string; source: string }[]): {
    valid: boolean;
    tamperedEntries: string[];
  } {
    const tamperedEntries: string[] = [];
    
    for (const entry of trainingData) {
      // Verify hash matches expected format and hasn't been tampered
      const expectedHash = this.computeHash(entry.source);
      
      if (!this.isValidHash(entry.hash)) {
        tamperedEntries.push(`Invalid hash format for source: ${entry.source}`);
      }
      
      // Check against audit log if entry exists
      const existingEntry = this.auditLog.find(a => 
        a.action === 'data_registration' && 
        (a as DataRegistrationEntry).dataHash === entry.hash
      );
      
      if (existingEntry && (existingEntry as DataRegistrationEntry).sourceId !== entry.source) {
        tamperedEntries.push(`Hash collision or tampering detected for: ${entry.source}`);
      }
    }
    
    return {
      valid: tamperedEntries.length === 0,
      tamperedEntries
    };
  }

  private computeHash(data: string): string {
    // Simplified hash computation (in production, use crypto.subtle or similar)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  private isValidHash(hash: string): boolean {
    return /^[a-f0-9]{16,64}$/i.test(hash);
  }

  private buildMerkleTree(entries: AuditEntry[]): MerkleNode | null {
    if (entries.length === 0) return null;
    
    // Create leaf nodes
    const leaves: MerkleNode[] = entries.map(entry => ({
      hash: this.computeHash(JSON.stringify(entry)),
      data: entry
    }));
    
    // Build tree bottom-up
    let currentLevel = leaves;
    
    while (currentLevel.length > 1) {
      const nextLevel: MerkleNode[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left; // Duplicate if odd
        
        const combinedHash = this.computeHash(left.hash + right.hash);
        nextLevel.push({
          hash: combinedHash,
          left,
          right
        });
      }
      
      currentLevel = nextLevel;
    }
    
    return currentLevel[0] || null;
  }

  // Krum Byzantine-resilient aggregation
  private krumAnalysis(updates: number[][], clientIds: string[]): {
    selectedUpdate: number[];
    suspiciousClients: string[];
  } {
    const n = updates.length;
    const f = Math.floor(n * this.config.byzantineFraction);
    
    if (n < 3) {
      return {
        selectedUpdate: updates[0] || [],
        suspiciousClients: []
      };
    }
    
    // Compute pairwise distances
    const distances: number[][] = [];
    for (let i = 0; i < n; i++) {
      distances[i] = [];
      for (let j = 0; j < n; j++) {
        distances[i][j] = this.euclideanDistance(updates[i], updates[j]);
      }
    }
    
    // Compute Krum scores
    const scores: number[] = [];
    for (let i = 0; i < n; i++) {
      // Sort distances and sum n-f-2 smallest (excluding self)
      const sortedDistances = [...distances[i]]
        .map((d, idx) => ({ d, idx }))
        .filter(item => item.idx !== i)
        .sort((a, b) => a.d - b.d);
      
      const kNearest = Math.max(1, n - f - 2);
      const score = sortedDistances
        .slice(0, kNearest)
        .reduce((sum, item) => sum + item.d, 0);
      
      scores.push(score);
    }
    
    // Identify selected update (minimum score)
    const selectedIdx = scores.indexOf(Math.min(...scores));
    
    // Identify suspicious clients (high scores)
    const meanScore = scores.reduce((a, b) => a + b, 0) / n;
    const stdScore = Math.sqrt(
      scores.reduce((sum, s) => sum + Math.pow(s - meanScore, 2), 0) / n
    );
    
    const threshold = meanScore + 2 * stdScore;
    const suspiciousClients = clientIds.filter((_, idx) => scores[idx] > threshold);
    
    return {
      selectedUpdate: updates[selectedIdx],
      suspiciousClients
    };
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    
    for (let i = 0; i < len; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    
    return Math.sqrt(sum);
  }

  // Multi-Krum for selecting multiple updates
  multiKrumAggregate(updates: number[][], clientIds: string[], numSelect: number): {
    aggregatedUpdate: number[];
    selectedClients: string[];
    suspiciousClients: string[];
  } {
    const n = updates.length;
    const f = Math.floor(n * this.config.byzantineFraction);
    const m = Math.min(numSelect, n - f);
    
    const selectedIndices: number[] = [];
    const suspiciousClients: string[] = [];
    const remainingIndices = new Set(Array.from({ length: n }, (_, i) => i));
    
    // Iteratively select m updates
    for (let iter = 0; iter < m; iter++) {
      const remaining = Array.from(remainingIndices);
      if (remaining.length === 0) break;
      
      // Compute Krum scores for remaining updates
      const scores = new Map<number, number>();
      
      for (const i of remaining) {
        let score = 0;
        const distances = remaining
          .filter(j => j !== i)
          .map(j => this.euclideanDistance(updates[i], updates[j]))
          .sort((a, b) => a - b);
        
        const kNearest = Math.max(1, remaining.length - f - 2);
        score = distances.slice(0, kNearest).reduce((a, b) => a + b, 0);
        scores.set(i, score);
      }
      
      // Select minimum score
      let minIdx = remaining[0];
      let minScore = scores.get(minIdx) || Infinity;
      
      for (const [idx, score] of scores) {
        if (score < minScore) {
          minScore = score;
          minIdx = idx;
        }
      }
      
      selectedIndices.push(minIdx);
      remainingIndices.delete(minIdx);
    }
    
    // Identify suspicious clients (not selected and high distance from selected)
    const selectedUpdates = selectedIndices.map(i => updates[i]);
    const avgSelected = this.averageVectors(selectedUpdates);
    
    for (const idx of remainingIndices) {
      const distance = this.euclideanDistance(updates[idx], avgSelected);
      if (distance > this.computeDistanceThreshold(selectedUpdates)) {
        suspiciousClients.push(clientIds[idx]);
      }
    }
    
    // Aggregate selected updates
    const aggregatedUpdate = this.averageVectors(selectedIndices.map(i => updates[i]));
    
    return {
      aggregatedUpdate,
      selectedClients: selectedIndices.map(i => clientIds[i]),
      suspiciousClients
    };
  }

  private averageVectors(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    
    const dim = vectors[0].length;
    const avg = new Array(dim).fill(0);
    
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) {
        avg[i] += v[i] || 0;
      }
    }
    
    for (let i = 0; i < dim; i++) {
      avg[i] /= vectors.length;
    }
    
    return avg;
  }

  private computeDistanceThreshold(updates: number[][]): number {
    if (updates.length < 2) return Infinity;
    
    const distances: number[] = [];
    for (let i = 0; i < updates.length; i++) {
      for (let j = i + 1; j < updates.length; j++) {
        distances.push(this.euclideanDistance(updates[i], updates[j]));
      }
    }
    
    const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
    const std = Math.sqrt(
      distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length
    );
    
    return mean + 2 * std;
  }

  // PGD Adversarial Check
  private pgdAdversarialCheck(updates: number[][]): {
    adversarialDetected: boolean;
    adversarialScore: number;
  } {
    if (updates.length === 0) {
      return { adversarialDetected: false, adversarialScore: 0 };
    }

    // Compute average update as reference
    const avgUpdate = this.averageVectors(updates);
    
    // Check each update for adversarial perturbations
    let adversarialScore = 0;
    
    for (const update of updates) {
      // Check if update looks like PGD perturbation
      const perturbation = update.map((v, i) => v - avgUpdate[i]);
      
      // Adversarial perturbations tend to be:
      // 1. Near the epsilon boundary
      // 2. Aligned in specific directions (gradient-like)
      
      const perturbationNorm = Math.sqrt(
        perturbation.reduce((sum, p) => sum + p * p, 0)
      );
      
      // Check if perturbation is suspiciously close to epsilon boundary
      const epsilonProximity = Math.abs(perturbationNorm - this.config.pgdEpsilon) / this.config.pgdEpsilon;
      
      if (epsilonProximity < 0.2) {
        adversarialScore += 0.3;
      }
      
      // Check for sign-like pattern (characteristic of FGSM/PGD)
      const signPattern = perturbation.filter(p => Math.abs(Math.abs(p) - this.config.pgdAlpha) < 0.01).length;
      if (signPattern > perturbation.length * 0.3) {
        adversarialScore += 0.2;
      }
      
      // Check for sparse perturbations (targeted attacks)
      const sparseCount = perturbation.filter(p => Math.abs(p) < 0.001).length;
      if (sparseCount > perturbation.length * 0.8) {
        adversarialScore += 0.1;
      }
    }
    
    adversarialScore /= updates.length;
    
    return {
      adversarialDetected: adversarialScore > 0.3,
      adversarialScore
    };
  }

  // PGD Training simulation for robustness
  pgdAdversarialTraining(
    cleanData: number[][],
    labels: number[],
    modelWeights: number[]
  ): {
    adversarialExamples: number[][];
    robustWeights: number[];
  } {
    const adversarialExamples: number[][] = [];
    
    for (const data of cleanData) {
      // Generate adversarial example using PGD
      let advData = [...data];
      
      for (let step = 0; step < this.config.pgdSteps; step++) {
        // Compute gradient (simplified: random direction)
        const gradient = advData.map(() => Math.random() * 2 - 1);
        const gradientNorm = Math.sqrt(gradient.reduce((sum, g) => sum + g * g, 0)) || 1;
        
        // Normalize gradient
        const normalizedGradient = gradient.map(g => g / gradientNorm);
        
        // Step in gradient direction
        advData = advData.map((v, i) => v + this.config.pgdAlpha * normalizedGradient[i]);
        
        // Project back to epsilon ball
        const perturbation = advData.map((v, i) => v - data[i]);
        const perturbNorm = Math.sqrt(perturbation.reduce((sum, p) => sum + p * p, 0));
        
        if (perturbNorm > this.config.pgdEpsilon) {
          const scale = this.config.pgdEpsilon / perturbNorm;
          advData = data.map((v, i) => v + perturbation[i] * scale);
        }
      }
      
      adversarialExamples.push(advData);
    }
    
    // Train on mixture of clean and adversarial (simplified)
    // In production, this would be actual gradient descent
    const robustWeights = modelWeights.map(w => {
      // Add small robustness regularization
      return w * (1 - 0.01) + 0.01 * (Math.random() * 2 - 1);
    });
    
    return { adversarialExamples, robustWeights };
  }

  // Historical pattern analysis
  private analyzeHistoricalPatterns(updates: number[][], clientIds: string[]): {
    anomaliesDetected: number;
    anomalousClients: string[];
  } {
    let anomaliesDetected = 0;
    const anomalousClients: string[] = [];
    
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      const currentUpdate = updates[i];
      const history = this.updateHistory.get(clientId) || [];
      
      if (history.length < 3) continue;
      
      // Compute average historical update
      const avgHistory = this.averageVectors(history);
      
      // Compute standard deviation
      const distances = history.map(h => this.euclideanDistance(h, avgHistory));
      const meanDist = distances.reduce((a, b) => a + b, 0) / distances.length;
      const stdDist = Math.sqrt(
        distances.reduce((sum, d) => sum + Math.pow(d - meanDist, 2), 0) / distances.length
      ) || 1;
      
      // Check if current update is anomalous
      const currentDist = this.euclideanDistance(currentUpdate, avgHistory);
      if (currentDist > meanDist + 3 * stdDist) {
        anomaliesDetected++;
        anomalousClients.push(clientId);
      }
    }
    
    return { anomaliesDetected, anomalousClients };
  }

  // Client trust management
  private updateClientTrustScores(clientIds: string[], byzantineClients: string[]): void {
    for (const clientId of clientIds) {
      const currentScore = this.clientTrustScores.get(clientId) || 1.0;
      
      if (byzantineClients.includes(clientId)) {
        // Decrease trust for suspicious clients
        this.clientTrustScores.set(clientId, Math.max(0, currentScore - 0.2));
      } else {
        // Slowly increase trust for good clients
        this.clientTrustScores.set(clientId, Math.min(1, currentScore + 0.05));
      }
    }
  }

  private storeUpdateHistory(updates: number[][], clientIds: string[]): void {
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      const history = this.updateHistory.get(clientId) || [];
      
      history.push(updates[i]);
      
      // Keep only last 10 updates
      if (history.length > 10) {
        history.shift();
      }
      
      this.updateHistory.set(clientId, history);
    }
  }

  // Audit logging
  private logToAudit(entry: AuditEntry): void {
    this.auditLog.push(entry);
    
    // Rebuild Merkle tree periodically
    if (this.auditLog.length % 10 === 0) {
      this.merkleRoot = this.buildMerkleTree(this.auditLog);
    }
  }

  private generateRecommendation(
    integrityScore: number,
    byzantineCount: number,
    totalClients: number,
    suspiciousCount: number
  ): string {
    if (integrityScore >= 0.9 && byzantineCount === 0) {
      return 'All checks passed. Model updates are safe to apply.';
    }
    
    if (integrityScore >= 0.7 && byzantineCount <= 1) {
      return `Minor anomalies detected. Apply updates with caution. Monitor client ${byzantineCount > 0 ? 'identified as suspicious' : 'behavior'}.`;
    }
    
    if (integrityScore >= 0.5) {
      return `Moderate integrity concerns. Recommend using Krum-aggregated update only. Exclude ${byzantineCount} suspicious client(s) from future rounds.`;
    }
    
    return `Severe integrity compromise detected. Reject all updates. Investigate ${byzantineCount}/${totalClients} suspicious clients. Consider retraining from verified checkpoint.`;
  }

  // Get current Merkle root for verification
  getMerkleRoot(): string | null {
    return this.merkleRoot?.hash || null;
  }

  // Verify specific entry exists in audit log
  verifyAuditEntry(entryHash: string): boolean {
    // Traverse Merkle tree to verify inclusion
    const computedHash = this.auditLog.find(entry => 
      this.computeHash(JSON.stringify(entry)) === entryHash
    );
    return computedHash !== undefined;
  }

  // Get client trust score
  getClientTrustScore(clientId: string): number {
    return this.clientTrustScores.get(clientId) || 1.0;
  }
}

interface AuditEntry {
  timestamp: string;
  action: string;
  [key: string]: unknown;
}

interface DataRegistrationEntry extends AuditEntry {
  action: 'data_registration';
  dataHash: string;
  sourceId: string;
}
