/**
 * DNP3 Connector
 * Distributed Network Protocol for SCADA systems, primarily used in utilities
 */

import { BaseDataSource, DataPoint, DataSourceConfig, TagConfig } from '../manager';

interface DNP3ConnectionParams {
  masterAddress: number;
  outstationAddress: number;
  host: string;
  port: number;
  mode: 'tcp' | 'serial';
  serialPort?: string;
  baudRate?: number;
  integrityPollIntervalMs?: number;
  eventPollIntervalMs?: number;
}

interface DNP3Point {
  index: number;
  value: number | boolean;
  flags: number;
  timestamp: Date;
  type: 'binary_input' | 'binary_output' | 'analog_input' | 'analog_output' | 'counter';
}

// DNP3 Point type mappings
const DNP3_POINT_TYPES = {
  BINARY_INPUT: 1,
  BINARY_OUTPUT: 10,
  ANALOG_INPUT: 30,
  ANALOG_OUTPUT: 40,
  COUNTER: 20,
  FROZEN_COUNTER: 21,
  TIME_AND_DATE: 50,
};

// DNP3 Quality flags
const DNP3_FLAGS = {
  ONLINE: 0x01,
  RESTART: 0x02,
  COMM_LOST: 0x04,
  REMOTE_FORCED: 0x08,
  LOCAL_FORCED: 0x10,
  OVER_RANGE: 0x20,
  REFERENCE_ERR: 0x40,
  RESERVED: 0x80,
};

// Simulated DNP3 outstation
class DNP3Simulator {
  private binaryInputs: Map<number, { value: boolean; flags: number; timestamp: Date }> = new Map();
  private binaryOutputs: Map<number, { value: boolean; flags: number; timestamp: Date }> = new Map();
  private analogInputs: Map<number, { value: number; flags: number; timestamp: Date }> = new Map();
  private analogOutputs: Map<number, { value: number; flags: number; timestamp: Date }> = new Map();
  private counters: Map<number, { value: number; flags: number; timestamp: Date }> = new Map();
  private eventBuffer: DNP3Point[] = [];

  constructor() {
    this.initializePoints();
  }

  private initializePoints(): void {
    const now = new Date();
    const onlineFlag = DNP3_FLAGS.ONLINE;

    // Binary Inputs (breakers, switches, alarms)
    for (let i = 0; i < 20; i++) {
      this.binaryInputs.set(i, {
        value: Math.random() > 0.7,
        flags: onlineFlag,
        timestamp: now,
      });
    }

    // Binary Outputs (control points)
    for (let i = 0; i < 10; i++) {
      this.binaryOutputs.set(i, {
        value: false,
        flags: onlineFlag,
        timestamp: now,
      });
    }

    // Analog Inputs (measurements)
    const analogDefaults = [
      { index: 0, value: 13800, name: 'Voltage_A' },
      { index: 1, value: 13795, name: 'Voltage_B' },
      { index: 2, value: 13802, name: 'Voltage_C' },
      { index: 3, value: 245.5, name: 'Current_A' },
      { index: 4, value: 243.2, name: 'Current_B' },
      { index: 5, value: 246.1, name: 'Current_C' },
      { index: 6, value: 60.0, name: 'Frequency' },
      { index: 7, value: 5250, name: 'MW' },
      { index: 8, value: 1750, name: 'MVAR' },
      { index: 9, value: 0.95, name: 'PF' },
      { index: 10, value: 35.5, name: 'Temp_Ambient' },
      { index: 11, value: 45.2, name: 'Temp_Transformer' },
    ];

    for (const ai of analogDefaults) {
      this.analogInputs.set(ai.index, {
        value: ai.value,
        flags: onlineFlag,
        timestamp: now,
      });
    }

    // Analog Outputs (setpoints)
    for (let i = 0; i < 5; i++) {
      this.analogOutputs.set(i, {
        value: 100,
        flags: onlineFlag,
        timestamp: now,
      });
    }

    // Counters (energy, events)
    for (let i = 0; i < 10; i++) {
      this.counters.set(i, {
        value: Math.floor(Math.random() * 100000),
        flags: onlineFlag,
        timestamp: now,
      });
    }
  }

