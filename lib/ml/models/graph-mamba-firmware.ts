// Graph Mamba for Control Flow Graph Fingerprinting
// Uses Selective State Space Model for firmware analysis

import type { FirmwareAnalysis } from '@/lib/types/database';

interface FirmwareData {
  binary: ArrayBuffer;
  vendor: string;
  model: string;
  expectedVersion: string;
  baselineFingerprint?: number[];
}

interface CFGNode {
  id: number;
  instructions: number[]; // Opcode sequences
  successors: number[];
  predecessors: number[];
}

interface ControlFlowGraph {
  nodes: CFGNode[];
  edges: [number, number][];
  entryPoint: number;
}

interface GraphMambaConfig {
  dModel: number;
  dState: number;
  dConv: number;
  expand: number;
  fingerprintDim: number;
}

// Common ICS firmware opcodes (simplified representation)
const OPCODE_CATEGORIES = {
  CONTROL_FLOW: [0x74, 0x75, 0x7C, 0x7D, 0xEB, 0xE8, 0xE9, 0xFF], // jmp, call, ret
  MEMORY: [0x8B, 0x89, 0x8A, 0x88, 0xA1, 0xA3], // mov variants
  ARITHMETIC: [0x01, 0x03, 0x29, 0x2B, 0xF7, 0x0F], // add, sub, mul, div
  LOGIC: [0x21, 0x23, 0x09, 0x0B, 0x31, 0x33], // and, or, xor
  IO: [0xE4, 0xE5, 0xE6, 0xE7, 0xEC, 0xED], // in, out
  PRIVILEGED: [0x0F, 0xFA, 0xFB, 0xCF] // special instructions
};

export class FirmwareAnalyzer {
  private config: GraphMambaConfig;
  private isInitialized: boolean = false;
  
  // Graph Mamba weights
  private nodeEmbedding: Map<number, number[]> = new Map();
  private stateWeights: number[][] = [];
  private convWeights: number[][] = [];
  private outputWeights: number[][] = [];
  
  // Selective state space parameters
  private A: number[][] = []; // State transition matrix
  private B: number[][] = []; // Input matrix
  private C: number[][] = []; // Output matrix
  private D: number[] = []; // Feedthrough

