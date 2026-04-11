/**
 * MQTT Connector
 * Message broker protocol for IoT and IIoT telemetry
 */

import { BaseDataSource, DataPoint, DataSourceConfig, TagConfig } from '../manager';

interface MQTTConnectionParams {
  brokerUrl: string;
  port: number;
  username?: string;
  password?: string;
  clientId?: string;
  clean?: boolean;
  keepalive?: number;
  qos?: 0 | 1 | 2;
  topics?: string[];
  useTLS?: boolean;
  caPath?: string;
  certPath?: string;
  keyPath?: string;
}

interface MQTTMessage {
  topic: string;
  payload: Buffer | string;
  qos: number;
  retain: boolean;
  timestamp: Date;
}

// Simulated MQTT broker for demo
class MQTTSimulator {
  private subscriptions: Map<string, ((message: MQTTMessage) => void)[]> = new Map();
  private retainedMessages: Map<string, MQTTMessage> = new Map();
  private simulationTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeRetainedMessages();
  }

  private initializeRetainedMessages(): void {
    const topics = [
      'ot/power/substation1/voltage',
      'ot/power/substation1/current',
      'ot/power/substation1/frequency',
      'ot/water/plant1/level',
      'ot/water/plant1/pressure',
      'ot/water/plant1/flow',
      'ot/hvac/building1/temperature',
      'ot/hvac/building1/humidity',
      'ot/manufacturing/line1/speed',
      'ot/manufacturing/line1/count',
      'iot/sensors/temp_001',
      'iot/sensors/pressure_001',
      'iot/sensors/vibration_001',
    ];

    for (const topic of topics) {
      const payload = this.generatePayload(topic);
      this.retainedMessages.set(topic, {
        topic,
        payload: JSON.stringify(payload),
        qos: 1,
        retain: true,
        timestamp: new Date(),
      });
    }
  }

  private generatePayload(topic: string): Record<string, unknown> {
    const now = new Date();
    
    if (topic.includes('voltage')) {
      return {
        value: 13800 + (Math.random() - 0.5) * 100,
        unit: 'V',
        quality: 'good',
        timestamp: now.toISOString(),
      };
    } else if (topic.includes('current')) {
      return {
        value: 245 + (Math.random() - 0.5) * 10,
        unit: 'A',
        quality: 'good',
        timestamp: now.toISOString(),
      };
    } else if (topic.includes('frequency')) {
      return {
        value: 60 + (Math.random() - 0.5) * 0.1,
        unit: 'Hz',
        quality: 'good',
        timestamp: now.toISOString(),
      };
    } else if (topic.includes('level')) {
      return {
        value: 75 + (Math.random() - 0.5) * 5,
        unit: '%',
        quality: 'good',
        timestamp: now.toISOString(),
      };
    } else if (topic.includes('pressure')) {
      return {
        value: 2.5 + (Math.random() - 0.5) * 0.2,
        unit: 'bar',
        quality: 'good',
        timestamp: now.toISOString(),
      };
    } else if (topic.includes('flow')) {
      return {
        value: 150 + (Math.random() - 0.5) * 20,
        unit: 'm3/h',
        quality: 'good',
        timestamp: now.toISOString(),
      };
    } else if (topic.includes('temperature') || topic.includes('temp')) {
      return {
        value: 22 + (Math.random() - 0.5) * 2,
        unit: 'C',
        quality: 'good',
        timestamp: now.toISOString(),
      };
    } else if (topic.includes('humidity')) {
      return {
        value: 45 + (Math.random() - 0.5) * 10,
        unit: '%RH',
        quality: 'good',
        timestamp: now.toISOString(),
      };
    } else if (topic.includes('speed')) {
      return {
        value: 100 + (Math.random() - 0.5) * 5,
        unit: 'units/min',
        quality: 'good',
        timestamp: now.toISOString(),
      };
    } else if (topic.includes('count')) {
      return {
        value: Math.floor(10000 + Math.random() * 100),
        unit: 'units',
        quality: 'good',
        timestamp: now.toISOString(),
      };
    } else if (topic.includes('vibration')) {
      return {
        value: 0.5 + Math.random() * 0.3,
        unit: 'mm/s',
        quality: 'good',
        timestamp: now.toISOString(),
      };
    }

    return {
      value: Math.random() * 100,
      timestamp: now.toISOString(),
    };
  }

  connect(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  disconnect(): void {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
    this.subscriptions.clear();
  }

  subscribe(topic: string, callback: (message: MQTTMessage) => void): void {
    // Handle wildcards
    const pattern = topic.replace('+', '[^/]+').replace('#', '.*');
    
    if (!this.subscriptions.has(pattern)) {
      this.subscriptions.set(pattern, []);
    }
    this.subscriptions.get(pattern)!.push(callback);

    // Send retained messages that match
    for (const [retainedTopic, message] of this.retainedMessages.entries()) {
      if (this.topicMatches(retainedTopic, topic)) {
        callback(message);
      }
    }
  }

  unsubscribe(topic: string): void {
    const pattern = topic.replace('+', '[^/]+').replace('#', '.*');
    this.subscriptions.delete(pattern);
  }

  publish(topic: string, payload: string | Buffer, qos: number = 1, retain: boolean = false): void {
    const message: MQTTMessage = {
      topic,
      payload,
      qos,
      retain,
      timestamp: new Date(),
    };

    if (retain) {
      this.retainedMessages.set(topic, message);
    }

    // Deliver to subscribers
    for (const [pattern, callbacks] of this.subscriptions.entries()) {
      if (this.topicMatches(topic, pattern)) {
        for (const callback of callbacks) {
          callback(message);
        }
      }
    }
  }

  private topicMatches(topic: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace('+', '[^/]+').replace('#', '.*') + '$');
    return regex.test(topic);
  }

  startSimulation(intervalMs: number = 1000): void {
    this.simulationTimer = setInterval(() => {
      // Update and publish all retained topics
      for (const topic of this.retainedMessages.keys()) {
        const payload = this.generatePayload(topic);
        this.publish(topic, JSON.stringify(payload), 1, true);
      }
    }, intervalMs);
  }
}