  readBinaryInputs(): DNP3Point[] {
    const points: DNP3Point[] = [];
    const now = new Date();

    this.binaryInputs.forEach((point, index) => {
      // Simulate occasional state changes
      if (Math.random() > 0.98) {
        point.value = !point.value;
        point.timestamp = now;
        this.eventBuffer.push({
          index,
          value: point.value,
          flags: point.flags,
          timestamp: now,
          type: 'binary_input',
        });
      }

      points.push({
        index,
        value: point.value,
        flags: point.flags,
        timestamp: point.timestamp,
        type: 'binary_input',
      });
    });

    return points;
  }

  readAnalogInputs(): DNP3Point[] {
    const points: DNP3Point[] = [];
    const now = new Date();

    this.analogInputs.forEach((point, index) => {
      // Simulate measurement variations
      const variation = (Math.random() - 0.5) * point.value * 0.01;
      point.value += variation;
      point.timestamp = now;

      // Check for deadband crossings (simplified)
      if (Math.random() > 0.95) {
        this.eventBuffer.push({
          index,
          value: point.value,
          flags: point.flags,
          timestamp: now,
          type: 'analog_input',
        });
      }

      points.push({
        index,
        value: point.value,
        flags: point.flags,
        timestamp: point.timestamp,
        type: 'analog_input',
      });
    });

    return points;
  }

  readCounters(): DNP3Point[] {
    const points: DNP3Point[] = [];
    const now = new Date();

    this.counters.forEach((point, index) => {
      // Counters increment over time
      point.value += Math.floor(Math.random() * 10);
      point.timestamp = now;

      points.push({
        index,
        value: point.value,
        flags: point.flags,
        timestamp: point.timestamp,
        type: 'counter',
      });
    });

    return points;
  }

  // Get events since last poll (Class 1, 2, 3 data)
  getEvents(): DNP3Point[] {
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    return events;
  }

  // Integrity poll (Class 0)
  integrityPoll(): DNP3Point[] {
    return [
      ...this.readBinaryInputs(),
      ...this.readAnalogInputs(),
      ...this.readCounters(),
    ];
  }

  // Control operations
  selectBeforeOperate(type: string, index: number, value: number | boolean): boolean {
    // SBO pattern - select phase
    return true;
  }

  operate(type: string, index: number, value: number | boolean): boolean {
    const now = new Date();

    if (type === 'binary_output') {
      const point = this.binaryOutputs.get(index);
      if (point) {
        point.value = value as boolean;
        point.timestamp = now;
        return true;
      }
    } else if (type === 'analog_output') {
      const point = this.analogOutputs.get(index);
      if (point) {
        point.value = value as number;
        point.timestamp = now;
        return true;
      }
    }

    return false;
  }
}

export class DNP3DataSource extends BaseDataSource {
  private connectionParams: DNP3ConnectionParams;
  private pollTimer: NodeJS.Timeout | null = null;
  private eventPollTimer: NodeJS.Timeout | null = null;
  private simulator: DNP3Simulator;

  constructor(config: DataSourceConfig) {
    super(config);
    this.connectionParams = config.connectionParams as DNP3ConnectionParams;
    this.simulator = new DNP3Simulator();
  }