  constructor(config?: Partial<GraphMambaConfig>) {
    this.config = {
      dModel: 256,
      dState: 64,
      dConv: 4,
      expand: 2,
      fingerprintDim: 256,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize opcode embeddings
    this.initializeOpcodeEmbeddings();
    
    // Initialize state space model parameters
    this.initializeStateSpaceModel();
    
    // Initialize output projection
    this.initializeOutputProjection();
    
    this.isInitialized = true;
  }

  private initializeOpcodeEmbeddings(): void {
    // Create embeddings for all possible opcodes (0-255)
    for (let opcode = 0; opcode < 256; opcode++) {
      const embedding = new Array(this.config.dModel).fill(0);
      
      // Category-based features
      for (const [category, opcodes] of Object.entries(OPCODE_CATEGORIES)) {
        if (opcodes.includes(opcode)) {
          const categoryIdx = Object.keys(OPCODE_CATEGORIES).indexOf(category);
          embedding[categoryIdx * 32] = 1.0;
        }
      }
      
      // Position encoding based on opcode value
      for (let i = 0; i < this.config.dModel; i++) {
        if (i % 2 === 0) {
          embedding[i] += Math.sin(opcode / Math.pow(10000, i / this.config.dModel));
        } else {
          embedding[i] += Math.cos(opcode / Math.pow(10000, (i - 1) / this.config.dModel));
        }
      }
      
      this.nodeEmbedding.set(opcode, embedding);
    }
  }

  private initializeStateSpaceModel(): void {
    const { dState, dModel, dConv } = this.config;
    
    // State transition matrix A (diagonal for efficiency)
    this.A = this.createDiagonalMatrix(dState, -0.1);
    
    // Input matrix B
    this.B = this.createMatrix(dState, dModel, Math.sqrt(2 / (dState + dModel)));
    
    // Output matrix C
    this.C = this.createMatrix(dModel, dState, Math.sqrt(2 / (dState + dModel)));
    
    // Feedthrough D
    this.D = new Array(dModel).fill(0.1);
    
    // Convolution weights for local processing
    this.convWeights = this.createMatrix(dModel, dConv, Math.sqrt(2 / (dModel + dConv)));
  }

  private initializeOutputProjection(): void {
    this.outputWeights = this.createMatrix(
      this.config.fingerprintDim,
      this.config.dModel,
      Math.sqrt(2 / (this.config.fingerprintDim + this.config.dModel))
    );
  }

  private createMatrix(rows: number, cols: number, scale: number): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = (Math.random() * 2 - 1) * scale;
      }
    }
    return matrix;
  }

  private createDiagonalMatrix(size: number, value: number): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < size; i++) {
      matrix[i] = new Array(size).fill(0);
      matrix[i][i] = value + (Math.random() - 0.5) * 0.02;
    }
    return matrix;
  }

  async analyze(data: FirmwareData): Promise<FirmwareAnalysis> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Extract control flow graph from binary
    const cfg = this.extractCFG(data.binary);
    
    // Generate fingerprint using Graph Mamba
    const fingerprint = this.generateFingerprint(cfg);
    
    // Compare with baseline if available
    let similarity = 1.0;
    let deviations: string[] = [];
    
    if (data.baselineFingerprint && data.baselineFingerprint.length > 0) {
      similarity = this.computeCosineSimilarity(fingerprint, data.baselineFingerprint);
      deviations = this.identifyDeviations(cfg, fingerprint, data.baselineFingerprint);
    }
    
    // Compute risk score
    const riskScore = this.computeRiskScore(cfg, similarity, deviations);
    
    // Determine if suspicious
    const isSuspicious = similarity < 0.95 || riskScore > 0.5;
    
    // Generate recommendation
    const recommendation = this.getRecommendation(similarity, riskScore, deviations);

    return {
      isSuspicious,
      similarity,
      fingerprint,
      riskScore,
      deviations,
      recommendation
    };
  }

  private extractCFG(binary: ArrayBuffer): ControlFlowGraph {
    const bytes = new Uint8Array(binary);
    const nodes: CFGNode[] = [];
    const edges: [number, number][] = [];
    
    // Simplified CFG extraction
    // In production, use Ghidra/IDA/Binary Ninja
    
    let currentBlock: number[] = [];
    let blockId = 0;
    let lastBlockEnd = 0;
    
    for (let i = 0; i < bytes.length; i++) {
      const opcode = bytes[i];
      currentBlock.push(opcode);
      
      // Check for control flow instructions (block boundaries)
      if (OPCODE_CATEGORIES.CONTROL_FLOW.includes(opcode)) {
        // End current block
        nodes.push({
          id: blockId,
          instructions: currentBlock,
          successors: [],
          predecessors: []
        });
        
        // Add edge from previous block
        if (blockId > 0) {
          edges.push([blockId - 1, blockId]);
          nodes[blockId - 1].successors.push(blockId);
          nodes[blockId].predecessors.push(blockId - 1);
        }
        
        // Handle jumps/calls (simplified)
        if (opcode === 0xEB || opcode === 0xE9 || opcode === 0xE8) {
          // Near jump/call - could have multiple targets
          if (blockId > 1 && Math.random() > 0.5) {
            const target = Math.floor(Math.random() * blockId);
            edges.push([blockId, target]);
            nodes[blockId].successors.push(target);
            nodes[target].predecessors.push(blockId);
          }
        }
        
        currentBlock = [];
        blockId++;
        lastBlockEnd = i;
        
        // Limit number of blocks for efficiency
        if (blockId >= 500) break;
      }
      
      // Create new block every 50 instructions if no control flow
      if (currentBlock.length >= 50) {
        nodes.push({
          id: blockId,
          instructions: currentBlock,
          successors: [],
          predecessors: []
        });
        
        if (blockId > 0) {
          edges.push([blockId - 1, blockId]);
          nodes[blockId - 1].successors.push(blockId);
          nodes[blockId].predecessors.push(blockId - 1);
        }
        
        currentBlock = [];
        blockId++;
      }
    }
    
    // Add final block if any instructions remain
    if (currentBlock.length > 0) {
      nodes.push({
        id: blockId,
        instructions: currentBlock,
        successors: [],
        predecessors: []
      });
      
      if (blockId > 0) {
        edges.push([blockId - 1, blockId]);
      }
    }

    return {
      nodes,
      edges,
      entryPoint: 0
    };
  }

  private generateFingerprint(cfg: ControlFlowGraph): number[] {
    // Embed each node
    const nodeFeatures: number[][] = cfg.nodes.map(node => 
      this.embedNode(node)
    );
    
    // Process with Graph Mamba (Selective State Space)
    const processedFeatures = this.graphMambaForward(nodeFeatures, cfg.edges);
    
    // Global pooling (mean)
    const pooled = this.globalMeanPool(processedFeatures);
    
    // Project to fingerprint space
    const fingerprint = this.projectToFingerprint(pooled);
    
    // Normalize
    return this.l2Normalize(fingerprint);
  }

  private embedNode(node: CFGNode): number[] {
    const embedding = new Array(this.config.dModel).fill(0);
    
    // Aggregate instruction embeddings
    for (const opcode of node.instructions) {
      const opcodeEmb = this.nodeEmbedding.get(opcode) || new Array(this.config.dModel).fill(0);
      for (let i = 0; i < this.config.dModel; i++) {
        embedding[i] += opcodeEmb[i];
      }
    }
    
    // Average
    const numInstructions = node.instructions.length || 1;
    for (let i = 0; i < this.config.dModel; i++) {
      embedding[i] /= numInstructions;
    }
    
    // Add structural features
    embedding[0] += node.successors.length * 0.1;
    embedding[1] += node.predecessors.length * 0.1;
    embedding[2] += numInstructions * 0.01;
    
    return embedding;
  }

  private graphMambaForward(nodeFeatures: number[][], edges: [number, number][]): number[][] {
    if (nodeFeatures.length === 0) return [];
    
    const { dState, dModel } = this.config;
    const numNodes = nodeFeatures.length;
    
    // Initialize hidden state
    let hiddenState = new Array(dState).fill(0);
    
    // Process nodes in topological order (simplified: sequential)
    const processedFeatures: number[][] = [];
    
    for (let i = 0; i < numNodes; i++) {
      const x = nodeFeatures[i];
      
      // Selective state space update
      // h'(t) = A*h(t) + B*x(t)
      const newHidden = new Array(dState).fill(0);
      
      // State transition
      for (let j = 0; j < dState; j++) {
        for (let k = 0; k < dState; k++) {
          newHidden[j] += this.A[j][k] * hiddenState[k];
        }
      }
      
      // Input contribution
      for (let j = 0; j < dState; j++) {
        for (let k = 0; k < Math.min(dModel, x.length); k++) {
          newHidden[j] += this.B[j][k] * x[k];
        }
      }
      
      // Apply selective gating (content-aware)
      const gate = this.computeSelectiveGate(x);
      for (let j = 0; j < dState; j++) {
        newHidden[j] *= gate;
      }
      
      hiddenState = newHidden;
      
      // Output: y(t) = C*h(t) + D*x(t)
      const output = new Array(dModel).fill(0);
      
      for (let j = 0; j < dModel; j++) {
        for (let k = 0; k < dState; k++) {
          output[j] += this.C[j][k] * hiddenState[k];
        }
        output[j] += this.D[j] * (x[j] || 0);
      }
      
      // Apply graph attention (aggregate neighbor info)
      const neighborContrib = this.aggregateNeighbors(i, nodeFeatures, edges);
      for (let j = 0; j < dModel; j++) {
        output[j] += 0.3 * (neighborContrib[j] || 0);
      }
      
      processedFeatures.push(output);
    }
    
    return processedFeatures;
  }

  private computeSelectiveGate(x: number[]): number {
    // Content-aware gating
    const mean = x.reduce((a, b) => a + b, 0) / x.length;
    const energy = x.reduce((sum, v) => sum + v * v, 0) / x.length;
    return this.sigmoid(mean + Math.sqrt(energy) * 0.5);
  }

  private aggregateNeighbors(
    nodeIdx: number,
    nodeFeatures: number[][],
    edges: [number, number][]
  ): number[] {
    const dModel = this.config.dModel;
    const aggregated = new Array(dModel).fill(0);
    let neighborCount = 0;
    
    // Find neighbors
    for (const [src, dst] of edges) {
      if (src === nodeIdx && dst < nodeFeatures.length) {
        for (let i = 0; i < dModel; i++) {
          aggregated[i] += nodeFeatures[dst][i] || 0;
        }
        neighborCount++;
      }
      if (dst === nodeIdx && src < nodeFeatures.length) {
        for (let i = 0; i < dModel; i++) {
          aggregated[i] += nodeFeatures[src][i] || 0;
        }
        neighborCount++;
      }
    }
    
    if (neighborCount > 0) {
      for (let i = 0; i < dModel; i++) {
        aggregated[i] /= neighborCount;
      }
    }
    
    return aggregated;
  }

  private globalMeanPool(features: number[][]): number[] {
    if (features.length === 0) {
      return new Array(this.config.dModel).fill(0);
    }
    
    const pooled = new Array(this.config.dModel).fill(0);
    
    for (const feature of features) {
      for (let i = 0; i < this.config.dModel; i++) {
        pooled[i] += feature[i] || 0;
      }
    }
    
    for (let i = 0; i < this.config.dModel; i++) {
      pooled[i] /= features.length;
    }
    
    return pooled;
  }

  private projectToFingerprint(pooled: number[]): number[] {
    const fingerprint = new Array(this.config.fingerprintDim).fill(0);
    
    for (let i = 0; i < this.config.fingerprintDim; i++) {
      for (let j = 0; j < Math.min(pooled.length, this.outputWeights[i]?.length || 0); j++) {
        fingerprint[i] += pooled[j] * (this.outputWeights[i][j] || 0);
      }
      fingerprint[i] = Math.tanh(fingerprint[i]);
    }
    
    return fingerprint;
  }

  private l2Normalize(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map(v => v / norm);
  }

  private computeCosineSimilarity(a: number[], b: number[]): number {
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
    return denom > 0 ? dotProduct / denom : 0;
  }

  private identifyDeviations(
    cfg: ControlFlowGraph,
    fingerprint: number[],
    baseline: number[]
  ): string[] {
    const deviations: string[] = [];
    
    // Analyze fingerprint differences
    const diff = fingerprint.map((v, i) => Math.abs(v - (baseline[i] || 0)));
    const maxDiffIdx = diff.indexOf(Math.max(...diff));
    const avgDiff = diff.reduce((a, b) => a + b, 0) / diff.length;
    
    if (avgDiff > 0.1) {
      deviations.push(`Overall fingerprint deviation: ${(avgDiff * 100).toFixed(1)}%`);
    }
    
    // Analyze CFG structure
    const numBlocks = cfg.nodes.length;
    const avgBlockSize = cfg.nodes.reduce((sum, n) => sum + n.instructions.length, 0) / numBlocks;
    
    // Check for suspicious patterns
    const privilegedCount = cfg.nodes.reduce((count, node) => {
      return count + node.instructions.filter(op => 
        OPCODE_CATEGORIES.PRIVILEGED.includes(op)
      ).length;
    }, 0);
    
    if (privilegedCount > numBlocks * 0.1) {
      deviations.push(`High privileged instruction ratio: ${privilegedCount} instructions`);
    }
    
    // Check for unusual control flow
    const highFanoutNodes = cfg.nodes.filter(n => n.successors.length > 5);
    if (highFanoutNodes.length > 3) {
      deviations.push(`Unusual control flow: ${highFanoutNodes.length} high-fanout blocks`);
    }
    
    // Check dimension-wise deviations
    for (let i = 0; i < 10; i++) {
      if (diff[i] > 0.3) {
        deviations.push(`Significant deviation in feature dimension ${i}`);
      }
    }
    
    return deviations;
  }

  private computeRiskScore(
    cfg: ControlFlowGraph,
    similarity: number,
    deviations: string[]
  ): number {
    let risk = 0;
    
    // Similarity-based risk (lower similarity = higher risk)
    risk += (1 - similarity) * 0.5;
    
    // Deviation count risk
    risk += Math.min(deviations.length * 0.1, 0.3);
    
    // Structural risk factors
    const numBlocks = cfg.nodes.length;
    
    // Very small or very large CFG
    if (numBlocks < 10 || numBlocks > 400) {
      risk += 0.1;
    }
    
    // Check for code injection patterns
    const ioOpsRatio = cfg.nodes.reduce((count, node) => {
      return count + node.instructions.filter(op => 
        OPCODE_CATEGORIES.IO.includes(op)
      ).length;
    }, 0) / (numBlocks * 10);
    
    if (ioOpsRatio > 0.2) {
      risk += 0.1;
    }
    
    return Math.min(Math.max(risk, 0), 1);
  }

  private getRecommendation(
    similarity: number,
    riskScore: number,
    deviations: string[]
  ): 'approve' | 'quarantine' | 'reject' {
    if (similarity >= 0.98 && riskScore < 0.2 && deviations.length === 0) {
      return 'approve';
    }
    
    if (similarity < 0.85 || riskScore > 0.7 || deviations.length > 5) {
      return 'reject';
    }
    
    return 'quarantine';
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }

  // Create baseline from known-good firmware
  async createBaseline(binary: ArrayBuffer): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const cfg = this.extractCFG(binary);
    return this.generateFingerprint(cfg);
  }
}