export class MQTTDataSource extends BaseDataSource {
  private connectionParams: MQTTConnectionParams;
  private simulator: MQTTSimulator;
  private messageBuffer: DataPoint[] = [];

  constructor(config: DataSourceConfig) {
    super(config);
    this.connectionParams = config.connectionParams as MQTTConnectionParams;
    this.simulator = new MQTTSimulator();
  }

  async connect(): Promise<void> {
    try {
      // In production, use mqtt library
      // const mqtt = require('mqtt');
      // this.client = mqtt.connect(this.connectionParams.brokerUrl, { ... });
      
      await this.simulator.connect();
      
      this.status.connected = true;
      this.status.lastConnected = new Date();
      this.isRunning = true;
      
      // Subscribe to configured topics
      if (this.connectionParams.topics) {
        for (const topic of this.connectionParams.topics) {
          this.subscribeToTopic(topic);
        }
      }

      // Subscribe to tag-based topics
      if (this.config.tags) {
        for (const tag of this.config.tags) {
          this.subscribeToTopic(tag.address);
        }
      }
      
      // Start simulation
      this.simulator.startSimulation(this.config.pollingIntervalMs || 1000);
      
      this.emit('connected');
    } catch (error) {
      this.status.connected = false;
      this.emitError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isRunning = false;
    this.simulator.disconnect();
    this.status.connected = false;
    this.emit('disconnected');
  }

  async readTags(tags: TagConfig[]): Promise<DataPoint[]> {
    // For MQTT, we return buffered messages that match tags
    const matchingData = this.messageBuffer.filter(dp =>
      tags.some(tag => dp.tagName === tag.name || dp.metadata?.topic === tag.address)
    );
    
    // Clear matched messages from buffer
    this.messageBuffer = this.messageBuffer.filter(dp =>
      !tags.some(tag => dp.tagName === tag.name || dp.metadata?.topic === tag.address)
    );
    
    return matchingData;
  }

  private subscribeToTopic(topic: string): void {
    this.simulator.subscribe(topic, (message) => {
      const dataPoint = this.parseMessage(message);
      if (dataPoint) {
        this.messageBuffer.push(dataPoint);
        this.emitData([dataPoint]);
      }
    });
  }

  private parseMessage(message: MQTTMessage): DataPoint | null {
    try {
      const payload = typeof message.payload === 'string' 
        ? message.payload 
        : message.payload.toString('utf-8');
      
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(payload);
      } catch {
        // Non-JSON payload, treat as raw value
        parsed = { value: payload };
      }

      // Extract tag name from topic
      const topicParts = message.topic.split('/');
      const tagName = topicParts[topicParts.length - 1];

      return {
        id: `${this.config.id}-${message.topic}-${Date.now()}`,
        sourceId: this.config.id,
        sourceType: 'mqtt',
        timestamp: parsed.timestamp ? new Date(parsed.timestamp as string) : message.timestamp,
        tagName,
        value: parsed.value as number | string | boolean,
        quality: (parsed.quality as string) === 'good' ? 'good' : 
                 (parsed.quality as string) === 'bad' ? 'bad' : 'uncertain',
        unit: parsed.unit as string | undefined,
        metadata: {
          topic: message.topic,
          qos: message.qos,
          retain: message.retain,
          rawPayload: payload,
        },
      };
    } catch (error) {
      console.error('Failed to parse MQTT message:', error);
      return null;
    }
  }

  // Publish to topic
  async publish(topic: string, payload: Record<string, unknown>, qos: 0 | 1 | 2 = 1): Promise<void> {
    this.simulator.publish(topic, JSON.stringify(payload), qos);
  }

  // Subscribe to additional topic
  async subscribe(topic: string): Promise<void> {
    this.subscribeToTopic(topic);
  }

  // Unsubscribe from topic
  async unsubscribe(topic: string): Promise<void> {
    this.simulator.unsubscribe(topic);
  }
}

export function createMQTTSource(config: DataSourceConfig): MQTTDataSource {
  return new MQTTDataSource(config);
}