  async connect(): Promise<void> {
    try {
      // In production, use dnp3 library (opendnp3 bindings)
      // const dnp3 = require('dnp3');
      // this.master = dnp3.createMaster({ ... });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
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
    
    if (this.eventPollTimer) {
      clearInterval(this.eventPollTimer);
      this.eventPollTimer = null;
    }
    
    this.status.connected = false;
    this.emit('disconnected');
  }

  async readTags(tags: TagConfig[]): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = [];
    const now = new Date();
    
    // Get all points from integrity poll
    const allPoints = this.simulator.integrityPoll();
    const pointMap = new Map(allPoints.map(p => [`${p.type}:${p.index}`, p]));

    for (const tag of tags) {
      try {
        const parsed = this.parseAddress(tag.address);
        const key = `${parsed.type}:${parsed.index}`;
        const point = pointMap.get(key);

        if (point) {
          let value = point.value;
          if (typeof value === 'number' && tag.scaleFactor) {
            value = value * tag.scaleFactor + (tag.offset || 0);
          }

          const quality = (point.flags & DNP3_FLAGS.ONLINE) ? 'good' :
                         (point.flags & DNP3_FLAGS.COMM_LOST) ? 'bad' : 'uncertain';

          dataPoints.push({
            id: `${this.config.id}-${tag.name}-${now.getTime()}`,
            sourceId: this.config.id,
            sourceType: 'dnp3',
            timestamp: point.timestamp,
            tagName: tag.name,
            value,
            quality,
            unit: tag.unit,
            metadata: {
              index: point.index,
              type: point.type,
              flags: point.flags,
              flagsDecoded: this.decodeFlags(point.flags),
            },
          });
        } else {
          dataPoints.push({
            id: `${this.config.id}-${tag.name}-${now.getTime()}`,
            sourceId: this.config.id,
            sourceType: 'dnp3',
            timestamp: now,
            tagName: tag.name,
            value: 0,
            quality: 'bad',
            metadata: {
              error: 'Point not found',
            },
          });
        }
      } catch (error) {
        dataPoints.push({
          id: `${this.config.id}-${tag.name}-${now.getTime()}`,
          sourceId: this.config.id,
          sourceType: 'dnp3',
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

  private parseAddress(address: string): { type: string; index: number } {
    // Format: AI:0, BI:5, AO:2, BO:1, CTR:0
    const parts = address.toUpperCase().split(':');
    const typeMap: Record<string, string> = {
      'AI': 'analog_input',
      'BI': 'binary_input',
      'AO': 'analog_output',
      'BO': 'binary_output',
      'CTR': 'counter',
    };

    return {
      type: typeMap[parts[0]] || 'analog_input',
      index: parseInt(parts[1] || '0', 10),
    };
  }

  private decodeFlags(flags: number): string[] {
    const decoded: string[] = [];
    if (flags & DNP3_FLAGS.ONLINE) decoded.push('ONLINE');
    if (flags & DNP3_FLAGS.RESTART) decoded.push('RESTART');
    if (flags & DNP3_FLAGS.COMM_LOST) decoded.push('COMM_LOST');
    if (flags & DNP3_FLAGS.REMOTE_FORCED) decoded.push('REMOTE_FORCED');
    if (flags & DNP3_FLAGS.LOCAL_FORCED) decoded.push('LOCAL_FORCED');
    if (flags & DNP3_FLAGS.OVER_RANGE) decoded.push('OVER_RANGE');
    if (flags & DNP3_FLAGS.REFERENCE_ERR) decoded.push('REFERENCE_ERR');
    return decoded;
  }

  private startPolling(): void {
    // Integrity poll (Class 0)
    const integrityInterval = this.connectionParams.integrityPollIntervalMs || 10000;
    this.pollTimer = setInterval(async () => {
      if (!this.isRunning || !this.config.tags) return;
      
      try {
        const data = await this.readTags(this.config.tags);
        this.emitData(data);
      } catch (error) {
        this.emitError(error as Error);
      }
    }, integrityInterval);

    // Event poll (Class 1, 2, 3)
    const eventInterval = this.connectionParams.eventPollIntervalMs || 1000;
    this.eventPollTimer = setInterval(() => {
      if (!this.isRunning) return;
      
      const events = this.simulator.getEvents();
      if (events.length > 0) {
        const eventData: DataPoint[] = events.map(e => ({
          id: `${this.config.id}-event-${e.type}-${e.index}-${Date.now()}`,
          sourceId: this.config.id,
          sourceType: 'dnp3' as const,
          timestamp: e.timestamp,
          tagName: `${e.type}:${e.index}`,
          value: e.value,
          quality: 'good' as const,
          metadata: {
            isEvent: true,
            flags: e.flags,
          },
        }));
        this.emitData(eventData);
      }
    }, eventInterval);
  }

  // Control operations with SBO
  async control(type: string, index: number, value: number | boolean): Promise<boolean> {
    // Select-Before-Operate pattern
    const selected = this.simulator.selectBeforeOperate(type, index, value);
    if (!selected) return false;
    
    return this.simulator.operate(type, index, value);
  }
}

export function createDNP3Source(config: DataSourceConfig): DNP3DataSource {
  return new DNP3DataSource(config);
}
