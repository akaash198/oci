/**
 * OPC-UA Connector
 * Modern industrial communication standard for SCADA and automation systems
 */

import { BaseDataSource, DataPoint, DataSourceConfig, TagConfig } from '../manager';

interface OPCUAConnectionParams {
  endpointUrl: string;
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy: 'None' | 'Basic128Rsa15' | 'Basic256' | 'Basic256Sha256';
  username?: string;
  password?: string;
  certificatePath?: string;
  privateKeyPath?: string;
  requestedSessionTimeout?: number;
}

interface OPCUANodeId {
  namespaceIndex: number;
  identifier: string | number;
  identifierType: 'numeric' | 'string' | 'guid' | 'bytestring';
}

// Simulated OPC-UA server for demo
class OPCUASimulator {
  private nodes: Map<string, { value: number | string | boolean; dataType: string; timestamp: Date }> = new Map();
  
  constructor() {
    // Initialize with typical OT data points
    this.initializeNodes();
  }

  private initializeNodes(): void {
    // Power Grid nodes
    this.nodes.set('ns=2;s=Grid.Voltage.PhaseA', { value: 13800, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=Grid.Voltage.PhaseB', { value: 13795, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=Grid.Voltage.PhaseC', { value: 13802, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=Grid.Current.PhaseA', { value: 245.5, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=Grid.Frequency', { value: 60.0, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=Grid.PowerFactor', { value: 0.95, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=Grid.ActivePower', { value: 5250, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=Grid.ReactivePower', { value: 1750, dataType: 'Float', timestamp: new Date() });
    
    // Process Control nodes
    this.nodes.set('ns=2;s=Tank1.Level', { value: 75.5, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=Tank1.Temperature', { value: 45.2, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=Tank1.Pressure', { value: 2.5, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=Pump1.Running', { value: true, dataType: 'Boolean', timestamp: new Date() });
    this.nodes.set('ns=2;s=Pump1.Speed', { value: 1450, dataType: 'Int32', timestamp: new Date() });
    this.nodes.set('ns=2;s=Valve1.Position', { value: 65, dataType: 'Float', timestamp: new Date() });
    
    // Safety System nodes
    this.nodes.set('ns=2;s=Safety.EmergencyStop', { value: false, dataType: 'Boolean', timestamp: new Date() });
    this.nodes.set('ns=2;s=Safety.HighPressureAlarm', { value: false, dataType: 'Boolean', timestamp: new Date() });
    this.nodes.set('ns=2;s=Safety.LowLevelAlarm', { value: false, dataType: 'Boolean', timestamp: new Date() });
    
    // Network/System nodes
    this.nodes.set('ns=2;s=System.CPUUsage', { value: 35, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=System.MemoryUsage', { value: 62, dataType: 'Float', timestamp: new Date() });
    this.nodes.set('ns=2;s=System.NetworkLatency', { value: 5.2, dataType: 'Float', timestamp: new Date() });
  }

  readNode(nodeId: string): { value: number | string | boolean; statusCode: number; timestamp: Date } {
    const node = this.nodes.get(nodeId);
    
    if (!node) {
      return { value: 0, statusCode: 0x80000000, timestamp: new Date() }; // Bad_NodeIdUnknown
    }

    // Simulate realistic value changes
    if (node.dataType === 'Float') {
      const currentValue = node.value as number;
      const variation = (Math.random() - 0.5) * currentValue * 0.02; // 2% variation
      node.value = currentValue + variation;
    } else if (node.dataType === 'Int32') {
      const currentValue = node.value as number;
      const variation = Math.floor((Math.random() - 0.5) * 10);
      node.value = currentValue + variation;
    } else if (node.dataType === 'Boolean') {
      // Rare state changes for boolean values
      if (Math.random() > 0.99) {
        node.value = !node.value;
      }
    }
    
    node.timestamp = new Date();
    
    return {
      value: node.value,
      statusCode: 0, // Good
      timestamp: node.timestamp,
    };
  }

  writeNode(nodeId: string, value: number | string | boolean): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    
    node.value = value;
    node.timestamp = new Date();
    return true;
  }

  browseNodes(parentNodeId?: string): string[] {
    if (!parentNodeId) {
      return Array.from(this.nodes.keys());
    }
    
    const prefix = parentNodeId.split('.').slice(0, -1).join('.');
    return Array.from(this.nodes.keys()).filter(k => k.includes(prefix));
  }
}

export class OPCUADataSource extends BaseDataSource {
  private connectionParams: OPCUAConnectionParams;
  private pollTimer: NodeJS.Timeout | null = null;
  private simulator: OPCUASimulator;
  private subscriptions: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: DataSourceConfig) {
    super(config);
    this.connectionParams = config.connectionParams as OPCUAConnectionParams;
    this.simulator = new OPCUASimulator();
  }

  async connect(): Promise<void> {
    try {
      // In production, use node-opcua library
      // const { OPCUAClient, SecurityPolicy, MessageSecurityMode } = require('node-opcua');
      // this.client = OPCUAClient.create({ ... });
      // await this.client.connect(this.connectionParams.endpointUrl);
      
      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 150));
      
      this.status.connected = true;
      this.status.lastConnected = new Date();
      this.isRunning = true;
      
      this.startPolling();
      this.emit('connected');
    } catch (error) {
      this.status.connected = false;
      this.emitError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isRunning = false;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    // Clear all subscriptions
    for (const timer of this.subscriptions.values()) {
      clearInterval(timer);
    }
    this.subscriptions.clear();
    
    this.status.connected = false;
    this.emit('disconnected');
  }

  async readTags(tags: TagConfig[]): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = [];
    const now = new Date();

    for (const tag of tags) {
      try {
        const nodeId = this.buildNodeId(tag.address);
        const result = this.simulator.readNode(nodeId);
        
        let value = result.value;
        if (typeof value === 'number' && tag.scaleFactor) {
          value = value * tag.scaleFactor + (tag.offset || 0);
        }

        const quality = result.statusCode === 0 ? 'good' : 
                       result.statusCode < 0x40000000 ? 'uncertain' : 'bad';

        dataPoints.push({
          id: `${this.config.id}-${tag.name}-${now.getTime()}`,
          sourceId: this.config.id,
          sourceType: 'opcua',
          timestamp: result.timestamp,
          tagName: tag.name,
          value,
          quality,
          unit: tag.unit,
          metadata: {
            nodeId,
            statusCode: result.statusCode,
            serverTimestamp: result.timestamp,
          },
        });
      } catch (error) {
        dataPoints.push({
          id: `${this.config.id}-${tag.name}-${now.getTime()}`,
          sourceId: this.config.id,
          sourceType: 'opcua',
          timestamp: now,
          tagName: tag.name,
          value: 0,
          quality: 'bad',
          metadata: {
            error: (error as Error).message,
          },
        });
      }
    }

    return dataPoints;
  }

  private buildNodeId(address: string): string {
    // Support various node ID formats
    if (address.startsWith('ns=')) {
      return address;
    }
    // Convert simple path to node ID
    return `ns=2;s=${address}`;
  }

  private startPolling(): void {
    const interval = this.config.pollingIntervalMs || 1000;
    
    this.pollTimer = setInterval(async () => {
      if (!this.isRunning || !this.config.tags) return;
      
      try {
        const data = await this.readTags(this.config.tags);
        this.emitData(data);
      } catch (error) {
        this.emitError(error as Error);
      }
    }, interval);
  }

  // Subscribe to data changes (OPC-UA subscription mode)
  async subscribe(tags: TagConfig[], publishingInterval: number = 1000): Promise<string> {
    const subscriptionId = `sub-${Date.now()}`;
    
    const timer = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const data = await this.readTags(tags);
        this.emitData(data);
      } catch (error) {
        this.emitError(error as Error);
      }
    }, publishingInterval);
    
    this.subscriptions.set(subscriptionId, timer);
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const timer = this.subscriptions.get(subscriptionId);
    if (timer) {
      clearInterval(timer);
      this.subscriptions.delete(subscriptionId);
    }
  }

  // Browse server nodes
  async browse(parentNodeId?: string): Promise<string[]> {
    return this.simulator.browseNodes(parentNodeId);
  }

  // Write value to node
  async write(nodeId: string, value: number | string | boolean): Promise<boolean> {
    return this.simulator.writeNode(this.buildNodeId(nodeId), value);
  }
}

export function createOPCUASource(config: DataSourceConfig): OPCUADataSource {
  return new OPCUADataSource(config);
}
